const venueService = require("./venue.service");
const { success } = require("../../utils/apiResponse");

const createVenue = async (req, res, next) => {
  try {
    const venue = await venueService.createVenue(req.body, req.user.id);
    return success(res, {
      data: venue,
      message: "Spatial venue configuration created.",
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

const getAllVenues = async (req, res, next) => {
  try {
    const { city, seatingType } = req.query;
    const venues = await venueService.getVenues({ city, seatingType });
    return success(res, { data: venues, message: "Venues retrieved successfully." });
  } catch (error) {
    next(error);
  }
};

const getVenueById = async (req, res, next) => {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    return success(res, { data: venue, message: "Venue configuration records matched." });
  } catch (error) {
    next(error);
  }
};

const updateVenue = async (req, res, next) => {
  try {
    const updated = await venueService.updateVenue(req.params.id, req.body, req.user);
    return success(res, { data: updated, message: "Physical venue updates pushed successfully." });
  } catch (error) {
    next(error);
  }
};

const deleteVenue = async (req, res, next) => {
  try {
    await venueService.deleteVenue(req.params.id);
    return success(res, {
      message: "Physical venue removed from available resource mapping cleanly.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
};
