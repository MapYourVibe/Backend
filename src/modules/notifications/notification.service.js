const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

// Mock service providers easily swappable for real SDK engines (e.g., Resend, Twilio, Firebase)
const emailProvider = async (to, subject, body) => {
  console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
  return { providerMessageId: `msg_em_${Math.random().toString(36).substring(7)}` };
};

const smsProvider = async (phone, message) => {
  console.log(`[SMS SENT] To: ${phone} | Content: ${message}`);
  return { providerMessageId: `msg_sms_${Math.random().toString(36).substring(7)}` };
};

const pushProvider = async (userId, title, message) => {
  console.log(`[PUSH SENT] User: ${userId} | ${title}: ${message}`);
  return { providerMessageId: `msg_push_${Math.random().toString(36).substring(7)}` };
};

/**
 * Core dispatch multiplexer that validates delivery states and creates notification records.
 */
const dispatchNotification = async ({ userId, channel, title, bodyData, metadata = {} }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Recipient profile record not found.", 404);

  const channelsToDeliver = [];

  if (channel === "EMAIL" || channel === "ALL") {
    if (user.email) channelsToDeliver.push({ type: "EMAIL", target: user.email });
  }
  if (channel === "SMS" || channel === "ALL") {
    if (user.phone) channelsToDeliver.push({ type: "SMS", target: user.phone });
  }
  if (channel === "PUSH" || channel === "ALL") {
    channelsToDeliver.push({ type: "PUSH", target: user.id });
  }

  const deliveryLogs = [];

  for (const delivery of channelsToDeliver) {
    try {
      let result;
      if (delivery.type === "EMAIL") {
        result = await emailProvider(delivery.target, title, bodyData);
      } else if (delivery.type === "SMS") {
        result = await smsProvider(delivery.target, bodyData);
      } else if (delivery.type === "PUSH") {
        result = await pushProvider(delivery.target, title, bodyData);
      }

      const log = await prisma.notification.create({
        data: {
          userId,
          type: delivery.type,
          message: `${title}: ${bodyData}`,
          read: false,
        },
      });
      deliveryLogs.push(log);
    } catch (error) {
      console.error(`Notification delivery failed for ${delivery.type}:`, error);

      const failedLog = await prisma.notification.create({
        data: {
          userId,
          type: delivery.type,
          message: `[FAILED] ${title}: ${bodyData} - ${error.message}`,
          read: false,
        },
      });
      deliveryLogs.push(failedLog);
    }
  }

  return deliveryLogs;
};

/**
 * Compiles parameters and fires automated booking confirmation templates.
 */
const triggerBookingConfirmation = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, listing: true },
  });

  if (!order) throw new AppError("Target order reference missing.", 404);

  const formattedAmount = (order.totalInPaise / 100).toFixed(2);
  const title = `🎟️ Booking Confirmed: ${order.listing.title}`;
  const templateBody = `Hello ${order.user.name || "Customer"},\n\nYour order #${order.id} for "${order.listing.title}" is confirmed! Total Paid: ₹${formattedAmount}.\n\nThank you for utilizing MapYourVibe!`;

  return dispatchNotification({
    userId: order.userId,
    channel: "ALL",
    title,
    bodyData: templateBody,
    metadata: { orderId: order.id },
  });
};

/**
 * Compiles parameters and fires transactional refund processing notification sheets.
 */
const triggerRefundNotification = async (refundId) => {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: { include: { user: true, listing: true } } },
  });

  if (!refund) throw new AppError("Target refund record missing.", 404);

  const formattedAmount = (refund.finalRefundAmountInPaise / 100).toFixed(2);
  const title = `💰 Refund Processed: ${refund.order.listing.title}`;
  const templateBody = `Hello ${refund.order.user.name || "Customer"},\n\nGood news! A refund of ₹${formattedAmount} has been processed successfully for your order #${refund.orderId}.\n\nThe funds should reflect back in your original payment mode within 5-7 bank business days.`;

  return dispatchNotification({
    userId: refund.order.userId,
    channel: "ALL",
    title,
    bodyData: templateBody,
    metadata: { refundId, orderId: refund.orderId },
  });
};

const getUserNotificationHistory = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

module.exports = {
  dispatchNotification,
  triggerBookingConfirmation,
  triggerRefundNotification,
  getUserNotificationHistory,
};
