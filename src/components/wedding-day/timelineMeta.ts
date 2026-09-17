import type { TimelineGroup } from "@/lib/types/database";

export const TIMELINE_GROUP_LABEL: Record<TimelineGroup, string> = {
  ceremony: "Ceremony",
  photos: "Photos",
  cocktail_hour: "Cocktail Hour",
  reception: "Reception",
  formalities: "Formalities",
  pack_down: "Pack Down",
  other: "Other",
};

export const TIMELINE_GROUP_OPTIONS: TimelineGroup[] = [
  "ceremony",
  "photos",
  "cocktail_hour",
  "reception",
  "formalities",
  "pack_down",
  "other",
];
