import {
  Award,
  BatteryCharging,
  CalendarCheck,
  CircleHelp,
  Cpu,
  CreditCard,
  Gamepad2,
  Gift,
  HardDrive,
  Headphones,
  Keyboard,
  LaptopMinimal,
  type LucideIcon,
  MessageSquareWarning,
  Monitor,
  Package,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Tablet,
  Truck,
  Watch,
  Wrench,
} from 'lucide-react';

/**
 * Icon registry for the homepage "service finder" cards.
 *
 * Only the icon *key* is stored in the database (`service_finder_entries.icon`),
 * so the admin picker and the storefront render the exact same glyph without
 * shipping any image uploads.
 */
export type ServiceIconOption = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

export const SERVICE_ICON_OPTIONS: ServiceIconOption[] = [
  { key: 'laptop', label: 'Laptop', Icon: LaptopMinimal },
  { key: 'smartphone', label: 'Phone', Icon: Smartphone },
  { key: 'tablet', label: 'Tablet', Icon: Tablet },
  { key: 'monitor', label: 'Desktop', Icon: Monitor },
  { key: 'cpu', label: 'Components', Icon: Cpu },
  { key: 'hard-drive', label: 'Storage', Icon: HardDrive },
  { key: 'keyboard', label: 'Accessories', Icon: Keyboard },
  { key: 'headphones', label: 'Audio', Icon: Headphones },
  { key: 'watch', label: 'Wearables', Icon: Watch },
  { key: 'printer', label: 'Printer', Icon: Printer },
  { key: 'gamepad', label: 'Gaming', Icon: Gamepad2 },
  { key: 'battery', label: 'Battery', Icon: BatteryCharging },
  { key: 'repair', label: 'Repair / Service', Icon: Wrench },
  { key: 'return', label: 'Returns', Icon: RotateCcw },
  { key: 'complaint', label: 'Complaint', Icon: MessageSquareWarning },
  { key: 'search', label: 'Finder / Search', Icon: Search },
  { key: 'warranty', label: 'Warranty', Icon: ShieldCheck },
  { key: 'delivery', label: 'Delivery', Icon: Truck },
  { key: 'payment', label: 'Payment / EMI', Icon: CreditCard },
  { key: 'booking', label: 'Booking', Icon: CalendarCheck },
  { key: 'support', label: 'Support / FAQ', Icon: CircleHelp },
  { key: 'store', label: 'Store', Icon: Store },
  { key: 'offers', label: 'Offers / Gifts', Icon: Gift },
  { key: 'award', label: 'Featured', Icon: Award },
  { key: 'products', label: 'Products', Icon: Package },
  { key: 'settings', label: 'Custom / Settings', Icon: Settings2 },
  { key: 'sparkles', label: 'General', Icon: Sparkles },
];

const SERVICE_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  SERVICE_ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
);

/** Fallback used when no key is stored or the stored key is unknown. */
export const DEFAULT_SERVICE_ICON = Sparkles;

/** Resolve a stored icon key to a lucide component. */
export function serviceIcon(key?: string | null): LucideIcon {
  if (!key) return DEFAULT_SERVICE_ICON;
  return SERVICE_ICONS[key] ?? DEFAULT_SERVICE_ICON;
}
