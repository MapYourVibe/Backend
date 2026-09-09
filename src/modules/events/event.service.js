const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const createEventListing = async (listingData, organizerUserId) => {
  // 1. Fetch matching active organizer reference profile
  const organizer = await prisma.organizerProfile.findUnique({
    where: { userId: organizerUserId },
  });

  if (!organizer || organizer.approvalStatus !== "APPROVED") {
    throw new AppError("Organizer profile must be fully approved before hosting listings.", 403);
  }

  // 2b. Conditional business parameter enforcement
  if (listingData.listingType === "EVENT" && !listingData.eventDate) {
    throw new AppError("Fixed calendar events require a specified execution date.", 400);
  }

  const { ticketTypes, capacitySlots, ...corePayload } = listingData;

  // 3. Atomic layout relational creation
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        ...corePayload,
        organizerId: organizer.id,
        createdBy: organizerUserId,
        status: "DRAFT", // Automatically drops into Draft state awaiting admin compliance routing
      },
    });

    // Seed dynamic ticket pricing structures if initialized by payload matrices
    if (listingData.listingType === "EVENT" && ticketTypes && ticketTypes.length > 0) {
      for (const tier of ticketTypes) {
        await tx.ticketType.create({
          data: {
            ...tier,
            listingId: listing.id,
          },
        });
      }
    }

    // Seed attraction availability tracking grids if initialized
    if (listingData.listingType === "ATTRACTION" && capacitySlots && capacitySlots.length > 0) {
      for (const slot of capacitySlots) {
        await tx.capacitySlot.create({
          data: {
            ...slot,
            date: new Date(slot.date),
            listingId: listing.id,
            bookedCount: 0,
          },
        });
      }
    }

    return tx.listing.findUnique({
      where: { id: listing.id },
      include: { ticketTypes: true, capacitySlots: true },
    });
  });
};

const queryEvents = async (queryFilters = {}) => {
  const { city, category, type, search, status, scope } = queryFilters;

  return prisma.listing.findMany({
    where: {
      ...(status === "all"
        ? {}
        : { status: status ?? "PUBLISHED" }),
      ...(type ? { listingType: type } : {}),
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      // Admin scope includes past/upcoming events of any status; public scope filters to upcoming.
      ...(scope === "admin"
        ? {}
        : {
            AND: [
              {
                OR: [
                  { eventDate: null },
                  { eventDate: { gte: new Date() } },
                ],
              },
            ],
          }),
    },
    include: { ticketTypes: true },
    orderBy: { position: "asc" },
  });
};

const getEventById = async (id) => {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { organizer: true, ticketTypes: true, capacitySlots: true },
  });

  if (!listing) {
    throw new AppError("Event or Attraction listing record not found.", 404);
  }
  return listing;
};

const updateEventListing = async (id, updateData, organizerUserId) => {
  const listing = await getEventById(id);

  // Authorization barrier check
  if (listing.organizer.userId !== organizerUserId) {
    throw new AppError("Access denied. You do not own this listing.", 403);
  }

  return prisma.listing.update({
    where: { id },
    data: updateData,
  });
};

const adminReviewListing = async (id, { status, remarks }) => {
  await getEventById(id);

  return prisma.listing.update({
    where: { id },
    data: {
      status: status === "APPROVED" ? "PUBLISHED" : "CANCELLED",
    },
  });
};

const markEventSoldOut = async (eventId, organizerUserId) => {
  const listing = await getEventById(eventId);

  if (listing.organizer.userId !== organizerUserId) {
    throw new AppError("Access denied. You do not own this listing.", 403);
  }

  return prisma.listing.update({
    where: { id: eventId },
    data: { bookingStatus: "SOLD_OUT" },
  });
};

// ---------------------------------------------------------------------------
// Admin curation (featured / suspend / resume) with audit logging
// ---------------------------------------------------------------------------

const CONFIRMED_ORDER_STATUSES = ["CONFIRMED", "PARTIALLY_REFUNDED"];

const logAdminAction = async (tx, adminId, action, targetId, notes) => {
  await tx.auditLog.create({
    data: {
      action,
      targetId,
      performedBy: adminId,
      notes: notes ?? null,
    },
  });
};

const toggleListingFeatured = async (id, { featured }, adminId) => {
  const listing = await getEventById(id);
  // True toggle: absent body -> flip based on current value; explicit boolean is honored.
  const next = typeof featured === "boolean" ? featured : !listing.featured;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.listing.update({
      where: { id },
      data: {
        featured: next,
        featuredAt: next ? new Date() : null,
      },
    });
    await logAdminAction(
      tx,
      adminId,
      next ? "LISTING_FEATURED" : "LISTING_UNFEATURED",
      id,
      `"${listing.title}"`,
    );
    return updated;
  });
};

