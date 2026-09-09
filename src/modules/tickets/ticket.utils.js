const crypto = require("crypto");
const { TICKET_NUMBER_PREFIX, TICKET_NUMBER_LENGTH } = require("./ticket.constants");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRandomString = (length) => {
  let result = "";
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }

  return result;
};

const generateTicketNumber = () => {
  return `${TICKET_NUMBER_PREFIX}-${generateRandomString(TICKET_NUMBER_LENGTH)}`;
};

// ✅ Fixed: Removed the pre-DB record 'ticketId' constraint and standardized naming conventions to use listingId
const generateQrPayload = ({ ticketNumber, listingId }) => {
  return JSON.stringify({
    ticketNumber,
    listingId,
  });
};

module.exports = {
  generateTicketNumber,
  generateQrPayload,
};
