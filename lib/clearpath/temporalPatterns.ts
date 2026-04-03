const RUSH_HOURS = [
  { start: 7, end: 10 },
  { start: 16, end: 19 },
];

export function getTemporalContext(now: Date): string {
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const inRush = RUSH_HOURS.some(({ start, end }) => hour >= start && hour < end);

  if (isWeekend) {
    if (inRush) return 'weekend peak hours';
    return 'weekend off-peak hours';
  }

  if (inRush) return 'weekday rush hour';
  if (hour >= 22 || hour < 6) return 'overnight period';
  return 'regular daytime hours';
}

export function getAdjustedDrivingTime(rawMinutes: number, distanceKm: number, now: Date): number {
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  let factor = 1;

  const inRush = RUSH_HOURS.some(({ start, end }) => hour >= start && hour < end);

  if (inRush) {
    factor += 0.35; // 35% slower in rush hour
  } else if (!isWeekend && hour >= 11 && hour < 15) {
    factor += 0.15; // mild midday congestion
  } else if (hour >= 22 || hour < 6) {
    factor -= 0.15; // faster overnight
  }

  // Very short distances are less sensitive to congestion
  if (distanceKm < 3) {
    factor = 1 + (factor - 1) * 0.5;
  }

  const adjusted = rawMinutes * factor;
  return Math.max(1, Math.round(adjusted));
}

export function getAdjustedWaitTime(waitMinutes: number, now: Date): number {
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  let factor = 1;

  if (!isWeekend && hour >= 18 && hour < 23) {
    factor += 0.25; // evenings busier on weekdays
  } else if (isWeekend && hour >= 11 && hour < 18) {
    factor += 0.2; // weekend daytime busier
  } else if (hour >= 0 && hour < 6) {
    factor -= 0.2; // late night usually quieter
  }

  const adjusted = waitMinutes * factor;
  return Math.max(0, Math.round(adjusted));
}

