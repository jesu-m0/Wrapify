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
      <div className="grid grid-cols-12 auto-rows-[100px] gap-4">
        <Bone className="col-span-4 row-span-3" />
        <Bone className="col-span-4 row-span-1" />
        <Bone className="col-span-4 row-span-1" />
        <Bone className="col-span-4 row-span-1" />
        <Bone className="col-span-4 row-span-1" />
        <Bone className="col-span-8 row-span-1" />
      </div>

      {/* Timeline + yearly */}
      <div className="grid grid-cols-12 gap-4">
        <Bone className="col-span-7 h-[400px]" />
        <Bone className="col-span-5 h-[400px]" />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-12 gap-4">
        <Bone className="col-span-3 h-[380px]" />
        <Bone className="col-span-3 h-[380px]" />
        <Bone className="col-span-3 h-[380px]" />
        <Bone className="col-span-3 h-[380px]" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-4">
        <Bone className="col-span-6 h-[320px]" />
        <Bone className="col-span-6 h-[320px]" />
      </div>
    </div>
  );
}
