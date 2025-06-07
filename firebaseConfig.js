// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB646seJD8EN5rYbsSR9qTgE_GSoSpPyqs",
  authDomain: "mental-health-f7b7f.firebaseapp.com",
  projectId: "mental-health-f7b7f",
  storageBucket: "mental-health-f7b7f.firebasestorage.app",
  messagingSenderId: "952214463855",
  appId: "1:952214463855:web:631b1cdb75bb1e3961349a",
  measurementId: "G-H3QQ176Z7G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Conditionally initialize Analytics
// let analytics;
// if (typeof window !== 'undefined') { // Check if in a browser-like environment for analytics
//   getAnalytics(app).isSupported().then(supported => {
//     if (supported) {
//       analytics = getAnalytics(app);
//       console.log("Firebase Analytics initialized.");
//     } else {
//       console.log("Firebase Analytics is not supported in this environment.");
//     }
//   }).catch(err => {
//     console.error("Error checking Firebase Analytics support:", err);
//   });
// } else {
//   console.log("Firebase Analytics skipped in non-browser environment.");
// }

const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { app, auth, db, storage };

