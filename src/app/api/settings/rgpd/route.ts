import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  const techs = await prisma.technician.findMany({
    where: {
      isActive: false,
      scheduledDeletionDate: { not: null },
    },
    include: { company: { select: { name: true } } },
    orderBy: { scheduledDeletionDate: "asc" },
  });

  const now = new Date();
  const result = techs.map((t) => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
    company: t.company,
    departureDate: t.departureDate,
    scheduledDeletionDate: t.scheduledDeletionDate,
    daysLeft: t.scheduledDeletionDate
      ? Math.ceil((t.scheduledDeletionDate.getTime() - now.getTime()) / 86400000)
      : 0,
  }));

  return NextResponse.json(result);
}
