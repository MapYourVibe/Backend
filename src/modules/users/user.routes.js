const express = require("express");
const router = express.Router();

const userController = require("./user.controller");
const requireAuth = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");

const { updateProfileSchema, changePasswordSchema } = require("./user.validation");

// Apply authentication shield across every user operational route path
router.use(requireAuth);

router.get("/profile", userController.getProfile);
router.patch("/profile", validate(updateProfileSchema), userController.updateProfile);
router.put("/password", validate(changePasswordSchema), userController.changePassword);
router.delete("/account", userController.deleteAccount);

// Extended Operational Metric Trackers
router.get("/statistics", userController.getStatistics);
router.get("/bookings", userController.getMyBookings);
router.get("/tickets", userController.getMyTickets);

module.exports = router;
