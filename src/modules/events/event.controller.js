const eventService = require("./event.service");
const { success } = require("../../utils/apiResponse");

const createEvent = async (req, res, next) => {
  try {
    const listing = await eventService.createEventListing(req.body, req.user.id);
    return success(res, {
      data: listing,
      message: "Event listing initialized successfully as a draft.",
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

const listEvents = async (req, res, next) => {
  try {
    const { city, category, type, search, status, scope } = req.query;
    const listings = await eventService.queryEvents({ city, category, type, search, status, scope });
    return success(res, { data: listings, message: "Catalog listings compiled successfully." });
  } catch (error) {
    next(error);
  }
};

const getEventDetail = async (req, res, next) => {
  try {
    const listing = await eventService.getEventById(req.params.id);
    return success(res, { data: listing, message: "Listing details matched cleanly." });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const updated = await eventService.updateEventListing(req.params.id, req.body, req.user.id);
    return success(res, {
      data: updated,
      message: "Listing structural fields updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const adminReview = async (req, res, next) => {
  try {
    const result = await eventService.adminReviewListing(req.params.id, req.body);
    return success(res, {
      data: result,
      message: "Listing compliance evaluation submitted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const markSoldOut = async (req, res, next) => {
  try {
    const result = await eventService.markEventSoldOut(req.params.id, req.user.id);
    return success(res, { data: result, message: "Event marked as sold out." });
  } catch (error) {
    next(error);
  }
};

const adminEventDetail = async (req, res, next) => {
  try {
    const detail = await eventService.getAdminEventDetail(req.params.id);
    return success(res, { data: detail, message: "Admin event detail compiled." });
  } catch (error) {
    next(error);
  }
};

const toggleFeatured = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await eventService.toggleListingFeatured(id, req.body, req.user.id);
    return success(res, { data: result, message: "Listing featured status updated." });
  } catch (error) {
    next(error);
  }
};

const togglePremium = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await eventService.toggleListingPremium(id, req.body, req.user.id);
    return success(res, { data: result, message: "Listing premium status updated." });
  } catch (error) {
    next(error);
  }
};

const updatePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await eventService.updateEventPosition(id, req.body, req.user.id);
    return success(res, { data: result, message: "Listing position updated." });
  } catch (error) {
    next(error);
  }
};

const suspendEvent = async (req, res, next) => {
  try {
    const result = await eventService.suspendListing(req.params.id, req.user.id);
    return success(res, { data: result, message: "Listing bookings suspended." });
  } catch (error) {
    next(error);
  }
};

const resumeEvent = async (req, res, next) => {
  try {
    const result = await eventService.resumeListing(req.params.id, req.user.id);
    return success(res, { data: result, message: "Listing bookings resumed." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  listEvents,
  getEventDetail,
  updateEvent,
  adminReview,
  markSoldOut,
  adminEventDetail,
  toggleFeatured,
  togglePremium,
  updatePosition,
  suspendEvent,
  resumeEvent,
};
