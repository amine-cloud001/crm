import { NextResponse } from "next/server";
import { getAllDistricts } from "@/lib/sendit";

let cachedDistricts: Awaited<ReturnType<typeof getAllDistricts>> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Return cached if fresh
    if (cachedDistricts && Date.now() - cacheTime < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cachedDistricts });
    }

    const districts = await getAllDistricts();
    cachedDistricts = districts;
    cacheTime = Date.now();

    return NextResponse.json({ success: true, data: districts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
