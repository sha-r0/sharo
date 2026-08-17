"use client";

export default function FormGrid({
  children,
  cols = 3,
}) {

  const map = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <div
      className={`grid gap-x-5 gap-y-4 ${map[cols]}`}
    >
      {children}
    </div>
  );
}
