"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { adminJson } from "@/components/admin/membership/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatIstDate, type MembershipSettings } from "@/lib/membership";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border border-border bg-white p-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Programme settings: status, fee, validity, plan copy, terms and stacking. */
export function MembershipSettingsPanel() {
  const [settings, setSettings] = useState<MembershipSettings | null>(null);
  const [benefitsText, setBenefitsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminJson<{ settings: MembershipSettings }>("/api/admin/membership/settings")
      .then(({ settings: loaded }) => {
        setSettings(loaded);
        setBenefitsText(loaded.benefits.join("\n"));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error && !settings) return <p className="mt-6 text-sm text-destructive">{error}</p>;
  if (!settings) {
    return (
      <div className="mt-6 grid gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-20" />
        ))}
      </div>
    );
  }

  const set = <K extends keyof MembershipSettings>(key: K, value: MembershipSettings[K]) =>
    setSettings((current) => (current ? { ...current, [key]: value } : current));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const { settings: saved } = await adminJson<{ settings: MembershipSettings }>(
        "/api/admin/membership/settings",
        {
          method: "PUT",
          body: JSON.stringify({
            programmeEnabled: settings.programmeEnabled,
            membershipFee: settings.membershipFee,
            defaultValidityDays: settings.defaultValidityDays,
            planName: settings.planName,
            description: settings.description,
            benefits: benefitsText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            termsContent: settings.termsContent,
            stackCoupons: settings.stackCoupons,
            stackOffers: settings.stackOffers,
            stackBundles: settings.stackBundles,
            reminderDays: settings.reminderDays,
            notifyOnGrant: settings.notifyOnGrant,
          }),
        },
      );
      setSettings(saved);
      setBenefitsText(saved.benefits.join("\n"));
      toast.success("Membership settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-6 grid max-w-3xl gap-8">
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Programme</h2>
        <Toggle
          label="Accept new memberships"
          hint="Turning this off stops new purchases only. Existing memberships keep working until they expire."
          checked={settings.programmeEnabled}
          onChange={(value) => set("programmeEnabled", value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Membership fee (₹)"
            hint="Used by the membership page and payment checkout."
          >
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={settings.membershipFee}
              onChange={(event) => set("membershipFee", Number(event.target.value) || 0)}
            />
          </Field>
          <Field
            label="Validity (days)"
            hint="Applies to memberships created after saving. Existing expiry dates don't change."
          >
            <Input
              type="number"
              min={1}
              max={3650}
              inputMode="numeric"
              value={settings.defaultValidityDays}
              onChange={(event) => set("defaultValidityDays", Number(event.target.value) || 365)}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Plan details</h2>
        <Field label="Plan name">
          <Input
            value={settings.planName}
            onChange={(event) => set("planName", event.target.value)}
          />
        </Field>
        <Field label="Description" hint="Shown at the top of the membership page.">
          <Textarea
            rows={3}
            value={settings.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>
        <Field label="Benefits" hint="One per line, up to 12.">
          <Textarea
            rows={5}
            value={benefitsText}
            onChange={(event) => setBenefitsText(event.target.value)}
          />
        </Field>
        <Field
          label="Membership terms"
          hint={`Version ${settings.termsVersion}. Editing the terms creates a new version that new buyers must accept.`}
        >
          <Textarea
            rows={8}
            value={settings.termsContent}
            onChange={(event) => set("termsContent", event.target.value)}
          />
        </Field>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Discount stacking</h2>
        <p className="text-sm text-muted-foreground">
          Off (default): member-priced items get only the member price. Coupons, offers and bundles
          then apply to the other items in the cart.
        </p>
        <Toggle
          label="Combine with coupon codes"
          checked={settings.stackCoupons}
          onChange={(value) => set("stackCoupons", value)}
        />
        <Toggle
          label="Combine with store offers"
          hint="For example the Istefada offer."
          checked={settings.stackOffers}
          onChange={(value) => set("stackOffers", value)}
        />
        <Toggle
          label="Combine with bundle deals"
          checked={settings.stackBundles}
          onChange={(value) => set("stackBundles", value)}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Notifications</h2>
        <Toggle
          label="Email customers when membership is granted"
          checked={settings.notifyOnGrant}
          onChange={(value) => set("notifyOnGrant", value)}
        />
        <Field
          label="Expiry reminder (days before)"
          hint="0 turns reminders off. Sent by the daily job."
        >
          <Input
            type="number"
            min={0}
            max={60}
            inputMode="numeric"
            value={settings.reminderDays}
            onChange={(event) => set("reminderDays", Number(event.target.value) || 0)}
            className="max-w-40"
          />
        </Field>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={saving} className="h-11 px-6">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save settings
        </Button>
        {settings.updatedBy ? (
          <p className="text-xs text-muted-foreground">
            Last saved by {settings.updatedBy}, {formatIstDate(settings.updatedAt, true)} IST
          </p>
        ) : null}
      </div>
    </form>
  );
}
