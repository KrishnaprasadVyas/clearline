'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechToText } from '@/lib/editor/hooks/useSpeechToText';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { applyBuildingConfig } from '@/lib/editor/utils/voiceAdapter';
import type { BuildingConfig } from '@/lib/buildingConfig';

type VoicePhase = 'idle' | 'listening' | 'designing' | 'speaking' | 'error';

interface VoiceResult {
  transcript: string;
  config: BuildingConfig | null;
  confirmation: string;
}

export function VoiceDesign() {
  const { addBuilding, getSelectedBuilding, updateBuilding } = useBuildings();
  const speech = useSpeechToText();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const processingRef = useRef(false);

  const placeholderText = (() => {
    switch (phase) {
      case 'idle':
        return 'Describe a building...';
      case 'listening':
        return 'Listening...';
      case 'designing':
        return 'Designing...';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return errorMessage || 'Error. Try again.';
    }
  })();

  const handleVoiceDesign = useCallback(() => {
    setErrorMessage('');
    setPhase('listening');
    speech.reset();
    processingRef.current = false;
    speech.startListening();
  }, [speech]);

  const processSpeechResult = useCallback(
    async (transcript: string) => {
      if (!transcript) {
        setPhase('error');
        setErrorMessage('I did not catch that. Try again.');
        return;
      }

      setPhase('designing');

      try {
        const selectedBuilding = getSelectedBuilding();
        let previousConfig: Partial<BuildingConfig> | undefined;
        if (selectedBuilding) {
          const spec = selectedBuilding.spec;

          // Reverse-map existing spec fields back to BuildingConfig so
          // Gemini knows every current value and only changes what the user asks for.
          const textureReverseMap: Record<string, string> = {
            stucco: 'smooth', concrete: 'concrete', brick: 'brick',
            wood: 'wood', glass: 'glass',
          };
          const roofReverseMap: Record<string, string> = {
            flat: 'flat', gabled: 'gable', hipped: 'hip',
          };
          const windowShapeReverseMap: Record<string, string> = {
            rectangular: 'basic', arched: 'arched',
            circular: 'circular', triangular: 'triangular',
          };

          previousConfig = {
            floors: spec.numberOfFloors,
            width: spec.width,
            length: spec.depth,
            heightPerFloor: spec.floorHeight,
            wallColor: spec.wallColor || 'gray',
            windowStyle: (spec.windowPattern === 'none'
              ? 'none'
              : windowShapeReverseMap[spec.windowShape] || 'basic') as BuildingConfig['windowStyle'],
            texture: (textureReverseMap[spec.wallTexture] || 'concrete') as BuildingConfig['texture'],
            roofStyle: (roofReverseMap[spec.roofType] || 'flat') as BuildingConfig['roofStyle'],
            style: 'modern',
            // Hospital parameters
            hospitalBeds: spec.hospitalBeds,
            hospitalDoctors: spec.hospitalDoctors,
            hospitalNurses: spec.hospitalNurses,
            hospitalRooms: spec.hospitalRooms,
            hospitalOperatingRooms: spec.hospitalOperatingRooms,
            hospitalEmergencyBays: spec.hospitalEmergencyBays,
            hospitalAmbulances: spec.hospitalAmbulances,
            hospitalTraumaRooms: spec.hospitalTraumaRooms,
            hospitalFloors: spec.hospitalFloors,
          };
        }

        const designResponse = await fetch('/api/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, previousConfig }),
        });

        if (!designResponse.ok) {
          const errorData = await designResponse.json();
          throw new Error(errorData.error || `Design API returned ${designResponse.status}`);
        }

        const { config, confirmation } = (await designResponse.json()) as {
          config: BuildingConfig;
          confirmation: string;
        };

        setLastResult({ transcript, config, confirmation });

        const specUpdates = applyBuildingConfig(config);
        if (selectedBuilding) {
          updateBuilding(selectedBuilding.id, specUpdates);
        } else {
          addBuilding({ x: 0, y: 0, z: 0 }, specUpdates);
        }

        setPhase('speaking');
        try {
          const speakResponse = await fetch('/api/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: confirmation }),
          });

          if (speakResponse.ok) {
            const audioBlob = await speakResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              setPhase('idle');
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              setPhase('idle');
            };
            await audio.play();
          } else {
            console.warn('Voice unavailable: /api/speak returned', speakResponse.status);
            setPhase('idle');
          }
        } catch (speakError) {
          console.warn('Voice unavailable:', speakError);
          setPhase('idle');
        }
      } catch (designError) {
        setPhase('error');
        setErrorMessage(
          designError instanceof Error ? designError.message : 'Failed to design building.'
        );
      }
    },
    [getSelectedBuilding, updateBuilding, addBuilding]
  );

  useEffect(() => {
    if (phase !== 'listening') return;

    if (speech.status === 'done' && speech.transcript && !processingRef.current) {
      processingRef.current = true;
      processSpeechResult(speech.transcript);
    } else if (speech.status === 'error' && !processingRef.current) {
      processingRef.current = true;
      setPhase('error');
      setErrorMessage(speech.error || 'Speech recognition failed.');
    }
  }, [speech.status, speech.transcript, speech.error, phase, processSpeechResult]);

  const isActive = phase !== 'idle' && phase !== 'error';

  const phaseDotClass = (() => {
    switch (phase) {
      case 'listening':
        return 'bg-teal-500 animate-pulse';
      case 'designing':
        return 'bg-amber-500 animate-pulse';
      case 'speaking':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-300';
    }
  })();

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      {/* Popover: Last Voice Command details */}
      {lastResult && showDetails && (
        <div className="w-[420px] bg-white border border-slate-200/80 rounded-2xl shadow-[0_18px_52px_rgba(2,6,23,0.16)] p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em]">
              Last Voice Command
            </span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Transcript</p>
            <p className="text-[13px] text-slate-900">&ldquo;{lastResult.transcript}&rdquo;</p>
          </div>
          {lastResult.config && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Parsed Config</p>
              <pre className="text-[11px] bg-slate-50 rounded-xl border border-slate-200/70 p-2.5 overflow-x-auto text-slate-700 leading-relaxed max-h-56 overflow-y-auto">
                {JSON.stringify(lastResult.config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Command bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl shadow-[0_16px_46px_rgba(2,6,23,0.12)] px-4 py-3 min-w-[420px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2.5 h-2.5 rounded-full ${phaseDotClass}`} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Voice design
            </div>
            <div className={`text-[13px] font-medium truncate ${phase === 'error' ? 'text-red-600' : 'text-slate-900'}`}>
              {lastResult && phase === 'idle'
                ? lastResult.transcript
                : placeholderText}
            </div>
          </div>
        </div>

        {/* Show details button (only when we have a result) */}
        {lastResult && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`h-9 px-3 rounded-xl text-[12px] font-semibold border transition-colors ${
              showDetails
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
            title="Show details"
          >
            Details
          </button>
        )}

        <button
          onClick={handleVoiceDesign}
          disabled={isActive}
          className="h-9 px-3.5 rounded-xl text-[12px] font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Start voice"
        >
          {isActive ? 'Running…' : 'Start'}
        </button>
      </div>
    </div>
  );
}
