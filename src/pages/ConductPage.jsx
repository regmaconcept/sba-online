import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, useApp } from '../App';
import { Save, CheckCircle } from 'lucide-react';

export default function ConductPage() {
  const { year, term } = useApp();
  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState('');
  const [rows,     setRows]     = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [opts,     setOpts]     = useState({ conduct: [], attitude: [], interest: [], remarks: [] });

  useEffect(() => {
    apiFetch('/classes').then(setClasses);
    apiFetch('/conduct-options').then(all => {
      const grouped = { conduct: [], attitude: [], interest: [], remarks: [] };
      all.forEach(o => { if (grouped[o.category]) grouped[o.category].push(o.value); });
      setOpts(grouped);
    });
  }, []);

  const load = useCallback(async () => {
    if (!selClass) return;
    const [studs, existing] = await Promise.all([
      apiFetch(`/students?class_id=${selClass}&year=${year}`),
      apiFetch(`/conduct?class_id=${selClass}&year=${year}&term=${term}`),
    ]);
    const map = {};
    existing.forEach(c => map[c.student_id] = c);
    setRows(studs.map(s => ({
      student_id: s.id, name: s.name, gender: s.gender,
      conduct:  map[s.id]?.conduct  || '',
      attitude: map[s.id]?.attitude || '',
      interest: map[s.id]?.interest || '',
      remarks:  map[s.id]?.remarks  || '',
      promoted_to:          map[s.id]?.promoted_to          || '',
      class_teacher_remark: map[s.id]?.class_teacher_remark || '',
    })));
  }, [selClass, year, term]);

  useEffect(() => { load(); }, [load]);

  function update(idx, field, val) {
    setRows(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });
    setSaved(false);
  }

  async function saveAll() {
    if (!selClass) return;
    setSaving(true);
    await apiFetch('/conduct/bulk', { method: 'POST', body: JSON.stringify({ rows, year, term }) });
    await load(); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const sel = "border border-slate-200 rounded text-xs py-1 px-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full min-w-[120px]";

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Conduct, Attitude &amp; Remarks</h1>
          <p className="page-sub">Complete for report card generation · Options managed in Settings</p>
        </div>
        {rows.length > 0 && (
          <button className="btn btn-green" onClick={saveAll} disabled={saving}>
            {saving ? 'Saving…' : saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save All</>}
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
      </div>

      {rows.length > 0 ? (
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Conduct</th><th>Attitude</th>
                <th>Interest</th><th>Remarks</th><th>Promoted To</th><th>Class Teacher Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.student_id}>
                  <td className="text-slate-400 text-xs">{i + 1}</td>
                  <td className="font-medium text-sm whitespace-nowrap">{r.name}</td>
                  {['conduct', 'attitude', 'interest', 'remarks'].map(field => (
                    <td key={field}>
                      <select className={sel} value={r[field]}
                        onChange={e => update(i, field, e.target.value)}>
                        <option value="">—</option>
                        {(opts[field] || []).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                  ))}
                  <td>
                    <input className="input-sm w-24" value={r.promoted_to}
                      onChange={e => update(i, 'promoted_to', e.target.value)}
                      placeholder="e.g. Basic 2" />
                  </td>
                  <td>
                    <input className="input-sm w-40" value={r.class_teacher_remark}
                      onChange={e => update(i, 'class_teacher_remark', e.target.value)}
                      placeholder="Optional remark" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selClass ? (
        <div className="card-p text-center py-12 text-slate-400">No students found in this class for {year}.</div>
      ) : (
        <div className="card-p text-center py-16 text-slate-400">Select a class to enter conduct information.</div>
      )}
    </div>
  );
}
