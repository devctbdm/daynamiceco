import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { DATABASE } from "../db/database.js";
import { defaultAddress, serializeUser, userEntries } from "../models/User.js";
import { serializeSession, sessionEntries } from "../models/Session.js";
import { getSmsSetting } from "../sms-settings/sms-settings.repository.js";
import { sendLoginOtp, sendPasswordResetOtp } from "../services/smsService.js";
import {
  findTeamMemberByEmail,
  findTeamMemberById,
  teamMemberExists,
  updateTeamMember,
} from "../team-members/team-members.repository.js";
import { parseUserAgent } from "../utils/parseUA.js";
import { recordLogin } from "../middleware/audit.js";
import {
  findUserByEmail,
  findUserById,
  findUserByPhoneSuffix,
  findUserForLogin,
} from "./users.repository.js";

const EMAIL_RE = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const ROLES = new Set(["super_admin", "admin", "manager", "customer"]);
const STATUSES = new Set(["active", "inactive", "suspended"]);
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_MINUTES = Number(process.env.LOCK_TIME_MINUTES) || 15;
const USER_FIELDS = [
  "name",
  "email",
  "password",
  "phone",
  "address",
  "addresses",
  "role",
  "status",
  "resetPasswordToken",
  "resetPasswordExpire",
  "twoFactorOtp",
  "twoFactorOtpExpire",
  "twoFactorAttempts",
  "loginAttempts",
  "lockUntil",
  "updatedAt",
];

class UsersService {
  constructor(database) {
    this.database = database;
  }

