import { create } from 'zustand';
import { Session } from '@/types/training';

type TrainingState = {
  session: Session | null;
  viewTimeframe: string;
  setSession: (session: Session | null) => void;
  setViewTimeframe: (tf: string) => void;
};

export const useTrainingStore = create<TrainingState>((set) => ({
  session: null,
  viewTimeframe: '1H',
  setSession: (session) => set({ session }),
  setViewTimeframe: (viewTimeframe) => set({ viewTimeframe }),
}));
