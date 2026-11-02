import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HeroBannersForm } from "@/components/admin/HeroBannersForm";
import { getHeroBanners } from "@/lib/home-banners.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin Banners",
  description: "Manage homepage banners",
  path: "/admin/banners",
  noIndex: true,
});

export default async function AdminBannersPage() {
  const banners = await getHeroBanners();

  return (
    <>
      <AdminPageHeader
        title="Homepage banners"
        description="The full-screen images at the top of the homepage. Add one or more; with several, they rotate every few seconds."
      />
      <div className="mt-8">
        <HeroBannersForm initial={banners} />
      </div>
    </>
  );
}
