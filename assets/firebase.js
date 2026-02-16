import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export const firebaseConfig = {
  "apiKey": "",
  "authDomain": "css-crm-183df.firebaseapp.com",
  "projectId": "css-crm-183df",
  "storageBucket": "css-crm-183df.firebasestorage.app",
  "messagingSenderId": "666616658986",
  "appId": "1:666616658986:web:68cbcae8d491bd825b5753",
  "measurementId": "G-5N5YYKMN5C"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const f = {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, orderBy, where, limit, onSnapshot, serverTimestamp, Timestamp
};
