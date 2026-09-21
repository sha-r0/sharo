import { buildQuotationList } from "../quotations/quotationList.js";

export async function getCompanyQuotationList(db, companyId, options = {}) {
  const company = db.collection("Companies").doc(companyId);
  const [quotations, settings] = await Promise.all([
    company.collection("Quotations").get(),
    company.collection("QuotationSettings").doc("default").get(),
  ]);
  return buildQuotationList(quotations.docs.map((doc) => ({ ...doc.data(), id: doc.id })), options, settings.data()?.quotationPrefix || "QT");
}
