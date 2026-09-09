const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");
const { getPlatformFinancialOverview } = require("../analytics/analytics.service");

/**
 * Compiles personalized dashboard stats for individual regular users.
 */
const fetchUserDashboard = async (userId) => {
  const [upcomingTickets, recentBookings, aggregateStats] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        order: { userId },
        status: "ACTIVE",
      },
      include: {
        orderItem: {
          include: {
            ticketType: {
              select: { name: true, listing: { select: { title: true, eventDate: true } } },
            },
            capacitySlot: {
              select: { slotLabel: true, date: true, listing: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { userId },
      include: { payment: true, listing: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.count({
      where: { userId, status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] } },
    }),
  ]);

  return {
    totalActiveBookings: aggregateStats,
    upcomingTickets: upcomingTickets.map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      title:
        t.orderItem.ticketType?.listing?.title ||
        t.orderItem.capacitySlot?.listing?.title ||
        "Attraction Pass",
      tier:
        t.orderItem.ticketType?.name || t.orderItem.capacitySlot?.slotLabel || "General Admission",
      scheduledDate:
        t.orderItem.ticketType?.listing?.eventDate || t.orderItem.capacitySlot?.date || null,
    })),
    recentTransactions: recentBookings,
  };
};

/**
 * Aggregates corporate operational parameters for registered event hosts.
 */
const fetchOrganizerDashboard = async (organizerUserId) => {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { userId: organizerUserId },
  });
  if (!organizer) throw new AppError("Organizer credentials profile missing.", 404);

  const [activeListingsCount, totalTicketsSold, grossSalesData, checkInVelocity] =
    await Promise.all([
      prisma.listing.count({ where: { organizerId: organizer.id, status: "PUBLISHED" } }),
      prisma.ticket.count({ where: { order: { listing: { organizerId: organizer.id } } } }),
      prisma.payment.aggregate({
        where: { order: { listing: { organizerId: organizer.id } }, status: "SUCCESS" },
        _sum: { amountInPaise: true },
      }),
      prisma.checkIn.count({
        where: { ticket: { order: { listing: { organizerId: organizer.id } } } },
      }),
    ]);

  return {
    organizerId: organizer.id,
    businessName: organizer.businessName,
    summary: {
      activeListings: activeListingsCount,
      totalTicketsDistributed: totalTicketsSold,
      grossEarningsInPaise: grossSalesData._sum.amountInPaise || 0,
      venueEntriesCheckedIn: checkInVelocity,
    },
  };
};

/**
 * Compiles a comprehensive overview of global operational health markers for administrative oversight.
 * Revenue is broken down per-event so admins can see earnings per listing.
 */
