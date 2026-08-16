export type HabitualTemplate = {
  defaultAmountCents: number | null;
  defaultAccountId: number | null;
  defaultConcept: string;
  direction: "income" | "expense";
};

export function prepareHabitualMovement(template: HabitualTemplate) {
  return {
    amount: template.defaultAmountCents ? String(template.defaultAmountCents / 100) : "",
    accountId: template.defaultAccountId ? String(template.defaultAccountId) : "none",
    concept: template.defaultConcept,
    directionLabel: template.direction === "income" ? "Ingreso" : "Gasto",
  };
}

export function visiblePaymentComment(note: string | null | undefined) {
  return note ? `Comentario: ${note}` : null;
}

export function canRecordAdminPayment(input: { playerId: string; chargeId: string; accountId: string; manualConcept?: string }) {
  return input.playerId !== "none" && input.accountId !== "none" && (input.chargeId !== "none" || Boolean(input.manualConcept?.trim()));
}
