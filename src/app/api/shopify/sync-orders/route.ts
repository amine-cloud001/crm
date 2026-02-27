import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchOrders, extractOrderData } from "@/lib/shopify";

export async function POST() {
  try {
    const orders = await fetchOrders({ status: "any", limit: 50 });

    let created = 0;
    let skipped = 0;

    for (const shopifyOrder of orders) {
      // Check if order already exists
      const existing = await prisma.order.findUnique({
        where: { shopifyOrderId: String(shopifyOrder.id) },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const orderData = extractOrderData(shopifyOrder);
      await prisma.order.create({ data: orderData });
      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${created} new orders, ${skipped} already existed`,
      created,
      skipped,
      total: orders.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
