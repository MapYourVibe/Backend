const bcrypt = require("bcryptjs");
const { prisma } = require("../src/config/db");

const USERS = [
  {
    name: "Priya Sharma",
    email: "priya@test.com",
    password: "Password@123",
  },
  {
    name: "Rohan Gupta",
    email: "rohan@test.com",
    password: "Password@123",
  },
  {
    name: "Ananya Singh",
    email: "ananya@test.com",
    password: "Password@123",
  },
];

const CAFES = [
  {
    ownerEmail: "priya@test.com",
    title: "The Third Wave Coffee",
    description:
      "Specialty coffee roasters serving single-origin brews, cold press, and artisan pastries in a minimalist industrial-chic space with free Wi-Fi.",
    venueName: "The Third Wave Coffee",
    address: "Sector 15, Part 2, Gurgaon",
    city: "Gurgaon",
    state: "Haryana",
    bannerUrl:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
    category: "Cafe",
    cuisineTags: ["Cafe", "Coffee", "Pastries"],
    avgMealCost: 60000,
    openingHours: {
      mon: { open: "08:00", close: "22:00" },
      tue: { open: "08:00", close: "22:00" },
      wed: { open: "08:00", close: "22:00" },
      thu: { open: "08:00", close: "22:00" },
      fri: { open: "08:00", close: "23:00" },
      sat: { open: "09:00", close: "23:00" },
      sun: { open: "09:00", close: "21:00" },
    },
    tables: [
      { label: "Window Counter", capacity: 2, basePricePerHr: 25000 },
      { label: "Couple Nook", capacity: 2, basePricePerHr: 30000 },
      { label: "4-Seater Booth", capacity: 4, basePricePerHr: 40000 },
    ],
  },
  {
    ownerEmail: "rohan@test.com",
    title: "SodaBottleOpenerWala",
    description:
      "Quirky Parsi cafe serving iconic Irani chai, bun-maskas, berry pulao, and nostalgic Irani dishes in a retro Bollywood-themed decor.",
    venueName: "SodaBottleOpenerWala",
    address: "DLF Cyber Hub, Gurgaon",
    city: "Gurgaon",
    state: "Haryana",
    bannerUrl:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80",
    category: "Cafe",
    cuisineTags: ["Indian", "Parsi", "Cafe"],
    avgMealCost: 85000,
    openingHours: {
      mon: { open: "10:00", close: "23:00" },
      tue: { open: "10:00", close: "23:00" },
      wed: { open: "10:00", close: "23:00" },
      thu: { open: "10:00", close: "23:00" },
      fri: { open: "10:00", close: "00:00" },
      sat: { open: "10:00", close: "00:00" },
      sun: { open: "10:00", close: "22:00" },
    },
    tables: [
      { label: "Irani Corner", capacity: 2, basePricePerHr: 30000, peakMultiplier: 1.5 },
      { label: "Family Table", capacity: 6, basePricePerHr: 50000, peakMultiplier: 1.3 },
      { label: "Rooftop Pair Seat", capacity: 2, basePricePerHr: 35000, peakMultiplier: 2.0 },
    ],
  },
  {
    ownerEmail: "ananya@test.com",
    title: "Farzi Cafe Cyber Hub",
    description:
      "Modern Indian bistro blending molecular gastronomy with Indian flavours - known for butter chicken dim sum, deconstructed classics, and craft cocktails.",
    venueName: "Farzi Cafe Cyber Hub",
    address: "Cyber Hub, DLF Phase 2, Gurgaon",
    city: "Gurgaon",
    state: "Haryana",
    bannerUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    category: "Fine Dining",
    cuisineTags: ["Indian", "Fine Dining", "Molecular"],
    avgMealCost: 150000,
    openingHours: {
      mon: { open: "12:00", close: "23:00" },
      tue: { open: "12:00", close: "23:00" },
      wed: { open: "12:00", close: "23:00" },
      thu: { open: "12:00", close: "23:00" },
      fri: { open: "12:00", close: "00:00" },
      sat: { open: "11:00", close: "00:00" },
      sun: { open: "11:00", close: "23:00" },
    },
    tables: [
      { label: "Chef's Table", capacity: 4, basePricePerHr: 60000, peakMultiplier: 1.5 },
      { label: "Lounge Sofa", capacity: 4, basePricePerHr: 50000, peakMultiplier: 1.3 },
      { label: "Bar High-Top", capacity: 2, basePricePerHr: 40000, peakMultiplier: 1.8 },
      { label: "Private Dining Room", capacity: 8, basePricePerHr: 80000, peakMultiplier: 2.0 },
    ],
  },
];

