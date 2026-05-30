import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp, apiFetch } from '../App';
import {
  LayoutDashboard, Users, GraduationCap, ClipboardList, CalendarCheck,
  MessageSquare, BarChart2, FileText, Settings, LogOut, School, Menu, ChevronRight
} from 'lucide-react';

const NAVS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/teachers', icon: GraduationCap, label: 'Teachers' },
  { to: '/marks', icon: ClipboardList, label: 'Marks Entry' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/conduct', icon: MessageSquare, label: 'Conduct & Remarks' },
  { to: '/rawscores', icon: BarChart2, label: 'Raw Scores' },
  { to: '/reports', icon: FileText, label: 'Report Cards' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];
const TERMS = ['ONE', 'TWO', 'THREE'];

export default function Layout() {
  const { user, logout, school, term, year, changeTerm, changeYear } = useApp();
  const navigate   = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [logo, setLogo] = useState('');
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(String);

  useEffect(() => {
    apiFetch('/school').then(s => { if (s?.logo_base64) setLogo(s.logo_base64); }).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className={`sidebar flex-shrink-0 flex flex-col transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
        {/* Logo area */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
          <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
            {logo ? (
              <img src={logo} alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5" />
            ) : (
              <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center">
                <School size={18} className="text-white" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-white font-bold text-xs leading-tight truncate">{school?.school_name || 'SBA School'}</p>
              <p className="text-slate-400 text-xs">GES System</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-slate-400 hover:text-white flex-shrink-0">
            <Menu size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {NAVS.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 mx-2' : ''}`
              }>
              <n.icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{n.label}</span>}
              {!collapsed && <ChevronRight size={12} className="ml-auto opacity-30" />}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {user?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
                <p className="text-slate-400 text-xs">{user?.role}</p>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="text-slate-400 hover:text-red-400">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button onClick={() => { logout(); navigate('/login'); }} className="text-slate-400 hover:text-red-400">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-shrink-0 no-print">
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-medium text-slate-500">Year</label>
            <select className="select text-xs py-1 w-24" value={year} onChange={e => changeYear(e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className="text-xs font-medium text-slate-500">Term</label>
            <select className="select text-xs py-1 w-24" value={term} onChange={e => changeTerm(e.target.value)}>
              {TERMS.map(t => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
