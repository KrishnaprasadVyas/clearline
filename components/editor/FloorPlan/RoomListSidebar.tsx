'use client';

import { useMemo } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { ROOM_TYPES } from '@/lib/editor/floorplan/roomTypes';
import { generateBuildingAllocation } from '@/lib/editor/floorplan/layoutAlgorithm';
import type { RoomTypeId } from '@/lib/editor/floorplan/roomTypes';

// Color dot for each room type
const ROOM_TYPE_COLORS: Record<RoomTypeId, string> = {
  ambulance_bay: '#ef4444',
  emergency_room: '#f97316',
  trauma_room: '#dc2626',
  operating_room: '#3b82f6',
  patient_room: '#60a5fa',
};

export function RoomListSidebar() {
  const { getSelectedBuilding, floorPlanFloor, setFloorPlanFloor } = useBuildings();
  const selectedBuilding = getSelectedBuilding();

  const allocation = useMemo(() => {
    if (!selectedBuilding) return null;
    return generateBuildingAllocation(selectedBuilding.spec);
  }, [selectedBuilding]);

  if (!selectedBuilding || !allocation) return null;

  // Check if any hospital params are set
  const hasActivity = ROOM_TYPES.some((rt) => rt.getCount(selectedBuilding.spec) > 0);
  if (!hasActivity) return null;

  // Build per-floor summaries
  const floorSummaries = allocation.floors.map((floor) => {
    const typeCounts: Partial<Record<RoomTypeId, number>> = {};
    for (const room of floor.rooms) {
      typeCounts[room.roomTypeId] = (typeCounts[room.roomTypeId] ?? 0) + 1;
    }
    return { floorIndex: floor.floorIndex, typeCounts, totalRooms: floor.rooms.length };
  });

  // Total counts across all floors
  const totalPlaced: Partial<Record<RoomTypeId, number>> = {};
  for (const floor of allocation.floors) {
    for (const room of floor.rooms) {
      totalPlaced[room.roomTypeId] = (totalPlaced[room.roomTypeId] ?? 0) + 1;
    }
  }

  return (
    <div className="absolute right-6 top-24 z-20 w-72 bg-white border border-slate-200/80 rounded-2xl shadow-[0_14px_40px_rgba(2,6,23,0.10)] overflow-hidden max-h-[80vh] flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200/70 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900 tracking-tight">Floors</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Layout inspector</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Hospital
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {floorSummaries.map((summary) => {
          const isActive = floorPlanFloor === summary.floorIndex;
          const isEmpty = summary.totalRooms === 0;

          return (
            <button
              key={summary.floorIndex}
              onClick={() => setFloorPlanFloor(isActive ? null : summary.floorIndex)}
              className={`w-full text-left px-5 py-3 transition-colors border-l-2 ${
                isActive
                  ? 'bg-slate-50 border-teal-500'
                  : 'hover:bg-slate-50/60 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[12px] font-semibold tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  Floor {summary.floorIndex + 1}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : isEmpty
                        ? 'bg-slate-100/50 text-slate-400'
                        : 'bg-slate-100/80 text-slate-500'
                  }`}
                >
                  {summary.totalRooms} rooms
                </span>
              </div>
              {summary.totalRooms > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {Object.entries(summary.typeCounts).map(([typeId, count]) => {
                    const roomDef = ROOM_TYPES.find((r) => r.id === typeId);
                    if (!roomDef || !count) return null;
                    return (
                      <span
                        key={typeId}
                        className="inline-flex items-center gap-1 text-xs text-gray-500"
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: ROOM_TYPE_COLORS[typeId as RoomTypeId] }}
                        />
                        {count} {roomDef.shortLabel}
                      </span>
                    );
                  })}
                </div>
              )}
              {isEmpty && (
                <p className="text-xs text-gray-400 mt-0.5">Empty</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend / totals */}
      <div className="px-5 py-4 border-t border-slate-200/70 bg-white">
        <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Allocation</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {ROOM_TYPES.map((rt) => {
            const placed = totalPlaced[rt.id] ?? 0;
            const requested = rt.getCount(selectedBuilding.spec);
            if (requested === 0) return null;
            return (
              <span key={rt.id} className="inline-flex items-center gap-1 text-xs">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: ROOM_TYPE_COLORS[rt.id] }}
                />
                <span className={placed < requested ? 'text-amber-600' : 'text-gray-600'}>
                  {placed}/{requested} {rt.shortLabel}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
