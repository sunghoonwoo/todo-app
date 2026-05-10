import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { reportId, pin } = await req.json();
    console.log("[delete] reportId:", reportId, "pin:", pin);

    // Try RPC first
    const { data, error } = await supabase.rpc("delete_report_with_pin", {
      p_report_id: reportId,
      p_pin: pin,
    });

    if (error) {
      console.warn("[delete] RPC failed, falling back to direct delete. Error:", error.message);
    }

    // If RPC succeeded and returned ok, use that result
    if (!error && data?.[0]?.ok) {
      const visitId: string | undefined = data?.[0]?.visit_id ?? undefined;
      return NextResponse.json({ ok: true, visitId: visitId ?? null });
    }

    // Fallback: verify PIN directly, then delete
    const { data: row, error: fetchError } = await supabase
      .from("user_price_reports")
      .select("pin, visit_id, clinic_id")
      .eq("report_id", reportId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ ok: false });
    }

    const match = row.pin != null && String(row.pin) === String(pin);
    if (!match) {
      return NextResponse.json({ ok: false });
    }

    // PIN verified — delete the report
    const { error: deleteError } = await supabase
      .from("user_price_reports")
      .delete()
      .eq("report_id", reportId);

    if (deleteError) {
      console.error("[delete] Delete error:", deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, visitId: row.visit_id });
  } catch (e) {
    console.error("[API POST /reports/delete]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
