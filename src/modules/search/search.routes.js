const express = require("express");
const router = express.Router();

const searchController = require("./search.controller");
const validate = require("../../middlewares/validate.middleware");
const { searchEventsSchema } = require("./search.validation");

/**
 * GET /api/search
 * High-performance discovery entry point for public listings query lookups.
 */
router.get("/", validate(searchEventsSchema), searchController.searchCatalog);

module.exports = router;
