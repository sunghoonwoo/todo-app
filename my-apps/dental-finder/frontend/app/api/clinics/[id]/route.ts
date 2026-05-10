import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [clinicsResult, priceReportsResult, userReportsResult] = await Promise.all([
      supabase.from("clinics").select("*").eq("clinic_id", id).single(),
      supabase
        .from("price_reports")
        .select("report_id, treatment_name, price, raw_text, post_url, post_date")
        .eq("clinic_id", id)
        .order("post_date", { ascending: false }),
      supabase
        .from("user_price_reports")
        .select(
          "report_id, visit_id, treatment_id, treatment_types(name), price, visit_date, extra_recommended, extra_note, review_text, friendliness_score, nickname, created_at, consultation_type, overtreatment_pressure, explanation_detail, price_fairness, trust_score, image_url"
        )
        .eq("clinic_id", id)
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      ...(clinicsResult.data ?? {}),
      communityPrices: priceReportsResult.data ?? [],
      userReports: (userReportsResult.data ?? []).map((r: any) => ({
        ...r,
        treatment_name: r.treatment_types?.name ?? "",
      })),
    });
  } catch (e) {
    console.error("[API /clinics/:id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
