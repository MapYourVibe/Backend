const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const getProfileByUserId = async (userId) => {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { userId },
  });
  if (!organizer) {
    throw new AppError("Organizer profile not found.", 404);
  }
  return organizer;
};

const updateProfile = async (userId, updateData) => {
  const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
  if (!organizer) {
    throw new AppError("Organizer profile not found.", 404);
  }

  // Prevent organizers from bypassing corporate parameters if their status is currently frozen under review
  if (organizer.approvalStatus === "SUSPENDED") {
    throw new AppError(
      "Profile modifications are restricted while this account is suspended.",
      403,
    );
  }

  return prisma.organizerProfile.update({
    where: { userId },
    data: updateData,
  });
};

const submitKycDetails = async (userId, kycData) => {
  const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
  if (!organizer) {
    throw new AppError("Organizer profile not found.", 404);
  }

  // Shift status to dynamic pending verification block upon payload submission
  return prisma.organizerProfile.update({
    where: { userId },
    data: {
      ...kycData,
      approvalStatus: "PENDING_VERIFICATION",
    },
  });
};

const adminVerifyProfile = async (organizerId, { approvalStatus, verificationNotes }) => {
  const organizer = await prisma.organizerProfile.findUnique({ where: { id: organizerId } });
  if (!organizer) {
    throw new AppError("Organizer identity record missing.", 404);
  }

  return prisma.organizerProfile.update({
    where: { id: organizerId },
    data: {
      approvalStatus,
      // Safely preserve administrative compliance logs inside database notes fields
      verificationNotes: verificationNotes || null,
    },
  });
};

/**
 * Lists organizers that host at least one listing, with their events.
 */
const listHostedOrganizers = async ({ search, page = 1, limit = 50 } = {}) => {
  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = {
    listings: { some: {} },
    ...(search
      ? {
          OR: [
            { businessName: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [organizers, total] = await Promise.all([
    prisma.organizerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        listings: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            status: true,
            featured: true,
            bookingStatus: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.organizerProfile.count({ where }),
  ]);

  return {
    items: organizers.map((o) => ({
      id: o.id,
      businessName: o.businessName,
      approvalStatus: o.approvalStatus,
      name: o.user.name,
      email: o.user.email,
      events: o.listings.map((l) => ({
        id: l.id,
        title: l.title,
        eventDate: l.eventDate,
        status: l.status,
        bookingStatus: l.bookingStatus,
        featured: l.featured,
      })),
    })),
    total,
    page: Math.max(parseInt(page, 10) || 1, 1),
    limit: take,
  };
};

module.exports = {
  getProfileByUserId,
  updateProfile,
  submitKycDetails,
  adminVerifyProfile,
  listHostedOrganizers,
};
