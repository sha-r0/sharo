import { addQueueItem, getQueueItems, removeQueueItem } from "./indexedDB";
import networkManager from "./networkManager";

/* ==========================================================
   Network Queue
========================================================== */

class NetworkQueue {

  constructor() {

    this.handlers = new Map();

    this.processing = false;

  }

  /* ======================================================
     Register Handler
  ====================================================== */

  register(type, handler) {

    this.handlers.set(type, handler);

  }

  /* ======================================================
     Add Request
  ====================================================== */

  async add(type, payload) {

    await addQueueItem({

      type,

      payload,

      createdAt: Date.now(),

    });

  }

  /* ======================================================
     Process Queue
  ====================================================== */

  async process() {

    if (this.processing) return;

    if (!networkManager.isOnline()) return;

    this.processing = true;

    try {

      const items = await getQueueItems();

      for (const item of items) {

        const handler = this.handlers.get(item.type);

        if (!handler) continue;

        try {

          await handler(item.payload);

          await removeQueueItem(item.id);

        }

        catch (error) {

          console.error(

            "Queue Failed",

            item,

            error

          );

        }

      }

    }

    finally {

      this.processing = false;

    }

  }

}

const networkQueue = new NetworkQueue();

export default networkQueue;