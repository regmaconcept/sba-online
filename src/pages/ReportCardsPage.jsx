import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, useApp } from '../App';
import { Printer, ChevronLeft, ChevronRight, FileText, Users } from 'lucide-react';

function ordinal(n) {
  if (!n && n !== 0) return '';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function rnd(v) {
  if (v == null || v === '') return 0;
  return Math.round(parseFloat(v)) || 0;
}

export default function ReportCardsPage() {
  const { year, term, school } = useApp();
  const [classes,    setClasses]    = useState([]);
  const [selClass,   setSelClass]   = useState('');
  const [students,   setStudents]   = useState([]);
  const [selIdx,     setSelIdx]     = useState(0);
  const [report,     setReport]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [printAll,   setPrintAll]   = useState(false);
  const [allReports, setAllReports] = useState([]);
  const [logo,       setLogo]       = useState('');

  useEffect(() => {
    apiFetch('/classes').then(setClasses);
    apiFetch('/school').then(s => { if (s?.logo_base64) setLogo(s.logo_base64); });
  }, []);

  const loadStudents = useCallback(async () => {
    if (!selClass) return;
    const s = await apiFetch(`/report/class?class_id=${selClass}&year=${year}`);
    setStudents(s); setSelIdx(0); setReport(null);
  }, [selClass, year]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadReport = useCallback(async () => {
    if (!students.length || selIdx >= students.length) return;
    setLoading(true);
    const r = await apiFetch(`/report/student?student_id=${students[selIdx].id}&year=${year}&term=${term}`);
    setReport(r); setLoading(false);
  }, [students, selIdx, year, term]);
  useEffect(() => { loadReport(); }, [loadReport]);

  async function printAllCards() {
    setPrintAll(true);
    const reports = [];
    for (const s of students) {
      const r = await apiFetch(`/report/student?student_id=${s.id}&year=${year}&term=${term}`);
      reports.push(r);
    }
    setAllReports(reports);
    setTimeout(() => { window.print(); setPrintAll(false); }, 800);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="page-hdr no-print">
        <div>
          <h1 className="page-title">Report Cards</h1>
          <p className="page-sub">Terminal Reports · {year} · Term {term}</p>
        </div>
        <div className="flex gap-2">
          {students.length > 0 && <>
            <button className="btn btn-outline btn-sm" onClick={printAllCards}>
              <Users size={14} /> Print All ({students.length})
            </button>
            {report && (
              <button className="btn btn-print" onClick={() => window.print()}>
                <Printer size={15} /> Print This
              </button>
            )}
          </>}
        </div>
      </div>

      <div className="filter-bar no-print">
        <div>
          <label className="label">Class</label>
          <select className="select w-40" value={selClass}
            onChange={e => { setSelClass(e.target.value); setStudents([]); setReport(null); }}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
        {students.length > 0 && <>
          <div>
            <label className="label">Student</label>
            <select className="select w-64" value={selIdx}
              onChange={e => setSelIdx(parseInt(e.target.value))}>
              {students.map((s, i) => <option key={s.id} value={i}>{i + 1}. {s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-1">
            <button className="btn btn-gray btn-sm" disabled={selIdx === 0}
              onClick={() => setSelIdx(i => i - 1)}><ChevronLeft size={14} /></button>
            <span className="text-sm text-slate-500 px-2 py-1.5">{selIdx + 1}/{students.length}</span>
            <button className="btn btn-gray btn-sm" disabled={selIdx === students.length - 1}
              onClick={() => setSelIdx(i => i + 1)}><ChevronRight size={14} /></button>
          </div>
        </>}
      </div>

      {/* Screen preview */}
      {!printAll && (
        loading
          ? <div className="card-p text-center py-16 text-slate-400">Loading report…</div>
          : report
            ? <div style={{ overflowX: 'auto' }}>
                <ReportCard report={report} school={school} year={year} term={term} logo={logo} />
              </div>
            : <div className="card-p text-center py-20 text-slate-400">
                <FileText size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-lg">Select a class and student</p>
                <p className="text-sm mt-1">to preview and print their terminal report card</p>
              </div>
      )}

      {/* Print-all mode */}
      {printAll && allReports.map((r, i) => (
        <div key={i} style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          <ReportCard report={r} school={school} year={year} term={term} logo={logo} />
        </div>
      ))}
    </div>
  );
}

// ── A4 Report Card Component ──────────────────────────────────────────────────
function ReportCard({ report, school, year, term, logo }) {
  if (!report) return null;
  const { student, marks, attendance, conduct, overallPosition, totalScore, aggregate } = report;
  const subjects = [...marks].sort((a, b) => (parseInt(a.subject_id) || 0) - (parseInt(b.subject_id) || 0));
  const R   = v => rnd(v);
  const Ord = n => ordinal(n) || '—';

  const cardStyle = {
    fontFamily: 'Times New Roman, Times, serif',
    fontSize:   '11pt',
    background: 'white',
    border:     'none',
    width:      '210mm',
    minHeight:  '297mm',
    margin:     '0 auto',
    padding:    '12mm',
    boxSizing:  'border-box',
    display:    'flex',
    flexDirection: 'column',
  };

  const thStyle  = { border: '1px solid #999', padding: '3px 5px', background: '#f5f5f5', fontSize: '9.5pt', textAlign: 'center', fontWeight: 'bold' };
  const tdStyle  = { border: '1px solid #ccc', padding: '3px 5px', fontSize: '9.5pt' };
  const tdC      = { ...tdStyle, textAlign: 'center' };
  const labelSt  = { fontWeight: 'bold', fontSize: '9pt', color: '#333' };
  const valueSt  = { fontSize: '9pt', borderBottom: '1px solid #aaa', minWidth: '80px', display: 'inline-block', paddingBottom: '1px' };

  function gradeColor(g) {
    const n = parseInt(g);
    if (n === 1) return '#059669'; if (n === 2) return '#10b981';
    if (n === 3) return '#3b82f6'; if (n === 4) return '#6366f1';
    if (n === 5) return '#f59e0b'; if (n === 6) return '#f97316';
    if (n === 7) return '#ef4444'; if (n === 8) return '#dc2626';
    return '#991b1b';
  }

  const daysPresent  = parseInt(attendance?.days_present) || 0;
  const totalDays    = parseInt(attendance?.total_days) || parseInt(school?.total_attendance) || 52;
  const daysAbsent   = Math.max(0, totalDays - daysPresent);
  const attPct       = totalDays > 0 ? ((daysPresent / totalDays) * 100).toFixed(0) : '—';

  return (
    <div style={cardStyle}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
        {/* Left: Crest */}
        <div style={{ width: '60px', flexShrink: 0 }}>
          {logo
            ? <img src={logo} alt="Crest" style={{ width: '55px', height: '55px', objectFit: 'contain' }} />
            : <div style={{ width: '55px', height: '55px', border: '2px solid #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt', color: '#999' }}>Crest</div>
          }
        </div>

        {/* Centre: School name */}
        <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {school?.school_name || report.info?.school_name || 'SCHOOL NAME'}
          </div>
          <div style={{ fontSize: '9.5pt', marginTop: '2px' }}>Ghana Education Service</div>
          <div style={{ fontSize: '9pt', color: '#555', marginTop: '1px' }}>{school?.district || report.info?.district || ''}</div>
        </div>

        {/* Right: Address */}
        <div style={{ width: '110px', textAlign: 'right', fontSize: '8.5pt', color: '#555', lineHeight: '1.4' }}>
          <div>{school?.address || report.info?.address || ''}</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
        TERMINAL REPORT — TERM {term}, {year}
      </div>

      {/* Student info row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {[
          ['NAME OF PUPIL', student?.name],
          ['CLASS', student?.class_name],
          ['GENDER', student?.gender],
          ['ACADEMIC YEAR', year],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={labelSt}>{lbl}:</span>
            <span style={valueSt}>{val || '—'}</span>
          </div>
        ))}
      </div>

      {/* Marks table */}
      <div style={{ flex: 1, marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '160px' }}>SUBJECT</th>
              <th style={thStyle}>Class Score /50</th>
              <th style={thStyle}>Exam Score /50</th>
              <th style={thStyle}>Total /100</th>
              <th style={thStyle}>Grade</th>
              <th style={thStyle}>Position</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((m, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                <td style={{ ...tdStyle, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '8.5pt' }}>{m.subject_name}</td>
                <td style={tdC}>{m.class_score_50 != null ? R(m.class_score_50) : ''}</td>
                <td style={tdC}>{m.exam_score_50  != null ? R(m.exam_score_50)  : ''}</td>
                <td style={{ ...tdC, fontWeight: 'bold' }}>{m.overall_total != null ? R(m.overall_total) : ''}</td>
                <td style={{ ...tdC, fontWeight: 'bold', color: m.grade ? gradeColor(m.grade) : '#333' }}>{m.grade || ''}</td>
                <td style={tdC}>{m.position ? Ord(m.position) : ''}</td>
                <td style={{ ...tdStyle, fontSize: '8.5pt', color: m.grade ? gradeColor(m.grade) : '#555' }}>{m.remark || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary + Attendance row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {/* Summary */}
        <table style={{ borderCollapse: 'collapse', flex: '1' }}>
          <tbody>
            {[
              ['Total Score', R(totalScore)],
              ['Aggregate',   aggregate || '—'],
              ['Overall Position', overallPosition ? Ord(overallPosition) : '—'],
            ].map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '9pt', background: '#f5f5f5', whiteSpace: 'nowrap' }}>{lbl}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center', fontSize: '10pt' }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Attendance */}
        <table style={{ borderCollapse: 'collapse', flex: '1' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }} colSpan={2}>ATTENDANCE</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Days in Term',  totalDays],
              ['Days Present',  daysPresent],
              ['Days Absent',   daysAbsent],
              ['Attendance %',  attPct !== '—' ? attPct + '%' : '—'],
            ].map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '9pt', background: '#f5f5f5', whiteSpace: 'nowrap' }}>{lbl}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Conduct */}
        <table style={{ borderCollapse: 'collapse', flex: '1.5' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }} colSpan={2}>CONDUCT &amp; REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Conduct',     conduct?.conduct   || ''],
              ['Attitude',    conduct?.attitude  || ''],
              ['Interest',    conduct?.interest  || ''],
              ['Remarks',     conduct?.remarks   || ''],
              ['Promoted To', conduct?.promoted_to || ''],
            ].map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '9pt', background: '#f5f5f5', whiteSpace: 'nowrap' }}>{lbl}</td>
                <td style={{ ...tdStyle, fontSize: '9pt' }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Class Teacher Remark */}
      {conduct?.class_teacher_remark && (
        <div style={{ marginBottom: '8px', border: '1px solid #ccc', padding: '5px 8px', fontSize: '9pt' }}>
          <span style={{ fontWeight: 'bold' }}>Class Teacher's Remark: </span>{conduct.class_teacher_remark}
        </div>
      )}

      {/* Signature row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px' }}>
        {[
          ["Class Teacher's Signature", ''],
          ['Date', school?.date_vacated || ''],
          ["Head Teacher's Signature",  school?.head_teacher || ''],
          ['Reopening Date', school?.reopening_date || ''],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ textAlign: 'center', minWidth: '90px' }}>
            <div style={{ borderTop: '1px solid #333', paddingTop: '3px', fontSize: '8pt', color: '#555' }}>
              {val ? <span style={{ fontWeight: 'bold' }}>{val}<br /></span> : null}
              {lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Grade key */}
      <div style={{ marginTop: '8px', fontSize: '7.5pt', color: '#777', borderTop: '1px solid #eee', paddingTop: '4px' }}>
        <b>Grade Key:</b> 1 = Excellent (&gt;79) · 2 = Very Good (70–79) · 3 = Good (65–69) · 4 = Fairly Good (59–64) · 5 = Credit (50–58) · 6 = Average (45–49) · 7 = Pass (39–44) · 8 = Weak (35–38) · 9 = Very Weak (&lt;35)
      </div>
    </div>
  );
}
