const dashboardService = require("./dashboard.service");
const { success } = require("../../utils/apiResponse");

const getUserPanel = async (req, res, next) => {
  try {
    const data = await dashboardService.fetchUserDashboard(req.user.id);
    return success(res, { data, message: "User analytics context compiled." });
  } catch (error) {
    next(error);
  }
};

const getOrganizerPanel = async (req, res, next) => {
  try {
    const data = await dashboardService.fetchOrganizerDashboard(req.user.id);
    return success(res, { data, message: "Organizer performance overview loaded." });
  } catch (error) {
    next(error);
  }
};

const getAdminPanel = async (req, res, next) => {
  try {
    const data = await dashboardService.fetchAdminDashboard();
    return success(res, {
      data,
      message: "Global platform administration stats aggregated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const getOrganizerEvents = async (req, res, next) => {
  try {
    const data = await dashboardService.fetchOrganizerEvents(req.user.id);
    return success(res, { data });
  } catch (error) {
    next(error);
  }
};

const getOrganizerEventDetail = async (req, res, next) => {
  try {
    const data = await dashboardService.fetchOrganizerEventDetail(req.user.id, req.params.eventId);
    return success(res, { data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserPanel,
  getOrganizerPanel,
  getAdminPanel,
  getOrganizerEvents,
  getOrganizerEventDetail,
};
