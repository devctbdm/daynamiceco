import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PermissionGroupsSuperAdminGuard } from "../permission-groups/super-admin.guard.js";
import { TeamMembersService } from "./team-members.service.js";

class TeamController {
  constructor(service) {
    this.service = service;
  }

  getAll() {
    return this.service.getTeamMembers();
  }

  async create(body) {
    return (await this.service.createTeamMember(body)).body;
  }

  update(id, body) {
    return this.service.updateTeamMember(id, body);
  }

  remove(id) {
    return this.service.deleteTeamMember(id);
  }

  stats() {
    return this.service.getStaffStats();
  }

  list(query) {
    return this.service.getStaff(query);
  }

  get(id) {
    return this.service.getStaffById(id);
  }

  async createStaff(body, request) {
    return (await this.service.createStaff(body, request)).body;
  }

  updateStaff(id, body, request) {
    return this.service.updateStaff(id, body, request);
  }

  status(id, request) {
    return this.service.toggleStaffStatus(id, request);
  }

  deleteStaff(id, request) {
    return this.service.deleteStaff(id, request);
  }
}

Controller("team")(TeamController);
Inject(TeamMembersService)(TeamController, undefined, 0);

const descriptor = (method) =>
  Object.getOwnPropertyDescriptor(TeamController.prototype, method);

for (const method of ["getAll", "create", "update", "remove"]) {
  UseGuards(LegacyAdminGuard)(
    TeamController.prototype,
    method,
    descriptor(method),
  );
}
Get()(TeamController.prototype, "getAll", descriptor("getAll"));
Post()(TeamController.prototype, "create", descriptor("create"));
HttpCode(201)(TeamController.prototype, "create", descriptor("create"));
Body()(TeamController.prototype, "create", 0);
Put(":id")(TeamController.prototype, "update", descriptor("update"));
Param("id")(TeamController.prototype, "update", 0);
Body()(TeamController.prototype, "update", 1);
Delete(":id")(TeamController.prototype, "remove", descriptor("remove"));
Param("id")(TeamController.prototype, "remove", 0);

class StaffController {
  constructor(service) {
    this.service = service;
  }

  stats() {
    return this.service.getStaffStats();
  }

  list(query) {
    return this.service.getStaff(query);
  }

  get(id) {
    return this.service.getStaffById(id);
  }

  async create(body, request) {
    return (await this.service.createStaff(body, request)).body;
  }

  update(id, body, request) {
    return this.service.updateStaff(id, body, request);
  }

  status(id, request) {
    return this.service.toggleStaffStatus(id, request);
  }

  remove(id, request) {
    return this.service.deleteStaff(id, request);
  }
}

const staffDescriptor = (method) =>
  Object.getOwnPropertyDescriptor(StaffController.prototype, method);

Controller("staff")(StaffController);
Inject(TeamMembersService)(StaffController, undefined, 0);

for (const method of [
  "stats",
  "list",
  "get",
  "create",
  "update",
  "status",
  "remove",
]) {
  UseGuards(PermissionGroupsSuperAdminGuard)(
    StaffController.prototype,
    method,
    staffDescriptor(method),
  );
}
Get("stats")(StaffController.prototype, "stats", staffDescriptor("stats"));
Get()(StaffController.prototype, "list", staffDescriptor("list"));
Query()(StaffController.prototype, "list", 0);
Get(":id")(StaffController.prototype, "get", staffDescriptor("get"));
Param("id")(StaffController.prototype, "get", 0);
Post()(StaffController.prototype, "create", staffDescriptor("create"));
HttpCode(201)(StaffController.prototype, "create", staffDescriptor("create"));
Body()(StaffController.prototype, "create", 0);
Req()(StaffController.prototype, "create", 1);
Put(":id")(StaffController.prototype, "update", staffDescriptor("update"));
HttpCode(200)(StaffController.prototype, "update", staffDescriptor("update"));
Param("id")(StaffController.prototype, "update", 0);
Body()(StaffController.prototype, "update", 1);
Req()(StaffController.prototype, "update", 2);
Patch(":id/status")(
  StaffController.prototype,
  "status",
  staffDescriptor("status"),
);
Param("id")(StaffController.prototype, "status", 0);
Req()(StaffController.prototype, "status", 1);
Delete(":id")(StaffController.prototype, "remove", staffDescriptor("remove"));
HttpCode(200)(StaffController.prototype, "remove", staffDescriptor("remove"));
Param("id")(StaffController.prototype, "remove", 0);
Req()(StaffController.prototype, "remove", 1);

export { StaffController, TeamController };
