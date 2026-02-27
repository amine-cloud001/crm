import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SENDIT_BASE_URL = "https://app.sendit.ma/api/v1";

async function getSenditToken(): Promise<string> {
  // Try cached token
  const cached = await prisma.setting.findUnique({ where: { key: "sendit_token" } });
  if (cached?.value) return cached.value;

  // Login for new token
  const email = await prisma.setting.findUnique({ where: { key: "sendit_email" } });
  const password = await prisma.setting.findUnique({ where: { key: "sendit_password" } });

  if (!email?.value || !password?.value) {
    throw new Error("Sendit credentials not configured. Go to Settings to add them.");
  }

  const res = await fetch(`${SENDIT_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.value, password: password.value }),
  });

  if (!res.ok) throw new Error(`Sendit login failed: ${res.status}`);

  const data = await res.json();
  const token = data.data?.token;
  if (!token) throw new Error("No token from Sendit");

  await prisma.setting.upsert({
    where: { key: "sendit_token" },
    update: { value: token },
    create: { key: "sendit_token", value: token },
  });

  return token;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const search = searchParams.get("search") || "";

    const token = await getSenditToken();

    const params = new URLSearchParams({ page });
    if (search) params.set("querystring", search);

    const senditRes = await fetch(`${SENDIT_BASE_URL}/districts?${params}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // If token expired, re-login and retry
    if (senditRes.status === 401 || senditRes.status === 403) {
      await prisma.setting.deleteMany({ where: { key: "sendit_token" } });
      const newToken = await getSenditToken();

      const retryRes = await fetch(`${SENDIT_BASE_URL}/districts?${params}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
      });

      const retryText = await retryRes.text();
      try {
        const retryData = JSON.parse(retryText);
        return NextResponse.json({
          success: true,
          data: retryData.data || [],
          total: retryData.total || 0,
          currentPage: retryData.current_page || 1,
          lastPage: retryData.last_page || 1,
        });
      } catch {
        return NextResponse.json(
          { success: false, error: `Sendit API error: ${retryText.substring(0, 200)}` },
          { status: 502 }
        );
      }
    }

    // Parse response safely
    const text = await senditRes.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total: data.total || 0,
        currentPage: data.current_page || 1,
        lastPage: data.last_page || 1,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: `Sendit API returned invalid response: ${text.substring(0, 200)}` },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