const fetchAdminDashboard = async () => {
  const CONFIRMED_ORDER_STATUSES = ["CONFIRMED", "PARTIALLY_REFUNDED"];

  const [
    totalUsers,
    totalOrganizers,
    pendingKycCount,
    activeEcosystemListings,
    draftListings,
    confirmedOrders,
    totalTicketsSold,
    totalCheckIns,
    listingsWithRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organizerProfile.count({ where: { approvalStatus: "APPROVED" } }),
    prisma.organizerProfile.count({ where: { approvalStatus: "PENDING" } }),
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
    prisma.listing.count({ where: { status: "DRAFT" } }),
    prisma.order.count({ where: { status: { in: CONFIRMED_ORDER_STATUSES } } }),
    prisma.orderItem.aggregate({
      where: { order: { status: { in: CONFIRMED_ORDER_STATUSES } } },
      _sum: { quantity: true },
    }),
    prisma.checkIn.count(),
    prisma.listing.findMany({
      where: { orders: { some: { status: { in: CONFIRMED_ORDER_STATUSES } } } },
      select: {
        id: true,
        title: true,
        eventDate: true,
        venueName: true,
        city: true,
        category: true,
        listingType: true,
        status: true,
        bookingStatus: true,
        featured: true,
        organizer: {
          select: { businessName: true },
        },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            priceInPaise: true,
            totalQuantity: true,
            orderItems: {
              where: { order: { status: { in: CONFIRMED_ORDER_STATUSES } } },
              select: { quantity: true },
            },
          },
        },
        orders: {
          where: { status: { in: CONFIRMED_ORDER_STATUSES } },
          select: {
            totalInPaise: true,
            items: {
              where: { order: { status: { in: CONFIRMED_ORDER_STATUSES } } },
              select: { quantity: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const financialOverview = await getPlatformFinancialOverview();

  const revenueByEvent = listingsWithRevenue.map((listing) => {
    const totalRevenueInPaise = listing.orders.reduce((sum, o) => sum + o.totalInPaise, 0);
    const ticketsSold = listing.orders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );

    const ticketBreakdown = listing.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      priceInPaise: tt.priceInPaise,
      totalQuantity: tt.totalQuantity,
      soldCount: tt.orderItems.reduce((s, oi) => s + oi.quantity, 0),
    }));

    return {
      eventId: listing.id,
      title: listing.title,
      eventDate: listing.eventDate,
      venueName: listing.venueName,
      city: listing.city,
      category: listing.category,
      listingType: listing.listingType,
      status: listing.status,
      bookingStatus: listing.bookingStatus,
      featured: listing.featured,
      organizerName: listing.organizer.businessName,
      totalRevenueInPaise,
      ticketsSold,
      orderCount: listing.orders.length,
      ticketBreakdown,
    };
  });

  return {
    timestamp: new Date(),
    ecosystemHealth: {
      registeredAccounts: totalUsers,
      activeVerifiedOrganizers: totalOrganizers,
      platformActiveListings: activeEcosystemListings,
      complianceQueueCount: pendingKycCount,
      draftListings,
    },
    platformStats: {
      totalOrders: confirmedOrders,
      totalTicketsSold: totalTicketsSold._sum.quantity || 0,
      totalCheckIns,
    },
    financialMetrics: {
      grossVolumeInPaise: financialOverview.grossVolumeInPaise,
      totalRefundedInPaise: financialOverview.refundedInPaise,
      netRevenueInPaise: financialOverview.netVolumeInPaise,
      platformCommissionInPaise: financialOverview.platformCommissionInPaise,
      platformCommissionRate: 1000,
      transactionCount: financialOverview.totalOrders,
      revenueByEvent,
    },
  };
};

/**
 * Lists all events for an organizer with ticket sales stats per event.
 */
const fetchOrganizerEvents = async (organizerUserId) => {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { userId: organizerUserId },
  });
  if (!organizer) throw new AppError("Organizer profile not found.", 404);

  const listings = await prisma.listing.findMany({
    where: { organizerId: organizer.id },
    include: {
      ticketTypes: {
        select: {
          id: true,
          name: true,
          totalQuantity: true,
          orderItems: {
            where: { order: { status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] } } },
            select: { id: true, quantity: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return listings.map((l) => {
    const totalSold = l.ticketTypes.reduce(
      (sum, tt) => sum + tt.orderItems.reduce((s, oi) => s + oi.quantity, 0),
      0,
    );
    const totalCapacity = l.ticketTypes.reduce((sum, tt) => sum + tt.totalQuantity, 0);
    const ticketBreakdown = l.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      totalQuantity: tt.totalQuantity,
      soldCount: tt.orderItems.reduce((s, oi) => s + oi.quantity, 0),
    }));

    return {
      id: l.id,
      title: l.title,
      eventDate: l.eventDate,
      status: l.status,
      bookingStatus: l.bookingStatus,
      totalTicketsSold: totalSold,
      totalCapacity,
      ticketBreakdown,
    };
  });
};

/**
 * Returns detailed ticket breakdown for a single event (organizer-owned).
 */
const fetchOrganizerEventDetail = async (organizerUserId, eventId) => {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { userId: organizerUserId },
  });
  if (!organizer) throw new AppError("Organizer profile not found.", 404);

  const listing = await prisma.listing.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    include: {
      ticketTypes: {
        include: {
          orderItems: {
            where: { order: { status: { in: ["CONFIRMED", "PARTIALLY_REFUNDED"] } } },
            select: { id: true, quantity: true },
          },
        },
      },
    },
  });
  if (!listing) throw new AppError("Event not found or not owned by you.", 404);

  const totalSold = listing.ticketTypes.reduce(
    (sum, tt) => sum + tt.orderItems.reduce((s, oi) => s + oi.quantity, 0),
    0,
  );
  const totalCapacity = listing.ticketTypes.reduce((sum, tt) => sum + tt.totalQuantity, 0);

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    eventDate: listing.eventDate,
    venueName: listing.venueName,
    address: listing.address,
    city: listing.city,
    status: listing.status,
    bookingStatus: listing.bookingStatus,
    totalTicketsSold: totalSold,
    totalCapacity,
    ticketBreakdown: listing.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      totalQuantity: tt.totalQuantity,
      soldCount: tt.orderItems.reduce((s, oi) => s + oi.quantity, 0),
    })),
  };
};

module.exports = {
  fetchUserDashboard,
  fetchOrganizerDashboard,
  fetchAdminDashboard,
  fetchOrganizerEvents,
  fetchOrganizerEventDetail,
};
