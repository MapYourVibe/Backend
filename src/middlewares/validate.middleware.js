/**
 * Wraps a Zod schema into an Express validation middleware layer.
 * Automatically adapts to validate either nested request spaces (body, query, params)
 * or flat request body structures natively.
 */
function validate(schema) {
  return (req, res, next) => {
    // Detect if the Zod schema explicitly maps standard Express request segments
    const hasRequestSegments =
      schema.shape &&
      ("body" in schema.shape || "query" in schema.shape || "params" in schema.shape);

    const validationTarget = hasRequestSegments
      ? { body: req.body, query: req.query, params: req.params }
      : req.body;

    const result = schema.safeParse(validationTarget);

    if (!result.success) {
      console.error("Validation failed for", req.method, req.path, ":", result.error.flatten().fieldErrors, "body:", JSON.stringify(req.body));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    // Safely reassign clean, parsed, and stripped data back to their respective Express targets
    if (hasRequestSegments) {
      if (result.data.body) req.body = result.data.body;
      if (result.data.query) req.query = result.data.query;
      if (result.data.params) req.params = result.data.params;
    } else {
      req.body = result.data;
    }

    next();
  };
}

module.exports = validate;
