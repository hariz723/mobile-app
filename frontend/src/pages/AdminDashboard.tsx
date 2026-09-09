import React, { useState, useEffect } from 'react';
import { adminApi, User, LocationRecord, AuditLogRecord } from '../services/api';
import { adminWs, WsLocationEvent } from '../services/websocket';
import { LiveMap, MapUserLocation } from '../components/LiveMap';
import { UserTable } from '../components/UserTable';
import {
  Users,
  Radio,
  Clock,
  ShieldCheck,
  FileText,
  MapPin,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'audit'>('live');
  const [users, setUsers] = useState<(User & { collection_enabled?: boolean; last_update?: string })[]>([]);
  const [liveLocations, setLiveLocations] = useState<MapUserLocation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // History state
  const [historyUser, setHistoryUser] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyRecords, setHistoryRecords] = useState<LocationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Initial load
  useEffect(() => {
    fetchUsers();
    adminWs.connect();

    // Subscribe to real-time WebSocket location events
    const unsubscribe = adminWs.onLocationUpdate((event: WsLocationEvent) => {
      console.log('[Admin WS] Received real-time update:', event);

      // Update or insert live marker on map without page refresh
      setLiveLocations((prev) => {
        const existingIdx = prev.findIndex((item) => item.userId === event.user_id);
        const updatedEntry: MapUserLocation = {
          userId: event.user_id,
          userName: event.user_name,
          latitude: event.latitude,
          longitude: event.longitude,
          accuracy: event.accuracy,
          updatedAt: event.timestamp,
        };

        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = updatedEntry;
          return next;
        } else {
          return [...prev, updatedEntry];
        }
      });

      // Update user collection status & last update in table
      setUsers((prev) =>
        prev.map((u) =>
          u.id === event.user_id
            ? { ...u, collection_enabled: true, last_update: event.timestamp }
            : u
        )
      );
    });

    return () => {
      unsubscribe();
      adminWs.disconnect();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data);

      // Preload initial locations for users with active status
      const locationsToLoad: MapUserLocation[] = [];
      for (const u of res.data) {
        if (u.collection_enabled) {
          try {
            const locRes = await adminApi.getUserLocation(u.id);
            if (locRes.data) {
              locationsToLoad.push({
                userId: u.id,
                userName: u.name,
                latitude: locRes.data.latitude,
                longitude: locRes.data.longitude,
                accuracy: locRes.data.accuracy,
                updatedAt: locRes.data.recorded_at,
              });
            }
          } catch (err) {
            console.error(`Could not fetch location for user ${u.id}`, err);
          }
        }
      }
      setLiveLocations(locationsToLoad);
    } catch (err) {
      console.error('Failed to fetch users list', err);
    }
  };

  const handleFetchHistory = async () => {
    if (!historyUser) return;
    setLoadingHistory(true);
    try {
      const res = await adminApi.getUserLocations(historyUser, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setHistoryRecords(res.data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await adminApi.getAuditLogs();
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Switch tabs
  const handleTabChange = (tab: 'live' | 'history' | 'audit') => {
    setActiveTab(tab);
    if (tab === 'audit') {
      handleFetchAuditLogs();
    }
  };

  // Metrics
  const totalUsers = users.length;
  const activeCollectingCount = users.filter((u) => u.collection_enabled).length;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Admin Location Management
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem' }}>
            Monitor authorized real-time locations, historical movements, and access audit trails.
          </p>
        </div>
        <button onClick={fetchUsers} className="btn btn-outline btn-sm">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Total Registered Users
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>{totalUsers}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--success-light)', color: 'var(--success)' }}>
            <Radio size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Active Broadcasting
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{activeCollectingCount}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Admin Security Role
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              {user.name} ({user.role.toUpperCase()})
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--slate-200)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleTabChange('live')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'live' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'live' ? 'var(--primary)' : 'var(--slate-500)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <MapPin size={18} />
          Live Map & Users
        </button>

        <button
          onClick={() => handleTabChange('history')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--slate-500)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Clock size={18} />
          Location History
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'audit' ? 'var(--primary)' : 'var(--slate-500)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FileText size={18} />
          Audit Logs
        </button>
      </div>

      {/* TAB 1: Live Map & Users */}
      {activeTab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Real-Time Operational Map (Leaflet / OpenStreetMap)
              </h3>
              <span className="badge badge-success">
                <Radio size={14} /> WebSocket Connected
              </span>
            </div>
            <LiveMap locations={liveLocations} selectedUserId={selectedUserId} />
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Authorized Users Directory</h3>
            </div>
            <UserTable
              users={users}
              selectedUserId={selectedUserId}
              onSelectUser={(id) => setSelectedUserId(id)}
              onViewHistory={(id) => {
                setHistoryUser(id);
                setActiveTab('history');
                setTimeout(() => handleFetchHistory(), 100);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Location History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h3>Query User Location History</h3>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
              <label className="form-label">Select User</label>
              <select
                className="form-select"
                value={historyUser || ''}
                onChange={(e) => setHistoryUser(Number(e.target.value))}
              >
                <option value="">-- Choose User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button
              onClick={handleFetchHistory}
              disabled={!historyUser || loadingHistory}
              className="btn btn-primary"
            >
              <Calendar size={16} />
              {loadingHistory ? 'Searching...' : 'Search History'}
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Recorded At</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--slate-500)', padding: '2rem' }}>
                      {historyUser ? 'No records found for the selected query.' : 'Select a user to display records.'}
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((rec, i) => (
                    <tr key={i}>
                      <td>{new Date(rec.recorded_at).toLocaleString()}</td>
                      <td>{rec.latitude.toFixed(6)}</td>
                      <td>{rec.longitude.toFixed(6)}</td>
                      <td>±{Math.round(rec.accuracy)} meters</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h3>Sensitive Action Audit Trail</h3>
            <button onClick={handleFetchAuditLogs} className="btn btn-outline btn-sm">
              <RefreshCw size={14} /> Refresh Logs
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target User</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--slate-500)', padding: '2rem' }}>
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <strong>{log.admin_name || `Admin #${log.admin_id}`}</strong>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{log.action}</span>
                      </td>
                      <td>{log.target_user_name || (log.target_user_id ? `User #${log.target_user_id}` : 'N/A')}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
