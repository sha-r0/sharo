"use client";

import {
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

import { companyDoc } from "@/lib/firestore-firebase";

import { mapCompany } from "./companyModel";
import notificationService from "../notification/notificationService";

/* ==========================================================
   Company Service
========================================================== */

class CompanyService {

  /* ======================================================
     Get Company By Id
  ====================================================== */

  async get(companyId) {

    try {

      const snapshot = await getDoc(
        companyDoc(companyId)
      );

      if (!snapshot.exists()) {

        return null;

      }

      return mapCompany({

        id: snapshot.id,

        ...snapshot.data(),

      });

    }

    catch (error) {

      console.error(
        "CompanyService.get",
        error
      );

      throw error;

    }

  }

  /* ======================================================
     Check Company Exists
  ====================================================== */

  async exists(companyId) {

    try {

      const snapshot = await getDoc(
        companyDoc(companyId)
      );

      return snapshot.exists();

    }

    catch (error) {

      console.error(
        "CompanyService.exists",
        error
      );

      return false;

    }

  }

  /* ======================================================
     Update Company
  ====================================================== */

  async update(
    companyId,
    data
  ) {

    try {

      await updateDoc(

        companyDoc(companyId),

        data

      );

      await notificationService.emitSafe("company.updated", {
        companyId,
        receiver: "company",
        actionRoute: "/manager",
        metadata: { updatedFields: Object.keys(data) },
      });

      return true;

    }

    catch (error) {

      console.error(
        "CompanyService.update",
        error
      );

      throw error;

    }

  }

  /* ======================================================
     Workspace Completed
  ====================================================== */

  async completeWorkspace(companyId) {

    return this.update(
      companyId,
      {
        workspaceCompleted: true,
      }
    );

  }

  /* ======================================================
     Update Logo
  ====================================================== */

  async updateLogo(
    companyId,
    logoUrl
  ) {

    return this.update(
      companyId,
      {
        logoUrl,
      }
    );

  }

  /* ======================================================
     Update Working Hours
  ====================================================== */

  async updateWorkingHours(
    companyId,
    workingHours
  ) {

    return this.update(
      companyId,
      {
        workingHours,
      }
    );

  }

  /* ======================================================
     Subscribe
  ====================================================== */

  subscribe(
    companyId,
    callback
  ) {

    return onSnapshot(

      companyDoc(companyId),

      (snapshot) => {

        if (!snapshot.exists()) {

          callback(null);

          return;

        }

        callback(

          mapCompany({

            id: snapshot.id,

            ...snapshot.data(),

          })

        );

      }

    );

  }

}

const companyService =
  new CompanyService();

export default companyService;
