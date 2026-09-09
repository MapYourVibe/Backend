const organizerService = require("./organizer.service");
const { success } = require("../../utils/apiResponse");

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await organizerService.getProfileByUserId(req.user.id);
    return success(res, { data: profile, message: "Organizer profile records retrieved." });
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await organizerService.updateProfile(req.user.id, req.body);
    return success(res, {
      data: updated,
      message: "Organizer corporate settings updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const submitKyc = async (req, res, next) => {
  try {
    const updated = await organizerService.submitKycDetails(req.user.id, req.body);
    return success(res, {
      data: updated,
      message: "Corporate KYC submitted for administrative review.",
    });
  } catch (error) {
    next(error);
  }
};

const adminVerify = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const result = await organizerService.adminVerifyProfile(organizerId, req.body);
    return success(res, {
      data: result,
      message: "Organizer system operational permissions updated.",
    });
  } catch (error) {
    next(error);
  }
};

const listHostedOrganizers = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await organizerService.listHostedOrganizers({ search, page, limit });
    return success(res, {
      data: result,
      message: "Hosted organizers catalog compiled.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  submitKyc,
  adminVerify,
  listHostedOrganizers,
};
