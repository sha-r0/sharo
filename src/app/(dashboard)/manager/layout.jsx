import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

export default function ManagerLayout({ children }) {
  return (
    <div className="bg-[#ECF1FD]">

      {/* ✅ FIXED SIDEBAR */}
      <div className="fixed left-2 top-2 bottom-2 z-50">
        <Sidebar />
      </div>

      {/* ✅ RIGHT SIDE (NAVBAR + CONTENT) */}
      <div className="ml-[88px] flex flex-col h-screen">

        {/* ✅ FIXED NAVBAR */}
        <div className="fixed top-2 left-[95px] right-2 z-40">
          <Navbar />
        </div>

        {/* ✅ SCROLLABLE CONTENT */}
        <main className="
          mt-[72px]
          h-[calc(100vh-80px)]
          overflow-y-auto
          no-scrollbar
          px-2 pb-2 pt-5
        ">
          {children}
        </main>

      </div>

    </div>
  );
}