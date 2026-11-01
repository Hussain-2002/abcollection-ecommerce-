"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MembershipAuditPanel } from "@/components/admin/membership/MembershipAuditPanel";
import { MembershipOverview } from "@/components/admin/membership/MembershipOverview";
import { MembershipPricingPanel } from "@/components/admin/membership/MembershipPricingPanel";
import { MembershipRecordsPanel } from "@/components/admin/membership/MembershipRecordsPanel";
import { MembershipSettingsPanel } from "@/components/admin/membership/MembershipSettingsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminMembershipPage() {
  return (
    <div>
      <AdminPageHeader
        title="AB Insider Membership"
        description="Run the membership programme: members, member prices, settings and history. All dates are shown in IST."
        actions={
          <a
            href="/membership"
            target="_blank"
            rel="noreferrer"
            className="text-sm underline underline-offset-4"
          >
            View membership page
          </a>
        }
      />
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="no-scrollbar flex h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="pricing">Member pricing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <MembershipOverview />
        </TabsContent>
        <TabsContent value="members">
          <MembershipRecordsPanel />
        </TabsContent>
        <TabsContent value="pricing">
          <MembershipPricingPanel />
        </TabsContent>
        <TabsContent value="settings">
          <MembershipSettingsPanel />
        </TabsContent>
        <TabsContent value="audit">
          <MembershipAuditPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
