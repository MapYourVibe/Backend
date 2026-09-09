const uploadService = require("./upload.service");
const { success } = require("../../utils/apiResponse");

const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    const url = await uploadService.uploadImage(req.file.path);
    return success(res, { data: { url }, message: "Image uploaded successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleUpload };
