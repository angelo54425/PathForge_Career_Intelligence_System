import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, targetCareer: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const assessments = await prisma.assessment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, career: true, profile: true, createdAt: true },
  });

  const latestSkills = (assessments[0]?.profile ?? {}) as Record<string, number>;

  const recentActivity = assessments.map((a) => ({
    career: a.career,
    createdAt: a.createdAt.toISOString(),
  }));

  return NextResponse.json({ user, latestSkills, recentActivity });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, targetCareer } = await req.json();

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(targetCareer !== undefined && { targetCareer }),
    },
    select: { id: true, name: true, email: true, targetCareer: true },
  });

  return NextResponse.json(updated);
}
