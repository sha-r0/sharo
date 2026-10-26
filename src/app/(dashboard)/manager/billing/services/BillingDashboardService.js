import { auth } from "@/lib/firebase";

class BillingDashboardService {
  async getDashboard({
    from = "",
    to = "",
  } = {}) {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        "Please sign in again."
      );
    }

    const token =
      await user.getIdToken();

    const params =
      new URLSearchParams();

    if (from) {
      params.set(
        "from",
        from
      );
    }

    if (to) {
      params.set(
        "to",
        to
      );
    }

    const query =
      params.toString();

    const response =
      await fetch(
        `/api/billing/dashboard${
          query
            ? `?${query}`
            : ""
        }`,
        {
          method: "GET",

          cache:
            "no-store",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const body =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      throw new Error(
        body.error ||
          "Unable to load billing dashboard."
      );
    }

    return body;
  }
}

export default new BillingDashboardService();