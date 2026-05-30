import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, useApp } from '../App';
import { Save, CheckCircle } from 'lucide-react';

export default function AttendancePage() {
  const { year, term } = useApp();
  const [classes,   setClasses]   = useState([]);
  const [selClass,  setSelClass]  = useState('');
  const [rows,      setRows]      = useState([]);
  const [totalDays, setTotalDays] = useState(52);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => { apiFetch('/classes').then(setClasses); }, []);

  const load = useCallback(async () => {
    if (!selClass) return;
    const [studs, existing] = await Promise.all([
      apiFetch(`/students?class_id=${selClass}&year=${year}`),
      apiFetch(`/attendance?class_id=${selClass}&year=${year}&term=${term}`),
    ]);
    const map = {};
    existing.forEach(a => map[a.student_id] = a);
    if (existing[0]?.total_days) setTotalDays(parseInt(existing[0].total_days));
    setRows(studs.map(s => ({
      student_id: s.id, name: s.name, gender: s.gender,
      days_present: map[s.id]?.days_present ?? '',
    })));
  }, [selClass, year, term]);

  useEffect(() => { load(); }, [load]);

  function update(idx, val) {
    setRows(prev => { const n = [...prev]; n[idx] = { ...n[idx], days_present: val }; return n; });
    setSaved(false);
  }

  async function saveAll() {
    if (!selClass) return;
    setSaving(true);
    await apiFetch('/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({ rows, year, term, total_days: parseInt(totalDays) || 0 }),
    });
    await load(); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-sub">Record days present for each student · {year} · Term {term}</p>
        </div>
        {rows.length > 0 && (
          <button className="btn btn-green" onClick={saveAll} disabled={saving}>
            {saving ? 'Saving…' : saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save Attendance</>}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div>
          <label className="label">Class</label>
          <select className="select w-40" value={selClass}
            onChange={e => { setSelClass(e.target.value); setRows([]); }}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Total Days in Term</label>
          <input type="number" className="input w-28" value={totalDays}
            onChange={e => setTotalDays(e.target.value)} min="1" max="365" />
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Gender</th>
                <th className="text-center">Days Present<br /><span className="font-normal normal-case text-xs">out of {totalDays}</span></th>
                <th className="text-center">Days Absent</th>
                <th className="text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const present = parseFloat(r.days_present) || 0;
                const total   = parseInt(totalDays) || 0;
                const pct     = r.days_present !== '' && total > 0 ? (present / total * 100).toFixed(1) : null;
                const absent  = r.days_present !== '' ? Math.max(0, total - parseInt(r.days_present) || 0) : null;
                return (
                  <tr key={r.student_id}>
                    <td className="text-slate-400 text-xs">{i + 1}</td>
                    <td className="font-medium">{r.name}</td>
                    <td>
                      <span className={`badge ${r.gender === 'Boy' ? 'badge-blue' : 'badge-purple'}`}>{r.gender}</span>
                    </td>
                    <td className="text-center">
                      <input type="number" className="mark-input w-20" min="0" max={totalDays}
                        value={r.days_present}
                        onChange={e => update(i, e.target.value)} />
                    </td>
                    <td className="text-center text-slate-500">{absent !== null ? absent : '—'}</td>
                    <td className="text-center">
                      {pct !== null ? (
                        <span className={`badge ${parseFloat(pct) >= 80 ? 'badge-green' : parseFloat(pct) >= 60 ? 'badge-amber' : 'badge-red'}`}>
                          {pct}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : selClass ? (
        <div className="card-p text-center py-12 text-slate-400">No students found in this class for {year}.</div>
      ) : (
        <div className="card-p text-center py-16 text-slate-400">Select a class to record attendance.</div>
      )}
    </div>
  );
}
