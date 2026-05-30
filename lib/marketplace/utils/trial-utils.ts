export type ReminderPhase =
  | "GETTING_STARTED"
  | "ACTIVE"
  | "CONVERT_NOW"
  | "EXPIRING_SOON"
  | "EXPIRED";

export function computeTrialFields(trial: {
  status: string;
  trialDays: number;
  startedAt: Date;
  expiresAt: Date;
}) {
  const now = new Date();
  const isExpired = trial.expiresAt < now;
  const daysRemaining = isExpired
    ? 0
    : Math.ceil(
        (trial.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
  const daysUsed = trial.trialDays - daysRemaining;
  const progressPercent = Math.min(
    100,
    Math.round((daysUsed / trial.trialDays) * 100)
  );

  const effectiveStatus =
    trial.status === "CONVERTED"
      ? "CONVERTED"
      : isExpired && trial.status === "ACTIVE"
        ? "EXPIRED"
        : trial.status;

  let reminderPhase: ReminderPhase;
  if (effectiveStatus === "EXPIRED") {
    reminderPhase = "EXPIRED";
  } else if (effectiveStatus === "CONVERTED") {
    reminderPhase = "ACTIVE";
  } else if (daysRemaining <= 3) {
    reminderPhase = "EXPIRING_SOON";
  } else if (daysRemaining <= 9) {
    reminderPhase = "CONVERT_NOW";
  } else if (daysUsed < 7) {
    reminderPhase = "GETTING_STARTED";
  } else {
    reminderPhase = "ACTIVE";
  }

  return {
    daysRemaining,
    daysUsed,
    progressPercent,
    effectiveStatus,
    reminderPhase,
  };
}
