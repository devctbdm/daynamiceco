import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Post,
  Get,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { SavedBuildsService } from "./saved-builds.service.js";

class SavedBuildsController {
  constructor(savedBuildsService) {
    this.savedBuildsService = savedBuildsService;
  }

  async getMyBuilds(request) {
    return {
      success: true,
      builds: await this.savedBuildsService.getMyBuilds(userId(request)),
    };
  }

  async saveBuild(request, body) {
    return {
      success: true,
      build: await this.savedBuildsService.saveBuild(userId(request), body),
    };
  }

  async deleteBuild(request, id) {
    await this.savedBuildsService.deleteBuild(userId(request), id);
    return { success: true, message: "Build deleted" };
  }
}

function userId(request) {
  return String(request.user?._id ?? request.user?.id);
}

Controller("pc-builder")(SavedBuildsController);
UseGuards(CartAuthGuard)(SavedBuildsController);
Inject(SavedBuildsService)(SavedBuildsController, undefined, 0);

Get("builds")(
  SavedBuildsController.prototype,
  "getMyBuilds",
  Object.getOwnPropertyDescriptor(
    SavedBuildsController.prototype,
    "getMyBuilds",
  ),
);
Req()(SavedBuildsController.prototype, "getMyBuilds", 0);

Post("builds")(
  SavedBuildsController.prototype,
  "saveBuild",
  Object.getOwnPropertyDescriptor(SavedBuildsController.prototype, "saveBuild"),
);
HttpCode(201)(
  SavedBuildsController.prototype,
  "saveBuild",
  Object.getOwnPropertyDescriptor(SavedBuildsController.prototype, "saveBuild"),
);
Req()(SavedBuildsController.prototype, "saveBuild", 0);
Body()(SavedBuildsController.prototype, "saveBuild", 1);

Delete("builds/:id")(
  SavedBuildsController.prototype,
  "deleteBuild",
  Object.getOwnPropertyDescriptor(
    SavedBuildsController.prototype,
    "deleteBuild",
  ),
);
Req()(SavedBuildsController.prototype, "deleteBuild", 0);
Param("id")(SavedBuildsController.prototype, "deleteBuild", 1);

export { SavedBuildsController };
