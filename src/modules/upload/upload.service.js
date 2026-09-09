const cloudinary = require("../../config/cloudinary");
const AppError = require("../../utils/AppError");

const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "mapyourvibe",
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    throw new AppError("Image upload failed. Please try again.", 500);
  }
};

module.exports = { uploadImage };