const toggleListingPremium = async (id, { premium }, adminId) => {
  const listing = await getEventById(id);
  const next = typeof premium === "boolean" ? premium : !listing.premium;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.listing.update({
      where: { id },
      data: {
        premium: next,
        premiumAt: next ? new Date() : null,
      },
    });
    await logAdminAction(
      tx,
      adminId,
      next ? "LISTING_PREMIUM" : "LISTING_UNPREMIUM",
      id,
      `"${listing.title}"`,
    );
    return updated;
  });
};

const updateEventPosition = async (id, { position }, adminId) => {
  await getEventById(id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.listing.update({
      where: { id },
      data: { position: position ?? 0 },
    });
    await logAdminAction(tx, adminId, "LISTING_POSITION_UPDATED", id, `position: ${position}`);
    return updated;
  });
};

const suspendListing = async (id, adminId) => {
  const listing = await getEventById(id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.listing.update({
      where: { id },
      data: { bookingStatus: "PAUSED" },
    });
    await logAdminAction(tx, adminId, "LISTING_SUSPENDED", id, `"${listing.title}"`);
    return updated;
  });
};

const resumeListing = async (id, adminId) => {
  const listing = await getEventById(id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.listing.update({
      where: { id },
      data: { bookingStatus: "OPEN" },
    });
    await logAdminAction(tx, adminId, "LISTING_RESUMED", id, `"${listing.title}"`);
    return updated;
  });
};

const getAdminEventDetail = async (id) => {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      organizer: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      ticketTypes: true,
      capacitySlots: true,
      orders: {
        where: { status: { in: CONFIRMED_ORDER_STATUSES } },
        include: {
          user: { select: { name: true, email: true } },
          payment: { select: { status: true, amountInPaise: true } },
          items: {
            select: {
              id: true,
              ticketTypeId: true,
              ticketName: true,
              quantity: true,
              priceInPaise: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!listing) throw new AppError("Event or Attraction listing record not found.", 404);

  const eventsHosted = await prisma.listing.count({
    where: { organizerId: listing.organizerId },
  });

  const totalRevenueInPaise = listing.orders.reduce((sum, o) => sum + o.totalInPaise, 0);
  const ticketsSold = listing.orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const commissionBps = listing.organizer.commissionRate ?? 1000;
  const commissionInPaise = Math.round(totalRevenueInPaise * (commissionBps / 10000));

  const ticketBreakdown = listing.ticketTypes.map((tt) => ({
    id: tt.id,
    name: tt.name,
    priceInPaise: tt.priceInPaise,
    totalQuantity: tt.totalQuantity,
    soldCount: listing.orders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + (i.ticketTypeId === tt.id ? i.quantity : 0), 0),
      0,
    ),
  }));

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    listingType: listing.listingType,
    bannerUrl: listing.bannerUrl,
    galleryUrls: listing.galleryUrls,
    venueName: listing.venueName,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    eventDate: listing.eventDate,
    status: listing.status,
    bookingStatus: listing.bookingStatus,
    featured: listing.featured,
    featuredAt: listing.featuredAt,
    premium: listing.premium,
    premiumAt: listing.premiumAt,
    position: listing.position,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    organizer: {
      id: listing.organizer.id,
      businessName: listing.organizer.businessName,
      approvalStatus: listing.organizer.approvalStatus,
      commissionRate: listing.organizer.commissionRate,
      user: listing.organizer.user,
    },
    eventsHosted,
    ticketTypes: listing.ticketTypes,
    capacitySlots: listing.capacitySlots,
    ticketBreakdown,
    salesSummary: {
      orderCount: listing.orders.length,
      ticketsSold,
      totalRevenueInPaise,
    },
    financials: {
      commissionBps,
      commissionInPaise,
      netPayoutInPaise: Math.max(0, totalRevenueInPaise - commissionInPaise),
    },
    orders: listing.orders,
  };
};

module.exports = {
  createEventListing,
  queryEvents,
  getEventById,
  updateEventListing,
  adminReviewListing,
  markEventSoldOut,
  toggleListingFeatured,
  toggleListingPremium,
  updateEventPosition,
  suspendListing,
  resumeListing,
  getAdminEventDetail,
};
