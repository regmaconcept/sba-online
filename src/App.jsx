import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import MarksEntryPage from './pages/MarksEntryPage';
import AttendancePage from './pages/AttendancePage';
import ConductPage from './pages/ConductPage';
import RawScoresPage from './pages/RawScoresPage';
import ReportCardsPage from './pages/ReportCardsPage';
import SettingsPage from './pages/SettingsPage';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Base API URL — change this to your deployed server URL in production
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Helper: make authenticated API calls
export async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('sba_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Server error' }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sba_user')); } catch { return null; }
  });
  const [school, setSchool] = useState(null);
  const [term, setTerm]   = useState(() => sessionStorage.getItem('sba_term') || 'ONE');
  const [year, setYear]   = useState(() => sessionStorage.getItem('sba_year') || new Date().getFullYear().toString());

  useEffect(() => { if (user) loadSchool(); }, [user]);

  async function loadSchool() {
    try {
      const s = await apiFetch('/school');
      setSchool(s);
      if (!sessionStorage.getItem('sba_year')) setYear(s.academic_year || new Date().getFullYear().toString());
      if (!sessionStorage.getItem('sba_term')) setTerm(s.current_term || 'ONE');
    } catch (e) { console.error('loadSchool:', e); }
  }

  function login(u, token) {
    setUser(u);
    sessionStorage.setItem('sba_user', JSON.stringify(u));
    sessionStorage.setItem('sba_token', token);
  }
  function logout() { setUser(null); sessionStorage.clear(); }
  function changeTerm(t) { setTerm(t); sessionStorage.setItem('sba_term', t); }
  function changeYear(y) { setYear(y); sessionStorage.setItem('sba_year', y); }

  return (
    <AppContext.Provider value={{ user, login, logout, school, loadSchool, term, year, changeTerm, changeYear }}>
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="students"   element={<StudentsPage />} />
            <Route path="teachers"   element={<TeachersPage />} />
            <Route path="marks"      element={<MarksEntryPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="conduct"    element={<ConductPage />} />
            <Route path="rawscores"  element={<RawScoresPage />} />
            <Route path="reports"    element={<ReportCardsPage />} />
            <Route path="settings"   element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppContext.Provider>
  );
}