  async register(input = {}) {
    const data = normalizeUserInput(input);
    validateUser(data, { requirePassword: true });
    if (await findUserByEmail(data.email, { database: this.database })) {
      throw badRequest("User already exists with this email");
    }
    const now = new Date();
    let row;
    try {
      [row] = await this.database
        .insert(userEntries)
        .values({
          id: crypto.randomBytes(12).toString("hex"),
          ...data,
          password: await bcrypt.hash(data.password, 10),
          address: { ...defaultAddress(), ...(data.address ?? {}) },
          addresses: [],
          role: "customer",
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    } catch (error) {
      if (error.code === "23505") {
        throw badRequest("User already exists with this email");
      }
      throw error;
    }
    if (!row) throw new Error("Failed to create user");
    const token = makeToken(row.id);
    return {
      statusCode: 201,
      body: {
        success: true,
        token,
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          phone: row.phone,
          address: row.address,
        },
      },
    };
  }

  async login(request, input = {}) {
    const identifier = String(input.email || input.identifier || "").trim();
    const password = input.password;
    const lookup = identifier.toLowerCase();
    const isAdminPortal = input.portal === "admin";
    let member = null;
    let user = null;

    if (isAdminPortal) {
      member = await findTeamMemberByEmail(lookup, { includeSensitive: true });
      if (!member) {
        user = await findUserForLogin(lookup, {
          roles: ["admin", "super_admin", "manager"],
          database: this.database,
        });
      }
    } else if (identifier) {
      user = await findUserForLogin(identifier, { database: this.database });
    }

    if (user) {
      if (isLocked(user)) {
        throw new TooManyAttemptsException(
          `Account temporarily locked after too many failed attempts. Try again in ${lockMinutesRemaining(user)} minute(s).`,
        );
      }
      if (
        typeof password !== "string" ||
        !(await bcrypt.compare(password, user.password))
      ) {
        await this.registerFailedUserLogin(user);
        throw unauthorized("Invalid email/phone or password");
      }
      await this.clearUserLoginAttempts(user);

      const isStaff = ["admin", "super_admin", "manager"].includes(user.role);
      const smsSetting = await getSmsSetting();
      if (isStaff && smsSetting.twoFactorEnabled) {
        return this.startUserTwoFactor(request, user, smsSetting);
      }

      const token = makeToken(user._id);
      await this.recordSession(user._id, request);
      if (isStaff) recordLogin(request, user);
      return { success: true, token, user: publicUser(user) };
    }

    if (!member && isAdminPortal) {
      member = await findTeamMemberByEmail(lookup, { includeSensitive: true });
    } else if (!member && lookup) {
      member = await findTeamMemberByEmail(lookup, { includeSensitive: true });
    }
    if (!member) throw unauthorized("Invalid email/phone or password");
    if (!member.active) {
      throw new ForbiddenException({
        success: false,
        message: "This account is inactive. Contact an administrator.",
      });
    }
    if (isLocked(member)) {
      throw new TooManyAttemptsException(
        `Account temporarily locked after too many failed attempts. Try again in ${lockMinutesRemaining(member)} minute(s).`,
      );
    }
    if (
      typeof password !== "string" ||
      !(member.password && (await bcrypt.compare(password, member.password)))
    ) {
      await this.registerFailedTeamLogin(member);
      throw unauthorized("Invalid email/phone or password");
    }
    await this.clearTeamLoginAttempts(member);

    const smsSetting = await getSmsSetting();
    if (smsSetting.twoFactorEnabled) {
      return this.startTeamTwoFactor(request, member, smsSetting);
    }
    const token = makeToken(member._id);
    member.lastLogin = new Date();
    await updateTeamMember(member._id, { lastLogin: member.lastLogin });
    recordLogin(request, member);
    return {
      success: true,
      token,
      user: publicUser(member, true),
    };
  }

  async verifyOtp(request, input = {}) {
    const { pendingToken, otp } = input;
    if (!pendingToken || !otp) {
      throw badRequest("Verification token and OTP are required");
    }
    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      throw unauthorized("Verification session expired. Please log in again.");
    }
    if (decoded.purpose !== "2fa-login") {
      throw unauthorized("Invalid verification token");
    }
    const isTeamAccount = decoded.source === "team";
    const account = isTeamAccount
      ? await findTeamMemberById(decoded.id, { includeSensitive: true })
      : await findUserById(decoded.id, {
          includeSensitive: true,
          database: this.database,
        });
    if (!account) throw unauthorized("User not found. Please log in again.");
    if (!account.twoFactorOtp || !account.twoFactorOtpExpire) {
      throw badRequest(
        "No verification code was requested. Please log in again.",
      );
    }
    if (new Date(account.twoFactorOtpExpire) < new Date()) {
      await this.clearTwoFactor(account, isTeamAccount);
      throw badRequest("Code has expired. Please log in again.");
    }
    if ((account.twoFactorAttempts || 0) >= 5) {
      await this.clearTwoFactor(account, isTeamAccount);
      throw new TooManyAttemptsException(
        "Too many attempts. Please log in again.",
      );
    }
    if (account.twoFactorOtp !== hashOtp(otp)) {
      await this.saveAccountFields(account, isTeamAccount, {
        twoFactorAttempts: (account.twoFactorAttempts || 0) + 1,
      });
      throw badRequest("Invalid code. Please try again.");
    }

    await this.clearTwoFactor(account, isTeamAccount);
    const token = makeToken(account._id);
    if (isTeamAccount) {
      account.lastLogin = new Date();
      await updateTeamMember(account._id, { lastLogin: account.lastLogin });
      recordLogin(request, account);
      return { success: true, token, user: publicUser(account, true) };
    }
    await this.recordSession(account._id, request);
    recordLogin(request, account);
    return { success: true, token, user: publicUser(account) };
  }

  async getMe(request) {
    if (request.isTeam)
      return { success: true, user: publicUser(request.user, true) };
    return {
      success: true,
      user: publicUser(request.user),
    };
  }

