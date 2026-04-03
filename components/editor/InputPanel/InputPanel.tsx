import { useState } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { TransformForm } from './TransformForm';
import { DimensionsForm } from './DimensionsForm';
import { WindowForm } from './WindowForm';
import { HospitalForm } from './HospitalForm';
import { TextureSelector } from './TextureSelector';
import { BuildingList } from './BuildingList';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

type SettingsTab = 'transform' | 'dimensions' | 'textures' | 'windows' | 'hospital';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'textures', label: 'Textures' },
  { id: 'windows', label: 'Windows' },
  { id: 'hospital', label: 'Hospital' },
];

export function InputPanel() {
  const { getSelectedBuilding, updateBuilding, updateBuildingRotation, updateBuildingPosition } = useBuildings();
  const selectedBuilding = getSelectedBuilding();
  const [activeTab, setActiveTab] = useState<SettingsTab>('transform');

  const handleUpdate = (updates: Partial<typeof DEFAULT_BUILDING_SPEC>) => {
    if (selectedBuilding) {
      updateBuilding(selectedBuilding.id, updates);
    }
  };

  const handleReset = () => {
    if (selectedBuilding) {
      updateBuilding(selectedBuilding.id, DEFAULT_BUILDING_SPEC);
    }
  };

  return (
    <div className="w-[420px] flex-none h-full bg-white border-r border-slate-200/80 shadow-[10px_0_28px_rgba(2,6,23,0.06)] flex flex-col z-10">
      {/* Fixed Header Section */}
      <div className="p-6 pb-4 border-b border-slate-200/70">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Editor
            </div>
            <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight mt-1">
              Building Designer
            </h2>
          </div>
        </div>

        {/* Building List */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 shadow-sm">
          <BuildingList />
        </div>

      </div>

      {/* Building Settings Section - 50% of panel */}
      {selectedBuilding ? (
        <div className="flex-1 flex flex-col min-h-0 basis-1/2">
          {/* Settings Header with Reset */}
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-800 tracking-wide">
              {selectedBuilding.name}
            </h3>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg font-semibold text-[11px] border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Tab Bar */}
          <div className="px-6 py-2 overflow-x-auto">
            <div className="flex gap-4 w-max min-w-full border-b border-slate-200/70">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap pb-2.5 text-[12px] font-semibold tracking-tight transition-colors duration-150 ${
                    activeTab === tab.id
                      ? 'text-slate-900 border-b-2 border-teal-500'
                      : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 mt-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
              {activeTab === 'transform' && (
                <TransformForm
                  buildingId={selectedBuilding.id}
                  position={selectedBuilding.position}
                  rotation={selectedBuilding.rotation}
                  onPositionChange={(pos) => updateBuildingPosition(selectedBuilding.id, pos)}
                  onRotationChange={(rotation) => updateBuildingRotation(selectedBuilding.id, rotation)}
                />
              )}
              {activeTab === 'dimensions' && (
                <DimensionsForm
                  spec={selectedBuilding.spec}
                  onUpdate={handleUpdate}
                  buildingId={selectedBuilding.id}
                />
              )}
              {activeTab === 'textures' && (
                <TextureSelector spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              )}
              {activeTab === 'windows' && (
                <WindowForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              )}
              {activeTab === 'hospital' && (
                <HospitalForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center py-10 px-6 bg-slate-50 rounded-2xl border border-slate-200/70 shadow-sm w-full">
            <p className="text-slate-900 font-semibold text-[15px] tracking-tight">No building selected</p>
            <p className="text-[12px] font-medium text-slate-500 mt-2">
              Add an asset, then tweak transform, materials, windows, and hospital settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
