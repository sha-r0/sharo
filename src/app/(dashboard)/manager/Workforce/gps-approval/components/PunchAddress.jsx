"use client";
import { useEffect, useState } from "react";
import { reverseGeocode } from "../../../components/EmployeeLocationCard";
import { readableAddress } from "../../components/approvals/reviewHelpers";

const cache = new Map();
let queue = Promise.resolve();
function resolveAddress(coordinates) {
  const key = coordinates.join(",");
  if (!cache.has(key)) {
    // Serialize lookups and reuse results for repeated locations and responsive views.
    const request = queue.then(() => reverseGeocode(...coordinates)).then((result) => readableAddress(result));
    cache.set(key, request);
    queue = request.catch(() => "").then(() => new Promise((resolve) => setTimeout(resolve, 1100)));
  }
  return cache.get(key);
}
export default function PunchAddress({ details }) {
  const [resolved, setResolved] = useState("");
  const [loading, setLoading] = useState(false);
  const key = details.coordinates?.join(",");
  useEffect(() => {
    let active = true;
    setResolved(""); setLoading(false);
    if (details.address || !key) return;
    setLoading(true);
    resolveAddress(key.split(",").map(Number)).then((address) => { if (active) setResolved(address); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [details.address, key]);
  return <div className="min-w-40 max-w-sm whitespace-normal break-words text-sm leading-relaxed"><p>{details.address || resolved || (loading ? "Finding address…" : "Address unavailable")}</p>{!details.address && !resolved && key && <p className="mt-1 text-xs text-slate-400">{key}</p>}</div>;
}
