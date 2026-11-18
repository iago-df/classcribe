import { create } from 'zustand';

export interface ConfirmRequest {
  title: string;
  message: string;
  yesLabel?: string;
  onYes: () => void;
}

/** the confirmation on screen right now, drawn by <ConfirmHost /> */
export const useConfirm = create<{ request: ConfirmRequest | null; set: (r: ConfirmRequest | null) => void }>((set) => ({
  request: null,
  set: (request) => set({ request }),
}));

/** "are you sure?" before anything destructive, as an app sheet instead of the system dialog */
export function confirm(title: string, message: string, onYes: () => void, yesLabel?: string) {
  useConfirm.getState().set({ title, message, onYes, yesLabel });
}
