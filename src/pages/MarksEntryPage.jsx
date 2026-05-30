import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, apiFetch } from '../App';
import { Save, CheckCircle, Info, X } from 'lucide-react';

// ── Grade helpers (match server exactly) ──────────────────────────────────────
function gN(s){ if(s>79)return 1;if(s>=70)return 2;if(s>=65)return 3;if(s>=59)return 4;if(s>=50)return 5;if(s>=45)return 6;if(s>=39)return 7;if(s>=35)return 8;return 9; }
function gR(s){ if(s>79)return'Excellent';if(s>=70)return'Very Good';if(s>=65)return'Good';if(s>=59)return'Fairly Good';if(s>=50)return'Credit';if(s>=45)return'Average';if(s>=39)return'Pass';if(s>=35)return'Weak';return'Very Weak'; }
function calc(s1,s2,s3,s4,exam){
  const c=[s1,s2,s3,s4].map(v=>parseFloat(v)||0);
  const ct=c.reduce((a,b)=>a+b,0),cs=ct/2,ex=parseFloat(exam)||0,ex50=ex/2,ov=+(cs+ex50).toFixed(2);
  return{classTotal:+ct.toFixed(2),cs50:+cs.toFixed(2),ex50:+ex50.toFixed(2),overall:ov,grade:gN(ov),remark:gR(ov)};
}
const GC={1:'g1',2:'g2',3:'g3',4:'g4',5:'g5',6:'g6',7:'g7',8:'g8',9:'g9'};
const DEF={test1_label:'TEST 1',test1_max:30,group_work_label:'GROUP WORK',group_work_max:20,test2_label:'TEST 2',test2_max:30,project_label:'PROJECT',project_max:20};

