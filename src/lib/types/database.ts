// Hand-written mirror of the Supabase schema (supabase/migrations/0001_init.sql).
// Once the project is linked to a real Supabase instance, this can be replaced
// by running `supabase gen types typescript` — the shapes below match exactly
// so that swap is a no-op for the rest of the app.

export type WeddingRole = "owner" | "editor" | "timeline_viewer" | "viewer";

export type VendorStatus = "considering" | "contacted" | "quote_received" | "booked" | "completed";

export type VendorDocumentType =
  | "contract"
  | "invoice"
  | "menu"
  | "seating_plan"
  | "quote"
  | "run_sheet"
  | "inspiration"
  | "other";

export type TaskCategory =
  | "general"
  | "vendors"
  | "guests"
  | "wedding_day"
  | "attire"
  | "payments"
  | "documents";

export type TimelineGroup =
  | "ceremony"
  | "photos"
  | "cocktail_hour"
  | "reception"
  | "formalities"
  | "pack_down"
  | "other";

export type ReminderDays = 0 | 3 | 7 | 14 | 30 | null;

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Wedding {
  id: string;
  partner_1: string;
  partner_2: string;
  wedding_date: string | null;
  ceremony_time: string | null;
  venue: string | null;
  location: string | null;
  guest_count: number | null;
  currency: string;
  joint_email: string | null;
  primary_colour: string;
  secondary_colour: string;
  total_budget: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeddingMember {
  id: string;
  wedding_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: WeddingRole;
  created_at: string;
  profile?: Profile | null;
}

export interface ExpenseCategory {
  id: string;
  wedding_id: string;
  name: string;
  target_budget: number;
  sort_order: number;
  is_uncategorised: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  wedding_id: string;
  name: string;
  type: string | null;
  status: VendorStatus;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  role: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  type: VendorDocumentType;
  title: string;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  wedding_id: string;
  category_id: string | null;
  vendor_id: string | null;
  name: string;
  total_amount: number;
  deposit_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInstalment {
  id: string;
  expense_id: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
  reminder_days: ReminderDays;
  label: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  wedding_id: string;
  title: string;
  assigned_user_id: string | null;
  assigned_to_both: boolean;
  category: TaskCategory;
  due_date: string | null;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  wedding_id: string;
  group_name: TimelineGroup;
  sort_order: number;
  start_time: string | null;
  duration_minutes: number | null;
  title: string;
  location: string | null;
  responsible_person: string | null;
  shared_notes: string | null;
  private_notes: string | null;
  managed_type: "ceremony" | null;
  created_at: string;
  updated_at: string;
}

// What timeline_viewer / viewer actually receive — private_notes does not
// exist on the wire for them at all (see timeline_events_shared view).
export type TimelineEventShared = Omit<TimelineEvent, "private_notes" | "created_at" | "updated_at">;

export interface InspirationCategory {
  id: string;
  wedding_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface InspirationPhoto {
  id: string;
  wedding_id: string;
  category_id: string | null;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface InspirationPhotoComment {
  id: string;
  photo_id: string;
  x: number;
  y: number;
  comment: string;
  created_by: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  wedding_id: string;
  user_id: string | null;
  action_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  profile?: Profile | null;
}
