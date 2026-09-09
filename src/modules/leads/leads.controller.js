const leadService = require("./leads.service");
const { success } = require("../../utils/apiResponse");

async function createLead(req, res, next) {
  try {
    const lead = await leadService.createLead(req.body);
    return success(res, { data: lead, message: "Application received. We'll review it shortly.", statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

async function listLeads(req, res, next) {
  try {
    const leads = await leadService.listLeads();
    return success(res, { data: leads, message: "Lead applications retrieved." });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateLead(req, res, next) {
  try {
    const result = await leadService.adminUpdateLead(req.params.id, req.body, req.user.id);
    const msg = result.tempPassword
      ? `Organizer approved. Account created — share these credentials:\nEmail: ${result.user.email}\nPassword: ${result.tempPassword}`
      : "Lead status updated.";
    return success(res, { data: result, message: msg });
  } catch (err) {
    next(err);
  }
}

module.exports = { createLead, listLeads, adminUpdateLead };
