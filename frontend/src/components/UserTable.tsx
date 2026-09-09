import React from 'react';
import { MapPin, History } from 'lucide-react';
import { User } from '../services/api';

interface UserTableProps {
  users: (User & { collection_enabled?: boolean; last_update?: string })[];
  onSelectUser: (userId: number) => void;
  onViewHistory: (userId: number) => void;
  selectedUserId?: number | null;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onSelectUser,
  onViewHistory,
  selectedUserId,
}) => {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Collection Status</th>
            <th>Last Updated</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--slate-500)', padding: '2rem' }}>
                No users found.
              </td>
            </tr>
          ) : (
            users.map((u) => {
              const isSelected = selectedUserId === u.id;
              return (
                <tr key={u.id} style={{ background: isSelected ? 'var(--primary-light)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.role === 'admin' ? 'badge-warning' : 'badge-neutral'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.collection_enabled ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      {u.collection_enabled ? 'ACTIVE' : 'STOPPED'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                    {u.last_update ? new Date(u.last_update).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => onSelectUser(u.id)}
                        className="btn btn-outline btn-sm"
                        title="Locate on map"
                      >
                        <MapPin size={14} />
                        Focus
                      </button>
                      <button
                        onClick={() => onViewHistory(u.id)}
                        className="btn btn-outline btn-sm"
                        title="View location history"
                      >
                        <History size={14} />
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
