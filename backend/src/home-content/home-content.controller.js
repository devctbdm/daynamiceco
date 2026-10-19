import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { HomeContentService } from "./home-content.service.js";

class HomeContentController {
  constructor(homeContentService) {
    this.homeContentService = homeContentService;
  }

  async getContent() {
    return {
      success: true,
      homeContent: await this.homeContentService.getContent(),
    };
  }

  async upsertContent(request, body) {
    return {
      success: true,
      homeContent: await this.homeContentService.upsertContent(
        body,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async deleteContent() {
    await this.homeContentService.deleteContent();
    return { success: true, message: "Home page content deleted" };
  }
}

Controller("home-content")(HomeContentController);
Inject(HomeContentService)(HomeContentController, undefined, 0);

Get()(
  HomeContentController.prototype,
  "getContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "getContent",
  ),
);

Put()(
  HomeContentController.prototype,
  "upsertContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "upsertContent",
  ),
);
HttpCode(200)(
  HomeContentController.prototype,
  "upsertContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "upsertContent",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeContentController.prototype,
  "upsertContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "upsertContent",
  ),
);
Req()(HomeContentController.prototype, "upsertContent", 0);
Body()(HomeContentController.prototype, "upsertContent", 1);

Delete()(
  HomeContentController.prototype,
  "deleteContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "deleteContent",
  ),
);
HttpCode(200)(
  HomeContentController.prototype,
  "deleteContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "deleteContent",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeContentController.prototype,
  "deleteContent",
  Object.getOwnPropertyDescriptor(
    HomeContentController.prototype,
    "deleteContent",
  ),
);

export { HomeContentController };
