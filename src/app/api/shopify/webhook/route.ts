import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractOrderData, ShopifyOrder } from "@/lib/shopify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Shopify sends the order object directly in webhook payloads
    const shopifyOrder = body as ShopifyOrder;

    if (!shopifyOrder.id) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Check if order already exists
    const existing = await prisma.order.findUnique({
      where: { shopifyOrderId: String(shopifyOrder.id) },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Order already exists",
      });
    }

    const orderData = extractOrderData(shopifyOrder);
    const order = await prisma.order.create({ data: orderData });

    return NextResponse.json({
      success: true,
      message: "Order created from webhook",
      orderId: order.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
