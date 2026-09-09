import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { User, authApi } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && token) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify with backend if online
          const res = await authApi.getMe();
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch {
          console.warn('Session expired or backend unreachable, using cached credentials if any');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: '1.1rem', color: 'var(--slate-500)' }}>Loading application...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              user ? (
                <UserDashboard user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/admin"
            element={
              user ? (
                user.role === 'admin' ? (
                  <AdminDashboard user={user} />
                ) : (
                  <div className="main-content">
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                      <h2>Access Denied</h2>
                      <p style={{ color: 'var(--slate-500)', marginTop: '0.5rem' }}>
                        You must have administrator privileges to view this page.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'}
                replace
              />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
