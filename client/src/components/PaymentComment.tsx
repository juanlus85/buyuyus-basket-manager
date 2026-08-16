import React from "react";
import { visiblePaymentComment } from "@/lib/financePresentation";

export function PaymentComment({ note }: { note: string | null | undefined }) {
  const text = visiblePaymentComment(note);
  return text ? <p className="mt-1 text-xs italic text-muted-foreground">{text}</p> : null;
}
