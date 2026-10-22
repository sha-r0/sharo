import {
  collection,
  doc,
  getDoc,
} from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";

export default class QuotationService {

  //////////////////////////////////////////////////////
  // Validation
  //////////////////////////////////////////////////////

  static validateCompanyId(companyId) {
      if (!companyId || typeof companyId !== "string") {
          throw new Error("Company ID is required.");
      }
  }

  static validateQuotationId(quotationId) {
      if (!quotationId || typeof quotationId !== "string") {
          throw new Error("Quotation ID is required.");
      }
  }

  static async getToken() {
      const token =
          await auth.currentUser?.getIdToken();

      if (!token) {
          throw new Error("UNAUTHENTICATED");
      }

      return token;
  }

  //////////////////////////////////////////////////////
  // References
  //////////////////////////////////////////////////////

  static companyRef(companyId) {
      this.validateCompanyId(companyId);

      return doc(
          db,
          "Companies",
          companyId
      );
  }

  static quotationsRef(companyId) {
      this.validateCompanyId(companyId);

      return collection(
          db,
          "Companies",
          companyId,
          "Quotations"
      );
  }

  static quotationRef(
      companyId,
      quotationId
  ) {
      this.validateCompanyId(companyId);
      this.validateQuotationId(
          quotationId
      );

      return doc(
          db,
          "Companies",
          companyId,
          "Quotations",
          quotationId
      );
  }

  static clientsRef(companyId) {
      this.validateCompanyId(companyId);

      return collection(
          db,
          "Companies",
          companyId,
          "Clients"
      );
  }

  //////////////////////////////////////////////////////
  // Company
  //////////////////////////////////////////////////////

  static async getCompany(companyId) {
      this.validateCompanyId(companyId);

      const snapshot =
          await getDoc(
              this.companyRef(companyId)
          );

      if (!snapshot.exists()) {
          return null;
      }

      return {
          id: snapshot.id,
          ...snapshot.data(),
      };
  }

  //////////////////////////////////////////////////////
  // Quotation Settings
  //////////////////////////////////////////////////////

  static async getSettings(companyId) {
      this.validateCompanyId(companyId);

      const token =
          await this.getToken();

      const response =
          await fetch(
              "/api/quotations",
              {
                  headers: {
                      Authorization:
                          `Bearer ${token}`,
                  },
                  cache: "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to load quotation settings."
          );
      }

      return result.settings || null;
  }

  //////////////////////////////////////////////////////
  // New / Edit Quotation Initial Data
  //////////////////////////////////////////////////////

  static async getNewQuotationData(
      companyId,
      quotationId = "",
      options = {}
  ) {
      this.validateCompanyId(companyId);

      const token =
          await this.getToken();

      const params =
          new URLSearchParams();

      if (quotationId) {
          params.set(
              "quotationId",
              quotationId
          );
      }

      if (
          options.includeClients ===
          false
      ) {
          params.set(
              "includeClients",
              "false"
          );
      }

      const queryString =
          params.toString();

      const response =
          await fetch(
              queryString
                  ? `/api/quotations?${queryString}`
                  : "/api/quotations",
              {
                  headers: {
                      Authorization:
                          `Bearer ${token}`,
                  },
                  cache: "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to load quotation data."
          );
      }

      return result;
  }

  //////////////////////////////////////////////////////
  // Save Quotation Settings
  //////////////////////////////////////////////////////

  static async saveSettings(
      companyId,
      settingsData
  ) {
      this.validateCompanyId(companyId);

      if (
          !settingsData ||
          typeof settingsData !== "object"
      ) {
          throw new Error(
              "Quotation settings are required."
          );
      }

      const token =
          await this.getToken();

      const response =
          await fetch(
              "/api/quotations",
              {
                  method: "PUT",

                  headers: {
                      "Content-Type":
                          "application/json",

                      Authorization:
                          `Bearer ${token}`,
                  },

                  body:
                      JSON.stringify(
                          settingsData
                      ),

                  cache: "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to save quotation settings."
          );
      }

      return result;
  }

