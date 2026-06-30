import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config.js';

function CalibrationPanel({ apiUrl }) {
  const baseUrl = apiUrl || API_BASE_URL;
  const [deviceId, setDeviceId] = useState('sensor1');
  const [benchmarkValue, setBenchmarkValue] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    const value = Number(benchmarkValue);
    if (!deviceId.trim() || !benchmarkValue || Number.isNaN(value) || value <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid device ID and a positive benchmark value.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${baseUrl}/api/calibration`, {
        deviceId: deviceId.trim(),
        benchmarkValue: value,
      });
      setStatus({
        type: 'success',
        message: `Calibration command sent to ${res.data.deviceId} (benchmark ${res.data.benchmarkValue}).`,
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to send calibration command.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="calibration-panel">
      <h2>Calibrate Sensor</h2>
      <p className="calibration-note">
        Place this sensor next to the benchmark sensor in the same air, then enter the
        benchmark sensor's current reading below. The device will scale its own reading
        to match it going forward.
      </p>
      <form onSubmit={handleSubmit} className="calibration-form">
        <label>
          Device ID
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g. sensor1"
          />
        </label>
        <label>
          Benchmark ADC Value
          <input
            type="number"
            value={benchmarkValue}
            onChange={(e) => setBenchmarkValue(e.target.value)}
            placeholder="e.g. 500"
            min="0"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Calibration'}
        </button>
      </form>
      {status && (
        <p className={`calibration-status ${status.type}`}>{status.message}</p>
      )}

      <style>{`
        .calibration-panel {
          max-width: 420px;
          margin: 24px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          padding: 20px;
        }
        .calibration-panel h2 {
          margin: 0 0 8px;
          font-size: 1.2rem;
        }
        .calibration-note {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 0 0 16px;
        }
        .calibration-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .calibration-form label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.85rem;
          color: #374151;
        }
        .calibration-form input {
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
        }
        .calibration-form button {
          padding: 10px;
          background: #264653;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .calibration-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .calibration-status {
          margin-top: 12px;
          font-size: 0.85rem;
        }
        .calibration-status.success { color: #16a34a; }
        .calibration-status.error { color: #dc2626; }
      `}</style>
    </div>
  );
}

export default CalibrationPanel;
