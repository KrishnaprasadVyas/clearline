export type Severity = 'critical' | 'urgent' | 'non-urgent';

export interface SymptomsPayload {
  chestPain: boolean;
  shortnessOfBreath: boolean;
  fever: boolean;
  dizziness: boolean;

  // Optional additional signals (used by routingService's specialty map).
  injuryOrBleeding?: boolean;
  severeHeadache?: boolean;

  // Free text from the voice triage, used as a fallback "reasoning".
  freeText?: string;
}

export interface Hospital {
  // MongoDB documents may use `_id`; the mock data uses `id`.
  _id?: unknown;
  id?: string;

  name?: string;
  city?: string;

  latitude?: number;
  longitude?: number;

  totalBeds?: number;
  erBeds?: number;

  phone?: string;
  website?: string;

  specialties?: string[];
}

export interface CongestionSnapshot {
  hospitalId: string;
  occupancyPct: number;
  waitMinutes: number;
  recordedAt?: Date;
}

export interface TriageResponse {
  severity: Severity;
  reasoning: string;
}

export interface ScoredHospital {
  hospital: Hospital;

  score: number;
  drivingTimeMinutes: number;
  waitMinutes: number;
  adjustedWaitMinutes: number;
  distanceKm: number;
  occupancyPct: number;

  specialtyMatch: boolean;
  routeGeometry: any;
  congestionSegments?: string[];

  totalEstimatedMinutes: number;
  reason: string;
}

export interface RouteRequest {
  severity: Severity | string;
  symptoms?: SymptomsPayload | null;

  userLat?: number;
  userLng?: number;
  postalCode?: string;

  // Not used directly in the API route right now, but is sent from the UI.
  city?: string;
}

export interface RouteResponse {
  recommended: ScoredHospital;
  alternatives: ScoredHospital[];

  // Added by the API route after computing the response.
  userLocation: { lat: number; lng: number };

  // Added by the UI when the user selects a specific route within the response.
  activeRoute?: ScoredHospital;
}

