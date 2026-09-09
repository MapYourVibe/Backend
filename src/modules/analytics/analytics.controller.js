const analyticsService = require("./analytics.service");
const { success } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");

const getPlatformRevenue = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await analyticsService.getGlobalRevenueAnalytics({ startDate, endDate });
    return success(res, {
      data: report,
      message: "Global ecosystem revenue analytics reports calculated.",
    });
  } catch (error) {
    next(error);
  }
};

const getOrganizerPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate, listingId } = req.query;
    const report = await analyticsService.getOrganizerPerformanceAnalytics(req.user.id, {
      startDate,
      endDate,
      listingId,
    });
    return success(res, {
      data: report,
      message: "Organizer performance metrics processed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const getPopularListings = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const list = await analyticsService.getPopularEventsCatalog(limit);
    return success(res, { data: list, message: "Trending popular events catalog extracted." });
  } catch (error) {
    next(error);
  }
};

const getPlatformFinancials = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const overview = await analyticsService.getPlatformFinancialOverview({ startDate, endDate });
    return success(res, {
      data: overview,
      message: "Platform financial overview aggregated.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformFinancials,
  getPlatformRevenue,
  getOrganizerPerformance,
  getPopularListings,
};
