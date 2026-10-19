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
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { QuestionsService } from "./questions.service.js";

class QuestionsController {
  constructor(questionsService) {
    this.questionsService = questionsService;
  }

  async findAll(query) {
    return this.questionsService.findAll(query);
  }

  async getStats() {
    return this.questionsService.getStats();
  }

  async findAnsweredForProduct(productId) {
    return this.questionsService.findAnsweredForProduct(productId);
  }

  async ask(request, body) {
    return this.questionsService.ask(
      body ?? {},
      request.user?._id ?? request.user?.id,
    );
  }

  async update(id, request, body) {
    return this.questionsService.update(
      id,
      body ?? {},
      request.user?._id ?? request.user?.id,
    );
  }

  async delete(id) {
    await this.questionsService.delete(id);
    return { success: true, message: "Question deleted successfully" };
  }
}

Controller("questions")(QuestionsController);
Inject(QuestionsService)(QuestionsController, undefined, 0);

Get()(
  QuestionsController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "findAll"),
);
UseGuards(LegacyAdminGuard)(
  QuestionsController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "findAll"),
);
Query()(QuestionsController.prototype, "findAll", 0);

Get("stats")(
  QuestionsController.prototype,
  "getStats",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "getStats"),
);
UseGuards(LegacyAdminGuard)(
  QuestionsController.prototype,
  "getStats",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "getStats"),
);

Get("product/:productId")(
  QuestionsController.prototype,
  "findAnsweredForProduct",
  Object.getOwnPropertyDescriptor(
    QuestionsController.prototype,
    "findAnsweredForProduct",
  ),
);
Param("productId")(QuestionsController.prototype, "findAnsweredForProduct", 0);

Post()(
  QuestionsController.prototype,
  "ask",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "ask"),
);
UseGuards(CartAuthGuard)(
  QuestionsController.prototype,
  "ask",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "ask"),
);
Req()(QuestionsController.prototype, "ask", 0);
Body()(QuestionsController.prototype, "ask", 1);

Patch(":questionId")(
  QuestionsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "update"),
);
HttpCode(200)(
  QuestionsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  QuestionsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "update"),
);
Param("questionId")(QuestionsController.prototype, "update", 0);
Req()(QuestionsController.prototype, "update", 1);
Body()(QuestionsController.prototype, "update", 2);

Delete(":questionId")(
  QuestionsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "delete"),
);
HttpCode(200)(
  QuestionsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  QuestionsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(QuestionsController.prototype, "delete"),
);
Param("questionId")(QuestionsController.prototype, "delete", 0);

export { QuestionsController };
