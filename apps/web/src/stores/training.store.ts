import { create } from 'zustand';
import { Session } from '@/types/training';

type TrainingState = {
  session: Session | null;
  activeSessionId: string | null;
  viewTimeframe: string;
  setSession: (session: Session | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setViewTimeframe: (tf: string) => void;
  clearTrainingState: () => void;
};

export const useTrainingStore = create<TrainingState>((set) => ({
  session: null,
  activeSessionId: null,
  viewTimeframe: '1H',
  setSession: (session) => set({ session, activeSessionId: session?.id ?? null }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setViewTimeframe: (viewTimeframe) => set({ viewTimeframe }),
  clearTrainingState: () => set({ session: null, activeSessionId: null, viewTimeframe: '1H' }),
}));
