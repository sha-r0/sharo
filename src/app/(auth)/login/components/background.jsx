"use client";

export default function Background({ children }) {
  return (
    <div className="min-h-screen w-full bg-red-500 flex items-center justify-center  overflow-hidden relative">

      {/* Main Container */}
      <div
        className={`relative w-full overflow-hidden`}>

        {/* Content */}
        <div className="relative h-full">
          {children}
        </div>
      </div>
    </div>
  );
}