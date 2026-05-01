"use client";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

export default function EmployeeLocationCard() {
  const [employees, setEmployees] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    (async () => {
      const data = await fetchEmployeeLocationsWithAddress();
      setEmployees(data);
    })();
  }, [refreshKey]);

  return (
    <div className="bg-[#F8F9FD] border border-white rounded-xl p-4 shadow-sm">

      {/* ===== HEADER WITH ICON + REFRESH ===== */}
      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2">
          {/* ICON LIKE SUMMARY CARD */}
          <div className="
            w-6 h-6 rounded-lg
            flex items-center justify-center
            bg-gradient-to-br from-indigo-400 to-violet-600
            shadow-[0_8px_20px_rgba(0,0,0,0.4)]
          ">
            <MapPin size={15} className="text-white" />
          </div>

          <h3 className="text-black text-lg font-semibold">
            Employee Locations
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">
            Live • {employees.length} users
          </span>

          {/* REFRESH BUTTON */}
          <button
            onClick={handleRefresh}
            className="
              text-xs text-black/70 
              bg-[#ccccff]
              border border-black/10 
              rounded-lg px-3 py-1
              hover:bg-[#bebeff] transition
            "
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ===== SCROLL AREA (WITH GAP FROM SCROLLBAR) ===== */}
      <div className="space-y-3 max-h-71 overflow-y-auto manager-scroll pr-3">

        {[...employees]
          .sort((a, b) => {
            const t1 = a.lastUpdated?.toDate?.()?.getTime() || 0;
            const t2 = b.lastUpdated?.toDate?.()?.getTime() || 0;
            return t2 - t1; // 👈 newest first
          })
          .map((emp) => (
            <div
              key={emp.id}
              className="
                bg-[#fff] 
                p-4 
                rounded-xl 
                border border-white/10 
                hover:bg-[#F8F9FD] 
                transition
              "
            >

              {/* NAME + STATUS DOT */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    emp.status === "online"
                      ? "bg-green-500"
                      : "bg-gray-500"
                  }`}
                />
                <div className="text-black font-medium text-sm">
                  {emp.name}
                  <span className="text-black/60 ml-1">
                    ({emp.employeeId})
                  </span>
                </div>
              </div>

              {/* ADDRESS */}
              <div className="text-sm text-black/70 leading-relaxed ml-4">
                📍 {emp.address?.fullAddress || "Location not available"}
              </div>

              {/* LAST SEEN */}
              <div className="text-xs text-black/50 mt-2 ml-4">
                Last seen:{" "}
                {emp.lastUpdated?.toDate?.()?.toLocaleString() || "N/A"}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
  
      const data = await res.json();
  
      const address = data.address || {};
  
      return {
        street:
          address.road ||
          address.pedestrian ||
          address.suburb ||
          "N/A",
  
        area:
          address.neighbourhood ||
          address.locality ||
          address.suburb ||
          "N/A",
  
        city:
          address.city ||
          address.town ||
          address.village ||
          "N/A",
  
        state:
          address.state || "N/A",
  
        fullAddress: data.display_name || "Address not found",
      };
    } catch (err) {
      console.error("Reverse geocode error:", err);
      return null;
    }
  }
  
  /**
   * Fetch all employees from employee_locations
   * and attach formatted address
   */
  export async function fetchEmployeeLocationsWithAddress() {
    const snap = await getDocs(collection(db, "employee_locations"));
  
    const employees = [];
  
    for (const doc of snap.docs) {
      const data = doc.data();
  
      if (!data.lat || !data.lng) continue;
  
      const address = await reverseGeocode(data.lat, data.lng);
  
      employees.push({
        id: doc.id,
        employeeId: data.employeeId,
        name: data.name,
        role: data.role,
        status: data.status,
        lat: data.lat,
        lng: data.lng,
        lastUpdated: data.lastUpdated,
        address, // <-- converted address
      });
    }
  
    return employees;
  }
