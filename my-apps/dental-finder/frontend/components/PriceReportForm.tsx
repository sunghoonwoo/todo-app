"use client";

import { useState, useEffect, useMemo } from "react";
import { api, hashPin, TreatmentType } from "@/lib/api-client";

const TOP_NAMES = ["정기검진/상담", "스케일링", "충치치료", "신경치료", "레진치료", "잇몸치료"];

const CATEGORY_LABELS: Record<string, string> = {
  보철: "보철",
  심미: "심미",
  교정: "교정",
  기타: "기타",
};

const CATEGORY_ORDER = ["보철", "심미", "교정", "기타"];

export type ReportFormValues = {
  reportId?: string;
  visitId?: string;
  treatmentIds: number[];
  price: string;
  visitDate: string;
  reviewText: string;
  friendlinessScore: number | null;
  nickname: string;
  pin?: string;
  consultationType: string;
  overtreatmentPressure: string;
  explanationDetail: string;
  priceFairness: string;
};

type Props = {
  clinicId: string;
  initialValues?: ReportFormValues;
  onSuccess: (reportIds: string[]) => void;
  onCancel?: () => void;
};

const FRIENDLINESS_OPTIONS = [
  { score: 5, label: "매우 친절", emoji: "😊" },
  { score: 4, label: "친절", emoji: "🙂" },
  { score: 3, label: "보통", emoji: "😐" },
  { score: 2, label: "불친절", emoji: "😕" },
  { score: 1, label: "매우 불친절", emoji: "😠" },
];

