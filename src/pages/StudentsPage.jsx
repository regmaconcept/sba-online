import React, { useState, useEffect } from 'react';
import { apiFetch, useApp } from '../App';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export default function StudentsPage() {
  const { year } = useApp();
  const [students, setStudents] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [filter,   setFilter]   = useState({ class_id: '', gender: '' });
  const [modal,    setModal]    = useState(null);
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

  function openAdd()  { setForm({ gender: 'Boy', academic_year: year, status: 'Active' }); setModal('add'); }
  function openEdit(s){ setForm({ ...s }); setModal(s); }

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/students', { method: 'POST', body: JSON.stringify(form) });
      else await apiFetch(`/students/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function del(id) {
    if (!window.confirm('Remove this student from the active list?')) return;
    await apiFetch(`/students/${id}`, { method: 'DELETE' });
    load();
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-sub">Manage enrolled students · {year}</p>
        </div>
        <button className="btn btn-blue" onClick={openAdd}><Plus size={16} /> Add Student</button>
      </div>

      <div className="filter-bar">
        <div>
          <label className="label">Class</label>
          <select className="select w-40" value={filter.class_id}
            onChange={e => setFilter(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="select w-32" value={filter.gender}
            onChange={e => setFilter(f => ({ ...f, gender: e.target.value }))}>
            <option value="">All</option>
            <option>Boy</option>
            <option>Girl</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500 self-end">{students.length} students found</div>
      </div>

      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Gender</th><th>Class</th>
              <th>Student No.</th><th>Year</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td className="text-slate-400 text-xs">{i + 1}</td>
                <td className="font-medium">{s.name}</td>
                <td><span className={`badge ${s.gender === 'Boy' ? 'badge-blue' : 'badge-purple'}`}>{s.gender}</span></td>
                <td>{s.class_name}</td>
                <td className="text-xs text-slate-400">{s.student_no}</td>
                <td className="text-xs text-slate-500">{s.academic_year}</td>
                <td><span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-gray btn-sm" onClick={() => openEdit(s)}><Edit2 size={12} /></button>
                    <button className="btn btn-red btn-sm" onClick={() => del(s.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-md">
            <div className="modal-hdr">
              <h2 className="font-bold text-slate-800">{modal === 'add' ? 'Add Student' : 'Edit Student'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.name || ''} onChange={e => F('name', e.target.value)} placeholder="Student's full name" />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="select" value={form.gender || 'Boy'} onChange={e => F('gender', e.target.value)}>
                  <option>Boy</option><option>Girl</option>
                </select>
              </div>
              <div>
                <label className="label">Class</label>
                <select className="select" value={form.class_id || ''} onChange={e => F('class_id', e.target.value)}>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <input className="input" value={form.academic_year || year} onChange={e => F('academic_year', e.target.value)} />
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-gray" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={save} disabled={saving}>
                <Save size={15} />{saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
