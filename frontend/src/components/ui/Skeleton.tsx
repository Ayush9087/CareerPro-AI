/**
 * Reusable skeleton primitives and page-level skeleton layouts.
 */

interface SkeletonProps {
  className?: string;
}

export function SkeletonBox({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-career-border/40 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`h-4 rounded ${className}`} />;
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <SkeletonBox className={`rounded-full ${className}`} />;
}

/** Full-page skeleton for Dashboard */
export function DashboardSkeleton() {
  return (
    <div className="space-y-7 pb-8" aria-label="Loading dashboard" role="status">
      {/* Header */}
      <div className="border-b border-career-border pb-5 space-y-2">
        <SkeletonText className="w-36 h-3" />
        <SkeletonText className="w-64 h-8" />
        <SkeletonText className="w-80 h-4" />
      </div>
      {/* Score + priorities grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <SkeletonText className="w-32 h-3" />
              <SkeletonText className="w-48 h-6" />
              <SkeletonText className="w-60 h-4" />
            </div>
            <SkeletonCircle className="h-36 w-36 shrink-0" />
          </div>
        </div>
        <div className="lg:col-span-5 space-y-3">
          <SkeletonText className="w-28 h-3" />
          <SkeletonText className="w-48 h-6" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 py-3">
              <SkeletonCircle className="h-7 w-7 shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonText className="w-full h-4" />
                <SkeletonText className="w-40 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Lower cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 py-4">
            <SkeletonText className="w-40 h-5" />
            <SkeletonText className="w-full h-4" />
            <SkeletonText className="w-3/4 h-4" />
            <SkeletonBox className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for list-heavy pages (Roadmap, Interview, etc.) */
export function ListPageSkeleton() {
  return (
    <div className="space-y-7 pb-8" aria-label="Loading content" role="status">
      <div className="border-b border-career-border pb-5 space-y-2">
        <SkeletonText className="w-28 h-3" />
        <SkeletonText className="w-56 h-8" />
        <SkeletonText className="w-96 h-4" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t border-career-border pt-5 space-y-3">
          <SkeletonText className="w-40 h-5" />
          <SkeletonText className="w-full h-4" />
          <SkeletonText className="w-3/4 h-4" />
          <SkeletonBox className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for chat page */
export function ChatSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col border border-career-border bg-career-surface md:min-h-[calc(100vh-4rem)] md:flex-row" aria-label="Loading chat" role="status">
      <div className="border-b border-career-border md:w-64 md:border-b-0 md:border-r p-4 space-y-3">
        <SkeletonText className="w-20 h-3" />
        <SkeletonText className="w-32 h-6" />
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="h-9 w-9" />
          <div className="space-y-1.5">
            <SkeletonText className="w-40 h-5" />
            <SkeletonText className="w-56 h-3" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[20rem]">
          <div className="space-y-4 w-full max-w-md">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBox key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for profile page */
export function ProfileSkeleton() {
  return (
    <div className="space-y-7 pb-8" aria-label="Loading profile" role="status">
      <div className="border-b border-career-border pb-5 space-y-2">
        <SkeletonText className="w-28 h-3" />
        <SkeletonText className="w-44 h-8" />
        <SkeletonText className="w-72 h-4" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <SkeletonText className="w-40 h-6" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonText className="w-16 h-3" />
                <SkeletonBox className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <SkeletonText className="w-24 h-6" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between gap-3 py-3 border-b border-career-border">
              <SkeletonText className="w-32 h-4" />
              <SkeletonText className="w-12 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
