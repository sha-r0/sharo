// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC97WtyPjCP3p-hvv7asElRdDWyeuSFRh4",
  authDomain: "sharo-ad80a.firebaseapp.com",
  projectId: "sharo-ad80a",
  storageBucket: "sharo-ad80a.firebasestorage.app",
  messagingSenderId: "55858842500",
  appId: "1:55858842500:web:7b50e60d715350d7646bd1",
  measurementId: "G-NNKTJVJX6X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const storage = getStorage(app);

export const auth = getAuth(app);