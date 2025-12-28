import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: Lấy danh sách dịch vụ của một staff
export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  
  try {
    if (staffId) {
      const staffServices = await prisma.staffService.findMany({
        where: { staffId },
        include: { service: true },
      });
      return NextResponse.json(staffServices.map(ss => ss.service));
    }
    
    // Trả về tất cả staff với services của họ
    const allStaffServices = await prisma.staffService.findMany({
      include: { staff: true, service: true },
    });
    return NextResponse.json(allStaffServices);
  } catch (error) {
    console.error("Fetch staff services error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST: Gán dịch vụ cho staff
export async function POST(req: NextRequest) {
  try {
    const { staffId, serviceIds } = await req.json();
    
    if (!staffId || !Array.isArray(serviceIds)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    
    // Xóa tất cả dịch vụ cũ của staff
    await prisma.staffService.deleteMany({
      where: { staffId },
    });
    
    // Thêm dịch vụ mới
    if (serviceIds.length > 0) {
      await prisma.staffService.createMany({
        data: serviceIds.map((serviceId: string) => ({
          staffId,
          serviceId,
        })),
      });
    }
    
    // Trả về danh sách mới
    const updatedServices = await prisma.staffService.findMany({
      where: { staffId },
      include: { service: true },
    });
    
    return NextResponse.json(updatedServices.map(ss => ss.service));
  } catch (error) {
    console.error("Update staff services error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
