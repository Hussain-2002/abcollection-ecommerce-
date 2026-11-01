"use client";

import { useEffect, useState } from "react";

import { adminJson } from "@/components/admin/membership/shared";
import { formatIstDate } from "@/lib/membership";

type Entry = {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  "settings.update": "Programme settings changed",
  "rule.create": "Member price added",
  "rule.update": "Member price changed",
  "rule.delete": "Member price removed",
  "membership.grant": "Membership granted",
  "membership.revoke": "Membership revoked",
  "membership.reactivate": "Membership reactivated",
  "membership.change_dates": "Membership dates changed",
};

function show(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return formatIstDate(value, true);
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

/** Who changed what, when: settings, prices and membership status. */
export function MembershipAuditPanel() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminJson<{ entries: Entry[] }>("/api/admin/membership/audit")
      .then((data) => setEntries(data.entries))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="mt-6 text-sm text-destructive">{error}</p>;
  if (!entries) return <div className="skeleton mt-6 h-64" />;
  if (!entries.length)
    return <p className="mt-6 text-sm text-muted-foreground">No changes recorded yet.</p>;

  return (
    <ol className="mt-6 divide-y divide-border border border-border bg-white">
      {entries.map((entry) => {
        const keys = Object.keys({ ...(entry.oldValue ?? {}), ...(entry.newValue ?? {}) });
        return (
          <li key={entry.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</p>
              <p className="text-xs text-muted-foreground">
                {entry.adminId} · {formatIstDate(entry.createdAt, true)} IST
              </p>
            </div>
            {entry.note ? <p className="mt-1 text-muted-foreground">{entry.note}</p> : null}
            {keys.length && entry.action !== "rule.create" && entry.action !== "rule.delete" ? (
              <ul className="mt-2 space-y-0.5 text-xs">
                {keys.slice(0, 12).map((key) => (
                  <li key={key} className="break-words">
                    <span className="text-muted-foreground">{key}:</span>{" "}
                    {show(entry.oldValue?.[key])} → {show(entry.newValue?.[key])}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
