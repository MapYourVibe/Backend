const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../../config/db");
const AppError = require("../../utils/AppError");

const SALT_ROUNDS = 10;

async function createLead(data) {
  return prisma.eventLead.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || "Not provided",
      organization: data.organization,
      city: data.city,
      description: data.description,
      expectedAudience: data.expectedAudience,
      listingType: "EVENT",
      notes: data.website ? `Website/IG: ${data.website}` : null,
    },
  });
}

async function listLeads() {
  return prisma.eventLead.findMany({ orderBy: { createdAt: "desc" } });
}

async function adminUpdateLead(leadId, { status, notes }, adminUserId) {
  const lead = await prisma.eventLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new AppError("Lead not found", 404);

  if (status !== "APPROVED") {
    return prisma.eventLead.update({
      where: { id: leadId },
      data: { status: "REJECTED", notes },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.eventLead.update({
      where: { id: leadId },
      data: { status: "APPROVED", notes },
    });

    const existingUser = await tx.user.findUnique({ where: { email: lead.email } });

    let user;
    let tempPassword = null;

    if (existingUser) {
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: { role: "ORGANIZER" },
      });

      const existingProfile = await tx.organizerProfile.findUnique({
        where: { userId: existingUser.id },
      });

      if (existingProfile) {
        await tx.organizerProfile.update({
          where: { userId: existingUser.id },
          data: { maxListings: 1 },
        });
      } else {
        await tx.organizerProfile.create({
          data: {
            userId: existingUser.id,
            businessName: lead.organization,
            approvalStatus: "APPROVED",
            onboardedBy: adminUserId,
            onboardedAt: new Date(),
            source: "lead",
            maxListings: 1,
          },
        });
      }
    } else {
      tempPassword = crypto.randomUUID().slice(0, 12) + "!Aa1";
      const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

      user = await tx.user.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: null,
          passwordHash,
          role: "ORGANIZER",
        },
      });

      await tx.organizerProfile.create({
        data: {
          userId: user.id,
          businessName: lead.organization,
          approvalStatus: "APPROVED",
          onboardedBy: adminUserId,
          onboardedAt: new Date(),
          source: "lead",
          maxListings: 1,
        },
      });
    }

    return { lead: updated, user: { id: user.id, name: user.name, email: user.email, role: user.role }, tempPassword };
  });

  return result;
}

module.exports = { createLead, listLeads, adminUpdateLead };
