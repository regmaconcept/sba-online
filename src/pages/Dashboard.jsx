import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, GraduationCap, BookOpen, TrendingUp, Award, School } from 'lucide-react';
import { useApp, apiFetch } from '../App';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

export default function Dashboard() {
  const { year, term, school } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, [year, term]);

  async function load() {
    try {
      const d = await apiFetch(`/dashboard?year=${year}&term=${term}`);
      setData(d);
    } catch (e) { console.error(e); }
  }

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading dashboard…</div>
  );

  const topSubject  = [...(data.subjectAvgs || [])].sort((a, b) => b.avg_score - a.avg_score)[0];
  const weakSubject = [...(data.subjectAvgs || [])].sort((a, b) => a.avg_score - b.avg_score)[0];

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{school?.school_name}</h1>
            <p className="text-blue-200 text-sm">{school?.district} · Ghana Education Service</p>
            <p className="text-blue-100 text-sm mt-2 font-medium">Academic Year {year} · Term {term}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center hidden sm:block">
            <School size={28} className="text-amber-300 mx-auto mb-1" />
            <p className="text-xs text-blue-200">Management System</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} color="bg-blue-500" label="Total Students" value={data.totalStudents} sub={`${data.boys} Boys · ${data.girls} Girls`} />
        <StatCard icon={GraduationCap} color="bg-emerald-500" label="Teachers" value={data.totalTeachers} />
        <StatCard icon={Award} color="bg-amber-500" label="Best Subject" value={topSubject?.subject_code || '—'} sub={topSubject ? `Avg: ${topSubject.avg_score?.toFixed(1)}%` : ''} />
        <StatCard icon={TrendingUp} color="bg-purple-500" label="Needs Attention" value={weakSubject?.subject_code || '—'} sub={weakSubject ? `Avg: ${weakSubject.avg_score?.toFixed(1)}%` : ''} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-p">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-500" /> Enrolment by Class
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byClass} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="class_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                {data.byClass.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-p">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-500" /> Subject Averages – Term {term}
          </h3>
          {data.subjectAvgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300">
              <BookOpen size={32} /><p className="text-sm mt-2">No marks entered yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.subjectAvgs} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="subject_code" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [v?.toFixed(1) + '%', 'Avg Score']} />
                <Bar dataKey="avg_score" name="Average" radius={[4, 4, 0, 0]}>
                  {data.subjectAvgs.map((s, i) => {
                    const v = s.avg_score || 0;
                    const color = v >= 65 ? '#10b981' : v >= 50 ? '#3b82f6' : v >= 39 ? '#f59e0b' : '#ef4444';
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grade scale */}
      <div className="card-p">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">Ghana Education Service — Grade Scale</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { g: 1, r: 'Excellent',   range: '>79',   c: 'bg-emerald-500' },
            { g: 2, r: 'Very Good',   range: '70–79', c: 'bg-green-500' },
            { g: 3, r: 'Good',        range: '65–69', c: 'bg-blue-500' },
            { g: 4, r: 'Fairly Good', range: '59–64', c: 'bg-indigo-500' },
            { g: 5, r: 'Credit',      range: '50–58', c: 'bg-amber-500' },
            { g: 6, r: 'Average',     range: '45–49', c: 'bg-orange-400' },
            { g: 7, r: 'Pass',        range: '39–44', c: 'bg-orange-500' },
            { g: 8, r: 'Weak',        range: '35–38', c: 'bg-red-500' },
            { g: 9, r: 'Very Weak',   range: '<35',   c: 'bg-red-700' },
          ].map(i => (
            <div key={i.g} className="text-center">
              <div className={`${i.c} text-white text-lg font-bold rounded-lg py-2`}>{i.g}</div>
              <p className="text-xs font-semibold text-slate-600 mt-1">{i.r}</p>
              <p className="text-xs text-slate-400">{i.range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon size={20} /></div>
      <div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
