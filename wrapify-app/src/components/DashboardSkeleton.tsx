"use client";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl bg-zinc-800/50 ${className || ""}`}
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Overview bento */}
      <div className="grid grid-cols-12 auto-rows-[96px] grid-flow-dense gap-4">
        <Bone className="col-span-3 row-span-2" />
        <Bone className="col-span-3 row-span-2" />
        <Bone className="col-span-2 row-span-1" />
        <Bone className="col-span-2 row-span-1" />
        <Bone className="col-span-2 row-span-1" />
        <Bone className="col-span-2 row-span-1" />
        <Bone className="col-span-4 row-span-1" />
      </div>

      {/* Timeline + yearly */}
      <div className="grid grid-cols-12 gap-4">
        <Bone className="col-span-7 h-140" />
        <Bone className="col-span-5 h-140" />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-12 auto-rows-[96px] gap-4">
        <Bone className="col-span-3 row-span-5" />
        <Bone className="col-span-3 row-span-5" />
        <Bone className="col-span-3 row-span-5" />
        <Bone className="col-span-3 row-span-5" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 auto-rows-[96px] gap-4">
        <Bone className="col-span-6 row-span-4" />
        <Bone className="col-span-6 row-span-4" />
      </div>
    </div>
  );
}
