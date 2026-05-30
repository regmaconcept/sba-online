import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);

  async function load() {
    const [t, c, s] = await Promise.all([
      apiFetch('/teachers'), apiFetch('/classes'), apiFetch('/subjects'),
    ]);
    setTeachers(t); setClasses(c); setSubjects(s);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/teachers', { method: 'POST', body: JSON.stringify(form) });
      else await apiFetch(`/teachers/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function del(id) {
    if (!window.confirm('Delete this teacher?')) return;
    await apiFetch(`/teachers/${id}`, { method: 'DELETE' });
    load();
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <div className="page-hdr">
        <div><h1 className="page-title">Teachers</h1><p className="page-sub">Manage teaching staff</p></div>
        <button className="btn btn-blue" onClick={() => { setForm({ status: 'Active' }); setModal('add'); }}>
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>Name</th><th>Subject</th><th>Class</th><th>Phone</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {teachers.map((t, i) => (
              <tr key={t.id}>
                <td className="text-slate-400 text-xs">{i + 1}</td>
                <td className="font-medium">{t.name}</td>
                <td className="text-sm text-slate-600">{t.subject_name || '—'}</td>
                <td className="text-sm text-slate-600">{t.class_name || '—'}</td>
                <td className="text-sm text-slate-500">{t.phone || '—'}</td>
                <td><span className={`badge ${t.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{t.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-gray btn-sm" onClick={() => { setForm({ ...t }); setModal(t); }}><Edit2 size={12} /></button>
                    <button className="btn btn-red btn-sm" onClick={() => del(t.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">No teachers added yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-md">
            <div className="modal-hdr">
              <h2 className="font-bold text-slate-800">{modal === 'add' ? 'Add Teacher' : 'Edit Teacher'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Full Name</label>
                <input className="input" value={form.name || ''} onChange={e => F('name', e.target.value)} placeholder="Teacher's full name" /></div>
              <div><label className="label">Subject</label>
                <select className="select" value={form.subject_id || ''} onChange={e => F('subject_id', e.target.value)}>
                  <option value="">None</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select></div>
              <div><label className="label">Class</label>
                <select className="select" value={form.class_id || ''} onChange={e => F('class_id', e.target.value)}>
                  <option value="">None</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select></div>
              <div><label className="label">Phone</label>
                <input className="input" value={form.phone || ''} onChange={e => F('phone', e.target.value)} placeholder="Phone number" /></div>
              <div><label className="label">Status</label>
                <select className="select" value={form.status || 'Active'} onChange={e => F('status', e.target.value)}>
                  <option>Active</option><option>Inactive</option>
                </select></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-gray" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={save} disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
