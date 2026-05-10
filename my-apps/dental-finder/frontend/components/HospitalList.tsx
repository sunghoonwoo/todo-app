"use client";

import { useCallback } from "react";
import { ReportSummary } from "@/lib/clinicUtils";

export type ClinicItem = {
  clinic_id: string;
  name: string;
  address: string;
  phone: string | null;
  distance?: number;
  reportSummary?: ReportSummary;
};

type Props = {
  clinics: ClinicItem[];
  loading: boolean;
  pagedClinics: ClinicItem[];
  page: number;
  totalClinics: number;
  onClinicClick: (id: string) => void;
  onPageChange: (newPage: number) => void;
  PAGE_SIZE: number;
};

export default function HospitalList({
  clinics, loading, pagedClinics, page, totalClinics, onClinicClick, onPageChange, PAGE_SIZE
}: Props) {
  const handlePrev = useCallback(() => {
    if (page > 0) onPageChange(page - 1);
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    if (pagedClinics.length > 0) onPageChange(page + 1);
  }, [page, pagedClinics, onPageChange]);

  if (loading && pagedClinics.length === 0 && clinics.length === 0) {
    return null;
  }

  if (!loading && pagedClinics.length === 0 && clinics.length === 0) {
    return <div className="text-center text-[14px] text-gray-400 py-10">검색 결과가 없습니다</div>;
  }

  return (
    <>
      <ul className="space-y-4">
        {pagedClinics.map((c) => {
          return (
            <li key={c.clinic_id} id={`clinic-${c.clinic_id}`}>
              <div
                onClick={() => onClinicClick(c.clinic_id)}
                className="relative bg-white rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200"
                style={{boxShadow: '0 8px 30px rgba(0,0,0,0.04)'}}
              >
                {/* Left accent border - pastel color */}
                <div className={`absolute left-0 top-0 bottom-0 w-2.5 rounded-l-3xl ${
                  c.reportSummary && c.reportSummary.count >= 3 && c.reportSummary.avgTrustScore != null
                    ? c.reportSummary.avgTrustScore >= 80 ? 'bg-green-500'
                    : c.reportSummary.avgTrustScore >= 50 ? 'bg-orange-400'
                    : 'bg-red-500'
                    : 'bg-gray-200'
                }`} />
                
                <div className="pl-5 pr-5 py-4">
                  {/* First row: Name (left) + Distance (right) - flex justify-between */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[18px] font-bold text-gray-900 truncate flex-1 min-w-0">{c.name}</span>
                    {c.distance !== undefined && (
                      <span className="text-[14px] font-bold text-[#3F51B5] bg-[#E8EAF6] px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                        {c.distance < 1
                          ? `${Math.round(c.distance * 1000)}m`
                          : `${c.distance.toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                 
                  {/* Second row: Address + Phone */}
                  <div className="text-[14px] text-gray-500 truncate">{c.address}</div>
                  {c.phone && <div className="text-[14px] text-gray-400 mt-1 flex items-center gap-1">📞 {c.phone}</div>}
                  
                  {/* Third row: Badges + Fact Highlights */}
                  {c.reportSummary && c.reportSummary.count > 0 ? (
                    <div className="flex flex-col gap-1.5 mt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.reportSummary.count >= 3 && c.reportSummary.avgTrustScore != null ? (
                          <span className={`text-[14px] font-bold px-3 py-1 rounded-full ${
                            c.reportSummary.avgTrustScore >= 80 ? 'bg-green-500 text-white' :
                            c.reportSummary.avgTrustScore >= 50 ? 'bg-orange-400 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            안심 추천 지수 {c.reportSummary.avgTrustScore}점
                          </span>
                        ) : (
                          <span className="text-[14px] font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                            최근 공유 시작됨 🔍
                          </span>
                        )}
                        <span className="text-[14px] font-medium bg-[#FFF3E0] text-[#E65100] px-2.5 py-1 rounded-full border border-orange-100/50">
                          📋 {c.reportSummary.count}건
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.reportSummary.hasDoctorConsultation && (
                          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            ✅ 의사가 직접 상담
                          </span>
                        )}
                        {c.reportSummary.hasNoOvertreatmentPressure && (
                          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                            ✅ 과잉진료 권유 없는 곳
                          </span>
                        )}
                        {c.reportSummary.hasHighFriendliness && (
                          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            ✅ 친절한 의료진
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <span className="text-[14px] font-medium px-3 py-1 rounded-full bg-gray-50 text-gray-400">
                        첫 번째 경험을 공유해 주세요! 🤘
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {pagedClinics.length > 0 && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={handlePrev}
            disabled={page === 0}
            className="px-6 py-3 text-[14px] rounded-[32px] bg-white hover:shadow-lg disabled:opacity-30 active:bg-gray-50 font-medium transition-all duration-200 min-w-[100px]"
            style={{boxShadow: '0 4px 16px rgba(99,102,241,0.08)'}}
          >
            ← 이전
          </button>
          <span className="px-6 py-3 text-[14px] text-gray-500 font-medium">{page + 1}페이지</span>
          <button
            onClick={handleNext}
            disabled={totalClinics < PAGE_SIZE}
            className="px-6 py-3 text-[14px] rounded-[32px] bg-white hover:shadow-lg disabled:opacity-30 active:bg-gray-50 font-medium transition-all duration-200 min-w-[100px]"
            style={{boxShadow: '0 4px 16px rgba(99,102,241,0.08)'}}
          >
            다음 →
          </button>
        </div>
      )}
    </>
  );
}
