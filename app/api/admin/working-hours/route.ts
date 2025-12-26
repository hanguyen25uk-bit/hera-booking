import { NextResponse } from "next/server";

let workingHours = [
  { dayOfWeek: 0, dayName: "Chủ nhật", isOpen: false, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 1, dayName: "Thứ hai", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 2, dayName: "Thứ ba", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 3, dayName: "Thứ tư", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 4, dayName: "Thứ năm", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 5, dayName: "Thứ sáu", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 6, dayName: "Thứ bảy", isOpen: true, openTime: "09:00", closeTime: "18:00" },
];

export async function GET() {
  return NextResponse.json(workingHours);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    workingHours = body;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
