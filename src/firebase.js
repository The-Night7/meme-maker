import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAPQLDfP-C7bH_6FHBo1EG2x0RHm_CTN9U",
  authDomain: "meme-maker-99f30.firebaseapp.com",
  projectId: "meme-maker-99f30",
  storageBucket: "meme-maker-99f30.firebasestorage.app",
  messagingSenderId: "948871225601",
  appId: "1:948871225601:web:c8abcb0760bc60e959bb00",
  measurementId: "G-D9EKR39G3W"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Constantes de l'application
export const appId = 'make-it-meme-clone';

export { app, auth, db };