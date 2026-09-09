import { auth } from "@/lib/firebase";

const readJson = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "PURCHASE_ORDER_REQUEST_FAILED");
  }
  return payload;
};

class PurchaseOrderService {
  async request(path, { method = "GET", body = null, user = null } = {}) {
    const firebaseUser = user || auth.currentUser;
    if (!firebaseUser) throw new Error("UNAUTHENTICATED");
    const token = await firebaseUser.getIdToken();
    const response = await fetch(path, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return readJson(response);
  }

  getList(user = null, query = {}) {
    const params = new URLSearchParams();
    if (query.status && query.status !== "all") params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/purchase-orders${suffix}`, { user });
  }

  getInit(user = null, purchaseOrderId = "") {
    const suffix = purchaseOrderId ? `?purchaseOrderId=${encodeURIComponent(purchaseOrderId)}` : "";
    return this.request(`/api/purchase-orders/init${suffix}`, { user });
  }

  getPurchaseOrder(user = null, purchaseOrderId) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}`, { user });
  }

  create(user = null, payload) {
    return this.request("/api/purchase-orders", { method: "POST", body: payload, user });
  }

  update(user = null, purchaseOrderId, payload) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}`, {
      method: "PUT",
      body: payload,
      user,
    });
  }

  submit(user = null, purchaseOrderId) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/submit`, {
      method: "POST",
      user,
    });
  }

  approve(user = null, purchaseOrderId) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/approve`, {
      method: "POST",
      user,
    });
  }

  issue(user = null, purchaseOrderId) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/issue`, {
      method: "POST",
      user,
    });
  }

  reject(user = null, purchaseOrderId) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/reject`, {
      method: "POST",
      user,
    });
  }

  cancel(user = null, purchaseOrderId) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/cancel`, {
      method: "POST",
      user,
    });
  }

  recordFulfillment(user = null, purchaseOrderId, payload) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/fulfillments`, {
      method: "POST",
      body: payload,
      user,
    });
  }

  recordBill(user = null, purchaseOrderId, payload) {
    return this.request(`/api/purchase-orders/${encodeURIComponent(purchaseOrderId)}/bills`, {
      method: "POST",
      body: payload,
      user,
    });
  }
}

export default new PurchaseOrderService();
