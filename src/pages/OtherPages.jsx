// ─────────────────────────────────────────────────────────────────────────────
// StudentsPage
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { apiFetch, useApp } from '../App';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export function StudentsPage() {
  const { year } = useApp();
  const [students, setStudents] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [filter,   setFilter]   = useState({ class_id:'', gender:'' });
  const [modal,    setModal]    = useState(null); // null | 'add' | student object
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);

  async function load() {
    const params = new URLSearchParams({ year });
    if (filter.class_id) params.set('class_id', filter.class_id);
    if (filter.gender)   params.set('gender',   filter.gender);
    const [s, c] = await Promise.all([
      apiFetch(`/students?${params}`),
      apiFetch('/classes'),
    ]);
    setStudents(s); setClasses(c);
  }
  useEffect(() => { load(); }, [filter, year]);

  function openAdd() { setForm({ gender:'Boy', academic_year: year, status:'Active' }); setModal('add'); }
  function openEdit(s) { setForm({ ...s }); setModal(s); }

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/students', { method:'POST', body:JSON.stringify(form) });
      else await apiFetch(`/students/${modal.id}`, { method:'PUT', body:JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function del(id) {
    if (!window.confirm('Remove this student?')) return;
    await apiFetch(`/students/${id}`, { method:'DELETE' });
    load();
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div><h1 className="page-title">Students</h1><p className="page-sub">Manage enrolled students</p></div>
        <button className="btn btn-blue" onClick={openAdd}><Plus size={16}/>Add Student</button>
      </div>

      <div className="filter-bar">
        <div><label className="label">Class</label>
          <select className="select w-40" value={filter.class_id} onChange={e=>setFilter(f=>({...f,class_id:e.target.value}))}>
            <option value="">All Classes</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
        <div><label className="label">Gender</label>
          <select className="select w-32" value={filter.gender} onChange={e=>setFilter(f=>({...f,gender:e.target.value}))}>
            <option value="">All</option>
            <option>Boy</option><option>Girl</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500 self-end">{students.length} students</div>
      </div>

      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>#</th><th>Name</th><th>Gender</th><th>Class</th><th>Student No.</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td className="text-slate-400 text-xs">{i+1}</td>
                <td className="font-medium">{s.name}</td>
                <td><span className={`badge ${s.gender==='Boy'?'badge-blue':'badge-purple'}`}>{s.gender}</span></td>
                <td>{s.class_name}</td>
                <td className="text-xs text-slate-400">{s.student_no}</td>
                <td><span className={`badge ${s.status==='Active'?'badge-green':'badge-gray'}`}>{s.status}</span></td>
                <td className="flex gap-1">
                  <button className="btn btn-gray btn-sm" onClick={()=>openEdit(s)}><Edit2 size={12}/></button>
                  <button className="btn btn-red btn-sm" onClick={()=>del(s.id)}><Trash2 size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal-box max-w-md">
            <div className="modal-hdr">
              <h2 className="font-bold text-slate-800">{modal==='add'?'Add Student':'Edit Student'}</h2>
              <button onClick={()=>setModal(null)}><X size={18}/></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Full Name</label>
                <input className="input" value={form.name||''} onChange={e=>F('name',e.target.value)} /></div>
              <div><label className="label">Gender</label>
                <select className="select" value={form.gender||'Boy'} onChange={e=>F('gender',e.target.value)}>
                  <option>Boy</option><option>Girl</option>
                </select></div>
              <div><label className="label">Class</label>
                <select className="select" value={form.class_id||''} onChange={e=>F('class_id',e.target.value)}>
                  <option value="">Select class</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select></div>
              <div><label className="label">Academic Year</label>
                <input className="input" value={form.academic_year||year} onChange={e=>F('academic_year',e.target.value)} /></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-gray" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={save} disabled={saving}>
                <Save size={15}/>{saving?'Saving…':'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeachersPage
// ─────────────────────────────────────────────────────────────────────────────
export function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);

  async function load() {
    const [t,c,s] = await Promise.all([apiFetch('/teachers'),apiFetch('/classes'),apiFetch('/subjects')]);
    setTeachers(t); setClasses(c); setSubjects(s);
  }
  useEffect(()=>{ load(); },[]);

  async function save() {
    setSaving(true);
    try {
      if (modal==='add') await apiFetch('/teachers',{method:'POST',body:JSON.stringify(form)});
      else await apiFetch(`/teachers/${modal.id}`,{method:'PUT',body:JSON.stringify(form)});
      setModal(null); load();
    } finally { setSaving(false); }
  }
  async function del(id){ if(!window.confirm('Delete teacher?'))return; await apiFetch(`/teachers/${id}`,{method:'DELETE'}); load(); }
  const F=(k,v)=>setForm(f=>({...f,[k]:v}));

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div><h1 className="page-title">Teachers</h1><p className="page-sub">Manage teaching staff</p></div>
        <button className="btn btn-blue" onClick={()=>{setForm({status:'Active'});setModal('add')}}><Plus size={16}/>Add Teacher</button>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>#</th><th>Name</th><th>Subject</th><th>Class</th><th>Phone</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {teachers.map((t,i)=>(
              <tr key={t.id}>
                <td className="text-slate-400 text-xs">{i+1}</td>
                <td className="font-medium">{t.name}</td>
                <td>{t.subject_name||'—'}</td>
                <td>{t.class_name||'—'}</td>
                <td>{t.phone||'—'}</td>
                <td><span className={`badge ${t.status==='Active'?'badge-green':'badge-gray'}`}>{t.status}</span></td>
                <td className="flex gap-1">
                  <button className="btn btn-gray btn-sm" onClick={()=>{setForm({...t});setModal(t)}}><Edit2 size={12}/></button>
                  <button className="btn btn-red btn-sm" onClick={()=>del(t.id)}><Trash2 size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&(
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal-box max-w-md">
            <div className="modal-hdr">
              <h2 className="font-bold text-slate-800">{modal==='add'?'Add Teacher':'Edit Teacher'}</h2>
              <button onClick={()=>setModal(null)}><X size={18}/></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Full Name</label><input className="input" value={form.name||''} onChange={e=>F('name',e.target.value)}/></div>
              <div><label className="label">Subject</label>
                <select className="select" value={form.subject_id||''} onChange={e=>F('subject_id',e.target.value)}>
                  <option value="">None</option>
                  {subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select></div>
              <div><label className="label">Class</label>
                <select className="select" value={form.class_id||''} onChange={e=>F('class_id',e.target.value)}>
                  <option value="">None</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone||''} onChange={e=>F('phone',e.target.value)}/></div>
              <div><label className="label">Status</label>
                <select className="select" value={form.status||'Active'} onChange={e=>F('status',e.target.value)}>
                  <option>Active</option><option>Inactive</option>
                </select></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-gray" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={save} disabled={saving}><Save size={15}/>{saving?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AttendancePage
// ─────────────────────────────────────────────────────────────────────────────
export function AttendancePage() {
  const { year, term } = useApp();
  const [classes,   setClasses]   = useState([]);
  const [selClass,  setSelClass]  = useState('');
  const [rows,      setRows]      = useState([]);
  const [totalDays, setTotalDays] = useState(52);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(()=>{ apiFetch('/classes').then(setClasses); },[]);

  async function load() {
    if (!selClass) return;
    const [studs, existing] = await Promise.all([
      apiFetch(`/students?class_id=${selClass}&year=${year}`),
      apiFetch(`/attendance?class_id=${selClass}&year=${year}&term=${term}`),
    ]);
    const map={};
    existing.forEach(a=>map[a.student_id]=a);
    if (existing[0]?.total_days) setTotalDays(parseInt(existing[0].total_days));
    setRows(studs.map(s=>({ student_id:s.id, name:s.name, gender:s.gender, days_present:map[s.id]?.days_present??'' })));
  }
  useEffect(()=>{ load(); },[selClass,year,term]);

  async function saveAll(){
    if(!selClass)return;
    setSaving(true);
    await apiFetch('/attendance/bulk',{method:'POST',body:JSON.stringify({rows,year,term,total_days:parseInt(totalDays)||0})});
    await load(); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  }

  return(
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div><h1 className="page-title">Attendance</h1><p className="page-sub">Record days present for each student this term</p></div>
        {rows.length>0&&<button className="btn btn-green" onClick={saveAll} disabled={saving}>{saving?'Saving…':saved?<><CheckCircle size={15}/>Saved!</>:<><Save size={15}/>Save Attendance</>}</button>}
      </div>
      <div className="filter-bar">
        <div><label className="label">Class</label>
          <select className="select w-40" value={selClass} onChange={e=>{setSelClass(e.target.value);setRows([])}}>
            <option value="">Select Class</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select></div>
        <div><label className="label">Total Days in Term</label>
          <input type="number" className="input w-28" value={totalDays} onChange={e=>setTotalDays(e.target.value)} min="1" max="365"/></div>
      </div>
      {rows.length>0&&(
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>Name</th><th>Gender</th><th className="text-center">Days Present<br/><span className="font-normal normal-case text-xs">out of {totalDays}</span></th><th className="text-center">Days Absent</th><th className="text-center">Attendance %</th></tr></thead>
            <tbody>
              {rows.map((r,i)=>{
                const pct=totalDays>0&&r.days_present!==''?((parseFloat(r.days_present)||0)/totalDays*100).toFixed(1):'—';
                const absent=r.days_present!==''?Math.max(0,(parseInt(totalDays)||0)-(parseInt(r.days_present)||0)):'—';
                return(
                  <tr key={r.student_id}>
                    <td className="text-slate-400 text-xs">{i+1}</td>
                    <td className="font-medium">{r.name}</td>
                    <td><span className={`badge ${r.gender==='Boy'?'badge-blue':'badge-purple'}`}>{r.gender}</span></td>
                    <td className="text-center">
                      <input type="number" className="mark-input w-20" min="0" max={totalDays}
                        value={r.days_present}
                        onChange={e=>{const n=[...rows];n[i]={...n[i],days_present:e.target.value};setRows(n);setSaved(false);}}/>
                    </td>
                    <td className="text-center text-slate-500">{absent}</td>
                    <td className="text-center">
                      <span className={`badge ${pct==='—'?'badge-gray':parseFloat(pct)>=80?'badge-green':parseFloat(pct)>=60?'badge-amber':'badge-red'}`}>{pct}{pct!=='—'?'%':''}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Need CheckCircle for attendance
import { CheckCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ConductPage
// ─────────────────────────────────────────────────────────────────────────────
export function ConductPage() {
  const { year, term } = useApp();
  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState('');
  const [rows,     setRows]     = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [opts,     setOpts]     = useState({conduct:[],attitude:[],interest:[],remarks:[]});

  useEffect(()=>{
    apiFetch('/classes').then(setClasses);
    apiFetch('/conduct-options').then(all=>{
      const grouped={conduct:[],attitude:[],interest:[],remarks:[]};
      all.forEach(o=>{if(grouped[o.category])grouped[o.category].push(o.value);});
      setOpts(grouped);
    });
  },[]);

  async function load(){
    if(!selClass)return;
    const [studs,existing]=await Promise.all([
      apiFetch(`/students?class_id=${selClass}&year=${year}`),
      apiFetch(`/conduct?class_id=${selClass}&year=${year}&term=${term}`),
    ]);
    const map={};
    existing.forEach(c=>map[c.student_id]=c);
    setRows(studs.map(s=>({
      student_id:s.id,name:s.name,gender:s.gender,
      conduct:map[s.id]?.conduct||'',attitude:map[s.id]?.attitude||'',
      interest:map[s.id]?.interest||'',remarks:map[s.id]?.remarks||'',
      promoted_to:map[s.id]?.promoted_to||'',class_teacher_remark:map[s.id]?.class_teacher_remark||'',
    })));
  }
  useEffect(()=>{load();},[selClass,year,term]);

  function update(idx,field,val){
    setRows(prev=>{const n=[...prev];n[idx]={...n[idx],[field]:val};return n;});
    setSaved(false);
  }

  async function saveAll(){
    if(!selClass)return;
    setSaving(true);
    await apiFetch('/conduct/bulk',{method:'POST',body:JSON.stringify({rows,year,term})});
    await load(); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  }

  const selectStyle="border border-slate-200 rounded text-xs py-0.5 px-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full";

  return(
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div><h1 className="page-title">Conduct, Attitude &amp; Remarks</h1><p className="page-sub">Complete for report card generation</p></div>
        {rows.length>0&&<button className="btn btn-green" onClick={saveAll} disabled={saving}>{saving?'Saving…':saved?<><CheckCircle size={15}/>Saved!</>:<><Save size={15}/>Save All</>}</button>}
      </div>
      <div className="filter-bar">
        <div><label className="label">Class</label>
          <select className="select w-40" value={selClass} onChange={e=>{setSelClass(e.target.value);setRows([])}}>
            <option value="">Select Class</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select></div>
      </div>
      {rows.length>0&&(
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>Name</th><th>Conduct</th><th>Attitude</th><th>Interest</th><th>Remarks</th><th>Promoted To</th><th>Class Teacher Remark</th></tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.student_id}>
                  <td className="text-slate-400 text-xs">{i+1}</td>
                  <td className="font-medium text-sm">{r.name}</td>
                  {['conduct','attitude','interest','remarks'].map(field=>(
                    <td key={field}>
                      <select className={selectStyle} value={r[field]} onChange={e=>update(i,field,e.target.value)}>
                        <option value="">—</option>
                        {(opts[field]||[]).map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                  ))}
                  <td><input className="input-sm w-28" value={r.promoted_to} onChange={e=>update(i,'promoted_to',e.target.value)} placeholder="e.g. Basic 2"/></td>
                  <td><input className="input-sm w-40" value={r.class_teacher_remark} onChange={e=>update(i,'class_teacher_remark',e.target.value)} placeholder="Optional remark"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RawScoresPage
// ─────────────────────────────────────────────────────────────────────────────
function ordinal(n){if(!n)return'';const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}

export function RawScoresPage(){
  const {year,term}=useApp();
  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState('');
  const [data,     setData]     = useState(null);

  useEffect(()=>{apiFetch('/classes').then(setClasses);},[]);

  async function load(){
    if(!selClass)return;
    const d=await apiFetch(`/rawscores?class_id=${selClass}&year=${year}&term=${term}`);
    setData(d);
  }
  useEffect(()=>{load();},[selClass,year,term]);

  function exportCsv(){
    if(!data)return;
    const headers=['No.','Name','Gender',...data.subjects.map(s=>s.subject_code),'Total','Position'];
    const rowData=data.students.map((s,i)=>[i+1,s.name,s.gender,...s.scores.map(sc=>sc??''),s.total.toFixed(2),ordinal(s.position)]);
    const csv=[headers,...rowData].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`raw_scores_${year}_Term${term}.csv`;
    a.click();
  }

  const Download=(()=>{const{Download}=require('lucide-react');return Download;})();
  const Printer=(()=>{const{Printer}=require('lucide-react');return Printer;})();

  return(
    <div className="flex flex-col gap-4">
      <div className="page-hdr no-print">
        <div><h1 className="page-title">Raw Scores &amp; Class Position</h1><p className="page-sub">Overall totals across all subjects with ranking</p></div>
        <div className="flex gap-2">
          {data&&<>
            <button className="btn btn-outline btn-sm" onClick={exportCsv}>CSV Export</button>
            <button className="btn btn-print btn-sm" onClick={()=>window.print()}>Print</button>
          </>}
        </div>
      </div>
      <div className="filter-bar no-print">
        <div><label className="label">Class</label>
          <select className="select w-40" value={selClass} onChange={e=>{setSelClass(e.target.value);setData(null);}}>
            <option value="">Select Class</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select></div>
      </div>
      {data&&(
        <div className="card tbl-wrap">
          <table className="tbl" style={{fontSize:'11px'}}>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>G</th>
                {data.subjects.map(s=><th key={s.id} className="text-center">{s.subject_code}</th>)}
                <th className="text-center">Total</th>
                <th className="text-center">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s,i)=>(
                <tr key={s.id}>
                  <td className="text-slate-400">{i+1}</td>
                  <td className="font-medium">{s.name}</td>
                  <td><span className={`badge ${s.gender==='Boy'?'badge-blue':'badge-purple'}`} style={{fontSize:'9px'}}>{s.gender[0]}</span></td>
                  {s.scores.map((sc,j)=>(
                    <td key={j} className="text-center mark-cell">{sc!=null?sc.toFixed(1):'—'}</td>
                  ))}
                  <td className="text-center font-bold text-blue-700">{s.total.toFixed(1)}</td>
                  <td className="text-center font-bold">{ordinal(s.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
