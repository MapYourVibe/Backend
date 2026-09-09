const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const createVenue = async (venueData, creatorId) => {
  return prisma.venue.create({
    data: {
      ...venueData,
      createdBy: creatorId,
    },
  });
};

const getVenues = async (filters = {}) => {
  const { city, seatingType } = filters;

  return prisma.venue.findMany({
    where: {
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      ...(seatingType ? { seatingType } : {}),
    },
    orderBy: { name: "asc" },
  });
};

const getVenueById = async (id) => {
  const venue = await prisma.venue.findUnique({
    where: { id },
  });

  if (!venue) {
    throw new AppError("Physical venue record not found.", 404);
  }
  return venue;
};

const updateVenue = async (id, updateData, user) => {
  const venue = await getVenueById(id); // Throws 404 immediately if the targeted record doesn't exist

  // Organizers may only edit venues they created; admins/OPS retain full control.
  if (user?.role !== "ADMIN" && user?.role !== "OPS") {
    if (!venue.createdBy || venue.createdBy !== user?.id) {
      throw new AppError("You do not have permission to modify this venue.", 403);
    }
  }

  return prisma.venue.update({
    where: { id },
    data: updateData,
  });
};

const deleteVenue = async (id) => {
  await getVenueById(id);

  // Safety Boundary Guard: Prevent hard deletion of spatial structures if linked to active event listings
  const activeListingsCount = await prisma.listing.count({
    where: { venueId: id },
  });

  if (activeListingsCount > 0) {
    throw new AppError(
      "Cannot remove physical venue configuration. Active event or attraction listings are currently scheduled here.",
      400,
    );
  }

  await prisma.venue.delete({
    where: { id },
  });

  return { success: true };
};

module.exports = {
  createVenue,
  getVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
};
