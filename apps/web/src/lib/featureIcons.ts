import { Compass, Handshake, Headset, LineChart, Network, ShieldCheck, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeatureIcon } from "@momentum/shared";

/** Icon names stored in `site_content.why_choose_us` mapped to Lucide icons. */
export const FEATURE_ICONS: Record<FeatureIcon, LucideIcon> = {
  compass: Compass,
  network: Network,
  users: Users,
  zap: Zap,
  "line-chart": LineChart,
  handshake: Handshake,
  shield: ShieldCheck,
  headset: Headset,
};

/** Falls back to a neutral icon if the CMS holds a name this build does not know. */
export function featureIcon(name: string): LucideIcon {
  return FEATURE_ICONS[name as FeatureIcon] ?? Compass;
}
