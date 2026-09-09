const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

/**
 * Updates global operational and marketplace variables dynamically.
 */
const updateSystemGlobalParameters = async (configPayload) => {
  const settings = await prisma.platformSettings.findFirst();
  if (settings) {
    return prisma.platformSettings.update({
      where: { id: settings.id },
      data: configPayload,
    });
  }
  return prisma.platformSettings.create({
    data: configPayload,
  });
};

/**
 * Freezes, suspends, or bans user accounts across the entire ecosystem.
 */
const modifyUserAccountStatus = async (targetUserId, { status, reason }, adminUserId) => {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) throw new AppError("Target individual user record missing.", 404);

  if (targetUserId === adminUserId) {
    throw new AppError(
      "Self-Destruction Error. You cannot suspend or ban your own administrative profile.",
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: targetUserId },
      data: {
        isFrozen: status !== "ACTIVE",
        role: status === "BANNED" ? "USER" : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        action: `USER_STATUS_${status}`,
        targetId: targetUserId,
        performedBy: adminUserId,
        notes: reason,
      },
    });

    return updatedUser;
  });
};

/**
 * Forcefully moderates, overrides, or unpublishes catalog listings for compliance.
 */
const overrideListingState = async (listingId, { status, adminNotes }, adminUserId) => {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new AppError("Target event listing metadata record missing.", 404);

  return prisma.$transaction(async (tx) => {
    const updatedListing = await tx.listing.update({
      where: { id: listingId },
      data: { status, adminNotes },
    });

    await tx.auditLog.create({
      data: {
        action: `LISTING_MODERATION_${status}`,
        targetId: listingId,
        performedBy: adminUserId,
        notes: adminNotes,
      },
    });

    return updatedListing;
  });
};

module.exports = {
  updateSystemGlobalParameters,
  modifyUserAccountStatus,
  overrideListingState,
};
