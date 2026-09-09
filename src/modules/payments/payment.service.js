const crypto = require("crypto");
const { prisma } = require("../../config/db");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");
const razorpayGateway = require("./gateways/razorpay.gateway");

const createPayment = async ({ orderId, userId }) => {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.userId !== userId) {
    throw new AppError("You are not authorized to pay for this order", 403);
  }

  if (order.status !== "PENDING") {
    throw new AppError(`Cannot create payment for a ${order.status.toLowerCase()} order`, 400);
  }

  const existingPayment = await prisma.payment.findUnique({
    where: {
      orderId: order.id,
    },
  });

  if (existingPayment) {
    if (existingPayment.status === "SUCCESS") {
      throw new AppError("Payment has already been completed", 400);
    }

    if (existingPayment.status === "PENDING") {
      return {
        paymentId: existingPayment.id,
        orderId: order.id,
        gateway: existingPayment.gateway,
        gatewayOrderId: existingPayment.gatewayOrderId,
        amount: existingPayment.amountInPaise,
        currency: existingPayment.currency,
        keyId: env.RAZORPAY_KEY_ID,
      };
    }

    if (existingPayment.status === "FAILED") {
      const gatewayOrder = await razorpayGateway.createOrder({
        amount: order.totalInPaise,
        receipt: `order_${order.id}`,
        notes: {
          orderId: order.id,
          userId,
        },
      });

      const updatedPayment = await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          status: "PENDING",
          gatewayOrderId: gatewayOrder.id,
          gatewayPaymentId: null,
          gatewaySignature: null,
          failureReason: null,
          gatewayResponse: gatewayOrder,
        },
      });

      return {
        paymentId: updatedPayment.id,
        orderId: order.id,
        gateway: updatedPayment.gateway,
        gatewayOrderId: updatedPayment.gatewayOrderId,
        amount: updatedPayment.amountInPaise,
        currency: updatedPayment.currency,
        keyId: env.RAZORPAY_KEY_ID,
      };
    }

    throw new AppError(`Unsupported payment status: ${existingPayment.status}`, 400);
  }

  const gatewayOrder = await razorpayGateway.createOrder({
    amount: order.totalInPaise,
    receipt: `order_${order.id}`,
    notes: {
      orderId: order.id,
      userId,
    },
  });

  let payment;

  try {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: "RAZORPAY",
        gatewayOrderId: gatewayOrder.id,
        status: "PENDING",
        amountInPaise: order.totalInPaise,
        currency: gatewayOrder.currency,
        gatewayResponse: gatewayOrder,
        idempotencyKey: `payment_${order.id}`,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      payment = await prisma.payment.findUnique({
        where: {
          orderId: order.id,
        },
      });

      if (!payment) {
        throw error;
      }
    } else {
      throw error;
    }
  }

  return {
    paymentId: payment.id,
    orderId: order.id,
    gateway: payment.gateway,
    gatewayOrderId: payment.gatewayOrderId,
    amount: payment.amountInPaise,
    currency: payment.currency,
    keyId: env.RAZORPAY_KEY_ID,
  };
};

const verifyPayment = async ({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId,
}) => {
  // ✅ Included order items explicitly to drive downstream ticket generation loops
  const payment = await prisma.payment.findUnique({
    where: {
      orderId,
    },
    include: {
      order: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  if (payment.order.userId !== userId) {
    throw new AppError("You are not authorized to verify this payment", 403);
  }

  if (payment.gateway !== "RAZORPAY") {
    throw new AppError("Unsupported payment gateway", 400);
  }

  // Idempotency check prevents duplicate execution if an identical event runs concurrently
  if (payment.status === "SUCCESS") {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      paymentStatus: payment.status,
      orderStatus: payment.order.status,
    };
  }

  if (payment.gatewayOrderId !== razorpayOrderId) {
    throw new AppError("Invalid gateway order", 400);
  }

  const isSignatureValid = razorpayGateway.verifySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isSignatureValid) {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "FAILED",
        failureReason: "Invalid payment signature",
      },
    });

    throw new AppError("Payment signature verification failed", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "SUCCESS",
        gatewayPaymentId: razorpayPaymentId,
        gatewaySignature: razorpaySignature,
        gatewayResponse: {
          ...(payment.gatewayResponse || {}),
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    const updatedOrder = await tx.order.update({
      where: {
        id: payment.orderId,
      },
      data: {
        status: "CONFIRMED",
      },
    });

    // ✅ Atomic Ticket Generation Loop: Creates secure access assets instantly upon verification
    for (const item of payment.order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const uniqueToken = crypto.randomBytes(6).toString("hex").toUpperCase();
        await tx.ticket.create({
          data: {
            orderId: payment.orderId,
            orderItemId: item.id,
            ticketNumber: `TIC-${item.id.slice(-6)}-${uniqueToken}`,
            qrCode: `QR-${item.id.slice(-6)}-${uniqueToken}`,
            status: "ACTIVE",
          },
        });
      }
    }

    return {
      updatedPayment,
      updatedOrder,
    };
  });

  return {
    paymentId: result.updatedPayment.id,
    orderId: result.updatedOrder.id,
    paymentStatus: result.updatedPayment.status,
    orderStatus: result.updatedOrder.status,
  };
};

