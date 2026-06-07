import { create } from 'zustand';
import { api } from '../lib/api';

interface Rule {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
}

interface AutomationStore {
  rules: Rule[];
  fetchRules: () => Promise<void>;
  toggleRule: (id: string, is_active: boolean) => Promise<void>;
}

export const useAutomationStore = create<AutomationStore>((set) => ({
  rules: [],
  fetchRules: async () => {
    try {
      const data = await api.getAutomations();
      set({ rules: data.rules });
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    }
  },
  toggleRule: async (id, is_active) => {
    // Optimistic update
    set((state) => ({
      rules: state.rules.map(r => r.id === id ? { ...r, is_active } : r)
    }));
    try {
      await api.toggleAutomation(id, is_active);
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      // Revert optimistic update
      set((state) => ({
        rules: state.rules.map(r => r.id === id ? { ...r, is_active: !is_active } : r)
      }));
    }
  }
}));
