import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, useApp } from '../App';
import { Save, CheckCircle, Plus, Trash2, Edit2, X, Key, Upload, Image } from 'lucide-react';

const TABS = ['School Info', 'Mark Labels', 'Classes', 'Subjects', 'Conduct Options', 'Users'];

export default function SettingsPage() {
  const { school, loadSchool, user } = useApp();
  const [tab, setTab] = useState('School Info');
  return (
    <div>
      <div className="page-hdr">
        <div><h1 className="page-title">Settings</h1><p className="page-sub">Manage all system configuration</p></div>
      </div>
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'School Info'      && <SchoolInfoTab school={school} onSave={loadSchool} />}
      {tab === 'Mark Labels'      && <MarkLabelsTab />}
      {tab === 'Classes'          && <ClassesTab />}
      {tab === 'Subjects'         && <SubjectsTab />}
      {tab === 'Conduct Options'  && <ConductOptionsTab />}
      {tab === 'Users'            && <UsersTab currentUser={user} />}
    </div>
  );
}

// ── SCHOOL INFO ───────────────────────────────────────────────────────────────
function SchoolInfoTab({ school, onSave }) {
  const [form,    setForm]    = useState({});
  const [logo,    setLogo]    = useState('');
  const [saved,   setSaved]   = useState(false);
  const [logoMsg, setLogoMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (school) setForm({ ...school });
    apiFetch('/school').then(s => { if (s?.logo_base64) setLogo(s.logo_base64); });
  }, [school]);

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    await apiFetch('/school', { method: 'PUT', body: JSON.stringify(form) });
    onSave(); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setLogoMsg('Please select an image file (PNG, JPG)');
    if (file.size > 2 * 1024 * 1024) return setLogoMsg('Image must be smaller than 2MB');
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result;
      const r = await apiFetch('/school/logo', { method: 'PUT', body: JSON.stringify({ base64 }) });
      if (r.success) { setLogo(base64); setLogoMsg('✅ Logo saved!'); setTimeout(() => setLogoMsg(''), 3000); }
      else setLogoMsg('❌ ' + r.message);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Logo */}
      <div className="card-p">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Image size={16} className="text-blue-500" /> School Logo / Crest
        </h3>
        <div className="flex flex-col items-center gap-3">
          <div className="w-36 h-36 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:border-blue-400 transition-all"
            onClick={() => fileRef.current?.click()}>
            {logo
              ? <img src={logo} alt="School Logo" className="w-full h-full object-contain p-2" />
              : <div className="text-center text-slate-400"><Upload size={28} className="mx-auto mb-1" /><p className="text-xs">Click to upload</p></div>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {logoMsg && <p className="text-sm text-center">{logoMsg}</p>}
          <p className="text-xs text-slate-400 text-center">PNG or JPG · Max 2MB<br />Displayed on report cards</p>
        </div>
      </div>

      {/* School details */}
      <div className="card-p lg:col-span-2 space-y-4">
        <h3 className="font-semibold text-slate-700 mb-3">School Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ['school_name', 'School Name'],
            ['address', 'Address'],
            ['district', 'District'],
            ['head_teacher', 'Head Teacher'],
            ['academic_year', 'Academic Year'],
            ['current_term', 'Current Term'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              {key === 'current_term' ? (
                <select className="select" value={form[key] || ''} onChange={e => F(key, e.target.value)}>
                  <option value="ONE">ONE</option><option value="TWO">TWO</option><option value="THREE">THREE</option>
                </select>
              ) : (
                <input className="input" value={form[key] || ''} onChange={e => F(key, e.target.value)} />
              )}
            </div>
          ))}
          <div>
            <label className="label">Total Days in Term</label>
            <input type="number" className="input" value={form.total_attendance || ''} onChange={e => F('total_attendance', e.target.value)} />
          </div>
          <div>
            <label className="label">Date Vacated</label>
            <input className="input" value={form.date_vacated || ''} onChange={e => F('date_vacated', e.target.value)} placeholder="e.g. 20th December 2024" />
          </div>
          <div>
            <label className="label">Reopening Date</label>
            <input className="input" value={form.reopening_date || ''} onChange={e => F('reopening_date', e.target.value)} placeholder="e.g. 13th January 2025" />
          </div>
        </div>
        <button className="btn btn-blue" onClick={save}>
          {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save School Info</>}
        </button>
      </div>
    </div>
  );
}

