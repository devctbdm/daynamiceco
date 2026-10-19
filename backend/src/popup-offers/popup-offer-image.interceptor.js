import { BadRequestException, Injectable } from "@nestjs/common";
import { uploadPopupOfferImage } from "../middleware/upload.js";

class PopupOfferImageInterceptor {
  async intercept(context, next) {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    try {
      await new Promise((resolve, reject) => {
        uploadPopupOfferImage(request, response, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      if (
        error?.code?.startsWith("LIMIT_") ||
        error?.message === "Only JPG, PNG, GIF, and WebP images are allowed!"
      ) {
        throw new BadRequestException({
          success: false,
          message: error.message,
        });
      }
      throw error;
    }

    return next.handle();
  }
}

Injectable()(PopupOfferImageInterceptor);

export { PopupOfferImageInterceptor };
