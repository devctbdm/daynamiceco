import { BadRequestException, Injectable } from "@nestjs/common";
import { productUpload } from "../middleware/upload.js";

class ProductImagesInterceptor {
  async intercept(context, next) {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    try {
      await new Promise((resolve, reject) => {
        productUpload.any()(request, response, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      if (error?.code?.startsWith("LIMIT_") || error?.name === "MulterError") {
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

Injectable()(ProductImagesInterceptor);

export { ProductImagesInterceptor };
