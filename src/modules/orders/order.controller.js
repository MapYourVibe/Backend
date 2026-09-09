const orderService = require("./order.service");
const apiResponse = require("../../utils/apiResponse");

exports.createOrder = async (req, res, next) => {
  try {
    const { reservationIds } = req.body;

    const order = await orderService.createOrder(req.user.id, reservationIds);

    return apiResponse.success(res, { data: order, message: "Order created successfully", statusCode: 201 });
  } catch (error) {
    next(error);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const orders = await orderService.listOrders({ page, limit });
    return apiResponse.success(res, { data: orders, message: "Orders fetched successfully" });
  } catch (error) {
    next(error);
  }
};
