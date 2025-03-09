import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { auth, googleProvider, saveWeightEntry, getWeightEntries } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import Papa from "papaparse";
import { parse, format, subMonths, subWeeks, subYears } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Analytics } from '@vercel/analytics/react';

const timeframes = {
  "1 week": subWeeks(new Date(), 1),
  "1 month": subMonths(new Date(), 1),
  "3 months": subMonths(new Date(), 3),
  "6 months": subMonths(new Date(), 6),
  "1 year": subYears(new Date(), 1),
  "2 years": subYears(new Date(), 2),
  "All data": null,
};

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0rem;
  margin: 0rem;
  min-height: 100vh;
  min-width: 100vw;
  background-color: #f7fafc;
  color: #2d3748;
  width: 100%;
`;

const Card = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 600px;
  background-color: white;
  color: #2d3748;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Title = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #2d3748;
  margin-bottom: 0.25rem;
`;

const Button = styled.button`
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  background-color:rgb(101, 215, 243);
  color: white;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  `;

const Input = styled.input`
  border: 1px solid #e2e8f0;
  margin: 0.7rem;
  padding: 1.0rem;
  border-radius: 0.25rem;
  width: 50%;
  font-size: 1.25rem;
  background-color: white;
  color: black;
`;

const TimeframeSelect = styled.select`
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  border-radius: 0.25rem;
  width: 30%;
  font-size: 0.875rem;
  background-color: white;
  color: black;
`;

const Group = styled.div`
  margin: 1rem 0;
`;

const InfoRow = styled.div`
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  color: #2d3748;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background-color: white;
  color: #2d3748;
`;

const TableHeader = styled.th`
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  text-align: left;
  font-size: 0.875rem;
  background-color: #f7fafc;
  color: #2d3748;
`;

const TableCell = styled.td`
  border: 1px solid #e2e8f0;
  padding: 0.2rem;
  text-align: left;
  font-size: 0.875rem;
  background-color: white;
  color: #2d3748;
`;

function App() {
  const [user, setUser] = useState(null);
  const [weight, setWeight] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [importStatus, setImportStatus] = useState(""); // State variable for import status
  const [timeframe1, setTimeframe1] = useState("1 month");
  const [timeframe2, setTimeframe2] = useState("6 months");
  const [showWeightHistory, setShowWeightHistory] = useState(false); // State variable for showing weight history

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

  const filterDataByTimeframe = (data, timeframe) => {
    if (!timeframe) return data;
    return data.filter(entry => new Date(entry.date.seconds * 1000) >= timeframe);
  };

  const getYAxisDomain = (data) => {
    const weights = data.map(entry => entry.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return [min - 1, max + 1];
  };

  const calculateChange = (data) => {
    if (data.length < 2) return { start: 0, current: 0, change: 0, changePercentage: 0 };
    const start = data[0].weight;
    const current = data[data.length - 1].weight;
    const change = current - start;
    const changePercentage = ((current - start) / start) * 100;
    return { start, current, change, changePercentage };
  };

  const filteredData1 = filterDataByTimeframe(weightHistory, timeframes[timeframe1]).sort((a, b) => new Date(a.date.seconds * 1000) - new Date(b.date.seconds * 1000));
  const filteredData2 = filterDataByTimeframe(weightHistory, timeframes[timeframe2]).sort((a, b) => new Date(a.date.seconds * 1000) - new Date(b.date.seconds * 1000));

  const change1 = calculateChange(filteredData1);
  const change2 = calculateChange(filteredData2);

  return (
    <Container>
      <Analytics />
      <Card>
        <Title>Weight Tracker</Title>

        {user ? (
          <div>
            <div className="flex justify-between items-center gap-4">
              <div className="text-sm">Welcome, {user.displayName}!</div>
              <Button onClick={logout}>Logout</Button>
            </div>

            <div className="mt-4">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight (lbs)"
              />
              <Button onClick={handleSaveWeight} className="mt-2 w-full">
                Save
              </Button>
            </div>

            {/* Line Charts */}
            <Group>
              <label htmlFor="timeframe1" className="text-sm">Timeframe: </label>
              <TimeframeSelect id="timeframe1" value={timeframe1} onChange={(e) => setTimeframe1(e.target.value)}>
                {Object.keys(timeframes).reverse().map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </TimeframeSelect>
              <InfoRow>
                <span>Starting: {change1.start}</span>
                <span>Current: {change1.current}</span>
                <span style={{ color: change1.change < 0 ? 'green' : 'red' }}>
                  Change: {change1.change.toFixed(1)} ({change1.changePercentage.toFixed(1)}%)
                </span>
              </InfoRow>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredData1} margin={{ left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date.seconds"
                    scale="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(tick) => format(new Date(tick * 1000), "MMM dd yyyy")}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis domain={getYAxisDomain(filteredData1)} tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={(label) => format(new Date(label * 1000), "MMM dd yyyy")} />
                  <Line type="monotone" dataKey="weight" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </Group>

            <Group>
              <label htmlFor="timeframe2" className="text-sm">Timeframe: </label>
              <TimeframeSelect id="timeframe2" value={timeframe2} onChange={(e) => setTimeframe2(e.target.value)}>
                {Object.keys(timeframes).reverse().map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </TimeframeSelect>
              <InfoRow>
                <span>Starting: {change2.start}</span>
                <span>Current: {change2.current}</span>
                <span style={{ color: change2.change < 0 ? 'green' : 'red' }}>
                  Change: {change2.change.toFixed(1)} ({change2.changePercentage.toFixed(1)}%)
                </span>
              </InfoRow>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredData2} margin={{ left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date.seconds"
                    scale="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(tick) => format(new Date(tick * 1000), "MMM dd yyyy")}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis domain={getYAxisDomain(filteredData2)} tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={(label) => format(new Date(label * 1000), "MMM dd yyyy")} />
                  <Line type="monotone" dataKey="weight" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </Group>

            <div className="mt-4">
              <Button onClick={() => setShowWeightHistory(!showWeightHistory)} className="mt-4 w-full bg-green-500">
                {showWeightHistory ? "Hide Weight History" : "Show Weight History"}
              </Button>
            </div>

              {showWeightHistory && (
                <div className="mt-4">
                  <h2 className="text-lg font-semibold">Weight History</h2>

                  {/* Import CSV */}
                  <div className="mt-4">
                    <label className="border p-2 rounded w-full bg-blue-500 text-white cursor-pointer">
                      Choose file for import
                      <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {importStatus && <p className="mt-2 text-red-500">{importStatus}</p>} {/* Display import status */}
                  </div>

                  <Table>
                    <thead>
                      <tr>
                        <TableHeader>Date</TableHeader>
                        <TableHeader>Weight (lbs)</TableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {weightHistory
                        .sort((a, b) => b.date.seconds - a.date.seconds) // Sort by date in descending order
                        .map((entry) => (
                          <tr key={entry.id}>
                            <TableCell>{format(new Date(entry.date.seconds * 1000), "MMM dd yyyy")}</TableCell>
                            <TableCell>{entry.weight}</TableCell>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              )}

          </div>
        ) : (
          <>
            <p className="text-gray-600">Track your daily weight easily.</p>
            <Button onClick={login} className="mt-4 w-full bg-blue-500">
              Login with Google
            </Button>
          </>
        )}
      </Card>
    </Container>
  );
}

export default App;







