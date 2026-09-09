const env = require("../src/config/env");
const bcrypt = require("bcryptjs");
const { prisma } = require("../src/config/db");
const { initializeAvailability } = require("../src/modules/inventory/inventory.service");

const ORGANIZERS = [
  {
    name: "Riya Kapoor",
    email: "riya@test.com",
    password: "Password@123",
    businessName: "EventX Productions",
  },
  {
    name: "Arjun Mehta",
    email: "arjun@test.com",
    password: "Password@123",
    businessName: "Urban Vibes Co.",
  },
  {
    name: "Sneha Iyer",
    email: "sneha@test.com",
    password: "Password@123",
    businessName: "Live Nation India",
  },
];

const EVENTS = [
  // ── Mumbai (3) ──
  {
    organizerEmail: "organizer@test.com",
    title: "Neon Nights: Techno Takeover",
    description:
      "A high-energy techno night featuring top DJs spinning deep, driving beats until the early hours. Expect laser shows, immersive visuals, and a dance floor that never sleeps.",
    category: "Nightlife",
    venueName: "antiSOCIAL",
    address: "6th Rd, Khar West",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
    eventDateOffset: 12,
    tickets: [
      { name: "General Admission", priceInPaise: 99900, qty: 200, desc: "Entry before 11 PM" },
      { name: "VIP Skip-the-Line", priceInPaise: 199900, qty: 50, desc: "Priority entry + mezzanine access" },
    ],
  },
  {
    organizerEmail: "riya@test.com",
    title: "Bollywood Retro Night",
    description:
      "Relive the golden era of Bollywood with live performances of iconic hits from the 90s and 2000s. Dress code: retro chic. Best dressed wins a prize.",
    category: "Music",
    venueName: "Hard Rock Cafe",
    address: "Guru Nanak Road, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
    eventDateOffset: 18,
    tickets: [
      { name: "Standard", priceInPaise: 79900, qty: 180, desc: "Standing" },
      { name: "VIP Table", priceInPaise: 249900, qty: 25, desc: "Reserved table for 4 + drinks" },
    ],
  },
  {
    organizerEmail: "arjun@test.com",
    title: "Mumbai Street Food Festival",
    description:
      "Over 50 food stalls serving the best vada pav, pav bhaji, pani puri, and more from across the city. Live cooking demos and contests throughout the day.",
    category: "Food & Drink",
    venueName: "Juhu Beach Ground",
    address: "Juhu Tara Road, Juhu",
    city: "Mumbai",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    eventDateOffset: 22,
    tickets: [
      { name: "Day Pass", priceInPaise: 39900, qty: 500, desc: "Full day entry + 2 tasting coupons" },
      { name: "Foodie Pass", priceInPaise: 99900, qty: 100, desc: "Unlimited tastings + priority queues" },
    ],
  },

  // ── Delhi (3) ──
  {
    organizerEmail: "riya@test.com",
    title: "Tech Summit Delhi 2026",
    description:
      "India's premier tech conference bringing together founders, engineers, and investors. Keynotes, workshops, and a startup pitch competition with ₹10L in prizes.",
    category: "Tech",
    venueName: "Pragati Maidan - Hall 5",
    address: "Mathura Road, IP Estate",
    city: "Delhi",
    state: "Delhi",
    bannerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 14,
    tickets: [
      { name: "Conference Pass", priceInPaise: 299900, qty: 300, desc: "All keynotes + workshops" },
      { name: "VIP All-Access", priceInPaise: 799900, qty: 50, desc: "Front row + networking dinner + swag bag" },
    ],
  },
  {
    organizerEmail: "sneha@test.com",
    title: "Delhi Comedy Mela",
    description:
      "An evening of non-stop laughter featuring 6 of Delhi's funniest comedians. Open mic segment for brave souls. Drinks and snacks included.",
    category: "Comedy",
    venueName: "Canvas Laugh Club",
    address: "Cyber Hub, DLF Phase 2",
    city: "Delhi",
    state: "Delhi",
    bannerUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
    eventDateOffset: 16,
    tickets: [
      { name: "Regular Seating", priceInPaise: 59900, qty: 120, desc: "Reserved seat" },
      { name: "Front Row", priceInPaise: 129900, qty: 20, desc: "Best view + meet & greet" },
    ],
  },
  {
    organizerEmail: "arjun@test.com",
    title: "Winter Art Exhibition",
    description:
      "A curated showcase of contemporary Indian art featuring 30+ artists. Paintings, sculptures, installations, and live art sessions. Free guided tours every hour.",
    category: "Art",
    venueName: "India Habitat Centre",
    address: "Lodhi Road, institutional Area",
    city: "Delhi",
    state: "Delhi",
    bannerUrl: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 25,
    tickets: [
      { name: "General Entry", priceInPaise: 19900, qty: 200, desc: "Self-guided tour" },
      { name: "Curator-Led Tour", priceInPaise: 79900, qty: 30, desc: "Guided tour + catalogue + wine" },
    ],
  },

  // ── Bangalore (3) ──
  {
    organizerEmail: "sneha@test.com",
    title: "Bangalore Indie Music Fest",
    description:
      "Two days of the best independent music from across India. 15 bands, 2 stages, food trucks, and a vinyl market. Camping available on-site.",
    category: "Music",
    venueName: "Phoenix Marketcity Open Air",
    address: "Whitefield Main Road",
    city: "Bangalore",
    state: "Karnataka",
    bannerUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 20,
    tickets: [
      { name: "Day Pass", priceInPaise: 149900, qty: 400, desc: "Single day access" },
      { name: "Weekend Pass", priceInPaise: 249900, qty: 200, desc: "Both days + camping" },
    ],
  },
  {
    organizerEmail: "arjun@test.com",
    title: "Startup Weekend Bangalore",
    description:
      "54 hours of building, mentoring, and pitching. Form a team, validate your idea, and present to investors. Pizza and coffee fuelled.",
    category: "Tech",
    venueName: "IAL Campus",
    address: "Jayamahal, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    bannerUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 28,
    tickets: [
      { name: "Participant", priceInPaise: 49900, qty: 100, desc: "Full weekend access" },
      { name: "Mentor Pass", priceInPaise: 19900, qty: 30, desc: "Observe + network" },
    ],
  },
  {
    organizerEmail: "riya@test.com",
    title: "Craft Beer & BBQ Festival",
    description:
      "Over 20 craft breweries and 15 BBQ stalls under one roof. Live bands, beer tasting flights, and a people's choice award. Kids welcome before 5 PM.",
    category: "Food & Drink",
    venueName: "The Lalit Ashok Garden",
    address: "Kumara Krupa Road",
    city: "Bangalore",
    state: "Karnataka",
    bannerUrl: "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    eventDateOffset: 15,
    tickets: [
      { name: "Entry + 2 Tastings", priceInPaise: 89900, qty: 300, desc: "General entry + beer flights" },
      { name: "Unlimited Tastings", priceInPaise: 199900, qty: 80, desc: "Open bar + VIP lounge" },
    ],
  },

  // ── Pune (2) ──
  {
    organizerEmail: "arjun@test.com",
    title: "Pune Heritage Walk & Food Tour",
    description:
      "A 4-hour guided walk through Pune's historic spots — Shaniwar Wada, Dagdusheth, and Kasba Peth — with stops forMisal Pav, Mastani, and Vada Pav.",
    category: "Food & Drink",
    venueName: "Shaniwar Wada Gate",
    address: "Shaniwar Peth, Pune",
    city: "Pune",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    eventDateOffset: 13,
    tickets: [
      { name: "Walking Tour", priceInPaise: 129900, qty: 40, desc: "Guided walk + 3 food stops" },
      { name: "Premium Tour", priceInPaise: 249900, qty: 15, desc: "Private guide + 5 food stops + souvenir" },
    ],
  },
  {
    organizerEmail: "sneha@test.com",
    title: "Pune Marathon 2026",
    description:
      "Run through the streets of Pune in this annual marathon. 5K, 10K, and 21K categories. Timing chips, medals, and post-run brunch included.",
    category: "Sports",
    venueName: "Deccan Gymkhana Ground",
    address: "Jangali Maharaj Road, Shivajinagar",
    city: "Pune",
    state: "Maharashtra",
    bannerUrl: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&q=80",
    eventDateOffset: 30,
    tickets: [
      { name: "5K Fun Run", priceInPaise: 99900, qty: 500, desc: "Timing chip + medal + T-shirt" },
      { name: "21K Half Marathon", priceInPaise: 199900, qty: 200, desc: "Timing chip + medal + T-shirt + brunch" },
    ],
  },

  // ── Chennai (2) ──
  {
    organizerEmail: "riya@test.com",
    title: "Chennai Classical Music Night",
    description:
      "An enchanting evening of Carnatic music featuring Padma Shri awardees. Traditional renditions in an intimate amphitheatre setting.",
    category: "Music",
    venueName: "Kamaraj Arangam",
    address: "Thousand Lights, Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    bannerUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 17,
    tickets: [
      { name: "Balcony", priceInPaise: 149900, qty: 150, desc: "Upper balcony seating" },
      { name: "Front Section", priceInPaise: 349900, qty: 50, desc: "First 3 rows + dinner break access" },
    ],
  },
  {
    organizerEmail: "arjun@test.com",
    title: "Marina Beach Fitness Carnival",
    description:
      "A full-day fitness event on Marina Beach. Yoga at sunrise, CrossFit challenges, Zumba, and a healthy food market. All fitness levels welcome.",
    category: "Sports",
    venueName: "Marina Beach Ground",
    address: "Kamaraj Salai, Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    bannerUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&q=80",
    eventDateOffset: 19,
    tickets: [
      { name: "Day Pass", priceInPaise: 59900, qty: 300, desc: "All activities + healthy lunch" },
      { name: "VIP Fitness Pack", priceInPaise: 149900, qty: 50, desc: "All activities + personal trainer session + kit" },
    ],
  },

  // ── Hyderabad (2) ──
  {
    organizerEmail: "sneha@test.com",
    title: "Hyderabad Food Walk",
    description:
      "Explore the legendary food of Old Hyderabad — Hyderabadi Biryani, Haleem, Irani Chai, and Double Ka Meetha. A 3-hour culinary journey.",
    category: "Food & Drink",
    venueName: "Charminar Area",
    address: "Charminar, Old City, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    bannerUrl: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    eventDateOffset: 21,
    tickets: [
      { name: "Food Walk", priceInPaise: 129900, qty: 30, desc: "Guided tour + 4 tastings" },
      { name: "Premium Food Walk", priceInPaise: 249900, qty: 10, desc: "Private guide + 6 tastings + recipe book" },
    ],
  },
  {
    organizerEmail: "arjun@test.com",
    title: "Ramoji Film City Comedy Night",
    description:
      "Comedy show at India's largest film studio complex. Stand-up, sketch comedy, and improv. Dinner and a backstage studio tour included.",
    category: "Comedy",
    venueName: "Ramoji Film City - Water Front",
    address: "Annojiguda, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    bannerUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
    eventDateOffset: 26,
    tickets: [
      { name: "Show Only", priceInPaise: 99900, qty: 200, desc: "Comedy show + dinner" },
      { name: "Show + Studio Tour", priceInPaise: 199900, qty: 40, desc: "Comedy show + dinner + backstage tour" },
    ],
  },

  // ── Kolkata (2) ──
  {
    organizerEmail: "riya@test.com",
    title: "Kolkata Book Fair Special",
    description:
      "A literary festival celebrating Bengali and Indian literature. Author readings, book launches, poetry slams, and a rare book auction.",
    category: "Art",
    venueName: "Science City Auditorium",
    address: "JBS Haldane Avenue, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    bannerUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 23,
    tickets: [
      { name: "Day Pass", priceInPaise: 29900, qty: 500, desc: "Entry to all sessions" },
      { name: "Festival Pass", priceInPaise: 99900, qty: 100, desc: "All 3 days + author meet & greet" },
    ],
  },
  {
    organizerEmail: "sneha@test.com",
    title: "Kolkata Street Photography Walk",
    description:
      "Capture the soul of Kolkata — College Street, Kumartuli, and Howrah Bridge. Led by award-winning photographer Raghu Rai's protégé.",
    category: "Art",
    venueName: "College Street Coffee House",
    address: "College Street, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    bannerUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 11,
    tickets: [
      { name: "Walk Entry", priceInPaise: 79900, qty: 25, desc: "Guided walk + critique session" },
      { name: "Walk + Workshop", priceInPaise: 199900, qty: 10, desc: "Guided walk + 2-hour editing workshop" },
    ],
  },

  // ── Goa (2) ──
  {
    organizerEmail: "arjun@test.com",
    title: "Goa Beach Music Festival",
    description:
      "Three days of non-stop music on Anjuna Beach. International DJs, live bands, drum circles, and bonfires. Camping and glamping options available.",
    category: "Music",
    venueName: "Anjuna Beach Ground",
    address: "Anjuna, North Goa",
    city: "Goa",
    state: "Goa",
    bannerUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 27,
    tickets: [
      { name: "Day Pass", priceInPaise: 199900, qty: 500, desc: "Single day access" },
      { name: "3-Day Festival Pass", priceInPaise: 499900, qty: 200, desc: "All days + camping + meals" },
    ],
  },
  {
    organizerEmail: "sneha@test.com",
    title: "Goa Sunset Yoga Retreat",
    description:
      "A weekend wellness retreat on Palolem Beach. Sunrise yoga, sound healing, Ayurvedic cooking class, and beach meditation sessions.",
    category: "Wellness",
    venueName: "The Postcard Cuelim",
    address: "Cuelim, Benaulim, Goa",
    city: "Goa",
    state: "Goa",
    bannerUrl: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 24,
    tickets: [
      { name: "Day Retreat", priceInPaise: 299900, qty: 30, desc: "Yoga + lunch + meditation" },
      { name: "Weekend Package", priceInPaise: 799900, qty: 15, desc: "2 nights stay + all sessions + meals" },
    ],
  },

  // ── Jaipur (2) ──
  {
    organizerEmail: "riya@test.com",
    title: "Jaipur Literature Festival After Dark",
    description:
      "An evening literary event with candle-lit readings, storytelling sessions, and acoustic music at the historic Narain Niwas Palace.",
    category: "Art",
    venueName: "Narain Niwas Palace",
    address: "Station Road, Kanota, Jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    bannerUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 29,
    tickets: [
      { name: "Evening Pass", priceInPaise: 99900, qty: 80, desc: "All readings + snacks" },
      { name: "Royal Pass", priceInPaise: 249900, qty: 20, desc: "Front row + author dinner + signed book" },
    ],
  },
  {
    organizerEmail: "arjun@test.com",
    title: "Jaipur Food & Craft Bazaar",
    description:
      "A vibrant bazaar celebrating Rajasthani food and crafts. Live folk music, puppet shows, block printing workshops, and Dal Baati Churma.",
    category: "Food & Drink",
    venueName: "Jawahar Kala Kendra",
    address: "Jawahar Kala Kendra, Jhalana Doongri",
    city: "Jaipur",
    state: "Rajasthan",
    bannerUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    eventDateOffset: 16,
    tickets: [
      { name: "Bazaar Entry", priceInPaise: 49900, qty: 400, desc: "Entry + 2 food tokens" },
      { name: "Workshop + Bazaar", priceInPaise: 149900, qty: 50, desc: "Block printing workshop + bazaar + food" },
    ],
  },

  // ── Ahmedabad (2) ──
  {
    organizerEmail: "sneha@test.com",
    title: "Ahmedabad Startup Meetup",
    description:
      "Monthly meetup for Ahmedabad's startup community. Lightning talks, investoroffice hours, and a demo day for early-stage startups.",
    category: "Tech",
    venueName: "Atal Bihari VCCIC",
    address: "IIM Road, Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    bannerUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 12,
    tickets: [
      { name: "Networking Pass", priceInPaise: 29900, qty: 100, desc: "Lightning talks + networking" },
      { name: "Founder Pass", priceInPaise: 99900, qty: 20, desc: "Demo day + investor office hours" },
    ],
  },
  {
    organizerEmail: "riya@test.com",
    title: "Sabarmati Riverfront Music Evening",
    description:
      "An intimate music evening on the Sabarmati Riverfront. Sufi, folk, and fusion artists perform as the sun sets over the river.",
    category: "Music",
    venueName: "Sabarmati Riverfront - Event Ground",
    address: "Sardar Patel Bridge, Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    bannerUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80",
    blueprintUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    eventDateOffset: 20,
    tickets: [
      { name: "Lawn Seating", priceInPaise: 79900, qty: 300, desc: "Open lawn" },
      { name: "VIP Lounge", priceInPaise: 199900, qty: 40, desc: "Covered lounge + dinner + meet artists" },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding 20 events across 3 organizers...\n");

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

  // Create organizer users
  const passwordHash = await bcrypt.hash("Password@123", 10);
  const organizerMap = {};

  for (const org of ORGANIZERS) {
    let user = await prisma.user.findUnique({ where: { email: org.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: org.name,
          email: org.email,
          passwordHash,
          role: "ORGANIZER",
          emailVerified: true,
        },
      });
      console.log(`✅ User created: ${org.email}`);
    } else {
      console.log(`ℹ️  User exists: ${org.email}`);
    }

    let profile = await prisma.organizerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.organizerProfile.create({
        data: {
          userId: user.id,
          businessName: org.businessName,
          approvalStatus: "APPROVED",
        },
      });
      console.log(`   ✅ Organizer profile: ${org.businessName}`);
    } else {
      console.log(`   ℹ️  Profile exists: ${org.businessName}`);
    }

    organizerMap[org.email] = { user, organizer: profile };
  }

  // Create events
  let created = 0;
  let skipped = 0;

  for (const evt of EVENTS) {
    const org = organizerMap[evt.organizerEmail];
    if (!org) {
      console.log(`❌ Organizer not found: ${evt.organizerEmail}`);
      continue;
    }

    const existing = await prisma.listing.findFirst({
      where: { title: evt.title, organizerId: org.organizer.id },
    });
    if (existing) {
      console.log(`⏭️  "${evt.title}" exists — skipping`);
      skipped++;
      continue;
    }

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + evt.eventDateOffset);
    eventDate.setHours(20, 0, 0, 0);

    const listing = await prisma.listing.create({
      data: {
        organizerId: org.organizer.id,
        createdBy: org.user.id,
        listingType: "EVENT",
        title: evt.title,
        description: evt.description,
        category: evt.category,
        bannerUrl: evt.bannerUrl,
        galleryUrls: [],
        venueBlueprintUrl: evt.blueprintUrl,
        venueName: evt.venueName,
        address: evt.address,
        city: evt.city,
        state: evt.state,
        status: "PUBLISHED",
        bookingStatus: "OPEN",
        eventDate,
      },
    });
    created++;

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

      try {
        await initializeAvailability("TICKET_TYPE", ticketType.id, ticketType.totalQuantity);
      } catch {
        // Redis might not be running
      }
    }
    console.log(`✅ [${evt.city}] ${evt.title}`);
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
  console.log("\n📋 User credentials:");
  console.log("   organizer@test.com / Password@123");
  for (const org of ORGANIZERS) {
    console.log(`   ${org.email} / Password@123 — ${org.businessName}`);
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("❌ Seeding failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
