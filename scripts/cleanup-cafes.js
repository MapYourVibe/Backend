/**
 * Cleanup script — deletes all cafe-related data + VENUE_OWNER users from the database.
 * Handles foreign key cascade: listings → ticket types, orders, etc.
 *
 * Usage: node scripts/cleanup-cafes.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up cafe data...\n");

  // 1. Cafe data (children first)
  const cafeBookings = await prisma.cafeBooking.deleteMany();
  console.log(`  Deleted ${cafeBookings.count} cafe bookings`);
  const cafePricingTiers = await prisma.cafePricingTier.deleteMany();
  console.log(`  Deleted ${cafePricingTiers.count} cafe pricing tiers`);
  const cafeTables = await prisma.cafeTable.deleteMany();
  console.log(`  Deleted ${cafeTables.count} cafe tables`);
  const cafes = await prisma.cafe.deleteMany();
  console.log(`  Deleted ${cafes.count} cafes`);
  const venueOwnerProfiles = await prisma.venueOwnerProfile.deleteMany();
  console.log(`  Deleted ${venueOwnerProfiles.count} venue owner profiles`);

  // 2. VENUE_OWNER users — clean up organizer profiles + listings first
  const venueUsers = await prisma.user.findMany({
    where: { role: "VENUE_OWNER" },
    select: { id: true },
  });
  const userIds = venueUsers.map((u) => u.id);

  if (userIds.length > 0) {
    const orgProfiles = await prisma.organizerProfile.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const orgIds = orgProfiles.map((op) => op.id);

    if (orgIds.length > 0) {
      const listings = await prisma.listing.findMany({
        where: { organizerId: { in: orgIds } },
        select: { id: true },
      });
      const listingIds = listings.map((l) => l.id);

      if (listingIds.length > 0) {
        await prisma.ticketType.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.capacitySlot.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.order.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.review.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.wishlist.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.coupon.deleteMany({ where: { listingId: { in: listingIds } } });
        const d = await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
        console.log(`  Deleted ${d.count} listings from VENUE_OWNER users`);
      }

      const op = await prisma.organizerProfile.deleteMany({ where: { userId: { in: userIds } } });
      console.log(`  Deleted ${op.count} organizer profiles for VENUE_OWNER users`);
    }
  }

  const venueOwners = await prisma.user.deleteMany({ where: { role: "VENUE_OWNER" } });
  console.log(`  Deleted ${venueOwners.count} VENUE_OWNER users`);

  console.log("\n✅ All cafe data removed from database.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
