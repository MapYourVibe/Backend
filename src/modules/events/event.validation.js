const { z } = require("zod");

const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
    description: z.string().trim().min(10, "Provide a descriptive breakdown"),
    category: z.string().trim().min(2, "Category is required"),

    // Distinguishes fixed scheduling from rolling attraction parameters
    listingType: z.enum(["EVENT", "ATTRACTION"]),

    bannerUrl: z.string().url(),
    galleryUrls: z.array(z.string().url()).default([]),
    venueBlueprintUrl: z.string().url().optional(),
    venueName: z.string().trim().min(2, "Venue name is required"),
    address: z.string().trim().min(2, "Address is required"),
    city: z.string().trim().min(2, "City is required"),
    state: z.string().trim().min(2, "State is required"),
    googleMapsUrl: z.string().url({ message: "Enter a valid Google Maps link" }).optional().or(z.literal("")),

    // Conditional requirements applied based on the chosen type in service layer
    eventDate: z.string().datetime({ message: "Invalid ISO datetime string format." }).optional(),

    allowPartialRefunds: z.boolean().default(true),
    refundAllowedUntilDays: z.number().int().nonnegative().default(0),

    // Nested structures to seed initial pricing tiers instantly
    ticketTypes: z
      .array(
        z.object({
          name: z.string().trim().min(2, "Tier name required"),
          description: z.string().trim().optional(),
          priceInPaise: z.number().int().positive(),
          totalQuantity: z.number().int().positive(),
          gstPercent: z.number().min(0).max(28).default(18),
          gstInclusive: z.boolean().default(false),
          coverChargeInPaise: z.number().int().nonnegative().default(0),
        }),
      )
      .optional(),

    capacitySlots: z
      .array(
        z.object({
          slotLabel: z.string().trim().min(1),
          date: z.string().date(), // YYYY-MM-DD format
          totalCapacity: z.number().int().positive(),
        }),
      )
      .optional(),
  }),
});

const updateEventSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid Listing ID format." }),
  }),
  body: createEventSchema.shape.body.partial(),
});

const reviewEventSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid Listing ID format." }),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
    remarks: z.string().trim().max(500).optional(),
  }),
});

const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid Listing ID format." }),
  }),
});

const toggleFeaturedSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "Invalid Listing ID format." }),
  }),
  body: z.object({
    featured: z.boolean().optional(),
  }),
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  reviewEventSchema,
  eventIdParamSchema,
  toggleFeaturedSchema,
};
