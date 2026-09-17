"use client";

import { PageHeader } from "@/components/nav/PageHeader";
import { WeddingSettingsForm } from "@/components/settings/WeddingSettingsForm";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { canEdit } from "@/lib/utils/permissions";

export default function SettingsPage() {
  const { role } = useWedding();

  if (!canEdit(role)) {
    return (
      <div>
        <PageHeader title="Settings" />
        <p className="p-6 text-sm text-muted">Only the couple can change wedding settings.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-6 p-4 sm:p-6">
        <WeddingSettingsForm />
        <CategoryManager />
      </div>
    </div>
  );
}
