import React, { useState } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Analytics } from '@vercel/analytics/react'

function App() {
  const [user, setUser] = useState(null);
  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);

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

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <Analytics />
      <div className="p-6 max-w-sm bg-white rounded-lg shadow-md text-center">
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
                className="border p-2 rounded"
              />
              <button onClick={handleSaveWeight} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded">
                Save
              </button>
            </div>

            {/* Weight History */}
            <div className="mt-4">
              <h2 className="text-lg font-semibold">Weight History</h2>
              <ul className="text-left">
                {weightHistory.map((entry) => (
                  <li key={entry.id}>
                    📅 {new Date(entry.date.seconds * 1000).toLocaleDateString()} - ⚖️ {entry.weight} lbs
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <button onClick={login} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Login with Google
          </button>
        )}
      </div>
    </div>
  );
}

export default App;







