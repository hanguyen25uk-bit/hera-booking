import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { SERVICE_TEMPLATES } from "@/lib/service-templates";

export async function POST(req: NextRequest) {
  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { templateId } = body;

    // For now, only support "nail-salon" template
    if (templateId !== "nail-salon" && templateId !== SERVICE_TEMPLATES.industry) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const salonId = auth.salonId;

    // Track created and skipped items
    const result = {
      created: { categories: 0, services: 0, assignments: 0 },
      skipped: { categories: 0, services: 0 },
    };

    // Get existing categories and services to check for duplicates
    const existingCategories = await prisma.serviceCategory.findMany({
      where: { salonId },
      select: { name: true },
    });
    const existingCategoryNames = new Set(existingCategories.map((c) => c.name));

    const existingServices = await prisma.service.findMany({
      where: { salonId },
      select: { name: true },
    });
    const existingServiceNames = new Set(existingServices.map((s) => s.name));

    // Get all active staff for assignments
    const activeStaff = await prisma.staff.findMany({
      where: { salonId, active: true },
      select: { id: true },
    });

    // Use transaction for all-or-nothing
    await prisma.$transaction(async (tx) => {
      // Process each category
      for (let catIndex = 0; catIndex < SERVICE_TEMPLATES.categories.length; catIndex++) {
        const categoryTemplate = SERVICE_TEMPLATES.categories[catIndex];

        // Check if category exists
        let categoryId: string;
        if (existingCategoryNames.has(categoryTemplate.name)) {
          // Get existing category ID
          const existingCat = await tx.serviceCategory.findFirst({
            where: { salonId, name: categoryTemplate.name },
            select: { id: true },
          });
          categoryId = existingCat!.id;
          result.skipped.categories++;
        } else {
          // Create new category
          const newCategory = await tx.serviceCategory.create({
            data: {
              salonId,
              name: categoryTemplate.name,
              sortOrder: catIndex,
            },
          });
          categoryId = newCategory.id;
          result.created.categories++;
        }

        // Process each service in this category
        for (let svcIndex = 0; svcIndex < categoryTemplate.services.length; svcIndex++) {
          const serviceTemplate = categoryTemplate.services[svcIndex];

          // Check if service exists
          if (existingServiceNames.has(serviceTemplate.name)) {
            result.skipped.services++;
            continue;
          }

          // Create new service
          const newService = await tx.service.create({
            data: {
              salonId,
              categoryId,
              name: serviceTemplate.name,
              description: serviceTemplate.description,
              durationMinutes: serviceTemplate.duration,
              price: serviceTemplate.price,
              sortOrder: svcIndex,
              isActive: true,
            },
          });

          result.created.services++;

          // Create staff assignments for all active staff
          if (activeStaff.length > 0) {
            await tx.staffService.createMany({
              data: activeStaff.map((staff) => ({
                staffId: staff.id,
                serviceId: newService.id,
              })),
            });
            result.created.assignments += activeStaff.length;
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      template: SERVICE_TEMPLATES.name,
      ...result,
    });
  } catch (error) {
    console.error("Apply template error:", error);
    return NextResponse.json(
      { error: "Failed to apply template" },
      { status: 500 }
    );
  }
}
