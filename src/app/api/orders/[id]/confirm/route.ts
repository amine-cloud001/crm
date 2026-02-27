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

    const body = await req.json().catch(() => ({}));
    const districtId = body.district_id || order.districtId;

    if (!districtId) {
      return NextResponse.json(
        { success: false, error: "District (city) is required. Please select a city." },
        { status: 400 }
      );
    }

    // Use edited fields from body, fall back to stored order data
    const customerName = body.customerName || order.customerName;
    const customerPhone = body.customerPhone || order.customerPhone;
    const customerAddress = body.customerAddress || order.customerAddress;
    const totalPrice = body.totalPrice != null ? parseFloat(body.totalPrice) : order.totalPrice;

    // Build product names joined with " + "
    const products = JSON.parse(body.products || order.products);
    const productNames = products
      .map((p: { title: string; variant?: string; quantity: number }) => {
        let name = p.title;
        if (p.variant) name += ` (${p.variant})`;
        if (p.quantity > 1) name += ` x${p.quantity}`;
        return name;
      })
      .join(" + ");

    // Create parcel in Sendit
    const parcel = await createParcel({
      district_id: districtId,
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      amount: totalPrice,
      reference: order.shopifyOrderNumber,
      comment: order.shopifyOrderNumber,
      products: productNames,
      allow_open: 1,
      allow_try: 1,
      products_from_stock: 0,
      option_exchange: 0,
    });

    // Save edited fields + Sendit info
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        customerName,
        customerPhone,
        customerAddress,
        totalPrice,
        products: body.products || order.products,
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
