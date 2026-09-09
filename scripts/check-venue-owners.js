require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const venueUsers = await prisma.user.findMany({
    where: { role: "VENUE_OWNER" },
    select: { id: true, name: true, email: true },
  });
  console.log("VENUE_OWNER users:", JSON.stringify(venueUsers, null, 2));

  for (const u of venueUsers) {
    const orgProfile = await prisma.organizerProfile.findUnique({ where: { userId: u.id } });
    if (orgProfile) {
      const listings = await prisma.listing.findMany({ where: { organizerId: orgProfile.id }, select: { id: true } });
      console.log(`  ${u.email} has orgProfile id=${orgProfile.id}, listings=${listings.length}`);
    } else {
      console.log(`  ${u.email} has no orgProfile`);
    }
  }
  await prisma.$disconnect();
}
main();