  //////////////////////////////////////////////////////
  // Dashboard
  //////////////////////////////////////////////////////

  static async getDashboard(
      companyId,
      options = {}
  ) {
      this.validateCompanyId(companyId);

      const token =
          await this.getToken();

      const params =
          new URLSearchParams({
              viewMode:
                  options.viewMode ||
                  "all",

              month:
                  options.month ||
                  "",

              search:
                  options.search ||
                  "",

              status:
                  options.status ||
                  "All",

              page:
                  String(
                      options.page ||
                      1
                  ),

              pageSize:
                  String(
                      options.pageSize ||
                      10
                  ),

              cursor:
                  options.cursor ||
                  "",

              direction:
                  options.direction ||
                  "",
          });

      const response =
          await fetch(
              `/api/quotations/list?${params.toString()}`,
              {
                  headers: {
                      Authorization:
                          `Bearer ${token}`,
                  },

                  cache:
                      "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to load quotations."
          );
      }

      return {
          ...result,

          quotations:
              Array.isArray(
                  result.quotations
              )
                  ? result.quotations
                  : [],

          summary:
              result.summary || {
                  total: 0,
                  draft: 0,
                  sent: 0,
                  approved: 0,
                  rejected: 0,
              },

          startCursor:
              result.startCursor ||
              null,

          endCursor:
              result.endCursor ||
              null,
      };
  }

  //////////////////////////////////////////////////////
  // Get One Quotation
  //////////////////////////////////////////////////////

  static async getQuotation(
      companyId,
      quotationId
  ) {
      this.validateCompanyId(companyId);
      this.validateQuotationId(
          quotationId
      );

      const token =
          await this.getToken();

      const response =
          await fetch(
              `/api/quotations/${encodeURIComponent(
                  quotationId
              )}`,
              {
                  headers: {
                      Authorization:
                          `Bearer ${token}`,
                  },

                  cache:
                      "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to load quotation."
          );
      }

      return (
          result.quotation ||
          null
      );
  }

  //////////////////////////////////////////////////////
  // Generate Quotation Number
  //////////////////////////////////////////////////////

  static async generateQuotationNumber(
      companyId
  ) {
      const settings =
          await this.getSettings(
              companyId
          );

      if (!settings) {
          return "QT-0001";
      }

      const prefix =
          String(
              settings.quotationPrefix ||
              "QT"
          )
              .trim()
              .toUpperCase();

      const nextNumber =
          Number(
              settings.nextQuotationNumber ||
              1
          );

      const year =
          new Date()
              .getFullYear()
              .toString()
              .slice(-2);

      return `${prefix}-${year}-${String(
          nextNumber
      ).padStart(4, "0")}`;
  }

  //////////////////////////////////////////////////////
  // Create Quotation
  //////////////////////////////////////////////////////

  static async createQuotation(
      companyId,
      data
  ) {
      this.validateCompanyId(companyId);

      if (
          !data ||
          typeof data !== "object"
      ) {
          throw new Error(
              "Quotation data is required."
          );
      }

      if (
          !String(
              data.quotationNumber ||
              ""
          ).trim()
      ) {
          throw new Error(
              "Quotation number is required."
          );
      }

      if (
          !String(
              data.clientName ||
              ""
          ).trim()
      ) {
          throw new Error(
              "Client name is required."
          );
      }

      const token =
          await this.getToken();

      const response =
          await fetch(
              "/api/quotations",
              {
                  method: "POST",

                  headers: {
                      "Content-Type":
                          "application/json",

                      Authorization:
                          `Bearer ${token}`,
                  },

                  body:
                      JSON.stringify(
                          data
                      ),

                  cache:
                      "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to create quotation."
          );
      }

      const quotationId =
          result.id;

      try {
          await notificationService.emitSafe(
              "quotation.created",
              {
                  companyId,

                  quotationNumber:
                      data.quotationNumber,

                  targetRole:
                      "manager",

                  actionId:
                      quotationId,

                  actionRoute:
                      "/manager/quotation-builder",

                  metadata: {
                      quotationId,

                      quotationNumber:
                          data.quotationNumber ||
                          null,

                      clientName:
                          data.clientName ||
                          null,
                  },
              }
          );
      } catch (
          notificationError
      ) {
          console.error(
              "Quotation created, but notification failed:",
              notificationError
          );
      }

      return quotationId;
  }

