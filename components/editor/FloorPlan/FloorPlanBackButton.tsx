'use client';

import { useMemo } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { generateBuildingAllocation } from '@/lib/editor/floorplan/layoutAlgorithm';
import { ROOM_TYPES } from '@/lib/editor/floorplan/roomTypes';
import type { RoomTypeId } from '@/lib/editor/floorplan/roomTypes';

export function FloorPlanBackButton() {
  const { floorPlanFloor, setFloorPlanFloor, getSelectedBuilding } = useBuildings();
  const selectedBuilding = getSelectedBuilding();

  const allocation = useMemo(() => {
    if (floorPlanFloor === null || !selectedBuilding) return null;
    return generateBuildingAllocation(selectedBuilding.spec);
  }, [floorPlanFloor, selectedBuilding]);

  if (floorPlanFloor === null || !allocation) return null;

  const floor = allocation.floors[floorPlanFloor];
  const roomCount = floor?.rooms.length ?? 0;

  // Build summary string
  const typeCounts: Partial<Record<RoomTypeId, number>> = {};
  for (const room of floor?.rooms ?? []) {
    typeCounts[room.roomTypeId] = (typeCounts[room.roomTypeId] ?? 0) + 1;
  }
  const summary = Object.entries(typeCounts)
    .map(([typeId, count]) => {
      const def = ROOM_TYPES.find((r) => r.id === typeId);
      return `${count} ${def?.shortLabel ?? typeId}`;
    })
    .join(', ');

  return (
    <div className="absolute left-4 top-4 z-20">
      <button
        onClick={() => setFloorPlanFloor(null)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-[0_12px_34px_rgba(2,6,23,0.10)] hover:bg-slate-50 transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </span>
        <div className="text-left">
          <div className="text-[12px] font-semibold text-slate-900 tracking-tight">
            Floor {floorPlanFloor + 1}
          </div>
          <div className="text-[11px] text-slate-500">
            {roomCount > 0 ? summary : 'Empty floor'} · back
          </div>
        </div>
      </button>
    </div>
  );
}