// ── MARK LABELS ───────────────────────────────────────────────────────────────
function MarkLabelsTab() {
  const [form,  setForm]  = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { apiFetch('/marklabels').then(l => { if (l) setForm(l); }); }, []);
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    await apiFetch('/marklabels', { method: 'PUT', body: JSON.stringify(form) });
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  const fields = [
    ['test1_label', 'test1_max', 'Test 1'],
    ['group_work_label', 'group_work_max', 'Group Work'],
    ['test2_label', 'test2_max', 'Test 2'],
    ['project_label', 'project_max', 'Project'],
  ];

  return (
    <div className="card-p max-w-xl space-y-4">
      <h3 className="font-semibold text-slate-700">SBA Component Labels &amp; Maximum Scores</h3>
      <p className="text-sm text-slate-400">These labels appear as column headers in the Marks Entry page. The 4 components must add up to 100 (they are halved to /50 for class score).</p>
      {fields.map(([labelKey, maxKey, name]) => (
        <div key={labelKey} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">{name} Label</label>
            <input className="input" value={form[labelKey] || ''} onChange={e => F(labelKey, e.target.value)} />
          </div>
          <div className="w-28">
            <label className="label">Max Score</label>
            <input type="number" className="input" value={form[maxKey] || ''} onChange={e => F(maxKey, e.target.value)} min="1" max="100" />
          </div>
        </div>
      ))}
      <button className="btn btn-blue" onClick={save}>
        {saved ? <><CheckCircle size={15} /> Saved!</> : <><Save size={15} /> Save Labels</>}
      </button>
    </div>
  );
}

