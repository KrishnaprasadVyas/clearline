"use client";
import CivilianPanel from '@/components/clearpath/civilian/CivilianPanel';

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200 to-slate-100">
      <CivilianPanel
        cityId="pune"
        onRecommendation={(res) => console.log('Recommendation:', res)}
      />
    </div>
  );
}