const handlePaymentAuthorized = async ({ payload, signature }) => {
  const gatewayPayment = payload.payment.entity;

  const payment = await prisma.payment.findFirst({
    where: {
      gatewayOrderId: gatewayPayment.order_id,
    },
  });

  if (!payment) {
    return {
      received: true,
      message: "Payment not found",
    };
  }

  if (payment.status === "SUCCESS" || payment.status === "AUTHORIZED") {
    return {
      received: true,
      duplicate: true,
      paymentId: payment.id,
      message: "Webhook already processed",
    };
  }

  const updatedPayment = await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: "AUTHORIZED",
      gatewayPaymentId: gatewayPayment.id,
      gatewayResponse: {
        ...(payment.gatewayResponse ?? {}),
        webhook: {
          payment: gatewayPayment,
          signature,
          receivedAt: new Date().toISOString(),
        },
      },
    },
  });

  return {
    received: true,
    paymentId: updatedPayment.id,
    paymentStatus: updatedPayment.status,
  };
};

const handlePaymentCaptured = async ({ payload, signature }) => {
  const gatewayPayment = payload.payment.entity;

  // ✅ Included nested order items within webhook processor to drive fallback ticket generation
  const payment = await prisma.payment.findFirst({
    where: {
      gatewayOrderId: gatewayPayment.order_id,
    },
    include: {
      order: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  if (payment.status === "SUCCESS") {
    return {
      received: true,
      duplicate: true,
      paymentId: payment.id,
      orderId: payment.orderId,
      message: "Webhook already processed",
    };
  }

  if (payment.amountInPaise !== gatewayPayment.amount) {
    throw new AppError("Payment amount mismatch", 400);
  }
  if (payment.currency !== gatewayPayment.currency) {
    throw new AppError("Payment currency mismatch", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "SUCCESS",
        gatewayPaymentId: gatewayPayment.id,
        gatewayResponse: {
          ...(payment.gatewayResponse ?? {}),
          webhook: {
            payment: gatewayPayment,
            signature,
            receivedAt: new Date().toISOString(),
          },
        },
      },
    });

    const updatedOrder = await tx.order.update({
      where: {
        id: payment.orderId,
      },
      data: {
        status: "CONFIRMED",
      },
    });

    // ✅ Asynchronous Webhook Ticket Generation Fallback Loop
    for (const item of payment.order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const uniqueToken = crypto.randomBytes(6).toString("hex").toUpperCase();
        await tx.ticket.create({
          data: {
            orderId: payment.orderId,
            orderItemId: item.id,
            ticketNumber: `TIC-${item.id.slice(-6)}-${uniqueToken}`,
            qrCode: `QR-${item.id.slice(-6)}-${uniqueToken}`,
            status: "ACTIVE",
          },
        });
      }
    }

    return {
      updatedPayment,
      updatedOrder,
    };
  });

  return {
    received: true,
    paymentId: result.updatedPayment.id,
    orderId: result.updatedOrder.id,
    paymentStatus: result.updatedPayment.status,
    orderStatus: result.updatedOrder.status,
  };
};

const handlePaymentFailed = async ({ payload, signature }) => {
  const gatewayPayment = payload.payment.entity;

  const payment = await prisma.payment.findFirst({
    where: {
      gatewayOrderId: gatewayPayment.order_id,
    },
  });

  if (!payment) {
    return {
      received: true,
      message: "Payment not found",
    };
  }

  if (payment.status === "SUCCESS") {
    return {
      received: true,
      duplicate: true,
      paymentId: payment.id,
      message: "Payment already completed",
    };
  }

  if (payment.status === "FAILED") {
    return {
      received: true,
      duplicate: true,
      paymentId: payment.id,
      message: "Webhook already processed",
    };
  }

  const updatedPayment = await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: "FAILED",
      gatewayPaymentId: gatewayPayment.id,
      failureReason: gatewayPayment.error_description ?? "Payment failed",
      gatewayResponse: {
        ...(payment.gatewayResponse ?? {}),
        webhook: {
          payment: gatewayPayment,
          signature,
          receivedAt: new Date().toISOString(),
        },
      },
    },
  });

  return {
    received: true,
    paymentId: updatedPayment.id,
    paymentStatus: updatedPayment.status,
  };
};

