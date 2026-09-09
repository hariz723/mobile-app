import React, { useState, useEffect, useRef } from 'react';
import { User, locationApi, LocationRecord } from '../services/api';
import { LocationControl } from '../components/LocationControl';
import { Shield, Clock, CheckCircle2 } from 'lucide-react';

interface UserDashboardProps {
  user: User;
}

// Calculate distance in meters between two lat/lng coordinates (Haversine formula)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | 'unknown'>('unknown');
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(
    null
  );
  const [history, setHistory] = useState<LocationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Watch position reference
  const watchIdRef = useRef<number | null>(null);
  const lastSentCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Query browser permissions on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          setPermissionStatus(permission.state);
          permission.onchange = () => {
            setPermissionStatus(permission.state);
          };
        })
        .catch(() => {
          setPermissionStatus('unknown');
        });
    }

    // Load initial settings and last location
    loadInitialData();

    // Clean up watcher on unmount
    return () => {
      stopWatching();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [settingsRes, latestRes, historyRes] = await Promise.allSettled([
        locationApi.getSettings(),
        locationApi.getLatest(),
        locationApi.getHistory(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        setIsCollecting(settingsRes.value.data.collection_enabled);
      }

      if (latestRes.status === 'fulfilled' && latestRes.value.data) {
        const loc = latestRes.value.data;
        setCurrentCoords({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        });
        setLastUpdated(loc.recorded_at);
      }

      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data)) {
        setHistory(historyRes.value.data.slice(0, 10)); // recent 10
      }
    } catch (e) {
      console.error('Failed to load initial location data', e);
    }
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const startWatching = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    stopWatching();

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    };

    const successCallback: PositionCallback = async (pos) => {
      setPermissionStatus('granted');
      const { latitude, longitude, accuracy } = pos.coords;
      const now = Date.now();

      setCurrentCoords({ latitude, longitude, accuracy });

      // Throttle updates: send only if moved > 10 meters OR > 5 seconds elapsed
      const last = lastSentCoordsRef.current;
      let shouldSend = false;

      if (!last) {
        shouldSend = true;
      } else {
        const timeDiff = (now - last.time) / 1000;
        const distDiff = getDistanceMeters(last.lat, last.lng, latitude, longitude);
        if (distDiff >= 10.0 || timeDiff >= 5) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        try {
          await locationApi.sendUpdate({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(pos.timestamp).toISOString(),
          });
          const timestampStr = new Date().toISOString();
          setLastUpdated(timestampStr);
          lastSentCoordsRef.current = { lat: latitude, lng: longitude, time: now };
          setError(null);

          // Update local history preview
          setHistory((prev) => [
            {
              latitude,
              longitude,
              accuracy,
              recorded_at: timestampStr,
            },
            ...prev.slice(0, 9),
          ]);
        } catch (err: any) {
          console.error('Failed to send location update to backend', err);
        }
      }
    };

    const errorCallback: PositionErrorCallback = (err) => {
      console.warn(`Geolocation error (${err.code}): ${err.message}`);
      if (err.code === err.PERMISSION_DENIED) {
        setPermissionStatus('denied');
        setError('Location access was denied in browser permissions. Please allow access in browser address bar.');
        handleStopCollection();
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setError('Location information is unavailable from your device.');
      } else if (err.code === err.TIMEOUT) {
        setError('Location request timed out. Retrying...');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
  };

  const handleStartCollection = async () => {
    setError(null);
    try {
      await locationApi.startCollection();
      setIsCollecting(true);
      startWatching();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to start location collection';
      setError(msg);
    }
  };

  const handleStopCollection = async () => {
    stopWatching();
    setIsCollecting(false);
    try {
      await locationApi.stopCollection();
    } catch (err) {
      console.error('Failed to update stop status on backend', err);
    }
  };

  return (
    <div className="main-content">
      {/* Welcome Banner */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Welcome back, {user.name}
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem' }}>
          Manage your personal location sharing consent and view real-time broadcast status.
        </p>
      </div>

      {/* Main Control Card */}
      <div style={{ marginBottom: '1.75rem' }}>
        <LocationControl
          permissionStatus={permissionStatus}
          isCollecting={isCollecting}
          onStart={handleStartCollection}
          onStop={handleStopCollection}
          lastUpdated={lastUpdated}
          currentCoords={currentCoords}
          error={error}
        />
      </div>

      {/* Info & History Grid */}
      <div className="grid-2">
        {/* Privacy & Transparency Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="var(--primary)" />
              <h3>Privacy Policy & Consent Controls</h3>
            </div>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Zero Secret Tracking:</strong> Location updates are only captured while this tab is actively open and collection is switched ON.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Instant Revocation:</strong> Stopping collection instantly clears the browser GPS watcher and prevents further backend storage.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>30-Day Retention:</strong> Historical records are securely purged automatically according to retention settings.</span>
            </div>
          </div>
        </div>

        {/* Recent Coordinates Stream */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--primary)" />
              <h3>Recent Coordinates Stream</h3>
            </div>
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--slate-500)', padding: '1.5rem', fontSize: '0.875rem' }}>
              No location coordinates shared yet. Click "Start Location Collection" above to begin.
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: '0.85rem' }}>
              {history.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--slate-100)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                  </span>
                  <span style={{ color: 'var(--slate-500)' }}>
                    ±{Math.round(item.accuracy)}m • {new Date(item.recorded_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
