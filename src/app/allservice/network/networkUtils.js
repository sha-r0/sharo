import {

    CONNECTION_TYPE,
  
    NETWORK_QUALITY,
  
  } from "./networkConstants";
  
  /* ==========================================================
     Connection Type
  ========================================================== */
  
  export function getConnectionType() {
  
    if (typeof navigator === "undefined") {
  
      return CONNECTION_TYPE.UNKNOWN;
  
    }
  
    const connection =
  
      navigator.connection ||
  
      navigator.mozConnection ||
  
      navigator.webkitConnection;
  
    if (!connection) {
  
      return CONNECTION_TYPE.UNKNOWN;
  
    }
  
    return connection.type || CONNECTION_TYPE.UNKNOWN;
  
  }
  
  /* ==========================================================
     Network Quality
  ========================================================== */
  
  export function getNetworkQuality() {
  
    if (typeof navigator === "undefined") {
  
      return NETWORK_QUALITY.UNKNOWN;
  
    }
  
    const connection =
  
      navigator.connection ||
  
      navigator.mozConnection ||
  
      navigator.webkitConnection;
  
    if (!connection) {
  
      return NETWORK_QUALITY.GOOD;
  
    }
  
    const downlink =
  
      connection.downlink || 10;
  
    if (downlink >= 20)
  
      return NETWORK_QUALITY.FAST;
  
    if (downlink >= 10)
  
      return NETWORK_QUALITY.GOOD;
  
    if (downlink >= 2)
  
      return NETWORK_QUALITY.SLOW;
  
    return NETWORK_QUALITY.VERY_SLOW;
  
  }