const handleRefundCreated = async ({ payload, signature }) => {
  const gatewayRefund = payload.refund.entity;

  let refund = await prisma.refund.findUnique({
    where: {
      gatewayRefundId: gatewayRefund.id,
    },
  });

  // ✅ Fixed Race Condition: Fallback to metadata identifier if gateway ID update transaction is still running
  if (!refund && gatewayRefund.notes?.refundId) {
    refund = await prisma.refund.findUnique({
      where: { id: gatewayRefund.notes.refundId },
    });
  }

  if (!refund) {
    return {
      received: true,
      message: "Refund not found",
    };
  }

  if (refund.status === "PROCESSING" || refund.status === "PROCESSED") {
    return {
      received: true,
      duplicate: true,
      refundId: refund.id,
      message: "Webhook already processed",
    };
  }

  const updatedRefund = await prisma.refund.update({
    where: {
      id: refund.id,
    },
    data: {
      status: "PROCESSING",
      gatewayRefundId: gatewayRefund.id, // Enforce persistence of identifier if fallback route was hit
      gatewayResponse: {
        ...(refund.gatewayResponse ?? {}),
        webhook: {
          refund: gatewayRefund,
          signature,
          receivedAt: new Date().toISOString(),
        },
      },
    },
  });

  return {
    received: true,
    refundId: updatedRefund.id,
    status: updatedRefund.status,
  };
};

const handleRefundProcessed = async ({ payload, signature }) => {
  const gatewayRefund = payload.refund.entity;

  let refund = await prisma.refund.findUnique({
    where: {
      gatewayRefundId: gatewayRefund.id,
    },
  });

  // ✅ Fixed Race Condition Fallback
  if (!refund && gatewayRefund.notes?.refundId) {
    refund = await prisma.refund.findUnique({
      where: { id: gatewayRefund.notes.refundId },
    });
  }

  if (!refund) {
    return {
      received: true,
      message: "Refund not found",
    };
  }

  if (refund.status === "PROCESSED") {
    return {
      received: true,
      duplicate: true,
      refundId: refund.id,
      message: "Webhook already processed",
    };
  }

  const updatedRefund = await prisma.refund.update({
    where: {
      id: refund.id,
    },
    data: {
      status: "PROCESSED",
      gatewayRefundId: gatewayRefund.id,
      processedAt: new Date(),
      gatewayResponse: {
        ...(refund.gatewayResponse ?? {}),
        webhook: {
          refund: gatewayRefund,
          signature,
          receivedAt: new Date().toISOString(),
        },
      },
    },
  });

  return {
    received: true,
    refundId: updatedRefund.id,
    status: updatedRefund.status,
  };
};

const handleRefundFailed = async ({ payload, signature }) => {
  const gatewayRefund = payload.refund.entity;

  let refund = await prisma.refund.findUnique({
    where: {
      gatewayRefundId: gatewayRefund.id,
    },
  });

  // ✅ Fixed Race Condition Fallback
  if (!refund && gatewayRefund.notes?.refundId) {
    refund = await prisma.refund.findUnique({
      where: { id: gatewayRefund.notes.refundId },
    });
  }

  if (!refund) {
    return {
      received: true,
      message: "Refund not found",
    };
  }

  if (refund.status === "FAILED") {
    return {
      received: true,
      duplicate: true,
      refundId: refund.id,
      message: "Webhook already processed",
    };
  }

  const updatedRefund = await prisma.refund.update({
    where: {
      id: refund.id,
    },
    data: {
      status: "FAILED",
      gatewayRefundId: gatewayRefund.id,
      failureReason: gatewayRefund.error_description ?? "Refund failed",
      gatewayResponse: {
        ...(refund.gatewayResponse ?? {}),
        webhook: {
          refund: gatewayRefund,
          signature,
          receivedAt: new Date().toISOString(),
        },
      },
    },
  });

  return {
    received: true,
    refundId: updatedRefund.id,
    status: updatedRefund.status,
  };
};

const webhook = async (req) => {
  const signature = req.headers["x-razorpay-signature"];

  const isValid = razorpayGateway.verifyWebhookSignature({
    body: req.rawBody,
    signature,
  });

  if (!isValid) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const event = req.body.event;

  const webhookEventLog = await prisma.paymentWebhookEvent.create({
    data: {
      gateway: "RAZORPAY",
      eventType: event,
      payload: req.body,
    },
  });

  let result;

  switch (event) {
    case "payment.authorized":
      result = await handlePaymentAuthorized({
        payload: req.body.payload,
        signature,
      });
      break;

    case "payment.captured":
      result = await handlePaymentCaptured({
        payload: req.body.payload,
        signature,
      });
      break;

    case "payment.failed":
      result = await handlePaymentFailed({
        payload: req.body.payload,
        signature,
      });
      break;

    case "refund.created":
      result = await handleRefundCreated({
        payload: req.body.payload,
        signature,
      });
      break;

    case "refund.processed":
      result = await handleRefundProcessed({
        payload: req.body.payload,
        signature,
      });
      break;

    case "refund.failed":
      result = await handleRefundFailed({
        payload: req.body.payload,
        signature,
      });
      break;

    default:
      return {
        received: true,
        event,
        message: "Event ignored",
      };
  }

  if (result) {
    await prisma.paymentWebhookEvent.update({
      where: {
        id: webhookEventLog.id,
      },
      data: {
        processedAt: new Date(),
      },
    });
  }

  return result;
};

module.exports = {
  createPayment,
  verifyPayment,
  webhook,
};
