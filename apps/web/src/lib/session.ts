import { Session } from '@/types/training';

type Bar = Session['barsData'][number];

function isBar(value: unknown): value is Bar {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.open === 'number' &&
    typeof v.high === 'number' &&
    typeof v.low === 'number' &&
    typeof v.close === 'number' &&
    typeof v.time === 'string'
  );
}

function parseBarsData(raw: unknown): Bar[] {
  if (Array.isArray(raw)) return raw.filter(isBar);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isBar) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeSession(session: Session): Session {
  return {
    ...session,
    barsData: parseBarsData((session as Session & { barsData: unknown }).barsData),
  };
}
