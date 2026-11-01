export function RouteSkeleton({
  variant = "page",
}: {
  variant?: "page" | "grid" | "pdp" | "form";
}) {
  if (variant === "grid") {
    return (
      <div aria-busy="true" aria-label="Loading products" className="min-h-[100svh]">
        <div className="page-wrap pt-[clamp(1.75rem,4vw,3rem)] pb-6">
          <div className="h-3 w-28 skeleton" />
          <div className="mt-5 h-12 w-56 skeleton" />
        </div>
        <div className="h-12 border-y border-border" />
        <div className="page-wrap grid grid-cols-2 gap-x-2.5 gap-y-7 pt-5 pb-16 min-[900px]:grid-cols-4 min-[900px]:gap-x-4 min-[900px]:gap-y-10">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] skeleton" />
              <div className="mt-3 h-3.5 w-3/4 skeleton" />
              <div className="mt-2 h-3 w-1/2 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "pdp") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading product"
        className="min-h-[100svh] lg:page-wrap lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12 lg:pt-6 xl:gap-16"
      >
        <div className="grid gap-1.5 lg:grid-cols-2">
          <div className="skeleton aspect-[2/3]" />
          <div className="skeleton hidden aspect-[2/3] lg:block" />
          <div className="skeleton hidden aspect-[2/3] lg:block" />
          <div className="skeleton hidden aspect-[2/3] lg:block" />
        </div>
        <div className="page-wrap pt-5 lg:px-0 lg:pt-0">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-6 h-6 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/3" />
          <div className="skeleton mt-5 h-6 w-28" />
          <div className="mt-8 flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton size-9 rounded-full" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-11" />
            ))}
          </div>
          <div className="skeleton mt-7 h-12 w-full" />
          <div className="skeleton mt-2 h-12 w-full" />
          <div className="mt-7 space-y-3">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="h-10 w-56 skeleton" />
        <div className="mt-3 h-4 w-80 max-w-full skeleton" />
        <div className="mt-10 space-y-4">
          <div className="h-40 skeleton" />
          <div className="h-40 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="h-10 w-48 skeleton" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-5/6 skeleton" />
        <div className="h-4 w-2/3 skeleton" />
      </div>
    </div>
  );
}
