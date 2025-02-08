// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp, doc, setDoc } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore Helper Functions
export const saveWeightEntry = async (userId, weight) => {
  try {
    const userRef = collection(db, "users", userId, "weightEntries");
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight to compare only the date

    const q = query(userRef, where("date", "==", Timestamp.fromDate(today)));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Update existing entry
      const entryDoc = querySnapshot.docs[0];
      await setDoc(doc(userRef, entryDoc.id), {
        date: Timestamp.fromDate(today),
        weight: parseFloat(weight.toFixed(1)), // Ensure 1 decimal place
      });
    } else {
      // Add new entry
      await addDoc(userRef, {
        date: Timestamp.fromDate(today),
        weight: parseFloat(weight.toFixed(1)), // Ensure 1 decimal place
      });
    }
  } catch (error) {
    console.error("Error saving weight entry:", error);
  }
};

export const getWeightEntries = async (userId) => {
  try {
    const userRef = collection(db, "users", userId, "weightEntries");
    const q = query(userRef, where("date", "!=", null)); // Get all entries
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching weight entries:", error);
    return [];
  }
};