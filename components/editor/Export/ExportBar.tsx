import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { exportMultiBuildingsToGLB, exportMultiBuildingsToJSON, copyMultiBuildingsToClipboard, exportToMap } from '@/lib/editor/utils/exportUtils';

interface ExportBarProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

export function ExportBar({ sceneRef }: ExportBarProps) {
  const { buildings } = useBuildings();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportingToMap, setExportingToMap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buildingName, setBuildingName] = useState('');

  const handleExportGLB = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    setExporting(true);
    try {
      await exportMultiBuildingsToGLB(sceneRef.current);
      alert(`Successfully exported ${buildings.length} building${buildings.length > 1 ? 's' : ''} as GLB!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export GLB. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    exportMultiBuildingsToJSON(buildings);
  };

  const handleCopyJSON = async () => {
    try {
      await copyMultiBuildingsToClipboard(buildings);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleExportToMap = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    if (buildings.length === 0) {
      alert('No buildings to export. Create a building first!');
      return;
    }

    const name = buildingName.trim() || 'Custom Building';

    setExportingToMap(true);
    try {
      const { id } = await exportToMap(sceneRef.current, name, buildings);
      // Navigate to map with the building ID
      router.push(`/map?buildingId=${id}`);
    } catch (error) {
      console.error('Export to map failed:', error);
      alert('Failed to export to map. Check console for details.');
      setExportingToMap(false);
    }
  };

  return (
    <div className="w-full bg-white border-t border-slate-200/80 shadow-[0_-10px_28px_rgba(2,6,23,0.06)] px-6 py-4 z-20 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-slate-900 tracking-tight">Export</span>
            <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500/80" />
              {buildings.length} asset{buildings.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Tip: Export to map to preview placement and traffic overlays.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportGLB}
            disabled={exporting}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting…' : 'GLB'}
          </button>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors"
          >
            JSON
          </button>

          <button
            onClick={handleCopyJSON}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>

          <div className="hidden md:block w-px h-8 bg-slate-200/70 mx-1" />

          <input
            type="text"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            placeholder="Blueprint name"
            className="hidden md:block w-56 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12px] text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/15"
          />

          <button
            onClick={handleExportToMap}
            disabled={exportingToMap}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingToMap ? 'Syncing…' : 'Export → Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
