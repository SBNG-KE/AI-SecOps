"use client";

import { useState, useEffect } from "react";
import { Cpu, Server, Wifi, Database } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface SystemData {
  cpu_percent: number;
  memory: number;
  disk: number;
  timestamp: string;
}

interface ScanDevice {
  ip: string;
  status: string;
}

interface RecentLogs {
  scans?: {
    ip: string;
    details: string | object;
  }[];
  system_reports?: SystemData[];
}

export default function HomePage() {
  // ... (existing state declarations)

  const [system, setSystem] = useState<SystemData | null>(null);
  const [scan, setScan] = useState<{ devices?: ScanDevice[] } | null>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [history, setHistory] = useState<SystemData[]>([]);
  const [recentLogs, setRecentLogs] = useState<unknown | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  // Fetch system stats
  const fetchSystem = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/system");
      const data = await res.json();
      setSystem(data);
      setHistory((h) => [...h.slice(-19), data]); // keep 20 entries
    } catch (err) {
      console.error("System fetch failed:", err);
    }
  };

  // Fetch network scan
  const fetchScan = async () => {
    try {
      setLoadingScan(true);
      const res = await fetch("http://localhost:5000/api/scan");
      const data = await res.json();
      setScan(data);
    } catch (err) {
      console.error("Scan fetch failed:", err);
    } finally {
      setLoadingScan(false);
    }
  };

  // Request AI advice (Gemini)
  const fetchAdvice = async () => {
    try {
      setLoadingAI(true);
      setAdvice(["Analyzing recent logs..."]);
      const res = await fetch("http://localhost:5000/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // backend fetches recent logs itself
      });
      const data = await res.json();
      if (data.advice_text) {
        const lines = data.advice_text.split(/\n+/).filter(Boolean);
        setAdvice(lines);
      } else if (data.advice) {
        setAdvice(data.advice);
      } else {
        setAdvice(["No advice available."]);
      }
    } catch (err) {
      console.error("AI advisor error:", err);
      setAdvice(["Error getting AI recommendations."]);
    } finally {
      setLoadingAI(false);
    }
  };

  // Fetch recent Supabase logs
  const fetchRecentLogs = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/recent-logs");
      const data = await res.json();
      setRecentLogs(data);
    } catch (err) {
      console.error("Recent logs fetch failed:", err);
    }
  };

  // Auto-refresh system stats
  useEffect(() => {
    fetchSystem();
    const timer = setInterval(fetchSystem, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">
        AI SecOps Hub Dashboard
      </h1>

      {/* System Status */}
      <section className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-xl shadow-md">
          <div className="flex items-center gap-2 mb-2 text-blue-400">
            <Cpu className="w-5 h-5" /> <span>CPU</span>
          </div>
          <p className="text-2xl">{system?.cpu_percent ?? "--"}%</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl shadow-md">
          <div className="flex items-center gap-2 mb-2 text-green-400">
            <Server className="w-5 h-5" /> <span>Memory</span>
          </div>
          <p className="text-2xl">{system?.memory ?? "--"}%</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl shadow-md">
          <div className="flex items-center gap-2 mb-2 text-yellow-400">
            <Wifi className="w-5 h-5" /> <span>Disk</span>
          </div>
          <p className="text-2xl">{system?.disk ?? "--"}%</p>
        </div>
      </section>

      {/* Live chart */}
      <div className="bg-gray-900 p-4 rounded-xl shadow-md mb-8">
        <h2 className="mb-2 font-semibold text-blue-300">System Trend</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cpu_percent" stroke="#60a5fa" />
            <Line type="monotone" dataKey="memory" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Network Scanner */}
      <section className="bg-gray-900 p-4 rounded-xl shadow-md mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-blue-300 font-semibold mb-2">Network Devices</h2>
          <button
            onClick={fetchScan}
            disabled={loadingScan}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
          >
            {loadingScan ? "Scanning..." : "Scan Network"}
          </button>
        </div>
        {scan && scan.devices && scan.devices.length > 0 ? (
          <ul className="space-y-1 mt-2">
            {scan.devices.map((d, i) => (
              <li key={i} className="text-sm text-gray-300">
                {d.ip} — {d.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No scan data yet.</p>
        )}
      </section>

      {/* AI Advisor */}
      <section className="bg-gray-900 p-4 rounded-xl shadow-md mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-blue-300 font-semibold mb-2">AI Advisor</h2>
          <button
            onClick={fetchAdvice}
            disabled={loadingAI}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
          >
            {loadingAI ? "Analyzing..." : "Get Recommendations"}
          </button>
        </div>
        <ul className="list-disc list-inside text-gray-300 text-sm">
          {advice.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </section>

      {/* Recent Logs */}
      <section className="bg-gray-900 p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-blue-300 font-semibold">Recent Logs</h2>
          <button
            onClick={fetchRecentLogs}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            <Database className="w-4 h-4" /> Load Logs
          </button>
        </div>

        {recentLogs ? (
          <div className="text-sm text-gray-300 max-h-64 overflow-y-auto">
            <h3 className="text-purple-400 mb-1">Scans:</h3>
            <ul className="mb-2">
              {(recentLogs as RecentLogs).scans?.map((s, i: number) => (
                <li key={i}>
                  {s.ip} —{" "}
                  {s.details && typeof s.details === "object"
                    ? JSON.stringify(s.details)
                    : s.details}
                </li>
              ))}
            </ul>
            <h3 className="text-purple-400 mb-1">System Reports:</h3>
            <ul className="space-y-1">
              {(recentLogs as RecentLogs).system_reports?.map((r, i: number) => (
                <li key={i}>
                  CPU {r.cpu_percent}% | Mem {r.memory}% | Disk {r.disk}%
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No logs loaded yet.</p>
        )}
      </section>
    </main>
  );
}
