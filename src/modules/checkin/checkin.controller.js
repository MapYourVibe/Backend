const checkinService = require("./checkin.service");
const { success } = require("../../utils/apiResponse");

const scanTicket = async (req, res, next) => {
  try {
    // ✅ Forwarded the scanner's role down to allow proper admin bypass rules inside the service
    const result = await checkinService.scanTicket({
      ticketNumber: req.body.ticketNumber,
      scannedBy: req.user.id,
      scannerRole: req.user.role,
    });

    return success(res, {
      message: "Ticket checked in successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanTicket,
};
