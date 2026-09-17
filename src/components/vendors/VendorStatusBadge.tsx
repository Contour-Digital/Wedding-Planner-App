import { Badge } from "@/components/ui/Badge";
import type { VendorStatus } from "@/lib/types/database";

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  considering: "Considering",
  contacted: "Contacted",
  quote_received: "Quote Received",
  booked: "Booked",
  completed: "Completed",
};

export const VENDOR_STATUS_COLOUR: Record<VendorStatus, string> = {
  considering: "bg-line text-muted",
  contacted: "bg-blue-100 text-blue-800",
  quote_received: "bg-warn/15 text-warn",
  booked: "bg-good/15 text-good",
  completed: "bg-primary/15 text-primaryStrong",
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <Badge className={VENDOR_STATUS_COLOUR[status]}>{VENDOR_STATUS_LABEL[status]}</Badge>;
}

export const VENDOR_STATUS_OPTIONS: VendorStatus[] = [
  "considering",
  "contacted",
  "quote_received",
  "booked",
  "completed",
];
