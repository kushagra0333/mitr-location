import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './display.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const API_BASE = 'https://mitr-api.onrender.com';
const API_KEY = 'mitrSos@2025';
const DEVICE_ID = 'device_1';

const GPSDataDisplay = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [triggered, setTriggered] = useState(false);

  // Fetch coordinates from backend
  const fetchCoordinates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/device/data/${DEVICE_ID}`, {
        headers: { 'x-api-key': API_KEY },
      });

      if (res.status === 403) {
        setTriggered(false);
        setCoordinates([]);
        return;
      }

      const data = await res.json();
      setCoordinates(data.coordinates || []);
      setLastUpdate(new Date());
      setTriggered(true);
      setError(null);
    } catch (err) {
      setError('Failed to fetch coordinates');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start manual trigger
  const startTrigger = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/device/trigger/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ deviceId: DEVICE_ID }),
      });
      const data = await res.json();
      if (res.ok) {
        setTriggered(true);
        fetchCoordinates();
      } else {
        alert(data.error || 'Failed to trigger device');
      }
    } catch (err) {
      alert('Error triggering device');
      console.error(err);
    }
  };

  // Stop trigger
  const stopTrigger = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/device/trigger/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ deviceId: DEVICE_ID }),
      });

      if (res.ok) {
        setTriggered(false);
        setCoordinates([]);
        setLastUpdate(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to stop trigger');
      }
    } catch (err) {
      alert('Error stopping trigger');
      console.error(err);
    }
  };

  // Check if device is triggered
  const checkTriggerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/device/status/${DEVICE_ID}`, {
        headers: { 'x-api-key': API_KEY },
      });

      const data = await res.json();
      setTriggered(data.triggered || false);
    } catch (err) {
      console.error('Status check failed:', err);
    }
  };

  useEffect(() => {
    checkTriggerStatus();
  }, []);

  useEffect(() => {
    if (triggered) {
      fetchCoordinates();
      const intervalId = setInterval(fetchCoordinates, 5000);
      return () => clearInterval(intervalId);
    }
  }, [triggered]);

  const calculateCenter = () => {
    if (coordinates.length === 0) return [0, 0];
    const sum = coordinates.reduce(
      (acc, coord) => ({
        lat: acc.lat + coord.latitude,
        lng: acc.lng + coord.longitude,
      }),
      { lat: 0, lng: 0 }
    );
    return [sum.lat / coordinates.length, sum.lng / coordinates.length];
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleString();

  return (
    <div className="gps-dashboard">
      <h1>Device GPS Tracker</h1>

      <div className="controls">
        <button onClick={startTrigger} disabled={triggered}>
          Start Trigger
        </button>
        <button onClick={stopTrigger} disabled={!triggered}>
          Stop Trigger
        </button>
      </div>

      {lastUpdate && (
        <p className="last-update">Last updated: {formatTime(lastUpdate)}</p>
      )}

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div className="loading">Loading GPS data...</div>
      ) : (
        <>
          <div className="map-container">
            <MapContainer
              center={calculateCenter()}
              zoom={13}
              style={{ height: '500px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {coordinates.map((coord) => (
                <Marker
                  key={`${coord.deviceId}-${coord.timestamp}`}
                  position={[coord.latitude, coord.longitude]}
                >
                  <Popup>
                    <strong>Device ID:</strong> {coord.deviceId}<br />
                    <strong>Coordinates:</strong> {coord.latitude.toFixed(6)}, {coord.longitude.toFixed(6)}<br />
                    <strong>Time:</strong> {formatTime(coord.timestamp)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="data-table">
            <h2>Recent Coordinates</h2>
            <table>
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {coordinates.map((coord, index) => (
                  <tr key={index}>
                    <td>{coord.deviceId}</td>
                    <td>{coord.latitude.toFixed(6)}</td>
                    <td>{coord.longitude.toFixed(6)}</td>
                    <td>{formatTime(coord.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default GPSDataDisplay;