// ── CLASSES ───────────────────────────────────────────────────────────────────
function ClassesTab() {
  const [classes, setClasses] = useState([]);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  async function load() { setClasses(await apiFetch('/classes')); }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/classes', { method: 'POST', body: JSON.stringify(form) });
      else await apiFetch(`/classes/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }
  async function del(id) {
    if (!window.confirm('Delete class? This will not delete associated students or marks.')) return;
    await apiFetch(`/classes/${id}`, { method: 'DELETE' }); load();
  }

  return (
    <div className="card-p max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Classes</h3>
        <button className="btn btn-blue btn-sm" onClick={() => { setForm({ class_level: classes.length + 1 }); setModal('add'); }}>
          <Plus size={14} /> Add Class
        </button>
      </div>
      <table className="tbl">
        <thead><tr><th>Class Name</th><th className="text-center">Level</th><th></th></tr></thead>
        <tbody>
          {classes.map(c => (
            <tr key={c.id}>
              <td className="font-medium">{c.class_name}</td>
              <td className="text-center">{c.class_level}</td>
              <td className="flex gap-1">
                <button className="btn btn-gray btn-sm" onClick={() => { setForm({ ...c }); setModal(c); }}><Edit2 size={12} /></button>
                <button className="btn btn-red btn-sm" onClick={() => del(c.id)}><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-hdr">
              <h2 className="font-bold">{modal === 'add' ? 'Add Class' : 'Edit Class'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Class Name</label>
                <input className="input" value={form.class_name || ''} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} /></div>
              <div><label className="label">Level (for sorting)</label>
                <input type="number" className="input" value={form.class_level || ''} onChange={e => setForm(f => ({ ...f, class_level: e.target.value }))} /></div>
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

// ── SUBJECTS ──────────────────────────────────────────────────────────────────
function SubjectsTab() {
  const [subjects, setSubjects] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);

  async function load() { setSubjects(await apiFetch('/subjects')); }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/subjects', { method: 'POST', body: JSON.stringify(form) });
      else await apiFetch(`/subjects/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }
  async function del(id) {
    if (!window.confirm('Delete subject? This will also delete all marks for this subject.')) return;
    await apiFetch(`/subjects/${id}`, { method: 'DELETE' }); load();
  }

  return (
    <div className="card-p max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Subjects</h3>
        <button className="btn btn-blue btn-sm" onClick={() => { setForm({}); setModal('add'); }}>
          <Plus size={14} /> Add Subject
        </button>
      </div>
      <table className="tbl">
        <thead><tr><th>Subject Name</th><th>Code</th><th>Order</th><th></th></tr></thead>
        <tbody>
          {subjects.map(s => (
            <tr key={s.id}>
              <td className="font-medium">{s.subject_name}</td>
              <td><span className="badge badge-blue">{s.subject_code}</span></td>
              <td className="text-center text-slate-400">{s.display_order}</td>
              <td className="flex gap-1">
                <button className="btn btn-gray btn-sm" onClick={() => { setForm({ ...s }); setModal(s); }}><Edit2 size={12} /></button>
                <button className="btn btn-red btn-sm" onClick={() => del(s.id)}><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-hdr">
              <h2 className="font-bold">{modal === 'add' ? 'Add Subject' : 'Edit Subject'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Subject Name</label>
                <input className="input" value={form.subject_name || ''} onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} /></div>
              <div><label className="label">Subject Code</label>
                <input className="input" value={form.subject_code || ''} onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} placeholder="e.g. MATH" /></div>
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

// ── CONDUCT OPTIONS ───────────────────────────────────────────────────────────
function ConductOptionsTab() {
  const [opts,    setOpts]    = useState([]);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const categories = ['conduct', 'attitude', 'interest', 'remarks'];

  async function load() { setOpts(await apiFetch('/conduct-options')); }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/conduct-options', { method: 'POST', body: JSON.stringify(form) });
      else await apiFetch(`/conduct-options/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }
  async function del(id) {
    if (!window.confirm('Delete this option?')) return;
    await apiFetch(`/conduct-options/${id}`, { method: 'DELETE' }); load();
  }

  return (
    <div className="card-p max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Conduct Options</h3>
        <button className="btn btn-blue btn-sm" onClick={() => { setForm({ category: 'conduct' }); setModal('add'); }}>
          <Plus size={14} /> Add Option
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {categories.map(cat => (
          <div key={cat}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 capitalize">{cat}</h4>
            <div className="space-y-1">
              {opts.filter(o => o.category === cat).map(o => (
                <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
                  <span className="text-sm">{o.value}</span>
                  <div className="flex gap-1">
                    <button className="btn btn-gray btn-sm" onClick={() => { setForm({ ...o }); setModal(o); }}><Edit2 size={11} /></button>
                    <button className="btn btn-red btn-sm" onClick={() => del(o.id)}><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-hdr">
              <h2 className="font-bold">{modal === 'add' ? 'Add Option' : 'Edit Option'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Category</label>
                <select className="select" value={form.category || 'conduct'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="label">Value</label>
                <input className="input" value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
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

// ── USERS ─────────────────────────────────────────────────────────────────────
function UsersTab({ currentUser }) {
  const [users,  setUsers]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [pwdModal, setPwdModal] = useState(null);
  const [newPwd,   setNewPwd]   = useState('');

  async function load() { setUsers(await apiFetch('/users')); }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (modal === 'add') await apiFetch('/users', { method: 'POST', body: JSON.stringify(form) });
      else await apiFetch(`/users/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function resetPwd() {
    if (!newPwd || newPwd.length < 6) return alert('Password must be at least 6 characters');
    await apiFetch(`/users/${pwdModal.id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPwd }) });
    setPwdModal(null); setNewPwd('');
    alert('Password reset successfully');
  }

  return (
    <div className="card-p max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">User Accounts</h3>
        <button className="btn btn-blue btn-sm" onClick={() => { setForm({ role: 'Teacher', is_active: 1 }); setModal('add'); }}>
          <Plus size={14} /> Add User
        </button>
      </div>
      <table className="tbl">
        <thead><tr><th>Full Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="font-medium">{u.full_name}</td>
              <td className="text-slate-500 text-sm">{u.username}</td>
              <td><span className={`badge ${u.role === 'Admin' ? 'badge-amber' : 'badge-blue'}`}>{u.role}</span></td>
              <td><span className={`badge ${u.is_active !== '0' ? 'badge-green' : 'badge-gray'}`}>{u.is_active !== '0' ? 'Active' : 'Inactive'}</span></td>
              <td>
                <div className="flex gap-1">
                  <button className="btn btn-gray btn-sm" onClick={() => { setForm({ ...u }); setModal(u); }}><Edit2 size={12} /></button>
                  <button className="btn btn-amber btn-sm" onClick={() => { setPwdModal(u); setNewPwd(''); }} title="Reset password"><Key size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit / Add modal */}
      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-hdr">
              <h2 className="font-bold">{modal === 'add' ? 'Add User' : 'Edit User'}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="label">Full Name</label>
                <input className="input" value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              {modal === 'add' && <>
                <div><label className="label">Username</label>
                  <input className="input" value={form.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
                <div><label className="label">Initial Password</label>
                  <input type="password" className="input" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
              </>}
              <div><label className="label">Role</label>
                <select className="select" value={form.role || 'Teacher'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option>Teacher</option><option>Admin</option>
                </select></div>
              <div><label className="label">Status</label>
                <select className="select" value={String(form.is_active) === '0' ? '0' : '1'} onChange={e => setForm(f => ({ ...f, is_active: parseInt(e.target.value) }))}>
                  <option value="1">Active</option><option value="0">Inactive</option>
                </select></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-gray" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={save} disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {pwdModal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setPwdModal(null)}>
          <div className="modal-box max-w-xs">
            <div className="modal-hdr">
              <h2 className="font-bold">Reset Password — {pwdModal.full_name}</h2>
              <button onClick={() => setPwdModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="label">New Password</label>
              <input type="password" className="input" value={newPwd}
                onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="modal-ftr">
              <button className="btn btn-gray" onClick={() => setPwdModal(null)}>Cancel</button>
              <button className="btn btn-amber" onClick={resetPwd}><Key size={15} /> Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