  async updateProfile(request, input = {}) {
    const user = await findUserById(request.user._id, {
      database: this.database,
    });
    if (!user)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    const updates = {};
    if (input.name) {
      updates.name = String(input.name).trim();
      if (!updates.name || updates.name.length > 50) {
        throw badRequest("Name must be between 1 and 50 characters");
      }
    }
    if (input.phone) {
      updates.phone = String(input.phone).trim();
      if (!updates.phone) throw badRequest("Please provide a phone number");
    }
    if (input.address) {
      updates.address = { ...user.address };
      for (const field of ["street", "city", "state", "postcode", "country"]) {
        if (input.address[field]) updates.address[field] = input.address[field];
      }
    }
    const updated = await this.updateUserRow(user._id, updates);
    return {
      success: true,
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
        address: updated.address,
      },
    };
  }

  async changePassword(userId, input = {}) {
    const { currentPassword, newPassword } = input;
    if (!currentPassword || !newPassword) {
      throw badRequest("Current password and new password are required");
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      throw badRequest("New password must be at least 6 characters");
    }
    const user = await findUserById(userId, {
      includeSensitive: true,
      database: this.database,
    });
    if (!user)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    if (!(await bcrypt.compare(String(currentPassword), user.password))) {
      throw unauthorized("Current password is incorrect");
    }
    await this.updateUserRow(user._id, {
      password: await bcrypt.hash(newPassword, 10),
    });
    return { success: true, message: "Password updated successfully" };
  }

  async forgotPassword(input = {}) {
    if (!input.phone) throw badRequest("Phone number is required");
    const user = await findUserByPhoneSuffix(input.phone, {
      database: this.database,
    });
    if (!user) {
      throw new NotFoundException({
        success: false,
        message: "No account found with this phone number",
      });
    }
    const otp = newOtp();
    await this.updateUserRow(user._id, {
      resetPasswordToken: hashOtp(otp),
      resetPasswordExpire: new Date(Date.now() + 10 * 60 * 1000),
    });
    const result = await sendPasswordResetOtp({ phone: user.phone, otp });
    if (result.skipped || !result.success) {
      console.error(
        "Forgot password SMS failed:",
        result.reason || result.log?.providerMessage,
      );
      throw new InternalServerErrorException({
        success: false,
        message:
          "Could not send the code. SMS service is not configured or is unavailable.",
      });
    }
    return { success: true, message: "OTP sent to your phone" };
  }

  async resetPassword(input = {}) {
    const { phone, otp, newPassword } = input;
    if (!phone || !otp || !newPassword) {
      throw badRequest("phone, otp and newPassword are required");
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      throw badRequest("Password must be at least 6 characters");
    }
    const user = await findUserByPhoneSuffix(phone, {
      includeSensitive: true,
      database: this.database,
    });
    if (!user || !user.resetPasswordToken) {
      throw badRequest("No password reset was requested for this phone");
    }
    if (
      !user.resetPasswordExpire ||
      new Date(user.resetPasswordExpire) < new Date()
    ) {
      throw badRequest("OTP has expired. Request a new code.");
    }
    if (user.resetPasswordToken !== hashOtp(otp)) {
      throw badRequest("Invalid OTP");
    }
    await this.updateUserRow(user._id, {
      password: await bcrypt.hash(newPassword, 10),
      resetPasswordToken: null,
      resetPasswordExpire: null,
    });
    return {
      success: true,
      message: "Password reset successfully. Please login.",
    };
  }

  async getAddresses(userId) {
    const user = await this.requireUser(userId);
    return { success: true, addresses: user.addresses };
  }

  async addAddress(userId, input = {}) {
    const user = await this.requireUser(userId);
    const addresses = [...user.addresses];
    addresses.push({
      _id: crypto.randomBytes(12).toString("hex"),
      label: input.label || "Home",
      fullName: input.fullName || user.name,
      phone: input.phone || user.phone,
      company: input.company || "",
      street: input.street || "",
      city: input.city || "",
      state: input.state || "",
      postcode: input.postcode || "",
      country: input.country || "Bangladesh",
      deliveryArea: input.deliveryArea || "",
      isDefault: addresses.length === 0,
    });
    await this.updateUserRow(user._id, { addresses });
    return { statusCode: 201, body: { success: true, addresses } };
  }

  async updateAddress(userId, addressId, input = {}) {
    const user = await this.requireUser(userId);
    const addresses = [...user.addresses];
    const address = addresses.find((item) => String(item._id) === addressId);
    if (!address)
      throw new NotFoundException({
        success: false,
        message: "Address not found",
      });
    for (const field of [
      "label",
      "fullName",
      "phone",
      "company",
      "street",
      "city",
      "state",
      "postcode",
      "country",
      "deliveryArea",
    ]) {
      if (input[field] !== undefined) address[field] = input[field];
    }
    await this.updateUserRow(user._id, { addresses });
    return { success: true, addresses };
  }

  async deleteAddress(userId, addressId) {
    const user = await this.requireUser(userId);
    const index = user.addresses.findIndex(
      (item) => String(item._id) === addressId,
    );
    if (index < 0)
      throw new NotFoundException({
        success: false,
        message: "Address not found",
      });
    const [removed] = user.addresses.splice(index, 1);
    if (
      removed.isDefault &&
      user.addresses.length &&
      !user.addresses.some((item) => item.isDefault)
    ) {
      user.addresses[0].isDefault = true;
    }
    await this.updateUserRow(user._id, { addresses: user.addresses });
    return { success: true, addresses: user.addresses };
  }

  async setDefaultAddress(userId, addressId) {
    const user = await this.requireUser(userId);
    if (!user.addresses.some((item) => String(item._id) === addressId)) {
      throw new NotFoundException({
        success: false,
        message: "Address not found",
      });
    }
    const addresses = user.addresses.map((address) => ({
      ...address,
      isDefault: String(address._id) === addressId,
    }));
    await this.updateUserRow(user._id, { addresses });
    return { success: true, addresses };
  }

  async getSessions(userId) {
    const rows = await this.database
      .select()
      .from(sessionEntries)
      .where(eq(sessionEntries.user, String(userId)))
      .orderBy(desc(sessionEntries.lastActive))
      .limit(20);
    return { success: true, sessions: rows.map(serializeSession) };
  }

  async revokeSession(userId, sessionId) {
    const conditions = and(
      eq(sessionEntries.id, String(sessionId)),
      eq(sessionEntries.user, String(userId)),
    );
    const [session] = await this.database
      .select()
      .from(sessionEntries)
      .where(conditions)
      .limit(1);
    if (!session) {
      throw new NotFoundException({
        success: false,
        message: "Session not found",
      });
    }
    if (session.isCurrent) throw badRequest("Cannot revoke current session");
    const [deleted] = await this.database
      .delete(sessionEntries)
      .where(
        and(
          eq(sessionEntries.id, String(sessionId)),
          eq(sessionEntries.user, String(userId)),
          eq(sessionEntries.isCurrent, false),
        ),
      )
      .returning({ id: sessionEntries.id });
    if (!deleted) {
      const [latest] = await this.database
        .select({ isCurrent: sessionEntries.isCurrent })
        .from(sessionEntries)
        .where(conditions)
        .limit(1);
      if (latest?.isCurrent) throw badRequest("Cannot revoke current session");
      throw new NotFoundException({
        success: false,
        message: "Session not found",
      });
    }
    return { success: true, message: "Session revoked" };
  }

  async findAll(query = {}) {
    const page = positiveInteger(query.page, 1);
    const limit = Math.min(100, positiveInteger(query.limit, 20));
    const conditions = [];
    if (query.role && query.role !== "all") {
      if (!ROLES.has(query.role)) throw badRequest("Invalid role");
      conditions.push(eq(userEntries.role, query.role));
    }
    if (query.status && query.status !== "all") {
      if (!STATUSES.has(query.status)) throw badRequest("Invalid status");
      conditions.push(eq(userEntries.status, query.status));
    }
    if (query.search) {
      const search = `%${escapeLike(String(query.search).trim())}%`;
      conditions.push(
        or(
          ilike(userEntries.name, search),
          ilike(userEntries.email, search),
          ilike(userEntries.phone, search),
        ),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.database
      .select({ total: count() })
      .from(userEntries)
      .where(where);
    const rows = await this.database
      .select()
      .from(userEntries)
      .where(where)
      .orderBy(desc(userEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const users = rows.map((row) => serializeUser(row));
    return {
      success: true,
      count: users.length,
      total: Number(totalRow?.total ?? 0),
      page,
      pages: Math.ceil(Number(totalRow?.total ?? 0) / limit),
      users,
    };
  }

  async getById(id) {
    const user = await findUserById(id, { database: this.database });
    if (!user)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    return { success: true, user };
  }

  async create(input = {}) {
    const data = normalizeUserInput(input);
    data.role = input.role || "customer";
    data.status = input.status || "active";
    validateUser(data, { requirePassword: true });
    validateRoleAndStatus(data.role, data.status);
    if (await findUserByEmail(data.email, { database: this.database })) {
      throw badRequest("User already exists with this email");
    }
    const now = new Date();
    let row;
    try {
      [row] = await this.database
        .insert(userEntries)
        .values({
          id: crypto.randomBytes(12).toString("hex"),
          ...data,
          password: await bcrypt.hash(data.password, 10),
          address: { ...defaultAddress(), ...(data.address ?? {}) },
          addresses: [],
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    } catch (error) {
      if (error.code === "23505") {
        throw badRequest("User already exists with this email");
      }
      throw error;
    }
    if (!row) throw new Error("Failed to create user");
    return {
      statusCode: 201,
      body: { success: true, user: serializeUser(row) },
    };
  }

  async update(id, input = {}, actor) {
    const user = await findUserById(id, { database: this.database });
    if (!user)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    const updates = {};
    for (const field of ["name", "email", "phone", "role", "status"]) {
      if (input[field] !== undefined) updates[field] = input[field];
    }
    if (input.role !== undefined && actor.role !== "super_admin") {
      throw new ForbiddenException({
        success: false,
        message: "Only super admin can change roles",
      });
    }
    if (updates.name !== undefined) updates.name = String(updates.name).trim();
    if (updates.email !== undefined)
      updates.email = String(updates.email).trim().toLowerCase();
    if (updates.phone !== undefined)
      updates.phone = String(updates.phone).trim();
    if (updates.role !== undefined && !ROLES.has(updates.role)) {
      throw badRequest("Invalid role");
    }
    if (updates.status !== undefined && !STATUSES.has(updates.status)) {
      throw badRequest("Invalid status");
    }
    if (
      updates.name !== undefined &&
      (!updates.name || updates.name.length > 50)
    ) {
      throw badRequest("Name must be between 1 and 50 characters");
    }
    if (updates.email !== undefined && !EMAIL_RE.test(updates.email)) {
      throw badRequest("Please provide a valid email");
    }
    if (updates.phone !== undefined && !updates.phone) {
      throw badRequest("Please provide a phone number");
    }
    if (input.password) {
      if (typeof input.password !== "string" || input.password.length < 6) {
        throw badRequest("Password must be at least 6 characters");
      }
      updates.password = await bcrypt.hash(input.password, 10);
    }
    const email = updates.email;
    if (email && email !== user.email) {
      const existing = await findUserByEmail(email, {
        database: this.database,
      });
      if (existing) throw badRequest("User already exists with this email");
    }
    validateUser(
      { ...user, ...updates },
      { requirePassword: false, validatePassword: false },
    );
    const updated = await this.updateUserRow(user._id, updates);
    return { success: true, user: updated };
  }

  async delete(id) {
    const user = await findUserById(id, { database: this.database });
    if (!user)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    if (user.role === "super_admin") {
      throw new ForbiddenException({
        success: false,
        message: "Super admin cannot be deleted",
      });
    }
    await this.database.delete(userEntries).where(eq(userEntries.id, user._id));
    return { success: true, message: "User deleted successfully" };
  }

  async getSetupStatus() {
    const [row] = await this.database
      .select({ total: count() })
      .from(userEntries)
      .where(eq(userEntries.role, "super_admin"));
    const teamAdmin = await teamMemberExists({ role: "super_admin" });
    return {
      success: true,
      setupRequired: Number(row?.total ?? 0) === 0 && !teamAdmin,
    };
  }

  async runSetup(input = {}) {
    const name = String(input.name || "").trim();
    const email = String(input.email || "")
      .trim()
      .toLowerCase();
    const phone = String(input.phone || "").trim();
    const password = input.password;
    const minimumPassword = Number(process.env.SETUP_MIN_PASSWORD) || 8;
    const digits = phone.replace(/\D/g, "");
    if (!name) throw badRequest("Please provide your name");
    if (name.length > 50)
      throw badRequest("Name cannot be more than 50 characters");
    if (!EMAIL_RE.test(email)) throw badRequest("Please provide a valid email");
    if (digits.length < 7)
      throw badRequest("Please provide a valid phone number");
    if (typeof password !== "string" || password.length < minimumPassword) {
      throw badRequest(
        `Password must be at least ${minimumPassword} characters`,
      );
    }

    const result = await this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(71420321)`);
      const [existingAdmin] = await transaction
        .select({ id: userEntries.id })
        .from(userEntries)
        .where(eq(userEntries.role, "super_admin"))
        .limit(1);
      if (existingAdmin || (await teamMemberExists({ role: "super_admin" }))) {
        throw new ConflictException({
          success: false,
          message:
            "Setup already completed. Sign in from the admin panel instead.",
        });
      }
      const [existing] = await transaction
        .select({ id: userEntries.id })
        .from(userEntries)
        .where(eq(userEntries.email, email))
        .limit(1);
      if (existing) {
        throw new ConflictException({
          success: false,
          message: "An account with this email already exists",
        });
      }
      const now = new Date();
      const [row] = await transaction
        .insert(userEntries)
        .values({
          id: crypto.randomBytes(12).toString("hex"),
          name,
          email,
          phone,
          password: await bcrypt.hash(password, 10),
          address: defaultAddress(),
          addresses: [],
          role: "super_admin",
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return row;
    });
    const token = makeToken(result.id);
    return {
      statusCode: 201,
      body: {
        success: true,
        token,
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
          phone: result.phone,
          address: result.address,
          isTeam: false,
          active: true,
        },
      },
    };
  }

  async requireUser(id) {
    const user = await findUserById(id, { database: this.database });
    if (!user)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    return user;
  }

  async updateUserRow(id, values) {
    const updates = Object.fromEntries(
      Object.entries(values).filter(([key]) => USER_FIELDS.includes(key)),
    );
    updates.updatedAt = new Date();
    let row;
    try {
      [row] = await this.database
        .update(userEntries)
        .set(updates)
        .where(eq(userEntries.id, id))
        .returning();
    } catch (error) {
      if (error.code === "23505") {
        throw badRequest("User already exists with this email");
      }
      throw error;
    }
    if (!row)
      throw new NotFoundException({
        success: false,
        message: "User not found",
      });
    return serializeUser(row);
  }

  async registerFailedUserLogin(user) {
    await this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(userEntries)
        .where(eq(userEntries.id, user._id))
        .for("update")
        .limit(1);
      if (!row) return;
      const attempts = Number(row.loginAttempts || 0) + 1;
      await transaction
        .update(userEntries)
        .set({
          loginAttempts: attempts >= MAX_LOGIN_ATTEMPTS ? 0 : attempts,
          lockUntil:
            attempts >= MAX_LOGIN_ATTEMPTS
              ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
              : row.lockUntil,
          updatedAt: new Date(),
        })
        .where(eq(userEntries.id, user._id));
    });
  }

  async clearUserLoginAttempts(user) {
    if (!user.loginAttempts && !user.lockUntil) return;
    await this.updateUserRow(user._id, { loginAttempts: 0, lockUntil: null });
  }

  async startUserTwoFactor(request, user, smsSetting) {
    const { expiry, otp } = newChallenge(smsSetting);
    await this.updateUserRow(user._id, {
      twoFactorOtp: hashOtp(otp),
      twoFactorOtpExpire: new Date(Date.now() + expiry * 1000),
      twoFactorAttempts: 0,
    });
    const result = await sendLoginOtp({
      phone: user.phone,
      otp,
      expirySeconds: expiry,
    });
    if (result.skipped || !result.success) {
      console.error(
        "Login 2FA SMS failed:",
        result.reason || result.log?.providerMessage,
      );
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException({
          success: false,
          message:
            "Could not send the verification code. SMS service is not configured or is unavailable.",
        });
      }
      console.warn(
        `[DEV 2FA] Verification code for ${user.phone || user.email}: ${otp}`,
      );
    }
    return {
      success: false,
      twoFactorRequired: true,
      pendingToken: jwt.sign(
        { id: String(user._id), purpose: "2fa-login", source: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      ),
      expiresIn: expiry,
      message: "Enter the code sent to your phone",
    };
  }

  async startTeamTwoFactor(request, member, smsSetting) {
    const { expiry, otp } = newChallenge(smsSetting);
    await updateTeamMember(member._id, {
      twoFactorOtp: hashOtp(otp),
      twoFactorOtpExpire: new Date(Date.now() + expiry * 1000),
      twoFactorAttempts: 0,
    });
    const result = await sendLoginOtp({
      phone: member.phone,
      otp,
      expirySeconds: expiry,
    });
    if (result.skipped || !result.success) {
      console.error(
        "Login 2FA SMS failed:",
        result.reason || result.log?.providerMessage,
      );
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException({
          success: false,
          message:
            "Could not send the verification code. SMS service is not configured or is unavailable.",
        });
      }
      console.warn(
        `[DEV 2FA] Verification code for ${member.phone || member.email}: ${otp}`,
      );
    }
    return {
      success: false,
      twoFactorRequired: true,
      pendingToken: jwt.sign(
        { id: member._id.toString(), purpose: "2fa-login", source: "team" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      ),
      expiresIn: expiry,
      message: "Enter the code sent to your phone",
    };
  }

  async recordSession(userId, request) {
    try {
      const ua = parseUserAgent(request.headers["user-agent"] || "");
      const now = new Date();
      await this.database.transaction(async (transaction) => {
        await transaction
          .update(sessionEntries)
          .set({ isCurrent: false, updatedAt: now })
          .where(eq(sessionEntries.user, String(userId)));
        await transaction.insert(sessionEntries).values({
          id: crypto.randomBytes(12).toString("hex"),
          user: String(userId),
          device: ua.device,
          browser: ua.browser,
          os: ua.os,
          ip: request.ip || request.connection?.remoteAddress || "",
          lastActive: now,
          isCurrent: true,
          createdAt: now,
          updatedAt: now,
        });
      });
    } catch (error) {
      console.error("Unable to record login session:", error);
    }
  }

  async registerFailedTeamLogin(member) {
    const attempts = (member.loginAttempts || 0) + 1;
    await updateTeamMember(member._id, {
      loginAttempts: attempts >= MAX_LOGIN_ATTEMPTS ? 0 : attempts,
      lockUntil:
        attempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : member.lockUntil,
    });
  }

  async clearTeamLoginAttempts(member) {
    if (!member.loginAttempts && !member.lockUntil) return;
    await updateTeamMember(member._id, {
      loginAttempts: 0,
      lockUntil: null,
    });
  }

  async clearTwoFactor(account, isTeamAccount) {
    await this.saveAccountFields(account, isTeamAccount, {
      twoFactorOtp: null,
      twoFactorOtpExpire: null,
      twoFactorAttempts: 0,
    });
  }

  async saveAccountFields(account, isTeamAccount, fields) {
    if (isTeamAccount) {
      await updateTeamMember(account._id, fields);
      return;
    }
    await this.updateUserRow(account._id, fields);
  }
}

function normalizeUserInput(input) {
  return {
    name: typeof input.name === "string" ? input.name.trim() : input.name,
    email:
      typeof input.email === "string"
        ? input.email.trim().toLowerCase()
        : input.email,
    password: input.password,
    phone: typeof input.phone === "string" ? input.phone.trim() : input.phone,
    address:
      input.address &&
      typeof input.address === "object" &&
      !Array.isArray(input.address)
        ? input.address
        : undefined,
  };
}

function validateUser(
  user,
  { requirePassword = true, validatePassword = true } = {},
) {
  if (typeof user.name !== "string" || !user.name.trim()) {
    throw badRequest("Please provide a name");
  }
  if (user.name.length > 50)
    throw badRequest("Name cannot be more than 50 characters");
  if (typeof user.email !== "string" || !EMAIL_RE.test(user.email)) {
    throw badRequest("Please provide a valid email");
  }
  if (typeof user.phone !== "string" || !user.phone.trim()) {
    throw badRequest("Please provide a phone number");
  }
  if (requirePassword && !user.password)
    throw badRequest("Please provide a password");
  if (
    validatePassword &&
    user.password !== undefined &&
    (typeof user.password !== "string" || user.password.length < 6)
  ) {
    throw badRequest("Password must be at least 6 characters");
  }
}

function validateRoleAndStatus(role, status) {
  if (!ROLES.has(role)) throw badRequest("Invalid role");
  if (!STATUSES.has(status)) throw badRequest("Invalid status");
}

function publicUser(user, isTeam = false) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: isTeam ? "" : user.phone,
    address: isTeam ? {} : user.address,
    isTeam,
    active: isTeam ? user.active : undefined,
  };
}

function makeToken(id) {
  return jwt.sign({ id: String(id) }, process.env.JWT_SECRET, {
    expiresIn: "3h",
  });
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function newOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function newChallenge(setting) {
  const otp = newOtp();
  return {
    otp,
    expiry: Math.max(15, Number(setting.otpExpirySeconds) || 60),
  };
}

function isLocked(account) {
  return Boolean(account.lockUntil && new Date(account.lockUntil) > new Date());
}

function lockMinutesRemaining(account) {
  return Math.max(
    1,
    Math.ceil((new Date(account.lockUntil).getTime() - Date.now()) / 60000),
  );
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function unauthorized(message) {
  return new UnauthorizedException({ success: false, message });
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

class TooManyAttemptsException extends HttpException {
  constructor(message) {
    super({ success: false, message }, 429);
  }
}

Injectable()(UsersService);
Inject(DATABASE)(UsersService, undefined, 0);

export { UsersService, publicUser, validateUser };
