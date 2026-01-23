import { create } from 'zustand';
import type { NormalizedData, DashboardMetrics, DashboardFilters } from '@/types';

interface AppState {
  // Estado de datos
  data: NormalizedData | null;
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;

  // Filtros
  filters: DashboardFilters;

  // Acciones
  setData: (data: NormalizedData) => void;
  setMetrics: (metrics: DashboardMetrics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  reset: () => void;
}

const defaultFilters: DashboardFilters = {
  fechaDesde: null,
  fechaHasta: null,
  entidades: [],
  productos: [],
  mediosPago: [],
};

export const useAppStore = create<AppState>((set) => ({
  data: null,
  metrics: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,

  setData: (data) => set({ data }),
  setMetrics: (metrics) => set({ metrics }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
  reset: () =>
    set({
      data: null,
      metrics: null,
      isLoading: false,
      error: null,
      filters: defaultFilters,
    }),
}));