async function main() {
  console.log("Seeding 3 users and 3 Gurgaon cafes...\n");
  const passwordHash = await bcrypt.hash("Password@123", 12);

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  [skip] User ${u.email} already exists`);
      continue;
    }
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: "USER",
        emailVerified: true,
      },
    });
    console.log(`  [ok] Created user: ${u.name} <${u.email}>`);
  }

  for (const c of CAFES) {
    const user = await prisma.user.findUnique({ where: { email: c.ownerEmail } });
    if (!user) {
      console.log(`  [error] User ${c.ownerEmail} not found, skipping "${c.title}"`);
      continue;
    }

    const existingListing = await prisma.listing.findFirst({
      where: { title: c.title, city: c.city },
    });
    if (existingListing) {
      console.log(`  [skip] Cafe "${c.title}" already exists`);
      continue;
    }

    // Create organizer profile (required for listing.organizerId FK)
    let orgProfile = await prisma.organizerProfile.findUnique({ where: { userId: user.id } });
    if (!orgProfile) {
      orgProfile = await prisma.organizerProfile.create({
        data: {
          userId: user.id,
          businessName: c.title + " Events",
          approvalStatus: "APPROVED",
          onboardedAt: new Date(),
        },
      });
      console.log(`  [ok] Created organizer profile for ${user.name}`);
    }

    // Create venue owner profile
    let ownerProfile = await prisma.venueOwnerProfile.findUnique({ where: { userId: user.id } });
    if (!ownerProfile) {
      ownerProfile = await prisma.venueOwnerProfile.create({
        data: {
          userId: user.id,
          businessName: c.title + " Pvt Ltd",
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
        },
      });
      console.log(`  [ok] Created venue owner profile for ${user.name}`);
    }

    // Update user role to VENUE_OWNER
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "VENUE_OWNER" },
    });

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        organizerId: orgProfile.id,
        createdBy: user.id,
        listingType: "EVENT",
        venueType: "CAFE",
        title: c.title,
        description: c.description,
        category: c.category,
        bannerUrl: c.bannerUrl,
        galleryUrls: [c.bannerUrl],
        venueName: c.venueName,
        address: c.address,
        city: c.city,
        state: c.state,
        status: "PUBLISHED",
        bookingStatus: "OPEN",
      },
    });

    // Create cafe record
    const cafe = await prisma.cafe.create({
      data: {
        listingId: listing.id,
        ownerId: ownerProfile.id,
        description: c.description,
        openingHours: c.openingHours,
        avgMealCost: c.avgMealCost,
        cuisineTags: c.cuisineTags,
        cancellationMins: 60,
        noShowMins: 30,
        status: "APPROVED",
        featured: true,
      },
    });

    // Create tables
    for (let i = 0; i < c.tables.length; i++) {
      const t = c.tables[i];
      await prisma.cafeTable.create({
        data: {
          cafeId: cafe.id,
          label: t.label,
          capacity: t.capacity,
          basePricePerHr: t.basePricePerHr,
          peakMultiplier: t.peakMultiplier || 1.0,
          status: "ACTIVE",
          sortOrder: i,
        },
      });
    }

    console.log(`  [ok] Created cafe: ${c.title} (${c.tables.length} tables)`);
  }

  console.log("\nVerifying...");
  const cafeCount = await prisma.cafe.count();
  const venueOwners = await prisma.venueOwnerProfile.count();
  const allCafes = await prisma.cafe.findMany({
    include: { listing: { select: { title: true, city: true } }, tables: true },
  });
  console.log(`  Total cafes: ${cafeCount}`);
  console.log(`  Total venue owners: ${venueOwners}`);
  for (const cafe of allCafes) {
    console.log(`  - ${cafe.listing.title} (${cafe.listing.city}) — ${cafe.tables.length} tables — ${cafe.status}`);
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
