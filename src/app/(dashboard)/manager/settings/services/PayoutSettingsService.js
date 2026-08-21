import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const getSettings = httpsCallable(functions, "getPayoutSettings");
const updateSettings = httpsCallable(functions, "updatePayoutSettings");
const connectMerchantPayout = httpsCallable(functions, "connectMerchantPayout");
const disconnectMerchantPayout = httpsCallable(functions, "disconnectMerchantPayout");

export const payoutSettingsService = {
  async get() {
    const result = await getSettings({});
    return result.data;
  },

  async update(settings) {
    const result = await updateSettings({
      provider: settings.provider,
      environment: settings.environment,
      authMode: settings.authMode || null,
      merchantId: settings.merchantId || null,
    });
    return result.data;
  },

  async connect({ clientId, clientSecret }) {
    const result = await connectMerchantPayout({ clientId, clientSecret, environment: "sandbox" });
    return result.data;
  },

  async disconnect() {
    const result = await disconnectMerchantPayout({});
    return result.data;
  },
};
