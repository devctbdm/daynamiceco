import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PopupOfferImageInterceptor } from "./popup-offer-image.interceptor.js";
import { PopupOffersService } from "./popup-offers.service.js";

class PopupOffersController {
  constructor(popupOffersService) {
    this.popupOffersService = popupOffersService;
  }

  async get() {
    return {
      success: true,
      popupOffer: await this.popupOffersService.get(),
    };
  }

  async update(request, body) {
    return {
      success: true,
      popupOffer: await this.popupOffersService.update(
        body ?? {},
        request.file,
        request.user?._id ?? request.user?.id,
      ),
    };
  }
}

Controller("popup-offer")(PopupOffersController);
Inject(PopupOffersService)(PopupOffersController, undefined, 0);

Get()(
  PopupOffersController.prototype,
  "get",
  Object.getOwnPropertyDescriptor(PopupOffersController.prototype, "get"),
);

Put()(
  PopupOffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PopupOffersController.prototype, "update"),
);
HttpCode(200)(
  PopupOffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PopupOffersController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  PopupOffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PopupOffersController.prototype, "update"),
);
UseInterceptors(PopupOfferImageInterceptor)(
  PopupOffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PopupOffersController.prototype, "update"),
);
Req()(PopupOffersController.prototype, "update", 0);
Body()(PopupOffersController.prototype, "update", 1);

export { PopupOffersController };
