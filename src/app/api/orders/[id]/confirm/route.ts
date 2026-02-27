import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createParcel, mapSenditStatusToAppStatus } from "@/lib/sendit";

export async function POST(
  req: NextRequest,
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

    if (order.senditCode) {
      return NextResponse.json(
        { success: false, error: "Order already confirmed and sent to Sendit" },
        { status: 400 }
      );
    }

    // Get optional overrides from request body
    const body = await req.json().catch(() => ({}));
    const districtId = body.district_id || order.districtId;

    if (!districtId) {
      return NextResponse.json(
        { success: false, error: "District (city) is required. Please select a city." },
        { status: 400 }
      );
    }

    const products = JSON.parse(order.products);
    const productNames = products
      .map((p: { title: string; quantity: number }) => `${p.title} x${p.quantity}`)
      .join(", ");

    // Create parcel in Sendit
    const parcel = await createParcel({
      district_id: districtId,
      name: order.customerName,
      phone: order.customerPhone,
      address: order.customerAddress,
      amount: order.totalPrice,
      reference: order.shopifyOrderNumber,
      comment: productNames,
      allow_open: body.allow_open ?? 1,
      allow_try: body.allow_try ?? 1,
      products_from_stock: 0,
      option_exchange: 0,
    });

    // Update order with Sendit info
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        senditCode: parcel.code,
        senditStatus: parcel.status,
        senditFee: parcel.fee,
        senditLabelUrl: parcel.labelUrl || null,
        districtId: districtId,
        status: mapSenditStatusToAppStatus(parcel.status),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      senditParcel: parcel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
