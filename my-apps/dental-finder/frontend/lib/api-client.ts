import { config } from "./config";
import { ReportSummary } from "./clinicUtils";

const BASE = config.api.baseUrl;

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export type Clinic = {
  clinic_id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  reportSummary?: ReportSummary;
};

export type ClinicDetail = Clinic & {
  communityPrices: CommunityPrice[];
  userReports: UserReport[];
};

export type CommunityPrice = {
  report_id: string;
  treatment_name: string;
  price: number;
  raw_text: string | null;
  post_url: string | null;
  post_date: string | null;
};

export type UserReport = {
  report_id: string;
  visit_id: string | null;
  treatment_id: number;
  treatment_name: string;
  price: number | null;
  visit_date: string | null;
  extra_recommended: boolean;
  extra_note: string | null;
  review_text: string | null;
  friendliness_score: number | null;
  nickname: string | null;
  created_at: string;
  consultation_type: string | null;
  overtreatment_pressure: string | null;
  explanation_detail: string | null;
  price_fairness: string | null;
  trust_score: number | null;
  image_url: string | null;
};

export type TreatmentType = {
  treatment_id: number;
  name: string;
  category: string | null;
};

type FetchClinicsParams = {
  sw_lat?: string;
  sw_lng?: string;
  ne_lat?: string;
  ne_lng?: string;
  city?: string;
  district?: string;
  search?: string;
  page?: string;
  priceReportOnly?: string;
};

type FetchClinicsResult = {
  clinics: Clinic[];
  loading?: boolean;
};

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json();
}

export const api = {
  fetchClinics(params: FetchClinicsParams): Promise<FetchClinicsResult> {
    return get<FetchClinicsResult>("/api/clinics", params as Record<string, string>);
  },

  fetchClinic(id: string): Promise<ClinicDetail> {
    return get<ClinicDetail>(`/api/clinics/${id}`);
  },

  fetchTreatments(): Promise<TreatmentType[]> {
    return get<TreatmentType[]>("/api/treatments");
  },

  fetchDistricts(city: string): Promise<string[]> {
    return get<string[]>("/api/districts", { city });
  },

  createReport(body: {
    clinicId: string;
    treatmentIds: number[];
    price: number | null;
    visitDate: string | null;
    reviewText: string | null;
    friendlinessScore: number | null;
    nickname: string | null;
    pin: string;
    consultationType: string;
    overtreatmentPressure: string;
    explanationDetail: string;
    priceFairness: string;
    trustScore: number;
    imageUrl?: string;
  }): Promise<{ reportIds: string[] }> {
    return post<{ reportIds: string[] }>("/api/reports", body);
  },

  updateReport(body: {
    reportId: string;
    treatmentIds: number[];
    price: number | null;
    visitDate: string | null;
    reviewText: string | null;
    friendlinessScore: number | null;
    nickname: string | null;
    consultationType: string;
    overtreatmentPressure: string;
    explanationDetail: string;
    priceFairness: string;
    trustScore: number;
    imageUrl?: string;
  }): Promise<{ success: boolean }> {
    return put<{ success: boolean }>("/api/reports", body);
  },

  verifyPin(reportId: string, pin: string): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>("/api/reports/verify", { reportId, pin });
  },

  deleteReport(reportId: string, pin: string): Promise<{ ok: boolean; visitId?: string }> {
    return post<{ ok: boolean; visitId?: string }>("/api/reports/delete", { reportId, pin });
  },

  reportRequiresPin(reportId: string): Promise<{ requiresPin: boolean }> {
    return post<{ requiresPin: boolean }>("/api/reports/requires-pin", { reportId });
  },

  fetchReportSummaries(clinicIds: string[]): Promise<{ reports: { clinic_id: string; report_id: string; visit_id: string | null; extra_recommended: boolean; trust_score: number | null; consultation_type: string | null; overtreatment_pressure: string | null; friendliness_score: number | null }[] }> {
    return get("/api/reports/summaries", { ids: clinicIds.join(",") });
  },

  updateReview(body: {
    reportId: string;
    pin: string;
    treatmentIds: number[];
    price: number | null;
    visitDate: string | null;
    reviewText: string | null;
    friendlinessScore: number | null;
    nickname: string | null;
    consultationType: string;
    overtreatmentPressure: string;
    explanationDetail: string;
    priceFairness: string;
    trustScore: number;
    imageUrl?: string;
  }): Promise<{ success: boolean }> {
    return post<{ success: boolean }>("/api/reviews/update", body);
  },

  uploadImage(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/api/upload`, { method: "POST", body: form }).then(
      (res) => { if (!res.ok) throw new Error("Upload failed"); return res.json(); }
    );
  },
};
