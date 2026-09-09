const bcrypt = require("bcryptjs");
const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const SALT_ROUNDS = 10;

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organizerProfile: true },
  });

  if (!user) {
    throw new AppError("User profile not found.", 404);
  }
  return sanitizeUser(user);
};

const updateProfile = async (userId, updateData) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  return sanitizeUser(updatedUser);
};

const changePassword = async (userId, { oldPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User profile not found.", 404);
  }

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Current password incorrect.", 400);
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { success: true };
};

const deleteAccount = async (userId) => {
  // Guard clause checking for active unfulfilled transactional orders before clearing
  const pendingOrders = await prisma.order.count({
    where: { userId, status: "PENDING" },
  });

  if (pendingOrders > 0) {
    throw new AppError("Cannot close account with active checkout sequences processing.", 400);
  }

  // Defensive choice: Execute database delete or switch status based on your business soft-delete model
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
};

const getUserStatistics = async (userId) => {
  const totalBookingsCount = await prisma.order.count({
    where: { userId, status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] } },
  });

  const totalSpentAggregate = await prisma.payment.aggregate({
    where: { order: { userId }, status: "SUCCESS" },
    _sum: { amountInPaise: true },
  });

  const activeTicketsCount = await prisma.ticket.count({
    where: { order: { userId }, status: "ACTIVE" },
  });

  return {
    totalBookings: totalBookingsCount,
    totalSpent: totalSpentAggregate._sum.amountInPaise || 0,
    activeTickets: activeTicketsCount,
  };
};

const getBookingsHistory = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    include: {
      payment: true,
      items: {
        include: {
          ticketType: true,
          capacitySlot: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getActiveTickets = async (userId) => {
  return prisma.ticket.findMany({
    where: { order: { userId }, status: "ACTIVE" },
    include: {
      orderItem: {
        include: {
          ticketType: { include: { listing: true } },
          capacitySlot: { include: { listing: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserStatistics,
  getBookingsHistory,
  getActiveTickets,
};
