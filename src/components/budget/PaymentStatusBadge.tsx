import { Badge } from "@/components/ui/Badge";
import { PAYMENT_STATUS_COLOUR, PAYMENT_STATUS_LABEL } from "@/lib/utils/paymentStatus";
import type { PaymentStatus } from "@/lib/types/domain";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={PAYMENT_STATUS_COLOUR[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}
