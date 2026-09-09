const paymentService = require("./payment.service");
const { success } = require("../../utils/apiResponse");

const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment({
      orderId: req.body.orderId,
      userId: req.user.id,
    });

    return success(res, {
      statusCode: 201,
      message: "Payment order created successfully",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment({
      orderId: req.body.orderId,
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
      userId: req.user.id,
    });

    return success(res, {
      message: "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const result = await paymentService.webhook(req);

    return success(res, {
      message: "Webhook received",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  verifyPayment,
  webhook,
};
