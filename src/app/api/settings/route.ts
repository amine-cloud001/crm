import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_KEYS = [
  "shopify_store_url",
  "shopify_access_token",
  "sendit_email",
  "sendit_password",
];

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ALLOWED_KEYS } },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      // Mask sensitive values
      if (s.key === "shopify_access_token" || s.key === "sendit_password") {
        result[s.key] = s.value ? "••••••••" : "";
      } else {
        result[s.key] = s.value;
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined && body[key] !== "••••••••") {
        await prisma.setting.upsert({
          where: { key },
          update: { value: body[key] },
          create: { key, value: body[key] },
        });
      }
    }

    // Clear cached Sendit token if credentials changed
    if (body.sendit_email || body.sendit_password) {
      await prisma.setting.deleteMany({ where: { key: "sendit_token" } });
    }

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
