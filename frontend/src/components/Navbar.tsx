import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { User } from '../services/api';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {

  return (
    <header className="navbar">
      <Link to="/" className="nav-brand">
        <Navigation className="text-primary" size={24} />
        <span>LocationShare</span>
        {user?.role === 'admin' && <span className="badge badge-warning">ADMIN</span>}
      </Link>

      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-outline btn-sm">
              <UserIcon size={16} />
              <span>User Dashboard</span>
            </Link>

            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-outline btn-sm">
                <LayoutDashboard size={16} />
                <span>Admin Panel</span>
              </Link>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-700)' }}>
                {user.name} ({user.email})
              </span>
              <button onClick={onLogout} className="btn btn-outline btn-sm" title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
