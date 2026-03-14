import { create } from 'zustand';

interface WarehouseState {
  selectedWarehouseId: string | null;
  setSelectedWarehouseId: (id: string | null) => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  selectedWarehouseId: null,
  setSelectedWarehouseId: (id) => set({ selectedWarehouseId: id }),
}));
