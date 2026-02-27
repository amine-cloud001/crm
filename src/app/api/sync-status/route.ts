import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParcelDetails, mapSenditStatusToAppStatus } from "@/lib/sendit";

export async function POST() {
  try {
    // Find all orders that have been sent to Sendit and are not in a final state
    const orders = await prisma.order.findMany({
      where: {
        senditCode: { not: null },
        status: {
          notIn: ["delivered", "canceled", "rejected"],
        },
      },
    });

    const results = [];

    for (const order of orders) {
      try {
        const details = await getParcelDetails(order.senditCode!);
        const newStatus = mapSenditStatusToAppStatus(details.status);

        if (details.status !== order.senditStatus) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              senditStatus: details.status,
              status: newStatus,
              senditLabelUrl: details.labelUrl || order.senditLabelUrl,
            },
          });

          results.push({
            orderId: order.id,
            shopifyOrder: order.shopifyOrderNumber,
            senditCode: order.senditCode,
            oldStatus: order.senditStatus,
            newStatus: details.status,
          });
        }
      } catch (err) {
        results.push({
          orderId: order.id,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
