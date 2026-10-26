import { auth } from "@/lib/firebase";

class UnbilledProjectService {
  async request(
    url,
    options = {}
  ) {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        "Please sign in again."
      );
    }

    const token =
      await user.getIdToken();

    const response =
      await fetch(
        url,
        {
          ...options,

          cache:
            "no-store",

          headers: {
            ...(options.headers ||
              {}),

            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const body =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        body.error ||
          "Request failed."
      );
    }

    return body;
  }


  async getProjects({
    cursor = "",
  } = {}) {
    const params =
      new URLSearchParams();

    if (cursor) {
      params.set(
        "cursor",
        cursor
      );
    }

    const query =
      params.toString();

    return this.request(
      `/api/billing/unbilled-projects${
        query
          ? `?${query}`
          : ""
      }`
    );
  }


  async backfillProjectInvoiceCounts() {
    return this.request(
      "/api/billing/backfill-project-invoice-counts",
      {
        method: "POST",
      }
    );
  }
}

export default new UnbilledProjectService();