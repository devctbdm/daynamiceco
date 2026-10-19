'use client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type PcPartSpecs = Record<string, string | number | boolean>;

export type PcPartFormValue = {
  enabled: boolean;
  type: string;
  socket: string;
  platform: string;
  formFactor: string;
  wattage: number;
  specs: PcPartSpecs;
};

export const EMPTY_PC_PART: PcPartFormValue = {
  enabled: false,
  type: '',
  socket: '',
  platform: '',
  formFactor: '',
  wattage: 0,
  specs: {},
};

const COMPONENT_TYPES: { value: string; label: string }[] = [
  { value: 'cpu', label: 'CPU' },
  { value: 'cpu_cooler', label: 'CPU Cooler' },
  { value: 'motherboard', label: 'Motherboard' },
  { value: 'ram', label: 'RAM' },
  { value: 'storage', label: 'Storage' },
  { value: 'gpu', label: 'Graphics Card' },
  { value: 'psu', label: 'Power Supply' },
  { value: 'casing', label: 'Casing' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'casing_cooler', label: 'Casing Cooler' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'speaker', label: 'Speaker & Home Theater' },
  { value: 'headphone', label: 'Headphone' },
  { value: 'wifi_adapter', label: 'Wifi Adapter / LAN Card' },
  { value: 'antivirus', label: 'Anti Virus' },
  { value: 'ups', label: 'UPS' },
];

const SOCKETS = ['AM4', 'AM5', 'LGA1151', 'LGA1200', 'LGA1700', 'LGA1851'];
const FORM_FACTORS = ['ATX', 'microATX', 'Mini-ITX'];
const CPU_SERIES = ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Ryzen Threadripper', 'Xeon'];
const CPU_GENERATIONS = ['10th Gen', '11th Gen', '12th Gen', '13th Gen', '14th Gen', '15th Gen', '5000 Series', '7000 Series', '9000 Series', 'Other'];
const GPU_BRANDS = ['NVIDIA', 'AMD', 'Intel'];
const GPU_VRAM_TYPES = ['GDDR5', 'GDDR6', 'GDDR6X', 'HBM2', 'HBM3'];
const RAM_TYPES = ['DDR3', 'DDR4', 'DDR5'];
const STORAGE_TYPES = ['SSD', 'HDD', 'NVMe'];
const STORAGE_INTERFACES = ['SATA III', 'NVMe PCIe 3.0', 'NVMe PCIe 4.0', 'NVMe PCIe 5.0'];
const COOLER_TYPES = ['air', 'liquid'];
const PSU_EFFICIENCY = ['80+ White', '80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'];
const PSU_MODULAR = ['Full', 'Semi', 'Non'];
const PANEL_TYPES = ['IPS', 'VA', 'TN', 'OLED', 'Mini-LED'];

// Component-type-specific spec fields definition
type SpecFieldDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'switch';
  options?: string[];
  placeholder?: string;
};

