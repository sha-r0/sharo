import React from "react";

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full px-3 py-2 border rounded-lg bg-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      {...props}
    ></textarea>
  );
}
