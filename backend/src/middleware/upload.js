import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

// ---- Configure Cloudinary ----
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createCloudinaryStorage = ({ folder, name, width, height }) => ({
  _handleFile(_req, file, callback) {
    let settled = false;
    const complete = (error, info) => {
      if (settled) return;
      settled = true;
      callback(error, info);
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [{ width, height, crop: "limit" }],
        public_id: `${name}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      },
      (error, result) => {
        if (error) return complete(error);
        if (!result) {
          return complete(new Error("Cloudinary upload returned no result"));
        }

        complete(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
        });
      },
    );

    uploadStream.once("error", complete);
    file.stream.once("error", (error) => uploadStream.destroy(error));
    file.stream.pipe(uploadStream);
  },
  _removeFile(_req, file, callback) {
    cloudinary.uploader.destroy(
      file.filename,
      { resource_type: "image" },
      (error) => callback(error),
    );
  },
});

// ---- Configure Multer Storage (Cloudinary) ----
const productStorage = createCloudinaryStorage({
  folder: "apple-it-zone/products",
  name: "product",
  width: 800,
  height: 800,
});

const categoryStorage = createCloudinaryStorage({
  folder: "apple-it-zone/categories",
  name: "category",
  width: 600,
  height: 600,
});

const sliderStorage = createCloudinaryStorage({
  folder: "apple-it-zone/sliders",
  name: "slider",
  width: 1600,
  height: 600,
});

const offerStorage = createCloudinaryStorage({
  folder: "apple-it-zone/offers",
  name: "offer",
  width: 1000,
  height: 1000,
});

const popupOfferStorage = createCloudinaryStorage({
  folder: "apple-it-zone/popup-offers",
  name: "popup-offer",
  width: 900,
  height: 900,
});

// ---- Multer instances with file filter ----
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, GIF, and WebP images are allowed!"), false);
  }
};

const logoStorage = createCloudinaryStorage({
  folder: "apple-it-zone/logo",
  name: "logo",
  width: 600,
  height: 200,
});

const physicalStoreStorage = createCloudinaryStorage({
  folder: "apple-it-zone/physical-stores",
  name: "physical-store-banner",
  width: 2000,
  height: 800,
});

export const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const categoryUpload = multer({
  storage: categoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const sliderUpload = multer({
  storage: sliderStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const offerUpload = multer({
  storage: offerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const popupOfferUpload = multer({
  storage: popupOfferStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const physicalStoreUpload = multer({
  storage: physicalStoreStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// ---- Middleware exports ----
export const uploadSingle = productUpload.single("image");
export const uploadMultiple = productUpload.array("images", 10);
export const uploadCategoryFields = categoryUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);
export const uploadSliderImage = sliderUpload.single("image");
export const uploadOfferImage = offerUpload.single("image");
export const uploadPopupOfferImage = popupOfferUpload.single("image");
export const uploadPhysicalStoreBanner = physicalStoreUpload.single("image");
export const uploadStoreLogo = logoUpload.single("image");
export { cloudinary };
