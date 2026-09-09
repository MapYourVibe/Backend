const env = require("../src/config/env");
const bcrypt = require("bcryptjs");
const { prisma } = require("../src/config/db");
const { initializeAvailability } = require("../src/modules/inventory/inventory.service");

const EVENTS = [
  {
    title: "Neon Nights: Techno Takeover",
    description:
      "A high-energy techno night featuring top DJs spinning deep, driving beats until the early hours. Expect laser shows, immersive visuals, and a dance floor that never sleeps.",
    category: "Techno",
    venueName: "antiSOCIAL",
    address: "6th Rd, Khar West",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    eventDateOffset: 2, // 2 days from now
    tickets: [
      { name: "General Admission", priceInPaise: 99900, qty: 200, desc: "Entry before 11 PM" },
      { name: "VIP Skip-the-Line", priceInPaise: 199900, qty: 50, desc: "Priority entry + mezzanine access" },
    ],
  },
  {
    title: "Rooftop Jazz & Cocktails",
    description:
      "Unwind with smooth jazz under the stars on a stunning rooftop overlooking the city skyline. Craft cocktails and gourmet bites included with every table booking.",
    category: "Chill",
    venueName: "AER",
    address: "Palladium Mall, Lower Parel",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80",
    eventDateOffset: 3,
    tickets: [
      { name: "Standard Table", priceInPaise: 150000, qty: 80, desc: "2-drink minimum" },
      { name: "Premium Lounge", priceInPaise: 350000, qty: 20, desc: "Private booth + bottle service" },
    ],
  },
  {
    title: "Comedy Crack-Up: Open Mic Night",
    description:
      "India's funniest emerging comedians take the stage for a night of unfiltered laughs. sign up to perform or just enjoy the show with a drink in hand.",
    category: "Comedy",
    venueName: "Canvas Laugh Club",
    address: "Phoenix Marketcity, Kurla",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80",
    eventDateOffset: 1, // tomorrow
    tickets: [
      { name: "General", priceInPaise: 59900, qty: 150, desc: "Reserved seating" },
      { name: "Front Row", priceInPaise: 99900, qty: 30, desc: "Best seats in the house" },
    ],
  },
  {
    title: "Sunset Music Festival",
    description:
      "A full-day outdoor music festival celebrating indie, electronic, and folk artists. Multiple stages, food trucks, art installations, and a sunset main-stage headline set.",
    category: "Festival",
    venueName: "Mahalaxmi Racecourse",
    address: "Bhulabhai Desai Road, Mahalaxmi",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    eventDateOffset: 5,
    tickets: [
      { name: "Day Pass", priceInPaise: 249900, qty: 500, desc: "Full day access to all stages" },
      { name: "VIP Experience", priceInPaise: 499900, qty: 100, desc: "Backstage access + premium viewing" },
    ],
  },
  {
    title: "Bollywood Retro Night",
    description:
      "Relive the golden era of Bollywood with live performances of iconic hits from the 90s and 2000s. Dress code: retro chic. Best dressed wins a prize.",
    category: "Live Band",
    venueName: "Hard Rock Cafe",
    address: "Guru Nanak Road, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?w=800&q=80",
    eventDateOffset: 4,
    tickets: [
      { name: "Standard", priceInPaise: 79900, qty: 180, desc: "Standing" },
      { name: "VIP Table", priceInPaise: 249900, qty: 25, desc: "Reserved table for 4 + drinks" },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding development data...\n");

  // Platform settings
  let platformSettings = await prisma.platformSettings.findFirst();
  if (!platformSettings) {
    platformSettings = await prisma.platformSettings.create({
      data: {
        bookingFeePercent: 3.0,
        refundDeductionPercent: 10.0,
        tcsPercent: 1.0,
        bookingFeeGstPercent: 18.0,
      },
    });
    console.log("✅ Platform settings created");
  }

  // Organizer user
  const passwordHash = await bcrypt.hash("Password@123", 10);
  let user = await prisma.user.findUnique({ where: { email: "organizer@test.com" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Demo Organizer",
        email: "organizer@test.com",
        passwordHash,
        role: "ORGANIZER",
        emailVerified: true,
      },
    });
    console.log("✅ Organizer user created");
  }

  // Organizer profile
  let organizer = await prisma.organizerProfile.findUnique({ where: { userId: user.id } });
  if (!organizer) {
    organizer = await prisma.organizerProfile.create({
      data: {
        userId: user.id,
        businessName: "MapYourVibe Events",
        approvalStatus: "APPROVED",
      },
    });
    console.log("✅ Organizer profile created");
  }

  // Create events
  for (const evt of EVENTS) {
    const existing = await prisma.listing.findFirst({
      where: { title: evt.title, organizerId: organizer.id },
    });
    if (existing) {
      console.log(`ℹ️  "${evt.title}" already exists — skipping`);
      continue;
    }

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + evt.eventDateOffset);
    eventDate.setHours(20, 0, 0, 0); // 8 PM

    const listing = await prisma.listing.create({
      data: {
        organizerId: organizer.id,
        createdBy: user.id,
        listingType: "EVENT",
        title: evt.title,
        description: evt.description,
        category: evt.category,
        bannerUrl: evt.bannerUrl,
        galleryUrls: [],
        venueName: evt.venueName,
        address: evt.address,
        city: evt.city,
        state: evt.state,
        status: "PUBLISHED",
        bookingStatus: "OPEN",
        eventDate,
      },
    });
    console.log(`✅ Created listing: ${evt.title}`);

    // Create ticket types
    for (const t of evt.tickets) {
      const ticketType = await prisma.ticketType.create({
        data: {
          listingId: listing.id,
          name: t.name,
          description: t.desc,
          priceInPaise: t.priceInPaise,
          totalQuantity: t.qty,
          gstPercent: 18,
          gstInclusive: false,
        },
      });

      // Initialize Redis inventory
      try {
        await initializeAvailability("TICKET_TYPE", ticketType.id, ticketType.totalQuantity);
      } catch {
        // Redis might not be running — that's ok for dev
      }
    }
    console.log(`   🎟️  Ticket types created for "${evt.title}"`);
  }

  console.log("\n🎉 Seeding complete!");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("❌ Seeding failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
