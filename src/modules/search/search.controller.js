const searchService = require("./search.service");
const { success } = require("../../utils/apiResponse");

const searchCatalog = async (req, res, next) => {
  try {
    // Pass the parsed, Zod-validated query object to the service layer
    const result = await searchService.executeSearch(req.query);

    return success(res, {
      data: result,
      message: "Catalog items matched and filtered successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchCatalog,
};
