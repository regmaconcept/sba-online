import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, useApp } from '../App';
import { Download, Printer } from 'lucide-react';

function ordinal(n) {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function RawScoresPage() {
  const { year, term } = useApp();
  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState('');
  const [data,     setData]     = useState(null);

  useEffect(() => { apiFetch('/classes').then(setClasses); }, []);

  const load = useCallback(async () => {
    if (!selClass) return;
    const d = await apiFetch(`/rawscores?class_id=${selClass}&year=${year}&term=${term}`);
    setData(d);
  }, [selClass, year, term]);

  useEffect(() => { load(); }, [load]);

  const className = classes.find(c => String(c.id) === String(selClass))?.class_name || '';

  function exportCsv() {
    if (!data) return;
    const headers = ['No.', 'Name', 'Gender', ...data.subjects.map(s => s.subject_code), 'Total', 'Position'];
    const rows = data.students.map((s, i) => [
      i + 1, s.name, s.gender,
      ...s.scores.map(sc => sc != null ? sc.toFixed(1) : ''),
      s.total.toFixed(1), ordinal(s.position),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `raw_scores_${className}_${year}_Term${term}.csv`;
    a.click();
  }

  const boys  = data?.students.filter(s => s.gender === 'Boy')  || [];
  const girls = data?.students.filter(s => s.gender === 'Girl') || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="page-hdr no-print">
        <div>
          <h1 className="page-title">Raw Scores &amp; Class Position</h1>
          <p className="page-sub">Overall totals across all subjects with class ranking</p>
        </div>
        <div className="flex gap-2">
          {data && <>
            <button className="btn btn-outline btn-sm" onClick={exportCsv}><Download size={14} /> CSV</button>
            <button className="btn btn-print btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
          </>}
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar no-print">
        <div>
          <label className="label">Class</label>
          <select className="select w-40" value={selClass}
            onChange={e => { setSelClass(e.target.value); setData(null); }}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
        {data && (
          <div className="ml-auto flex gap-4 text-sm text-slate-500 self-end">
            <span>Boys: <b className="text-blue-600">{boys.length}</b></span>
            <span>Girls: <b className="text-purple-600">{girls.length}</b></span>
            <span>Total: <b className="text-slate-700">{data.students.length}</b></span>
          </div>
        )}
      </div>

      {/* Print header (hidden on screen, shows on print) */}
      {data && (
        <div className="hidden print:block text-center mb-4">
          <p className="text-lg font-bold">Raw Scores — {className}</p>
          <p className="text-sm">Academic Year: {year} · Term {term}</p>
        </div>
      )}

      {data ? (
        <div className="card tbl-wrap">
          <table className="tbl" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th className="sticky left-0 bg-slate-50">#</th>
                <th className="sticky left-8 bg-slate-50 min-w-[140px]">Name</th>
                <th>G</th>
                {data.subjects.map(s => (
                  <th key={s.id} className="text-center" title={s.subject_name}>{s.subject_code}</th>
                ))}
                <th className="text-center">Total</th>
                <th className="text-center">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s, i) => (
                <tr key={s.id}>
                  <td className="text-slate-400">{i + 1}</td>
                  <td className="font-medium whitespace-nowrap">{s.name}</td>
                  <td>
                    <span className={`badge ${s.gender === 'Boy' ? 'badge-blue' : 'badge-purple'}`}
                      style={{ fontSize: '9px', padding: '1px 4px' }}>
                      {s.gender[0]}
                    </span>
                  </td>
                  {s.scores.map((sc, j) => (
                    <td key={j} className="text-center mark-cell">
                      {sc != null ? sc.toFixed(1) : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="text-center font-bold text-blue-700">{s.total.toFixed(1)}</td>
                  <td className="text-center font-bold text-slate-700">{ordinal(s.position)}</td>
                </tr>
              ))}
            </tbody>
            {/* Subject stats footer */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={3} className="text-xs font-bold text-slate-500 py-2">Average</td>
                {data.subjects.map((sub, j) => {
                  const scores = data.students.map(s => s.scores[j]).filter(v => v != null);
                  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
                  return <td key={j} className="text-center text-xs font-semibold text-slate-600">{avg}</td>;
                })}
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : selClass ? (
        <div className="card-p text-center py-12 text-slate-400">Loading…</div>
      ) : (
        <div className="card-p text-center py-16 text-slate-400">
          <p className="font-medium text-lg">Select a class to view raw scores</p>
        </div>
      )}
    </div>
  );
}
