import { NextRequest, NextResponse } from "next/server";
import { listDistricts } from "@/lib/sendit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || undefined;

    const result = await listDistricts(page, search);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      currentPage: result.current_page,
      lastPage: result.last_page,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
