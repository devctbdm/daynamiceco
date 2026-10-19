import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { QuestionsController } from "./questions.controller.js";
import { QuestionsService } from "./questions.service.js";

class QuestionsModule {}

Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, LegacyAdminGuard, CartAuthGuard],
})(QuestionsModule);

export default QuestionsModule;
