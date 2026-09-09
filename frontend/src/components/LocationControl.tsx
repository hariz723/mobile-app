import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Play, Square, MapPin, AlertCircle, Info } from 'lucide-react';

interface LocationControlProps {
  permissionStatus: PermissionState | 'unknown';
  isCollecting: boolean;
  onStart: () => void;
  onStop: () => void;
  lastUpdated: string | null;
  currentCoords: { latitude: number; longitude: number; accuracy: number } | null;
  error: string | null;
}

export const LocationControl: React.FC<LocationControlProps> = ({
  permissionStatus,
  isCollecting,
  onStart,
  onStop,
  lastUpdated,
  currentCoords,
  error,
}) => {
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleStartClick = () => {
    // Present clear consent dialogue before starting
    setShowConsentModal(true);
  };

  const handleConfirmConsent = () => {
    setShowConsentModal(false);
    onStart();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={22} color="var(--primary)" />
          <h3>Location Sharing Controls</h3>
        </div>
        <span
          className={`badge ${
            isCollecting ? 'badge-success' : 'badge-neutral'
          }`}
        >
          {isCollecting ? 'COLLECTION ACTIVE' : 'COLLECTION STOPPED'}
        </span>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
            Browser Permission
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {permissionStatus === 'granted' && (
              <>
                <ShieldCheck size={18} color="var(--success)" />
                <span style={{ color: 'var(--success)' }}>Granted</span>
              </>
            )}
            {permissionStatus === 'denied' && (
              <>
                <ShieldAlert size={18} color="var(--danger)" />
                <span style={{ color: 'var(--danger)' }}>Denied</span>
              </>
            )}
            {(permissionStatus === 'prompt' || permissionStatus === 'unknown') && (
              <>
                <Info size={18} color="var(--warning)" />
                <span style={{ color: 'var(--warning)' }}>Not Requested Yet</span>
              </>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
            Collection Status
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem', color: isCollecting ? 'var(--success)' : 'var(--slate-700)' }}>
            {isCollecting ? 'ACTIVE' : 'STOPPED'}
          </div>
        </div>

        <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
            Last Update
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.35rem', color: 'var(--slate-700)' }}>
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {currentCoords && (
        <div
          style={{
            background: 'var(--primary-light)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            padding: '0.85rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          <strong>Current Broadcast Coordinates:</strong> Latitude: {currentCoords.latitude.toFixed(5)}, Longitude:{' '}
          {currentCoords.longitude.toFixed(5)} (±{Math.round(currentCoords.accuracy)}m)
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        {!isCollecting ? (
          <button onClick={handleStartClick} className="btn btn-primary" style={{ flex: 1 }}>
            <Play size={18} />
            Start Location Collection
          </button>
        ) : (
          <button onClick={onStop} className="btn btn-danger" style={{ flex: 1 }}>
            <Square size={18} />
            Stop Location Collection
          </button>
        )}
      </div>

      {/* Explicit Consent Explanation Modal */}
      {showConsentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Explicit Location Sharing Consent</h3>
            <p style={{ color: 'var(--slate-700)', marginBottom: '1rem', fontSize: '0.925rem' }}>
              By starting location collection, you explicitly consent to sharing your real-time GPS coordinates with this
              application.
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--slate-700)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <li style={{ marginBottom: '0.35rem' }}>
                Coordinates will be sent to the backend only while this tab is active.
              </li>
              <li style={{ marginBottom: '0.35rem' }}>
                Your data is stored securely and retained for a maximum of 30 days according to the retention policy.
              </li>
              <li style={{ marginBottom: '0.35rem' }}>
                Authorized administrators will be able to view your live marker on their operational map.
              </li>
              <li>You can immediately revoke consent and terminate collection at any time by clicking <strong>Stop</strong>.</li>
            </ul>
            <div className="modal-actions">
              <button onClick={() => setShowConsentModal(false)} className="btn btn-outline">
                Cancel
              </button>
              <button onClick={handleConfirmConsent} className="btn btn-primary">
                I Understand & Start Sharing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
