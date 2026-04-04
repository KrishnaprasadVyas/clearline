'use client';

import { useState } from 'react';
import type { EmergencyCase } from '@/lib/clearpath/caseTypes';
import type { ScoredHospital } from '@/lib/clearpath/types';

type CongestionSnapshot = {
  hospitalId?: string;
  waitMinutes?: number;
  occupancyPct?: number;
};

type HospitalSnapshot = {
  id?: string;
  _id?: { toString: () => string };
  totalBeds?: number;
  erBeds?: number;
  specialties?: string[];
};

interface DispatchSidebarProps {
  cases: EmergencyCase[];
  hospitals: HospitalSnapshot[];
  congestion: CongestionSnapshot[];
  selectedCaseId?: string | null;
  onCaseSelect: (c: EmergencyCase | null) => void;
  onOverrideSubmit: (caseId: string, newHospital: ScoredHospital) => Promise<void>;
}

export default function DispatchSidebar({
  cases,
  hospitals,
  congestion,
  selectedCaseId,
  onCaseSelect,
  onOverrideSubmit,
}: DispatchSidebarProps) {
  const [isOverriding, setIsOverriding] = useState(false);

  const selectedCase = cases.find(c => c.caseId === selectedCaseId);

  function getHospitalInfo(hospId?: string) {
    if (!hospId) return null;
    const h = hospitals.find(x => x.id === hospId || x._id?.toString() === hospId);
    const c = congestion.find(x => x.hospitalId === hospId);
    if (!h) return null;
    const occ = c?.occupancyPct ?? 0;
    const totalBeds = h.totalBeds ?? 100;
    const erBeds = h.erBeds ?? 10;
    return {
      occupancyPct: occ,
      waitMinutes: c?.waitMinutes ?? 0,
      availableTotal: Math.max(0, Math.floor(totalBeds * ((100 - occ) / 100))),
      availableER: Math.max(0, Math.floor(erBeds * ((100 - occ) / 100))),
    };
  }

  const SEVERITY_COLOR: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    urgent: 'bg-orange-100 text-orange-700',
    'non-urgent': 'bg-green-100 text-green-700',
  };

  return (
    <div className="civ-panel h-[calc(100vh-2rem)] w-[360px] pointer-events-auto flex flex-col">

      {/* Header */}
      <div className="civ-header !mb-4 flex items-center justify-between pr-1">
        <div>
          <h2 className="civ-header-title">Live Dispatch</h2>
          <p className="civ-header-sub">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            {cases.length} active {cases.length === 1 ? 'case' : 'cases'}
          </p>
        </div>
      </div>

      {/* Case list / Case detail */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 pb-6">

        {/* ── CASE DETAIL VIEW ── */}
        {selectedCase ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onCaseSelect(null)}
              className="text-[0.72rem] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1 hover:text-sky-800 transition-colors"
            >
              ← All Cases
            </button>

            {/* Severity + Case ID */}
            <div className="flex items-center gap-2">
              <span className={`civ-badge ${SEVERITY_COLOR[selectedCase.triage.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                {selectedCase.triage.severity}
              </span>
              {selectedCase.incidentId && (
                <span className="civ-badge bg-amber-100 text-amber-800">
                  {selectedCase.incidentId}
                </span>
              )}
              <span className="ml-auto text-[0.68rem] text-slate-400 font-medium">
                {new Date(selectedCase.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight -mt-1">
              {selectedCase.caseId}
            </h3>

            {/* Patient message */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 italic">
              &ldquo;{selectedCase.patientMessage}&rdquo;
            </div>

            {/* Assigned hospital */}
            {(() => {
              const hospId = selectedCase.assignedHospital?.hospital?.id;
              const info = getHospitalInfo(hospId);
              return (
                <div className="bg-white border border-sky-200 border-b-4 border-b-sky-400 rounded-xl p-3 shadow-sm">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Routed to</p>
                  <p className="font-bold text-slate-800 text-base">{selectedCase.assignedHospital?.hospital?.name}</p>
                  <p className="text-[0.72rem] text-sky-700 font-bold mt-0.5">
                    {selectedCase.assignedHospital?.totalEstimatedMinutes} min ETA
                  </p>
                  {info && (
                    <div className="mt-2 flex gap-2 text-[0.68rem]">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${info.occupancyPct > 80 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {Math.round(info.occupancyPct)}% full
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {info.availableER} ER beds free
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {info.waitMinutes}m wait
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* AI Reasoning */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Why this hospital</p>
              <p className="text-[0.8rem] text-slate-700 leading-relaxed">
                {selectedCase.assignedHospital?.reason || selectedCase.triage.reasoning}
              </p>
              {(selectedCase.triage.predictedNeeds?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedCase.triage.predictedNeeds.map((need: string) => (
                    <span key={need} className="text-[0.62rem] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold uppercase tracking-wide">
                      {need}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Alternatives */}
            {(selectedCase.alternatives as ScoredHospital[])?.length > 0 && (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-1">Alternatives</p>
                <div className="flex flex-col gap-2">
                  {(selectedCase.alternatives as ScoredHospital[]).slice(0, 3).map((alt) => {
                    const altInfo = getHospitalInfo(alt.hospital?.id);
                    return (
                      <div key={alt.hospital?.id} className="bg-white border border-slate-200 hover:border-sky-300 transition-colors rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-bold text-slate-800">{alt.hospital?.name}</span>
                          <span className="text-[0.72rem] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">{alt.totalEstimatedMinutes} min</span>
                        </div>
                        {altInfo && (
                          <div className="flex gap-1.5 text-[0.65rem] mb-2">
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${altInfo.occupancyPct > 80 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                              {Math.round(altInfo.occupancyPct)}% full
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                              {altInfo.availableER} ER free
                            </span>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            setIsOverriding(true);
                            await onOverrideSubmit(selectedCase.caseId, alt);
                            setIsOverriding(false);
                          }}
                          disabled={isOverriding}
                          className="w-full text-[0.72rem] font-bold py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 transition-colors disabled:opacity-50"
                        >
                          {isOverriding ? 'Overriding...' : 'Override to here'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ── CASE LIST VIEW ── */
          <>
            {cases.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <span className="text-lg">🏥</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">No active cases</p>
                <p className="text-[0.72rem] text-slate-400 mt-1">Cases will appear here when received via WhatsApp</p>
              </div>
            )}
            {cases.map(c => (
              <div
                key={c.caseId}
                onClick={() => onCaseSelect(c)}
                className={`civ-hospital-card civ-hospital-card--top cursor-pointer hover:bg-slate-50 transition-all hover:scale-[1.01] active:scale-[0.99] ${c.incidentId ? 'border-l-4 border-l-amber-400' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`civ-badge ${SEVERITY_COLOR[c.triage.severity] ?? ''}`}>
                      {c.triage.severity}
                    </span>
                    {c.incidentId && (
                      <span className="text-[0.62rem] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        MCI
                      </span>
                    )}
                  </div>
                  <span className="text-[0.65rem] text-slate-400 font-medium">
                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-sm font-bold text-slate-800 mb-1">{c.caseId}</p>
                <p className="text-[0.75rem] text-slate-500 line-clamp-1 mb-2 italic">&ldquo;{c.patientMessage}&rdquo;</p>

                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className="text-[0.72rem] font-bold text-sky-700">
                    → {c.assignedHospital?.hospital?.name ?? 'Routing...'}
                  </span>
                  <span className="text-[0.8rem] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {c.assignedHospital?.totalEstimatedMinutes}m
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
