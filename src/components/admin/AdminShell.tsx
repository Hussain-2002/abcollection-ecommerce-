"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
import { ExternalLink, LogOut, Search } from "lucide-react";

import { AdminCommandMenu } from "@/components/admin/AdminCommandMenu";
import { ADMIN_NAV, adminBreadcrumbs, isAdminNavActive } from "@/components/admin/admin-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const crumbs = adminBreadcrumbs(pathname);
  const initial = username.slice(0, 1).toUpperCase();

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Dashboard">
                <Link href="/admin">
                  <span className="flex size-8 shrink-0 items-center justify-center">
                    <img
                      src="/brand/ab-monogram-sm.png"
                      alt=""
                      width={180}
                      height={148}
                      className="h-6 w-auto"
                    />
                  </span>
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-[0.78rem] font-medium tracking-[0.18em] uppercase">
                      AB Collection
                    </span>
                    <span className="truncate text-xs text-muted-foreground">Store console</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {ADMIN_NAV.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isAdminNavActive(pathname, item.href)}
                        tooltip={item.label}
                        className="data-[active=true]:bg-ink data-[active=true]:font-normal data-[active=true]:text-white"
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="View site">
                <Link href="/" target="_blank">
                  <ExternalLink />
                  <span>View site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip="Log out">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{username}</span>
              <span className="block truncate text-xs text-muted-foreground">Signed in</span>
            </span>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <Fragment key={`${crumb.label}-${index}`}>
                    {index > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem>
                      {last || !crumb.href ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <Button
            type="button"
            variant="outline"
            className="ml-auto h-8 gap-2 px-3 text-muted-foreground"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] font-medium text-foreground sm:inline">
              ⌘K
            </kbd>
          </Button>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
      <AdminCommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  );
}
