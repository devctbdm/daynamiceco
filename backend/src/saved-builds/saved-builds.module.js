import { Module } from "@nestjs/common";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { SavedBuildsController } from "./saved-builds.controller.js";
import { SavedBuildsService } from "./saved-builds.service.js";

class SavedBuildsModule {}

Module({
  controllers: [SavedBuildsController],
  providers: [SavedBuildsService, CartAuthGuard],
})(SavedBuildsModule);

export default SavedBuildsModule;
