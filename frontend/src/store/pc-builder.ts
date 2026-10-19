'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type PcPart = {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  stock?: number;
  brand?: string;
  slug?: string;
  pcPart?: {
    enabled: boolean;
    type: string;
    socket?: string;
    platform?: string;
    formFactor?: string;
    wattage?: number;
    specs?: Record<string, any>;
  };
};

export type SlotKey =
  | 'cpu' | 'cpu_cooler' | 'motherboard' | 'ram' | 'storage'
  | 'gpu' | 'psu' | 'casing'
  | 'monitor' | 'casing_cooler' | 'keyboard' | 'mouse'
  | 'speaker' | 'headphone' | 'wifi_adapter' | 'antivirus' | 'ups';

export const CORE_SLOTS: SlotKey[] = [
  'cpu', 'cpu_cooler', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'casing',
];

export const PERIPHERAL_SLOTS: SlotKey[] = [
  'monitor', 'casing_cooler', 'keyboard', 'mouse',
  'speaker', 'headphone', 'wifi_adapter', 'antivirus', 'ups',
];

export const SLOT_LABELS: Record<SlotKey, string> = {
  cpu: 'CPU',
  cpu_cooler: 'CPU Cooler',
  motherboard: 'Motherboard',
  ram: 'RAM',
  storage: 'Storage',
  gpu: 'Graphics Card',
  psu: 'Power Supply',
  casing: 'Casing',
  monitor: 'Monitor',
  casing_cooler: 'Casing Cooler',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  speaker: 'Speaker',
  headphone: 'Headphone',
  wifi_adapter: 'WiFi Adapter',
  antivirus: 'Antivirus',
  ups: 'UPS',
};

type PcBuilderState = {
  selected: Partial<Record<SlotKey, PcPart>>;
  selectPart: (slot: SlotKey, part: PcPart) => void;
  removePart: (slot: SlotKey) => void;
  clearAll: () => void;
};

export const usePcBuilder = create<PcBuilderState>()(
  persist(
    (set) => ({
      selected: {},
      selectPart: (slot, part) =>
        set((state) => ({
          selected: { ...state.selected, [slot]: part },
        })),
      removePart: (slot) =>
        set((state) => {
          const next = { ...state.selected };
          delete next[slot];
          return { selected: next };
        }),
      clearAll: () => set({ selected: {} }),
    }),
    {
      name: 'pc-builder-selected',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
