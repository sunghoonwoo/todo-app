import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_SIZE = 20;

async function getClinicIdsWithReports(client: typeof supabase): Promise<string[]> {
  const { data, error } = await client
    .from("user_price_reports")
    .select("clinic_id");

  if (error) {
    console.error("[getClinicIdsWithReports]", error.message);
    return [];
  }
  return [...new Set((data ?? []).map((r) => r.clinic_id))];
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const swLat = sp.get("sw_lat");
  const swLng = sp.get("sw_lng");
  const neLat = sp.get("ne_lat");
  const neLng = sp.get("ne_lng");
  const city = sp.get("city") || "";
  const district = sp.get("district") || "";
  const search = sp.get("search") || "";
  const page = parseInt(sp.get("page") || "0", 10);
  const priceReportOnly = sp.get("priceReportOnly") === "true";
  const hasBounds = !!(swLat && swLng && neLat && neLng);

  try {
    if (hasBounds) {
      const reportIds: string[] | undefined = priceReportOnly
        ? await getClinicIdsWithReports(supabase)
        : undefined;

      if (priceReportOnly && reportIds?.length === 0) {
        return NextResponse.json({ clinics: [] });
      }

      // Use PostGIS spatial search via RPC
      const { data, error } = await supabase.rpc("search_clinics_by_bounds", {
        sw_lat: parseFloat(swLat),
        sw_lng: parseFloat(swLng),
        ne_lat: parseFloat(neLat),
        ne_lng: parseFloat(neLng),
        search_term: search.trim(),
        report_ids: reportIds ?? null,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ clinics: (data ?? []) as any[] });
    }

    if (priceReportOnly) {
      const clinicIdsWithReports = await getClinicIdsWithReports(supabase);
      if (clinicIdsWithReports.length === 0) {
        return NextResponse.json({ clinics: [] });
      }

      let q = supabase
        .from("clinics")
        .select("clinic_id, name, address, city, district, phone, lat, lng")
        .in("clinic_id", clinicIdsWithReports)
        .eq("is_active", true);

      if (city) {
        q = q.eq("city", city);
        if (district) q = q.eq("district", district);
      }
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);

      const { data, error } = await q;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ clinics: data ?? [] });
    }

    let query = supabase
      .from("clinics")
      .select("clinic_id, name, address, city, district, phone, lat, lng")
      .eq("is_active", true)
      .order("name")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (city) query = query.eq("city", city);
    if (district) query = query.eq("district", district);
    if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ clinics: data ?? [] });
  } catch (e) {
    console.error("[API /clinics]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
