import React, { useState, useEffect } from "react";
import { auth, googleProvider, saveWeightEntry, getWeightEntries } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import Papa from "papaparse";
import { parse } from "date-fns";
import './App.css';
import { Analytics } from '@vercel/analytics/react';

function App() {
  const [user, setUser] = useState(null);
  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [importStatus, setImportStatus] = useState(""); // State variable for import status

  // Fetch weight data when user logs in
  useEffect(() => {
    if (user) {
      fetchWeightData();
    }
  }, [user]);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error("Login Failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const fetchWeightData = async () => {
    if (user) {
      const entries = await getWeightEntries(user.uid);
      setWeightHistory(entries);
    }
  };

  const handleSaveWeight = async () => {
    if (user && weight) {
      await saveWeightEntry(user.uid, parseFloat(weight));
      setWeight(""); // Clear input
      fetchWeightData(); // Refresh list
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportStatus("Importing..."); // Set status to "Importing..."
      Papa.parse(file, {
        header: true, // Set to true to handle CSV with headers
        complete: async (results) => {
          console.log("Parsed CSV Data:", results.data);
          const data = results.data;
          for (const entry of data) {
            if (!entry.date || !entry.weight) { // Check if date and weight exist
              console.warn("Skipping row with missing date or weight:", entry);
              continue; // Skip to the next row
            }
            try {
              const date = parse(entry.date, "MMM dd yyyy", new Date());
              const weight = parseFloat(entry.weight);
              await saveWeightEntry(user.uid, weight, date);
            } catch (error) {
              console.error("Error parsing date or saving entry:", error);
            }
          }
          fetchWeightData(); // Refresh list
          setImportStatus(""); // Clear status after import is complete
        },
        error: (error) => {
          console.error("Error parsing CSV file:", error);
          setImportStatus("Error importing file"); // Set status to error message
        }
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Analytics />
      <div className="p-6 w-full max-w-sm bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-800">Weight Tracker</h1>
        <p className="text-gray-600">Track your daily weight easily.</p>

        {user ? (
          <div>
            <p>Welcome, {user.displayName}!</p>
            <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
              Logout
            </button>

            <div className="mt-4">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight (lbs)"
                className="border p-2 rounded w-full"
              />
              <button onClick={handleSaveWeight} className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded">
                Save
              </button>
            </div>

            {/* Import CSV */}
            <div className="mt-4">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="border p-2 rounded w-full" />
              {importStatus && <p className="mt-2 text-red-500">{importStatus}</p>} {/* Display import status */}
            </div>

            {/* Weight History */}
            <div className="mt-4">
              <h2 className="text-lg font-semibold">Weight History</h2>
              <ul className="text-left">
                {weightHistory.map((entry) => (
                  <li key={entry.id} className="mt-2">
                    📅 {new Date(entry.date.seconds * 1000).toLocaleDateString()} - ⚖️ {entry.weight} lbs
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <button onClick={login} className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded">
            Login with Google
          </button>
        )}
      </div>
    </div>
  );
}

export default App;







