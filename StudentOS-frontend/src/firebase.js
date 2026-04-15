// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔐 Your Firebase config (safe to keep here)
const firebaseConfig = {
  apiKey: "AIzaSyCmBpKss5MqZcJqmNstebpiIiaKatRhRWg",
  authDomain: "studentt-os.firebaseapp.com",
  projectId: "studentt-os",
  storageBucket: "studentt-os.firebasestorage.app",
  messagingSenderId: "893388872937",
  appId: "1:893388872937:web:0b2d30bc99903028652478",
};

// 🚀 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔥 Initialize Firestore (this is what you actually need)
export const db = getFirestore(app);