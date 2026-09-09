const userService = require("./user.service");
const { success } = require("../../utils/apiResponse");

const getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    return success(res, { data: profile, message: "User profile loaded." });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user.id, req.body);
    return success(res, { data: updated, message: "Profile updated successfully." });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    await userService.changePassword(req.user.id, req.body);
    return success(res, { message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    await userService.deleteAccount(req.user.id);
    res.clearCookie("token"); // Terminate session cookie immediately upon hard destruction
    return success(res, { message: "Account deleted successfully." });
  } catch (error) {
    next(error);
  }
};

const getStatistics = async (req, res, next) => {
  try {
    const stats = await userService.getUserStatistics(req.user.id);
    return success(res, { data: stats, message: "User usage history calculated." });
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await userService.getBookingsHistory(req.user.id);
    return success(res, { data: bookings, message: "Booking transactions loaded." });
  } catch (error) {
    next(error);
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await userService.getActiveTickets(req.user.id);
    return success(res, { data: tickets, message: "Active entrance tickets loaded." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getStatistics,
  getMyBookings,
  getMyTickets,
};
