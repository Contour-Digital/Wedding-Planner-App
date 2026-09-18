import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ExportBinderCard() {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-display text-lg font-semibold">Wedding binder</h3>
        <p className="mt-1 text-xs text-muted">
          A single printable document with everything — contacts, the wedding day timeline, tasks, budget,
          and vendors — ready to save as a PDF.
        </p>
      </div>
      <Link href="/export/binder" target="_blank">
        <Button variant="secondary">Export wedding binder</Button>
      </Link>
    </Card>
  );
}
