const adminService = require("./admin.service");
const { success } = require("../../utils/apiResponse");

const setSystemConfig = async (req, res, next) => {
  try {
    const updatedConfig = await adminService.updateSystemGlobalParameters(req.body);
    return success(res, {
      data: updatedConfig,
      message: "Global platform configuration metrics modified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const user = await adminService.modifyUserAccountStatus(
      req.params.userId,
      req.body,
      req.user.id,
    );
    return success(res, {
      data: user,
      message: "Ecosystem account status parameter altered successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const moderateListing = async (req, res, next) => {
  try {
    const listing = await adminService.overrideListingState(
      req.params.listingId,
      req.body,
      req.user.id,
    );
    return success(res, {
      data: listing,
      message: "Ecosystem marketplace listing status altered successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setSystemConfig,
  updateUserStatus,
  moderateListing,
};
