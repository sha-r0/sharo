import networkQueue from "./networkQueue";

/* ==========================================================
   Network Manager
========================================================== */

class NetworkManager {

    constructor() {
  
      this.online =
        typeof navigator !== "undefined"
          ? navigator.onLine
          : true;
  
      this.listeners = new Set();
  
    }
  
    /* ======================================================
       Initialize
    ====================================================== */
  
    init() {
  
      if (typeof window === "undefined") {
  
        return;
  
      }
  
      window.addEventListener(
        "online",
        this.handleOnline
      );
  
      window.addEventListener(
        "offline",
        this.handleOffline
      );
  
    }
  
    /* ======================================================
       Destroy
    ====================================================== */
  
    destroy() {
  
      if (typeof window === "undefined") {
  
        return;
  
      }
  
      window.removeEventListener(
        "online",
        this.handleOnline
      );
  
      window.removeEventListener(
        "offline",
        this.handleOffline
      );
  
    }
  
    /* ======================================================
       Online
    ====================================================== */
  
    handleOnline = async () => {

        this.online = true;
      
        this.notify();
      
        try {
      
          await networkQueue.process();
      
        }
      
        catch (error) {
      
          console.error(
            "Queue Processing Failed",
            error
          );
      
        }
      
      };
  
    /* ======================================================
       Offline
    ====================================================== */
  
    handleOffline = () => {
  
      this.online = false;
  
      this.notify();
  
    };
  
    /* ======================================================
       Current State
    ====================================================== */
  
    isOnline() {
  
      return this.online;
  
    }
  
    /* ======================================================
       Subscribe
    ====================================================== */
  
    subscribe(callback) {
  
      this.listeners.add(callback);
  
      callback(this.online);
  
      return () => {
  
        this.listeners.delete(callback);
  
      };
  
    }
  
    /* ======================================================
       Notify
    ====================================================== */
  
    notify() {
  
      this.listeners.forEach(
  
        (callback) => {
  
          callback(this.online);
  
        }
  
      );
  
    }
  
  }
  
  const networkManager =
    new NetworkManager();
  
  export default networkManager;