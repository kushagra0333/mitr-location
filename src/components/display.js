import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './display.css'; // Import your CSS file for styling
// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const GPSDataDisplay = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch coordinates from server
  const fetchCoordinates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/gps');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setCoordinates(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching coordinates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and set up polling
  useEffect(() => {
    fetchCoordinates(); // Fetch immediately on component mount
    
    // Set up polling every 5 seconds
    const intervalId = setInterval(fetchCoordinates, 5000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Calculate center point for the map
  const calculateCenter = () => {
    if (coordinates.length === 0) return [0, 0];
    
    const sum = coordinates.reduce((acc, coord) => {
      return {
        lat: acc.lat + coord.latitude,
        lng: acc.lng + coord.longitude
      };
    }, { lat: 0, lng: 0 });
    
    return [
      sum.lat / coordinates.length,
      sum.lng / coordinates.length
    ];
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="gps-dashboard">
      <h1>Real-Time GPS Coordinates</h1>
      
      {lastUpdate && (
        <p className="last-update">
          Last updated: {formatTime(lastUpdate)}
        </p>
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {coordinates.map((coord, index) => (
                <Marker
                  key={`${coord.deviceId}-${coord.timestamp}`}
                  position={[coord.latitude, coord.longitude]}
                >
                  <Popup>
                    <div>
                      <strong>Device ID:</strong> {coord.deviceId || 'Unknown'}<br />
                      <strong>Coordinates:</strong> {coord.latitude.toFixed(6)}, {coord.longitude.toFixed(6)}<br />
                      <strong>Time:</strong> {formatTime(coord.timestamp)}
                    </div>
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
                    <td>{coord.deviceId || 'Unknown'}</td>
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