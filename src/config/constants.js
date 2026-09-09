// src/config/constants.js

module.exports = {
  // How long a checkout hold lasts before it's eligible to be released back
  // to the pool (PRD Addendum Section 15.3 / 19.2).
  RESERVATION_HOLD_MINUTES: 10,

  // How often the expired-reservation sweep runs (see inventory.service.js).
  RESERVATION_SWEEP_INTERVAL_MS: 60 * 1000, // 1 minute
};
