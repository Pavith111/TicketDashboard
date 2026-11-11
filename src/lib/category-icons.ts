import {
  CircleHelp,
  Cpu,
  Globe,
  HardDrive,
  Headphones,
  KeyRound,
  Laptop,
  LayoutGrid,
  Mail,
  Monitor,
  Package,
  Phone,
  Printer,
  Projector,
  Server,
  ShieldCheck,
  Smartphone,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Icons admins can choose from when creating an issue category. */
export const CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  laptop: { icon: Laptop, label: "Laptop" },
  monitor: { icon: Monitor, label: "Monitor" },
  printer: { icon: Printer, label: "Printer" },
  wifi: { icon: Wifi, label: "Wi-Fi" },
  globe: { icon: Globe, label: "Globe" },
  mail: { icon: Mail, label: "Mail" },
  "layout-grid": { icon: LayoutGrid, label: "Apps" },
  package: { icon: Package, label: "Package" },
  "key-round": { icon: KeyRound, label: "Key" },
  projector: { icon: Projector, label: "Projector" },
  cpu: { icon: Cpu, label: "Chip" },
  server: { icon: Server, label: "Server" },
  "hard-drive": { icon: HardDrive, label: "Storage" },
  smartphone: { icon: Smartphone, label: "Phone" },
  phone: { icon: Phone, label: "Telephone" },
  headphones: { icon: Headphones, label: "Audio" },
  "shield-check": { icon: ShieldCheck, label: "Security" },
  "circle-help": { icon: CircleHelp, label: "Other" },
};

export function categoryIcon(name?: string | null): LucideIcon {
  return (name && CATEGORY_ICONS[name]?.icon) || CircleHelp;
}