const SPECS_BY_TYPE: Record<string, SpecFieldDef[]> = {
  cpu: [
    { key: 'series', label: 'Series', type: 'select', options: CPU_SERIES },
    { key: 'generation', label: 'Generation', type: 'select', options: CPU_GENERATIONS },
    { key: 'cores', label: 'Cores', type: 'number', placeholder: 'e.g. 16' },
    { key: 'threads', label: 'Threads', type: 'number', placeholder: 'e.g. 32' },
    { key: 'baseClock', label: 'Base Clock', type: 'text', placeholder: 'e.g. 3.4 GHz' },
    { key: 'boostClock', label: 'Boost Clock', type: 'text', placeholder: 'e.g. 5.8 GHz' },
    { key: 'cache', label: 'Cache', type: 'text', placeholder: 'e.g. 36 MB' },
    { key: 'igpu', label: 'Integrated Graphics', type: 'text', placeholder: 'e.g. Intel UHD 770' },
  ],
  gpu: [
    { key: 'brand', label: 'Brand', type: 'select', options: GPU_BRANDS },
    { key: 'vram', label: 'VRAM (GB)', type: 'number', placeholder: 'e.g. 12' },
    { key: 'vramType', label: 'VRAM Type', type: 'select', options: GPU_VRAM_TYPES },
    { key: 'boostClock', label: 'Boost Clock', type: 'text', placeholder: 'e.g. 2.52 GHz' },
    { key: 'length', label: 'Length (mm)', type: 'number', placeholder: 'e.g. 300' },
  ],
  motherboard: [
    { key: 'chipset', label: 'Chipset', type: 'text', placeholder: 'e.g. Z790, B650' },
    { key: 'ramSlots', label: 'RAM Slots', type: 'number', placeholder: 'e.g. 4' },
    { key: 'maxRam', label: 'Max RAM (GB)', type: 'number', placeholder: 'e.g. 128' },
    { key: 'ramType', label: 'RAM Type', type: 'select', options: RAM_TYPES },
    { key: 'm2Slots', label: 'M.2 Slots', type: 'number', placeholder: 'e.g. 3' },
    { key: 'wifi', label: 'WiFi Built-in', type: 'switch' },
  ],
  ram: [
    { key: 'capacity', label: 'Capacity (GB)', type: 'number', placeholder: 'e.g. 32' },
    { key: 'speed', label: 'Speed (MHz)', type: 'number', placeholder: 'e.g. 6000' },
    { key: 'ramType', label: 'Type', type: 'select', options: RAM_TYPES },
    { key: 'modules', label: 'Modules', type: 'text', placeholder: 'e.g. 2x16GB' },
    { key: 'latency', label: 'CAS Latency', type: 'text', placeholder: 'e.g. CL36' },
    { key: 'rgb', label: 'RGB', type: 'switch' },
  ],
  storage: [
    { key: 'capacity', label: 'Capacity (GB)', type: 'number', placeholder: 'e.g. 1000' },
    { key: 'storageType', label: 'Type', type: 'select', options: STORAGE_TYPES },
    { key: 'interface', label: 'Interface', type: 'select', options: STORAGE_INTERFACES },
    { key: 'readSpeed', label: 'Read Speed (MB/s)', type: 'number', placeholder: 'e.g. 7000' },
    { key: 'writeSpeed', label: 'Write Speed (MB/s)', type: 'number', placeholder: 'e.g. 6000' },
  ],
  cpu_cooler: [
    { key: 'coolerType', label: 'Type', type: 'select', options: COOLER_TYPES },
    { key: 'radiatorSize', label: 'Radiator Size (mm)', type: 'number', placeholder: 'e.g. 360' },
    { key: 'tdpRating', label: 'Max TDP (W)', type: 'number', placeholder: 'e.g. 250' },
    { key: 'noiseLevel', label: 'Noise (dBA)', type: 'number', placeholder: 'e.g. 25' },
  ],
  psu: [
    { key: 'efficiency', label: 'Efficiency', type: 'select', options: PSU_EFFICIENCY },
    { key: 'modular', label: 'Modular', type: 'select', options: PSU_MODULAR },
    { key: 'fanSize', label: 'Fan Size (mm)', type: 'number', placeholder: 'e.g. 135' },
  ],
  casing: [
    { key: 'maxGpuLength', label: 'Max GPU Length (mm)', type: 'number', placeholder: 'e.g. 360' },
    { key: 'maxCoolerHeight', label: 'Max Cooler Height (mm)', type: 'number', placeholder: 'e.g. 170' },
    { key: 'driveBays', label: 'Drive Bays', type: 'number', placeholder: 'e.g. 2' },
  ],
  monitor: [
    { key: 'size', label: 'Size (inches)', type: 'number', placeholder: 'e.g. 27' },
    { key: 'resolution', label: 'Resolution', type: 'text', placeholder: 'e.g. 2560x1440' },
    { key: 'refreshRate', label: 'Refresh Rate (Hz)', type: 'number', placeholder: 'e.g. 165' },
    { key: 'panelType', label: 'Panel Type', type: 'select', options: PANEL_TYPES },
    { key: 'responseTime', label: 'Response Time (ms)', type: 'number', placeholder: 'e.g. 1' },
  ],
};

export function PcPartEditor({
  value,
  onChange,
}: {
  value: PcPartFormValue;
  onChange: (v: PcPartFormValue) => void;
}) {
  const specFields = SPECS_BY_TYPE[value.type] || [];

  function updateSpec(key: string, val: string | number | boolean) {
    onChange({ ...value, specs: { ...value.specs, [key]: val } });
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">PC Builder part</Label>
          <p className="text-xs text-muted-foreground">
            Enable if this product is a component for the PC Builder (CPU,
            Motherboard, RAM, etc.).
          </p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: v })}
        />
      </div>

      {value.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Component type</Label>
              <Select
                value={value.type}
                onValueChange={(v) => onChange({ ...value, type: v ?? '', specs: v ? value.specs : {} })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Socket</Label>
              <Select
                value={value.socket}
                onValueChange={(v) => onChange({ ...value, socket: v ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Socket (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {SOCKETS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                CPU/Motherboard/Cooler: e.g. AM5, LGA1700
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select
                value={value.platform}
                onValueChange={(v) => onChange({ ...value, platform: v ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amd">AMD</SelectItem>
                  <SelectItem value="intel">Intel</SelectItem>
                  <SelectItem value="generic">Generic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Form factor</Label>
              <Select
                value={value.formFactor}
                onValueChange={(v) => onChange({ ...value, formFactor: v ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Form factor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_FACTORS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated wattage (W)</Label>
              <Input
                type="number"
                min={0}
                value={value.wattage || ''}
                placeholder="e.g. 65"
                onChange={(e) =>
                  onChange({ ...value, wattage: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {/* Component-specific specs */}
          {specFields.length > 0 && (
            <div className="rounded-md border p-3 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {COMPONENT_TYPES.find((t) => t.value === value.type)?.label || 'Component'} Specifications
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {specFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    {field.type === 'select' ? (
                      <Select
                        value={String(value.specs[field.key] ?? '')}
                        onValueChange={(v) => updateSpec(field.key, v ?? '')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options!.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'switch' ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Switch
                          checked={!!value.specs[field.key]}
                          onCheckedChange={(v) => updateSpec(field.key, v)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {value.specs[field.key] ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ) : (
                      <Input
                        type={field.type}
                        value={String(value.specs[field.key] ?? '')}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          updateSpec(
                            field.key,
                            field.type === 'number' ? (Number(e.target.value) || 0) : e.target.value
                          )
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
