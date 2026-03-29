// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPQLDfP-C7bH_6FHBo1EG2x0RHm_CTN9U",
  authDomain: "meme-maker-99f30.firebaseapp.com",
  projectId: "meme-maker-99f30",
  storageBucket: "meme-maker-99f30.firebasestorage.app",
  messagingSenderId: "948871225601",
  appId: "1:948871225601:web:c8abcb0760bc60e959bb00",
  measurementId: "G-D9EKR39G3W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export it
export const db = getFirestore(app);