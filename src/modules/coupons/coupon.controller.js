const couponService = require("./coupon.service");
const { success } = require("../../utils/apiResponse");

const createNewCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body, req.user);
    return success(res, {
      data: coupon,
      message: "Promotional coupon code created successfully.",
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

const validateCouponCode = async (req, res, next) => {
  try {
    const calculation = await couponService.verifyAndCalculateDiscount(req.body);
    return success(res, {
      data: calculation,
      message: "Coupon applied and validated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNewCoupon,
  validateCouponCode,
};
