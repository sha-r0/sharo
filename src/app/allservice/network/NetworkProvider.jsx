"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import networkManager from "./networkManager";

/* ==========================================================
   Context
========================================================== */

const NetworkContext =
  createContext(null);

/* ==========================================================
   Provider
========================================================== */

export default function NetworkProvider({

  children,

}) {

  const [online, setOnline] = useState(

    networkManager.isOnline()

  );

  useEffect(() => {

    networkManager.init();

    const unsubscribe =
      networkManager.subscribe(

        (status) => {

          setOnline(status);

        }

      );

    return () => {

      unsubscribe();

      networkManager.destroy();

    };

  }, []);

  const value = useMemo(

    () => ({

      online,

      offline: !online,

    }),

    [online]

  );

  return (

    <NetworkContext.Provider value={value}>

      {children}

    </NetworkContext.Provider>

  );

}

/* ==========================================================
   Hook
========================================================== */

export function useNetwork() {

  const context =
    useContext(NetworkContext);

  if (!context) {

    throw new Error(

      "useNetwork must be used inside NetworkProvider"

    );

  }

  return context;

}