const { z } = require("zod");

const createVenueSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3, "Venue name must be at least 3 characters").max(100),
    description: z.string().trim().max(1000).optional(),
    capacity: z.number().int().positive("Capacity threshold must be a positive integer"),
    amenities: z.array(z.string().trim().min(1)).default([]),
    address: z.string().trim().min(5, "Complete street address is required"),
    city: z.string().trim().min(2, "City name is required"),
    state: z.string().trim().min(2, "State name is required"),
    zipCode: z.string().trim().min(5).max(10),
    images: z.array(z.string().url("Every asset pointer must be a valid secure URL")).default([]),
    seatingType: z.enum(["SEATED", "STANDING", "MIXED_HYBRID", "UNASSIGNED"], {
      errorMap: () => ({
        message: "Seating type must be SEATED, STANDING, MIXED_HYBRID, or UNASSIGNED.",
      }),
    }),
  }),
});

const updateVenueSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid Venue ID format." }),
  }),
  body: createVenueSchema.shape.body.partial(),
});

const venueIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid Venue ID format." }),
  }),
});

module.exports = {
  createVenueSchema,
  updateVenueSchema,
  venueIdParamSchema,
};
