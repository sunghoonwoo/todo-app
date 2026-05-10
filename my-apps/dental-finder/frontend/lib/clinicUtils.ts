export type ReportSummary = {
  count: number;
  noExtraCount: number;
  avgTrustScore: number | null;
  hasDoctorConsultation: boolean;
  hasNoOvertreatmentPressure: boolean;
  hasHighFriendliness: boolean;
};

export type ReportRecord = {
  clinic_id: string;
  report_id: string;
  extra_recommended: boolean;
  visit_id: string | null;
  trust_score: number | null;
  consultation_type: string | null;
  overtreatment_pressure: string | null;
  friendliness_score: number | null;
};

export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeReportSummaries(reports: ReportRecord[]): Map<string, ReportSummary> {
  const map = new Map<string, ReportSummary>();

  // visit_id (or report_id if null) 기준으로 그룹핑
  const visitMap = new Map<string, { clinic_id: string; reports: ReportRecord[] }>();

  for (const r of reports) {
    const visitKey = r.visit_id ?? r.report_id;
    const existing = visitMap.get(visitKey);
    if (existing) {
      existing.reports.push(r);
    } else {
      visitMap.set(visitKey, { clinic_id: r.clinic_id, reports: [r] });
    }
  }

  // 방문별로 집계 (상세페이지와 동일한 기준)
  for (const { clinic_id, reports: visitReports } of visitMap.values()) {
    const existing = map.get(clinic_id);
    // 방문 중 하나라도 extra_recommended=true 면 해당 방문은 "추가권유 있음"
    const hasExtra = visitReports.some(r => r.extra_recommended);

    if (existing) {
      existing.count++;
      if (!hasExtra) existing.noExtraCount++;
    } else {
      map.set(clinic_id, {
        count: 1,
        noExtraCount: hasExtra ? 0 : 1,
        avgTrustScore: null,
        hasDoctorConsultation: false,
        hasNoOvertreatmentPressure: false,
        hasHighFriendliness: false,
      });
    }
  }

  // Compute avg trust score per clinic (across all reports, all rows share same score per visit)
  for (const [clinic_id, summary] of map) {
    const clinicReports = reports.filter(r => r.clinic_id === clinic_id);
    const scores = clinicReports.map(r => r.trust_score).filter((s): s is number => s !== null);
    summary.avgTrustScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    summary.hasDoctorConsultation = clinicReports.some(r => r.consultation_type === 'doctor');
    summary.hasNoOvertreatmentPressure = clinicReports.some(r => r.overtreatment_pressure === 'none');
    summary.hasHighFriendliness = clinicReports.some(r => r.friendliness_score != null && r.friendliness_score >= 4);
  }

  return map;
}

export function getReportBadge(summary?: ReportSummary) {
  if (!summary || summary.count === 0) return { color: "bg-gray-200", accentColor: "bg-gray-300", label: "데이터 수집 중" };
  const honestyPct = Math.round((summary.noExtraCount / summary.count) * 100);
  if (honestyPct >= 80) return { color: "bg-[#E8F5E9] text-[#2E7D32]", accentColor: "bg-[#81C784]", label: `안심 추천 지수 ${honestyPct}%` };
  if (honestyPct >= 50) return { color: "bg-[#FFF3E0] text-[#E65100]", accentColor: "bg-[#FFB74D]", label: `안심 추천 지수 ${honestyPct}%` };
  return { color: "bg-[#FFEBEE] text-[#C62828]", accentColor: "bg-[#E57373]", label: `안심 추천 지수 ${honestyPct}%` };
}

export function getBadgeHex(summary?: ReportSummary): string {
  if (!summary || summary.count === 0) return "#d1d5db";
  const honestyPct = (summary.noExtraCount / summary.count) * 100;
  if (honestyPct >= 80) return "#81C784";
  if (honestyPct >= 50) return "#FFB74D";
  return "#E57373";
}
