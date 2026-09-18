"use client";

import { PageHeader } from "@/components/nav/PageHeader";
import { PersonalProfileForm } from "@/components/settings/PersonalProfileForm";
import { WeddingSettingsForm } from "@/components/settings/WeddingSettingsForm";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { ExportBinderCard } from "@/components/settings/ExportBinderCard";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { canEdit } from "@/lib/utils/permissions";

export default function SettingsPage() {
  const { role } = useWedding();

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-6 p-4 sm:p-6">
        <PersonalProfileForm />
        {canEdit(role) && (
          <>
            <WeddingSettingsForm />
            <CategoryManager />
            <ExportBinderCard />
          </>
        )}
        {role === "owner" && <DeleteAccountCard />}
      </div>
    </div>
  );
}
