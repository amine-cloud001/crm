import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParcelDetails } from "@/lib/sendit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // If order has a Sendit code, fetch latest status
    let senditDetails = null;
    if (order.senditCode) {
      try {
        senditDetails = await getParcelDetails(order.senditCode);
      } catch {
        // Sendit might be unreachable, continue with cached data
      }
    }

    return NextResponse.json({
      success: true,
      data: order,
      senditDetails,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
