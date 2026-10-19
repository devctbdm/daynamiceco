// backend/src/controllers/invoiceController.js

import { randomUUID } from "node:crypto";
import {
  createInvoice,
  deleteInvoiceById,
  findInvoiceById,
  findInvoiceByOrderId,
  findPreparedByAccounts,
  listInvoiceSummaries,
  listInvoices,
  updateInvoiceDocument,
} from "../invoices/invoices.repository.js";
import {
  findAllOrdersForReporting,
  findOrderById,
} from "../orders/orders.service.js";
import { findUserById } from "../users/users.repository.js";

const INVOICE_STATUSES = ["paid", "pending", "overdue", "cancelled"];

const formatAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  return [addr.street, addr.city, addr.state, addr.postcode, addr.country]
    .filter(Boolean)
    .join(", ");
};

const actorId = (user) => user?.id ?? user?._id;

// Resolves stored `preparedBy` ids to `{ _id, name }` like the old populate()
// call did. Ids that match no account are returned unchanged.
const populatePreparedBy = async (invoiceList) => {
  const ids = invoiceList
    .map((invoice) => invoice.preparedBy)
    .filter((value) => typeof value === "string" && value);
  const accounts = await findPreparedByAccounts(ids);

  return invoiceList.map((invoice) => {
    const key =
      typeof invoice.preparedBy === "string"
        ? invoice.preparedBy
        : invoice.preparedBy?._id;
    const account = key ? accounts.get(key) : undefined;
    return account ? { ...invoice, preparedBy: account } : invoice;
  });
};

export const buildInvoiceFromOrder = async (order) => {
  let user = null;
  if (order.user && typeof order.user !== "string") {
    user = order.user;
  } else if (order.user) {
    user = await findUserById(order.user);
  }

  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const issueDate = new Date(order.createdAt);
  const dueDate = new Date(order.createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  let status = "pending";
  const payStatus = order.payment?.status;
  if (payStatus === "paid") {
    status = "paid";
  } else if (
    payStatus === "failed" ||
    payStatus === "cancelled" ||
    order.orderStatus === "cancelled"
  ) {
    status = "cancelled";
  } else if (new Date() > dueDate) {
    status = "overdue";
  }

  return {
    order: order._id,
    invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
    customer: {
      name: user?.name || "Customer",
      email: user?.email || "",
      phone: user?.phone || "",
      address: formatAddress(user?.address || order.shippingAddress),
    },
    issueDate: issueDate.toISOString(),
    dueDate: dueDate.toISOString(),
    items: (order.items || []).map((i) => ({
      _id: randomUUID(),
      product: String(i.product ?? ""),
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
      amount: i.price * i.quantity,
      warranty: "",
      serialNumbers: [],
    })),
    subtotal,
    discount: 0,
    deliveryCharge: 0,
    extraCharge: 0,
    netPayable: order.totalAmount,
    status,
    note: order.note || "",
    salesPerson: "Apple-it-zone",
    preparedBy: null,
  };
};

// @desc    Get all invoices with pagination, search and status filter
// @route   GET /api/invoices
export const getAllInvoices = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );
    const status =
      req.query.status && req.query.status !== "all"
        ? String(req.query.status)
        : undefined;
    const search = req.query.search ? String(req.query.search).trim() : "";

    const { invoices, total } = await listInvoices({
      page,
      limit,
      status,
      search: search || undefined,
    });
    const populated = await populatePreparedBy(invoices);

    res.json({
      success: true,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      invoices: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
export const getInvoiceStats = async (_req, res) => {
  try {
    const summaries = await listInvoiceSummaries();
    const stats = summaries.reduce(
      (acc, inv) => {
        const netPayable = Number(inv.netPayable) || 0;
        if (inv.status === "paid") acc.totalPaid += netPayable;
        if (inv.status === "pending") acc.totalOutstanding += netPayable;
        if (inv.status === "overdue") acc.totalOverdue += netPayable;
        if (inv.status === "cancelled") acc.cancelledCount += 1;
        return acc;
      },
      { totalOutstanding: 0, totalPaid: 0, totalOverdue: 0, cancelledCount: 0 },
    );
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }
    const [populated] = await populatePreparedBy([invoice]);
    res.json({ success: true, invoice: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate invoice from an order (admin)
// @route   POST /api/invoices/order/:orderId
export const generateFromOrder = async (req, res) => {
  try {
    const existing = await findInvoiceByOrderId(req.params.orderId);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Invoice already exists for this order",
        invoice: existing,
      });
    }
    const order = await findOrderById(req.params.orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    const document = await buildInvoiceFromOrder(order);
    document.preparedBy = actorId(req.user) ?? null;
    const invoice = await createInvoice(document);
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create invoices for all orders missing one (admin)
// @route   POST /api/invoices/sync
export const syncInvoicesFromOrders = async (req, res) => {
  try {
    const orders = await findAllOrdersForReporting();
    let created = 0;
    for (const order of orders) {
      const existing = await findInvoiceByOrderId(order._id);
      if (existing) continue;
      const document = await buildInvoiceFromOrder(order);
      document.preparedBy = actorId(req.user) ?? null;
      await createInvoice(document);
      created += 1;
    }
    res.json({ success: true, created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update invoice fields (admin) - editable everything
// @route   PUT /api/invoices/:id
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    const {
      customer,
      items,
      issueDate,
      dueDate,
      status,
      discount,
      deliveryCharge,
      extraCharge,
      note,
      salesPerson,
    } = req.body;

    const updated = {
      ...invoice,
      customer: { ...invoice.customer },
      items: (invoice.items || []).map((item) => ({
        ...item,
        serialNumbers: Array.isArray(item.serialNumbers)
          ? [...item.serialNumbers]
          : [],
      })),
    };

    if (customer) {
      updated.customer = { ...updated.customer, ...customer };
    }
    if (issueDate) updated.issueDate = new Date(issueDate).toISOString();
    if (dueDate) updated.dueDate = new Date(dueDate).toISOString();
    if (status && INVOICE_STATUSES.includes(status)) updated.status = status;
    if (typeof discount === "number") updated.discount = discount;
    if (typeof deliveryCharge === "number")
      updated.deliveryCharge = deliveryCharge;
    if (typeof extraCharge === "number") updated.extraCharge = extraCharge;
    if (note !== undefined) updated.note = note;
    if (salesPerson !== undefined) updated.salesPerson = salesPerson;

    if (items && Array.isArray(items)) {
      updated.items = items.map((it) => {
        const previous = updated.items.find(
          (x) => String(x._id) === String(it._id),
        );
        return {
          _id: String(it._id ?? previous?._id ?? randomUUID()),
          product: String(it.product ?? previous?.product ?? ""),
          name: it.name ?? previous?.name ?? "",
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          amount: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
          warranty: it.warranty || "",
          serialNumbers: Array.isArray(it.serialNumbers)
            ? it.serialNumbers.filter(Boolean)
            : [],
        };
      });
    }

    updated.subtotal = updated.items.reduce((s, i) => s + i.amount, 0);
    updated.netPayable =
      updated.subtotal -
      updated.discount +
      updated.deliveryCharge +
      updated.extraCharge;
    updated.preparedBy = actorId(req.user) ?? updated.preparedBy ?? null;

    const saved = await updateInvoiceDocument(req.params.id, updated);
    const [populated] = await populatePreparedBy([saved]);
    res.json({ success: true, invoice: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete invoice (admin)
// @route   DELETE /api/invoices/:id
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }
    await deleteInvoiceById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
