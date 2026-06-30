import React, { useState, useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import CalibrationPanel from './CalibrationPanel.jsx';
import { API_BASE_URL, SOCKET_URL } from './config.js';

// ---- helpers -----------------------------------------------------------

// Group raw history records into buckets depending on how wide the time
// range is, so the x-axis stays readable whether the data spans hours or
// weeks.
function bucketHistory(records) {
  if (!records || records.length === 0) {
    return { points: [], granularity: 'none' };
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const first = new Date(sorted[0].timestamp).getTime();
  const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const spanHours = (last - first) / (1000 * 60 * 60);

  let granularity;
  if (spanHours <= 6) {
    granularity = 'minute'; // plot raw points, label as HH:mm:ss
  } else if (spanHours <= 24) {
    granularity = 'hour';
  } else {
    granularity = 'day';
  }

  const keyFor = (date) => {
    if (granularity === 'minute') {
      return date.toISOString(); // every point is its own bucket
    }
    if (granularity === 'hour') {
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    }
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const labelFor = (date) => {
    if (granularity === 'minute') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (granularity === 'hour') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const buckets = new Map();

  sorted.forEach((rec) => {
    const date = new Date(rec.timestamp);
    const key = keyFor(date);
    if (!buckets.has(key)) {
      buckets.set(key, {
        label: labelFor(date),
        sortKey: date.getTime(),
        count: 0,
        temperature: 0,
        humidity: 0,
        rawADC: 0,
        avgADC: 0,
      });
    }
    const b = buckets.get(key);
    b.count += 1;
    b.temperature += Number(rec.temperature) || 0;
    b.humidity += Number(rec.humidity) || 0;
    b.rawADC += Number(rec.rawADC) || 0;
    b.avgADC += Number(rec.avgADC) || 0;
  });

  const points = Array.from(buckets.values())
    .map((b) => ({
      label: b.label,
      sortKey: b.sortKey,
      temperature: +(b.temperature / b.count).toFixed(1),
      humidity: +(b.humidity / b.count).toFixed(1),
      rawADC: Math.round(b.rawADC / b.count),
      avgADC: Math.round(b.avgADC / b.count),
    }))
    .sort((a, b) => a.sortKey - b.sortKey);

  return { points, granularity };
}

const GRANULARITY_TITLE = {
  minute: 'Last few hours',
  hour: 'Last 24 hours',
  day: 'Full history (daily average)',
  none: 'No data yet',
};

// ---- small UI pieces -----------------------------------------------------

function StatCard({ label, value, unit, accent }) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        <span className="stat-unit">{unit}</span>
      </span>
    </div>
  );
}

// ---- main component -------------------------------------------------------

function App() {
  const [latest, setLatest] = useState({
    temperature: null,
    humidity: null,
    rawADC: null,
    avgADC: null,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Latest reading
    axios
      .get(`${API_BASE_URL}/api/sensor/latest`)
      .then((res) => {
        if (res.data) {
          setLatest({
            temperature: res.data.temperature,
            humidity: res.data.humidity,
            rawADC: res.data.rawADC,
            avgADC: res.data.avgADC,
          });
        }
      })
      .catch((err) => console.error('Initial latest fetch failed:', err));

    // Full history for the chart
    axios
      .get(`${API_BASE_URL}/api/sensor/history`)
      .then((res) => {
        setHistory(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('History fetch failed:', err);
        setError('Could not load sensor history.');
        setLoading(false);
      });

    // Live updates
    const socket = io(SOCKET_URL);
    socket.on('realtimeData', (incoming) => {
      setLatest({
        temperature: incoming.temperature,
        humidity: incoming.humidity,
        rawADC: incoming.rawADC,
        avgADC: incoming.avgADC,
      });
      setHistory((prev) => [
        ...prev,
        {
          timestamp: incoming.timestamp || new Date().toISOString(),
          temperature: incoming.temperature,
          humidity: incoming.humidity,
          rawADC: incoming.rawADC,
          avgADC: incoming.avgADC,
        },
      ]);
    });

    return () => socket.disconnect();
  }, []);

  const { points, granularity } = useMemo(() => bucketHistory(history), [history]);

  const fmt = (v, digits = 1) =>
    v === null || v === undefined || Number.isNaN(v) ? '--' : Number(v).toFixed(digits);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Washroom Sensor Dashboard</h1>
        <p className="subtitle">{GRANULARITY_TITLE[granularity]}</p>
      </header>

      <section className="stat-grid">
        <StatCard label="Temperature" value={fmt(latest.temperature)} unit="°C" accent="#e76f51" />
        <StatCard label="Humidity" value={fmt(latest.humidity)} unit="%" accent="#2a9d8f" />
        <StatCard label="Raw ADC" value={fmt(latest.rawADC, 0)} unit="" accent="#e9c46a" />
        <StatCard label="Avg ADC" value={fmt(latest.avgADC, 0)} unit="" accent="#264653" />
      </section>

      <section className="chart-panel">
        {loading && <p className="status-text">Loading history…</p>}
        {!loading && error && <p className="status-text error">{error}</p>}
        {!loading && !error && points.length === 0 && (
          <p className="status-text">No sensor history yet.</p>
        )}
        {!loading && !error && points.length > 0 && (
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={points} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Temp °C / Humidity %', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'ADC', angle: 90, position: 'insideRight', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#e76f51" dot={false} strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#2a9d8f" dot={false} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="rawADC" name="Raw ADC" stroke="#e9c46a" dot={false} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="avgADC" name="Avg ADC" stroke="#264653" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <CalibrationPanel apiUrl={API_BASE_URL} />

      <style>{`
        .dashboard {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px 16px 48px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1f2937;
        }
        .dashboard-header h1 {
          font-size: 1.6rem;
          margin: 0 0 4px;
        }
        .subtitle {
          margin: 0 0 20px;
          color: #6b7280;
          font-size: 0.9rem;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: #fff;
          border-top: 4px solid #ccc;
          border-radius: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stat-label {
          font-size: 0.8rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .stat-value {
          font-size: 1.8rem;
          font-weight: 600;
        }
        .stat-unit {
          font-size: 1rem;
          font-weight: 400;
          color: #9ca3af;
          margin-left: 4px;
        }
        .chart-panel {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          padding: 16px;
        }
        .status-text {
          text-align: center;
          color: #6b7280;
          padding: 60px 0;
        }
        .status-text.error {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}

export default App;
