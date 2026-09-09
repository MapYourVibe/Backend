// src/utils/apiResponse.js
//
// Every successful response across every module goes through this, so the
// frontend can always rely on the same shape: { success, message, data }.

function success(res, { data = null, message = "Success", statusCode = 200 } = {}) {
  return res.status(statusCode).json({ success: true, message, data });
}

module.exports = { success };