export default function MarksEntryPage() {
  const { year, term } = useApp();
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [labels,    setLabels]    = useState(DEF);
  const [selClass,  setSelClass]  = useState('');
  const [selSubject,setSelSubject]= useState('');
  const [rows,      setRows]      = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [msg,       setMsg]       = useState('');
  const tbodyRef = useRef(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/classes'),
      apiFetch('/subjects'),
      apiFetch('/marklabels'),
    ]).then(([c, s, l]) => {
      setClasses(c); setSubjects(s);
      if (l && l.test1_label) setLabels(l);
    }).catch(console.error);
  }, []);

  const cols = [
    { key:'sba1', label:labels.test1_label||'TEST 1', max:Number(labels.test1_max)||30 },
    { key:'sba2', label:labels.group_work_label||'GROUP WORK', max:Number(labels.group_work_max)||20 },
    { key:'sba3', label:labels.test2_label||'TEST 2', max:Number(labels.test2_max)||30 },
    { key:'sba4', label:labels.project_label||'PROJECT', max:Number(labels.project_max)||20 },
  ];

  const loadMarks = useCallback(async () => {
    if (!selClass || !selSubject) return;
    const [studs, existing] = await Promise.all([
      apiFetch(`/students?class_id=${selClass}&year=${year}`),
      apiFetch(`/marks?subject_id=${selSubject}&class_id=${selClass}&year=${year}&term=${term}`),
    ]);
    const map = {};
    existing.forEach(m => map[m.student_id] = m);
    setRows(studs.map(s => ({
      student_id: s.id, name: s.name, gender: s.gender,
      sba1: map[s.id]?.sba1 ?? '', sba2: map[s.id]?.sba2 ?? '',
      sba3: map[s.id]?.sba3 ?? '', sba4: map[s.id]?.sba4 ?? '',
      exam_score: map[s.id]?.exam_score ?? '',
    })));
  }, [selClass, selSubject, year, term]);

  useEffect(() => { loadMarks(); }, [loadMarks]);

  function upd(idx, field, val, maxVal) {
    if (maxVal !== undefined) {
      const n = parseFloat(val);
      if (val !== '' && !isNaN(n) && n > maxVal) return;
    }
    setRows(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });
    setSaved(false);
  }

  function getCalc(row) {
    if ([row.sba1,row.sba2,row.sba3,row.sba4,row.exam_score].every(v => v===''||v==null)) return null;
    return calc(row.sba1,row.sba2,row.sba3,row.sba4,row.exam_score);
  }

  function handleKey(e, rowIdx, col) {
    if (e.key==='Enter'||e.key==='Tab') {
      e.preventDefault();
      const c = ['sba1','sba2','sba3','sba4','exam_score'];
      const nx = c.indexOf(col)+1;
      if (nx < c.length) tbodyRef.current?.querySelector(`[data-row="${rowIdx}"][data-col="${c[nx]}"]`)?.focus();
      else if (rowIdx+1 < rows.length) tbodyRef.current?.querySelector(`[data-row="${rowIdx+1}"][data-col="sba1"]`)?.focus();
    }
  }

  async function saveAll() {
    if (!selClass || !selSubject) return setMsg('Select class and subject first');
    setSaving(true); setMsg('');
    await apiFetch('/marks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        rows: rows.map(r => ({
          student_id: r.student_id,
          sba1: r.sba1||null, sba2: r.sba2||null, sba3: r.sba3||null, sba4: r.sba4||null,
          exam_score: r.exam_score||null,
        })),
        subject_id: selSubject, year, term,
      }),
    });
    await loadMarks(); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const maxExam = 100;
  const totalSBA = cols.reduce((a, c) => a + c.max, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr no-print">
        <div>
          <h1 className="page-title">Marks Entry</h1>
          <p className="page-sub">Enter SBA scores and exam scores · {year} · Term {term}</p>
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
        <div>
          <label className="label">Subject</label>
          <select className="select w-56" value={selSubject}
            onChange={e => { setSelSubject(e.target.value); setRows([]); }}>
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
        </div>
        {rows.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
            <Info size={13} className="text-blue-400" />
            SBA max: {totalSBA} · Exam max: {maxExam} · Tab/Enter to navigate
          </div>
        )}
        {msg && <p className="text-red-500 text-sm">{msg}</p>}
      </div>

      {rows.length > 0 ? (
        <div className="card tbl-wrap marks-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Gender</th>
                {cols.map(c => (
                  <th key={c.key} className="text-center">
                    {c.label}<br /><span className="font-normal normal-case text-xs">/{c.max}</span>
                  </th>
                ))}
                <th className="text-center">SBA Total<br /><span className="font-normal normal-case text-xs">/{totalSBA}</span></th>
                <th className="text-center">Class Score<br /><span className="font-normal normal-case text-xs">/50</span></th>
                <th className="text-center">Exam<br /><span className="font-normal normal-case text-xs">/{maxExam}</span></th>
                <th className="text-center">Exam Score<br /><span className="font-normal normal-case text-xs">/50</span></th>
                <th className="text-center">Total<br /><span className="font-normal normal-case text-xs">/100</span></th>
                <th className="text-center">Grade</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {rows.map((row, i) => {
                const c = getCalc(row);
                return (
                  <tr key={row.student_id}>
                    <td className="text-slate-400 text-xs">{i + 1}</td>
                    <td className="font-medium">{row.name}</td>
                    <td>
                      <span className={`badge ${row.gender === 'Boy' ? 'badge-blue' : 'badge-purple'}`}>{row.gender}</span>
                    </td>
                    {cols.map(col => (
                      <td key={col.key} className="text-center">
                        <input
                          className="mark-input"
                          type="number" min="0" max={col.max} step="0.5"
                          value={row[col.key]}
                          data-row={i} data-col={col.key}
                          onChange={e => upd(i, col.key, e.target.value, col.max)}
                          onKeyDown={e => handleKey(e, i, col.key)}
                        />
                      </td>
                    ))}
                    <td className="text-center mark-cell">{c ? c.classTotal : '—'}</td>
                    <td className="text-center mark-cell">{c ? c.cs50 : '—'}</td>
                    <td className="text-center">
                      <input
                        className="mark-input"
                        type="number" min="0" max={maxExam} step="0.5"
                        value={row.exam_score}
                        data-row={i} data-col="exam_score"
                        onChange={e => upd(i, 'exam_score', e.target.value, maxExam)}
                        onKeyDown={e => handleKey(e, i, 'exam_score')}
                      />
                    </td>
                    <td className="text-center mark-cell">{c ? c.ex50 : '—'}</td>
                    <td className="text-center mark-cell font-bold">{c ? c.overall : '—'}</td>
                    <td className={`text-center mark-cell ${c ? GC[c.grade] : ''}`}>{c ? c.grade : '—'}</td>
                    <td className={`mark-cell text-xs ${c ? GC[c.grade] : ''}`}>{c ? c.remark : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        selClass && selSubject ? (
          <div className="card-p text-center py-12 text-slate-400">
            <p>No students found in this class for {year}.</p>
          </div>
        ) : (
          <div className="card-p text-center py-16 text-slate-400">
            <p className="font-medium text-lg">Select a class and subject to begin</p>
          </div>
        )
      )}
    </div>
  );
}
