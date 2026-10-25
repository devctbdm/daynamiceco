import { Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CartAuthGuard, CartSellingGuard } from "../cart/cart-auth.guard.js";
import {
  cancelPayment,
  initiatePayment,
  ipnListener,
  queryTransaction,
  validatePayment,
} from "../controllers/paymentController.js";

class PaymentsController {
  async initiate(request, response) {
    return initiatePayment(request, response);
  }

  async validateGet(request, response) {
    return validatePayment(request, response);
  }

  async validatePost(request, response) {
    return validatePayment(request, response);
  }

  async ipn(request, response) {
    return ipnListener(request, response);
  }

  async queryTransaction(request, response) {
    return queryTransaction(request, response);
  }

  async cancelGet(request, response) {
    return cancelPayment(request, response);
  }

  async cancelPost(request, response) {
    return cancelPayment(request, response);
  }
}

Controller("payment")(PaymentsController);

function route(method, path, guards = []) {
  const descriptor = Object.getOwnPropertyDescriptor(
    PaymentsController.prototype,
    method,
  );
  const decorator = path.method === "GET" ? Get(path.path) : Post(path.path);
  decorator(PaymentsController.prototype, method, descriptor);
  if (guards.length) {
    UseGuards(...guards)(PaymentsController.prototype, method, descriptor);
  }
  Req()(PaymentsController.prototype, method, 0);
  Res()(PaymentsController.prototype, method, 1);
}

route("initiate", { method: "POST", path: "initiate" }, [
  CartAuthGuard,
  CartSellingGuard,
]);
route("validateGet", { method: "GET", path: "validate" });
route("validatePost", { method: "POST", path: "validate" });
route("ipn", { method: "POST", path: "ipn" });
route("queryTransaction", { method: "GET", path: "transaction/:tran_id" }, [
  LegacyAdminGuard,
]);
route("cancelGet", { method: "GET", path: "cancel" });
route("cancelPost", { method: "POST", path: "cancel" });

export { PaymentsController };
