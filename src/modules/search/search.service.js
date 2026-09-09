const { prisma } = require("../../config/db");

const executeSearch = async (filters) => {
  const { search, city, category, type, page, limit, sortBy } = filters;

  const skip = (page - 1) * limit;

  // 1. Build the dynamic structural query matrix based on optional parameters
  const whereClause = {
    status: "PUBLISHED",
    ...(type ? { listingType: type } : {}),
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { venueName: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // 2. Map sorting strategies to native database parameters
  let orderByClause = {};

  switch (sortBy) {
    case "UPCOMING":
      whereClause.eventDate = { gte: new Date() };
      orderByClause = { eventDate: "asc" };
      break;

    case "PRICE_LOW_HIGH":
      orderByClause = { ticketTypes: { _min: { priceInPaise: "asc" } } };
      break;

    case "PRICE_HIGH_LOW":
      orderByClause = { ticketTypes: { _max: { priceInPaise: "desc" } } };
      break;

    case "TRENDING":
      orderByClause = { createdAt: "desc" };
      break;

    case "LATEST":
    default:
      orderByClause = { createdAt: "desc" };
      break;
  }

  // 3. Execute concurrent data extraction pipeline
  const [results, totalMatches] = await Promise.all([
    prisma.listing.findMany({
      where: whereClause,
      include: {
        ticketTypes: {
          select: { priceInPaise: true, name: true, totalQuantity: true },
        },
      },
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    prisma.listing.count({ where: whereClause }),
  ]);

  return {
    items: results,
    pagination: {
      totalItems: totalMatches,
      totalPages: Math.ceil(totalMatches / limit),
      currentPage: page,
      limit,
    },
  };
};

module.exports = {
  executeSearch,
};
