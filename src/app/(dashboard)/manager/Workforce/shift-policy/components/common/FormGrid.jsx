"use client";

export default function FormGrid({
  children,
  cols = 3,
}) {

  const map = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div
      className={`grid gap-5 ${map[cols]}`}
    >
      {children}
    </div>
  );
}