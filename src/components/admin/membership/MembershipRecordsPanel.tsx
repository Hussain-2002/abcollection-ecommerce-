"use client";

import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminList } from "@/components/admin/AdminList";
import { StatusPill } from "@/components/admin/StatusPill";
import { adminJson, fromLocalInput, toLocalInput } from "@/components/admin/membership/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  MEMBERSHIP_SOURCE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUSES,
  formatIstDate,
  type CustomerMembership,
} from "@/lib/membership";
import { formatInr } from "@/lib/price";

type Customer = { id: string; fullName: string; email: string; phone: string };
type MembershipRow = CustomerMembership & { customer: Customer | null };
type Detail = {
  membership: CustomerMembership;
  customer: Customer | null;
  payments: {
    id: string;
    provider: string;
    providerOrderId: string;
    providerPaymentId: string | null;
    amount: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }[];
  history: {
    id: string;
    adminId: string;
    action: string;
    note: string | null;
    oldValue: unknown;
    newValue: unknown;
    createdAt: string;
  }[];
};

/** Membership records: search, filter, inspect, grant, revoke, change dates. */
export function MembershipRecordsPanel() {
  const [records, setRecords] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    setLoading(true);
    try {
      setError("");
      const data = await adminJson<{ records: MembershipRow[] }>(
        `/api/admin/membership/records?${params}`,
      );
      setRecords(data.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load memberships.");
    } finally {
      setLoading(false);
    }
  }, [from, q, source, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Name, email, mobile, ID or ABI-…"
            className="h-10 pl-9"
            aria-label="Search memberships"
          />
        </div>
        <NativeSelect
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 w-auto"
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {MEMBERSHIP_STATUSES.map((value) => (
            <option key={value} value={value}>
              {MEMBERSHIP_STATUS_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="h-10 w-auto"
          aria-label="Source"
        >
          <option value="">All sources</option>
          <option value="paid">Paid</option>
          <option value="admin_granted">Admin granted</option>
        </NativeSelect>
        <Input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="h-10 w-auto"
          aria-label="Created from"
        />
        <Input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="h-10 w-auto"
          aria-label="Created to"
        />
        <Button type="button" className="h-10 sm:ml-auto" onClick={() => setGrantOpen(true)}>
          Grant membership
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <AdminList
        rows={records}
        loading={loading}
        hideSearch
        rowKey={(row) => row.id}
        getSearchText={() => ""}
        empty="No memberships match."
        columns={[
          {
            header: "Member",
            cell: (row) => (
              <button type="button" onClick={() => setDetailId(row.id)} className="text-left">
                <span className="block font-medium underline-offset-4 hover:underline">
                  {row.customer?.fullName ?? "Deleted customer"}
                </span>
                <span className="block text-xs text-muted-foreground">{row.membershipNumber}</span>
              </button>
            ),
          },
          {
            header: "Status",
            cell: (row) => (
              <StatusPill status={row.status}>{MEMBERSHIP_STATUS_LABELS[row.status]}</StatusPill>
            ),
          },
          {
            header: "Source",
            className: "hidden md:table-cell",
            cell: (row) => MEMBERSHIP_SOURCE_LABELS[row.source],
          },
          {
            header: "Expires",
            className: "hidden sm:table-cell",
            cell: (row) => formatIstDate(row.expiresAt),
          },
          {
            header: "Created",
            className: "hidden lg:table-cell",
            cell: (row) => formatIstDate(row.createdAt),
          },
          {
            header: "",
            className: "text-right",
            cell: (row) => (
              <Button
                type="button"
                variant="ghost"
                className="h-8"
                onClick={() => setDetailId(row.id)}
              >
                View
              </Button>
            ),
          },
        ]}
        footer={`${records.length} membership${records.length === 1 ? "" : "s"} · dates in IST`}
      />

      <GrantDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onGranted={() => {
          setGrantOpen(false);
          void load();
        }}
      />
      <MembershipDetailSheet
        id={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => void load()}
      />
    </div>
  );
}

function GrantDialog({
  open,
  onOpenChange,
  onGranted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setStartsAt("");
      setExpiresAt("");
      setNote("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void adminJson<{ customers: Customer[] }>(
        `/api/admin/membership/customers?q=${encodeURIComponent(query.trim())}`,
      )
        .then((data) => setResults(data.customers))
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const grant = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await adminJson("/api/admin/membership/records", {
        method: "POST",
        body: JSON.stringify({
          customerId: selected.id,
          startsAt: fromLocalInput(startsAt),
          expiresAt: fromLocalInput(expiresAt),
          note,
        }),
      });
      toast.success(`Membership granted to ${selected.fullName}`);
      onGranted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant membership.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(100%,calc(100vw-1.5rem))] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grant membership</DialogTitle>
          <DialogDescription>
            Complimentary: no payment is requested and no fee is recorded.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {selected ? (
            <div className="flex items-start justify-between gap-3 border border-border p-3 text-sm">
              <span>
                <span className="block font-medium">{selected.fullName}</span>
                <span className="block text-muted-foreground">
                  {selected.email} · {selected.phone}
                </span>
              </span>
              <button type="button" className="text-xs underline" onClick={() => setSelected(null)}>
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="grant-search">Customer</Label>
              <Input
                id="grant-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, mobile, email or customer ID"
                autoFocus
              />
              {results.length ? (
                <ul className="max-h-56 divide-y divide-border overflow-y-auto border border-border">
                  {results.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(customer)}
                        className="w-full p-3 text-left text-sm hover:bg-muted"
                      >
                        <span className="block font-medium">{customer.fullName}</span>
                        <span className="block text-muted-foreground">
                          {customer.email} · {customer.phone}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim().length >= 2 ? (
                <p className="text-xs text-muted-foreground">No registered customers match.</p>
              ) : null}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Blank = now</p>
            </div>
            <div className="space-y-1.5">
              <Label>Expires</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Blank = default validity</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Internal note (optional)</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why this is being granted"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!selected || busy} onClick={() => void grant()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Grant membership
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Action = "revoke" | "reactivate" | "change_dates";

function MembershipDetailSheet({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      setDetail(await adminJson<Detail>(`/api/admin/membership/records/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load membership.");
    }
  }, [id]);

  useEffect(() => {
    setDetail(null);
    setAction(null);
    void load();
  }, [load]);

  const startAction = (next: Action) => {
    setAction(next);
    setReason("");
    setStartsAt(toLocalInput(detail?.membership.startsAt));
    setExpiresAt(toLocalInput(detail?.membership.expiresAt));
  };

  const submit = async () => {
    if (!id || !action || busy) return;
    setBusy(true);
    setError("");
    try {
      await adminJson(`/api/admin/membership/records/${id}`, {
        method: "PATCH",
        body: JSON.stringify(
          action === "change_dates"
            ? {
                action,
                reason,
                startsAt: fromLocalInput(startsAt),
                expiresAt: fromLocalInput(expiresAt) ?? "",
              }
            : { action, reason },
        ),
      });
      toast.success("Membership updated");
      setAction(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update membership.");
    } finally {
      setBusy(false);
    }
  };

  const m = detail?.membership;
  return (
    <Sheet open={id !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-0">
        <div className="border-b border-border p-6 pr-14">
          <SheetTitle>{m ? m.membershipNumber : "Membership"}</SheetTitle>
          <SheetDescription>{detail?.customer?.fullName ?? ""}</SheetDescription>
        </div>
        {!detail ? (
          <div className="p-6">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="skeleton h-40" />
            )}
          </div>
        ) : m ? (
          <div className="grid gap-6 p-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Status", MEMBERSHIP_STATUS_LABELS[m.status]],
                ["Source", MEMBERSHIP_SOURCE_LABELS[m.source]],
                ["Starts", formatIstDate(m.startsAt, true)],
                ["Expires", formatIstDate(m.expiresAt, true)],
                ["Plan", m.planName],
                ["Fee", m.source === "admin_granted" ? "Complimentary" : formatInr(m.feeAmount)],
                [
                  "Customer",
                  detail.customer ? `${detail.customer.email} · ${detail.customer.phone}` : "—",
                ],
                ["Terms version", `v${m.termsVersion}`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 break-words">{value}</dd>
                </div>
              ))}
            </dl>

            {m.source === "admin_granted" ? (
              <section className="border border-border p-4 text-sm">
                <h3 className="font-medium">Grant details</h3>
                <p className="mt-2 text-muted-foreground">
                  Granted by {m.grantedBy ?? "—"} on {formatIstDate(m.purchasedAt, true)} IST
                </p>
                {m.grantNote ? <p className="mt-1">Note: {m.grantNote}</p> : null}
              </section>
            ) : (
              <section className="border border-border p-4 text-sm">
                <h3 className="font-medium">Payments</h3>
                {detail.payments.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.payments.map((payment) => (
                      <li key={payment.id} className="break-all text-muted-foreground">
                        {formatInr(payment.amount)} · {payment.status} · {payment.provider} order{" "}
                        {payment.providerOrderId}
                        {payment.providerPaymentId ? ` · payment ${payment.providerPaymentId}` : ""}
                        {payment.paidAt ? ` · paid ${formatIstDate(payment.paidAt, true)}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-muted-foreground">No payment recorded.</p>
                )}
              </section>
            )}

            {m.status === "revoked" ? (
              <p className="text-sm text-muted-foreground">
                Revoked by {m.revokedBy} on {formatIstDate(m.revokedAt, true)} IST: {m.revokeReason}
              </p>
            ) : null}

            <section>
              <h3 className="text-sm font-medium">Actions</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.status !== "revoked" &&
                m.status !== "pending_payment" &&
                m.status !== "failed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => startAction("revoke")}
                  >
                    Revoke
                  </Button>
                ) : null}
                {m.status === "revoked" || m.status === "expired" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => startAction("reactivate")}
                  >
                    Reactivate
                  </Button>
                ) : null}
                {m.status !== "pending_payment" && m.status !== "failed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => startAction("change_dates")}
                  >
                    Change dates
                  </Button>
                ) : null}
              </div>
              {action ? (
                <div className="mt-4 grid gap-3 border border-border bg-white p-4">
                  {action === "change_dates" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Starts</Label>
                        <Input
                          type="datetime-local"
                          value={startsAt}
                          onChange={(event) => setStartsAt(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Expires</Label>
                        <Input
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(event) => setExpiresAt(event.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label>Reason (required, saved in the audit log)</Label>
                    <Textarea
                      rows={2}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setAction(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={busy || reason.trim().length < 3}
                      onClick={() => void submit()}
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                      {action === "revoke"
                        ? "Revoke membership"
                        : action === "reactivate"
                          ? "Reactivate"
                          : "Save dates"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section>
              <h3 className="text-sm font-medium">Status history</h3>
              {detail.history.length ? (
                <ol className="mt-3 space-y-3 border-l border-border pl-4 text-sm">
                  {detail.history.map((entry) => (
                    <li key={entry.id}>
                      <p className="font-medium">
                        {entry.action.replace("membership.", "").replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.adminId} · {formatIstDate(entry.createdAt, true)} IST
                      </p>
                      {entry.note ? <p className="mt-0.5">{entry.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {m.source === "paid"
                    ? "Activated by verified payment. No admin changes."
                    : "No admin changes."}
                </p>
              )}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