  //////////////////////////////////////////////////////
  // Update Quotation
  //////////////////////////////////////////////////////

  static async updateQuotation(
      companyId,
      quotationId,
      data
  ) {
      this.validateCompanyId(companyId);
      this.validateQuotationId(
          quotationId
      );

      if (
          !data ||
          typeof data !== "object"
      ) {
          throw new Error(
              "Quotation update data is required."
          );
      }

      const token =
          await this.getToken();

      const response =
          await fetch(
              `/api/quotations/${encodeURIComponent(
                  quotationId
              )}`,
              {
                  method: "PUT",

                  headers: {
                      "Content-Type":
                          "application/json",

                      Authorization:
                          `Bearer ${token}`,
                  },

                  body:
                      JSON.stringify(
                          data
                      ),

                  cache:
                      "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to update quotation."
          );
      }

      const transition =
          result?.statusTransition;

      /*
       * Preserve the existing quotation
       * Approved / Rejected notifications
       * without another Firestore read.
       */
      if (
          transition?.decisionChanged &&
          [
              "approved",
              "rejected",
          ].includes(
              transition.nextStatus
          )
      ) {
          try {
              const quotation =
                  result?.quotation ||
                  {};

              await notificationService.emitSafe(
                  `quotation.${transition.nextStatus}`,
                  {
                      companyId,

                      quotationNumber:
                          quotation.quotationNumber ||
                          data.quotationNumber ||
                          null,

                      targetRole:
                          "manager",

                      actionId:
                          quotationId,

                      actionRoute:
                          "/manager/quotation-builder",

                      metadata: {
                          quotationId,

                          quotationNumber:
                              quotation.quotationNumber ||
                              data.quotationNumber ||
                              null,

                          clientName:
                              quotation.clientName ||
                              data.clientName ||
                              null,

                          status:
                              transition.nextStatus,
                      },
                  }
              );
          } catch (
              notificationError
          ) {
              console.error(
                  "Quotation updated, but notification failed:",
                  notificationError
              );
          }
      }

      return result;
  }

  //////////////////////////////////////////////////////
  // Update Quotation Status
  //////////////////////////////////////////////////////

  static async updateQuotationStatus(
      companyId,
      quotationId,
      status
  ) {
      const allowedStatuses = [
          "Draft",
          "Sent",
          "Approved",
          "Rejected",
      ];

      const normalizedStatus =
          allowedStatuses.find(
              (item) =>
                  item.toLowerCase() ===
                  String(
                      status || ""
                  )
                      .trim()
                      .toLowerCase()
          );

      if (!normalizedStatus) {
          throw new Error(
              "Invalid quotation status."
          );
      }

      return this.updateQuotation(
          companyId,
          quotationId,
          {
              status:
                  normalizedStatus,
          }
      );
  }

  //////////////////////////////////////////////////////
  // Delete Quotation
  //////////////////////////////////////////////////////

  static async deleteQuotation(
      companyId,
      quotationId
  ) {
      this.validateCompanyId(companyId);
      this.validateQuotationId(
          quotationId
      );

      const token =
          await this.getToken();

      const response =
          await fetch(
              `/api/quotations?quotationId=${encodeURIComponent(
                  quotationId
              )}`,
              {
                  method:
                      "DELETE",

                  headers: {
                      Authorization:
                          `Bearer ${token}`,
                  },

                  cache:
                      "no-store",
              }
          );

      const result =
          await response.json();

      if (!response.ok) {
          throw new Error(
              result.error ||
              "Unable to delete quotation."
          );
      }

      return result;
  }
}