/* ==========================================================
   IndexedDB
========================================================== */

const DB_NAME = "sharo-db";

const DB_VERSION = 1;

const STORE = "offline-queue";

let db = null;

/* ==========================================================
   Open Database
========================================================== */

export async function openDatabase() {

  if (db) {

    return db;

  }

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(

      DB_NAME,

      DB_VERSION

    );

    request.onerror = () => {

      reject(request.error);

    };

    request.onsuccess = () => {

      db = request.result;

      resolve(db);

    };

    request.onupgradeneeded = () => {

      const database = request.result;

      if (

        !database.objectStoreNames.contains(STORE)

      ) {

        database.createObjectStore(

          STORE,

          {

            keyPath: "id",

            autoIncrement: true,

          }

        );

      }

    };

  });

}

/* ==========================================================
   Add
========================================================== */

export async function addQueueItem(data) {

  const database = await openDatabase();

  return new Promise((resolve, reject) => {

    const tx = database.transaction(

      STORE,

      "readwrite"

    );

    tx.objectStore(STORE).add(data);

    tx.oncomplete = resolve;

    tx.onerror = reject;

  });

}

/* ==========================================================
   Get All
========================================================== */

export async function getQueueItems() {

  const database = await openDatabase();

  return new Promise((resolve, reject) => {

    const tx = database.transaction(

      STORE,

      "readonly"

    );

    const request =

      tx.objectStore(STORE).getAll();

    request.onsuccess = () => {

      resolve(request.result);

    };

    request.onerror = reject;

  });

}

/* ==========================================================
   Delete
========================================================== */

export async function removeQueueItem(id) {

  const database = await openDatabase();

  return new Promise((resolve, reject) => {

    const tx = database.transaction(

      STORE,

      "readwrite"

    );

    tx.objectStore(STORE).delete(id);

    tx.oncomplete = resolve;

    tx.onerror = reject;

  });

}

/* ==========================================================
   Clear
========================================================== */

export async function clearQueue() {

  const database = await openDatabase();

  return new Promise((resolve, reject) => {

    const tx = database.transaction(

      STORE,

      "readwrite"
    );

    tx.objectStore(STORE).clear();

    tx.oncomplete = resolve;

    tx.onerror = reject;

  });

}