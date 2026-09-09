const notificationService = require("./notification.service");
const { success } = require("../../utils/apiResponse");

const getMyHistory = async (req, res, next) => {
  try {
    const history = await notificationService.getUserNotificationHistory(req.user.id);
    return success(res, {
      data: history,
      message: "Communication delivery history parsed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const adminSendManualNotification = async (req, res, next) => {
  try {
    const { userId, channel, subject, message } = req.body;

    const logs = await notificationService.dispatchNotification({
      userId,
      channel,
      title: subject,
      bodyData: message,
      metadata: { initiatedBy: req.user.id, manualDispatch: true },
    });

    return success(res, {
      data: logs,
      message: "Manual system notification logs dispatched successfully.",
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyHistory,
  adminSendManualNotification,
};