const INPUT_CLS = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function PriceReportForm({ clinicId, initialValues, onSuccess, onCancel }: Props) {
  const isEdit = !!initialValues?.reportId;

  const [treatments, setTreatments] = useState<TreatmentType[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [treatmentIds, setTreatmentIds] = useState<number[]>(
    initialValues?.treatmentIds ?? []
  );

  const { topTreatments, otherTreatments } = useMemo(() => {
    const top: TreatmentType[] = [];
    const other: TreatmentType[] = [];
    const remaining = [...treatments];
    for (const name of TOP_NAMES) {
      const idx = remaining.findIndex((t) => t.name === name);
      if (idx !== -1) {
        top.push(remaining[idx]);
        remaining.splice(idx, 1);
      }
    }
    other.push(...remaining);
    return { topTreatments: top, otherTreatments: other };
  }, [treatments]);

  function toggleTreatment(id: number) {
    setTreatmentIds((prev) =>
      prev.includes(id)
        ? prev.filter((tid) => tid !== id)
        : [...prev, id]
    );
  }
  const [price, setPrice] = useState(initialValues?.price ?? "");
  const [visitDate, setVisitDate] = useState(initialValues?.visitDate ?? "");
  const [reviewText, setReviewText] = useState(initialValues?.reviewText ?? "");
  const [friendlinessScore, setFriendlinessScore] = useState<number | null>(initialValues?.friendlinessScore ?? null);
  const [nickname, setNickname] = useState(initialValues?.nickname ?? "");
  const [consultationType, setConsultationType] = useState(initialValues?.consultationType ?? "");
  const [overtreatmentPressure, setOvertreatmentPressure] = useState(initialValues?.overtreatmentPressure ?? "");
  const [explanationDetail, setExplanationDetail] = useState(initialValues?.explanationDetail ?? "");
  const [priceFairness, setPriceFairness] = useState(initialValues?.priceFairness ?? "");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.fetchTreatments().then(setTreatments).catch(() => {});
  }, []);

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setPrice(digits ? parseInt(digits).toLocaleString() : "");
  }

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4).trim());
  }

  function resizeImage(file: File, maxW: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxW) { height = (height / width) * maxW; width = maxW; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas error")), file.type, 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageFile(file);
    setUploadedUrl(null);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const resized = await resizeImage(imageFile, 1024);
      const resizedFile = new File([resized], imageFile.name, { type: imageFile.type });
      const { url } = await api.uploadImage(resizedFile);
      setUploadedUrl(url);
      return url;
    } catch (e) {
      console.error("[PriceReportForm] Upload error:", e);
      setError("이미지 업로드 중 오류가 발생했습니다.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  function calcTrustScore() {
    const c = { doctor: 25, mixed: 12, coordinator: 0 }[consultationType] ?? 0;
    const o = { none: 25, persuaded: 12, aggressive: -10 }[overtreatmentPressure] ?? 0;
    const e = { all: 20, expensive_only: 5 }[explanationDetail] ?? 0;
    const p = { fair: 15, high: 5 }[priceFairness] ?? 0;
    const f = friendlinessScore === 5 ? 15 : friendlinessScore === 4 ? 12 : friendlinessScore === 3 ? 10 : friendlinessScore === 2 ? 5 : 0;
    return Math.max(0, Math.min(100, c + o + e + p + f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (treatmentIds.length === 0) { setError("치료 종류를 선택해주세요"); return; }
    if (!consultationType) { setError("상담 유형을 선택해주세요"); return; }
    if (!overtreatmentPressure) { setError("과잉진료 권유 여부를 선택해주세요"); return; }
    if (!explanationDetail) { setError("설명 충실도를 선택해주세요"); return; }
    if (!priceFairness) { setError("가격 적정성을 선택해주세요"); return; }
    if (friendlinessScore === null) { setError("친절도를 선택해주세요"); return; }
    if (!isEdit && pin.length !== 4) { setError("4자리 비번을 입력해주세요"); return; }

    setSubmitting(true);
    setError(null);

    const parsedPrice = price ? parseInt(price.replace(/,/g, "")) : null;

    const finalImageUrl = imageFile ? await uploadImage() : uploadedUrl;
    if (imageFile && !finalImageUrl) { setSubmitting(false); return; }

    if (isEdit && initialValues?.reportId) {
      try {
        const trustScore = calcTrustScore();
        await api.updateReview({
          reportId: initialValues.reportId,
          pin: initialValues.pin ?? "",
          treatmentIds,
          price: parsedPrice,
          visitDate: visitDate || null,
          reviewText: reviewText.trim() || null,
          friendlinessScore: friendlinessScore,
          nickname: nickname.trim() || null,
          consultationType,
          overtreatmentPressure,
          explanationDetail,
          priceFairness,
          trustScore,
          imageUrl: finalImageUrl ?? undefined,
        });
        setSubmitting(false);
        onSuccess([initialValues.reportId]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        console.error("[PriceReportForm] updateReview error:", msg);
        setError("수정 중 오류가 발생했습니다.");
        setSubmitting(false);
      }
    } else {
      try {
        const trustScore = calcTrustScore();
        const hashedPin = await hashPin(pin);
        const payload = {
          clinicId,
          treatmentIds,
          price: parsedPrice,
          visitDate: visitDate || null,
          reviewText: reviewText.trim() || null,
          friendlinessScore,
          nickname: nickname.trim() || null,
          pin: hashedPin,
          consultationType,
          overtreatmentPressure,
          explanationDetail,
          priceFairness,
          trustScore,
          imageUrl: finalImageUrl ?? undefined,
        };
        console.log("[PriceReportForm] Submitting report:", JSON.stringify({ ...payload, pin: "[REDACTED]" }));
        const { reportIds } = await api.createReport(payload);
        console.log("[PriceReportForm] Report created successfully:", reportIds);
        setSubmitting(false);
        onSuccess(reportIds);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        console.error("[PriceReportForm] createReport error:", msg);
        setError(msg);
        setSubmitting(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          어떤 치료를 받으셨나요? *{" "}
          {!isEdit && <span className="text-xs text-gray-400 font-normal">복수 선택 가능</span>}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {topTreatments.map((t) => (
            <button
              key={t.treatment_id}
              type="button"
              onClick={() => toggleTreatment(t.treatment_id)}
              className={`py-3 px-3 rounded-xl text-sm font-semibold border-2 transition active:scale-[0.97] ${
                treatmentIds.includes(t.treatment_id)
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {otherTreatments.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="w-full py-3 px-4 rounded-xl text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 transition flex items-center justify-center gap-1.5"
            >
              {showMore ? "접기" : "기타 항목 더보기"}
              <svg
                className={`w-4 h-4 transition-transform ${showMore ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMore && (
              <div className="mt-4 pb-6 space-y-4">
                {CATEGORY_ORDER.map((cat) => {
                  const items = otherTreatments.filter((t) => (t.category ?? "기타") === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((t) => (
                          <button
                            key={t.treatment_id}
                            type="button"
                            onClick={() => toggleTreatment(t.treatment_id)}
                            className={`px-3.5 py-1.5 rounded-full text-sm border transition ${
                              treatmentIds.includes(t.treatment_id)
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-bold text-gray-800 mb-3">안심 추천 점수</p>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">1. 상담은 누가 진행했나요? *</p>
            <div className="flex gap-2">
              {[
                { value: "doctor", label: "의사" },
                { value: "mixed", label: "의사+코디" },
                { value: "coordinator", label: "코디네이터" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConsultationType(consultationType === opt.value ? "" : opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition ${
                    consultationType === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">2. 과잉진료나 추가 시술을 권유받았나요? *</p>
            <div className="flex gap-2">
              {[
                { value: "none", label: "전혀 없음" },
                { value: "persuaded", label: "권유는 있었음" },
                { value: "aggressive", label: "강하게 권유" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOvertreatmentPressure(overtreatmentPressure === opt.value ? "" : opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition ${
                    overtreatmentPressure === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">3. 치료 옵션에 대한 설명은 충분했나요? *</p>
            <div className="flex gap-2">
              {[
                { value: "all", label: "모든 옵션 설명" },
                { value: "expensive_only", label: "비싼 것만 설명" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExplanationDetail(explanationDetail === opt.value ? "" : opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition ${
                    explanationDetail === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">4. 가격은 적정하다고 느꼈나요? *</p>
            <div className="flex gap-2">
              {[
                { value: "fair", label: "적정함" },
                { value: "high", label: "비쌌음" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriceFairness(priceFairness === opt.value ? "" : opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition ${
                    priceFairness === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">5. 의사/직원 친절 지표 *</p>
            <div className="grid grid-cols-5 gap-1.5">
              {FRIENDLINESS_OPTIONS.map((opt) => (
                <button
                  key={opt.score}
                  type="button"
                  onClick={() => setFriendlinessScore(friendlinessScore === opt.score ? null : opt.score)}
                  className={`flex flex-col items-center py-2 rounded-xl text-[11px] font-medium border-2 transition ${
                    friendlinessScore === opt.score
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
                  }`}
                >
                  <span className="text-base leading-none mb-1">{opt.emoji}</span>
                  <span className="whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {consultationType && overtreatmentPressure && explanationDetail && priceFairness && friendlinessScore !== null && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">예상 점수:</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
              calcTrustScore() >= 80 ? "bg-green-100 text-green-700"
                : calcTrustScore() >= 50 ? "bg-orange-100 text-orange-700"
                : "bg-red-100 text-red-700"
            }`}>
              {calcTrustScore()}점
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">언제 진료 받으셨나요? (선택)</p>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className={INPUT_CLS}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          얼마 내셨나요? (선택)
          {treatmentIds.length > 1 && <span className="text-xs text-gray-400 font-normal ml-1">— 전체 합산 금액</span>}
        </p>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={handlePriceChange}
            placeholder="예: 50,000"
            className={INPUT_CLS + " pr-8"}
          />
          <span className="absolute right-3 top-2.5 text-sm text-gray-400">원</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">후기 (선택)</p>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="진료 경험을 자유롭게 작성해 주세요"
          maxLength={500}
          rows={3}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
        <p className="text-xs text-blue-500 mb-2">영수증을 인증하면 검증된 리뷰 배지가 부여되며, 제보의 신뢰도가 높아집니다! (선택)</p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="receipt-upload"
          onChange={handleImageSelect}
          className="hidden"
        />
        <label
          htmlFor="receipt-upload"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          {imagePreview ? "사진 변경" : "사진 추가"}
        </label>
        {uploading && <span className="text-sm text-blue-500 ml-2">업로드 중...</span>}
        {imagePreview && (
          <div className="mt-2 relative inline-flex">
            <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); setUploadedUrl(null); }}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">닉네임 (선택)</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="익명"
          maxLength={30}
          className={INPUT_CLS}
        />
      </div>

      {!isEdit && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            비번 4자리 *{" "}
            <span className="text-xs text-gray-400 font-normal">나중에 수정/삭제 시 사용</span>
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={handlePinChange}
            placeholder="숫자 4자리"
            maxLength={4}
            className={INPUT_CLS}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-xl transition hover:bg-gray-50"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {submitting ? (isEdit ? "수정 중..." : "공유 중...") : (isEdit ? "수정하기" : "공유하기")}
        </button>
      </div>
    </form>
  );
}
