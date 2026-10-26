import { auth } from "@/lib/firebase";

class PendingProjectService {
  async getProjects() {
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
        "/api/billing/pending-projects",
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
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        body.error ||
          "Unable to load pending billing projects."
      );
    }

    return body;
  }
}

export default new PendingProjectService();