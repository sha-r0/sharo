import { NextResponse } from "next/server";

const allowedHosts = new Set(["firebasestorage.googleapis.com", "storage.googleapis.com"]);
const allowedBuckets = ["sharo-ad80a.firebasestorage.app", "sharo-ad80a.appspot.com"];

export async function GET(request) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) return NextResponse.json({ error: "Image URL is required." }, { status: 400 });
  let url;
  try { url = new URL(source); }
  catch { return NextResponse.json({ error: "Invalid image URL." }, { status: 400 }); }
  const approvedBucket = allowedBuckets.some((bucket) => url.pathname.includes(bucket) || url.hostname === bucket);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || !approvedBucket) {
    return NextResponse.json({ error: "Image source is not allowed." }, { status: 403 });
  }
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return NextResponse.json({ error: "Image could not be loaded." }, { status: response.status });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return NextResponse.json({ error: "Source is not an image." }, { status: 415 });
    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Billing image proxy failed:", error);
    return NextResponse.json({ error: "Image could not be loaded." }, { status: 502 });
  }
}
