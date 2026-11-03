import { useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY = { name: '', code: '', sex: '', phone: '' };

function SexSelect({ value, onChange }) {
  return (
    <select className="input w-20" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sex</option>
      <option value="M">M</option>
      <option value="F">F</option>
    </select>
  );
}

export default function Students() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // { id, name, code, sex, phone }
  const [showRemoved, setShowRemoved] = useState(false);
  const [paste, setPaste] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function load() {
    try {
      setList(await api.get('/students?all=1'));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function run(fn) {
    setError('');
    setInfo('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const add = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post('/students', form);
      setForm(EMPTY);
    });
  };

  const saveEdit = () =>
    run(async () => {
      const { id, ...fields } = editing;
      await api.put(`/students/${id}`, fields);
      setEditing(null);
    });

  const remove = (s) => {
    if (window.confirm(`Remove ${s.name}? Past attendance is kept; they just won't appear in new attendance lists.`)) {
      run(() => api.del(`/students/${s.id}`));
    }
  };

  const importPasted = () =>
    run(async () => {
      const r = await api.post('/students/import', { text: paste });
      setPaste('');
      setInfo(
        `${r.imported} added${r.skipped ? `, ${r.skipped} skipped (name already in the list)` : ''}.` +
          (r.errors.length ? ` Notes: ${r.errors.join('; ')}` : ''),
      );
    });

  const shown = list.filter((s) => s.active || showRemoved);

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex flex-wrap gap-2">
        <input className="input w-32" placeholder="Student ID" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="input min-w-[12rem] flex-1" placeholder="Student name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <SexSelect value={form.sex} onChange={(sex) => setForm({ ...form, sex })} />
        <input className="input w-52" placeholder="Contact number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="btn" disabled={!form.name.trim()}>Add student</button>
      </form>

      <div className="card space-y-2">
        <button className="text-sm font-medium text-blue-600 hover:underline" onClick={() => setShowImport(!showImport)}>
          {showImport ? 'Hide' : 'Add many students at once (paste from Excel)'}
        </button>
        {showImport && (
          <>
            <p className="text-sm text-gray-600">
              Copy these columns from your Excel sheet and paste them below, in this order:{' '}
              <b>Student ID, Name, Sex, Contact number</b>. Only the name is required. Names already in the list are skipped.
            </p>
            <textarea
              className="input h-40 w-full font-mono"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'B1-001\tSok Dara\tM\t012 345 678\nB1-002\tChan Nita\tF\t098 765 432'}
            />
            <button className="btn" disabled={!paste.trim()} onClick={importPasted}>Import students</button>
          </>
        )}
      </div>

      {error && <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{error}</div>}
      {info && <div className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800">{info}</div>}

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{list.filter((s) => s.active).length} students</h2>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} />
            Show removed
          </label>
        </div>
        {shown.length === 0 && <p className="text-sm text-gray-500">No students yet.</p>}
        <ul className="divide-y">
          {shown.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              {editing?.id === s.id ? (
                <>
                  <div className="flex flex-1 flex-wrap gap-2">
                    <input className="input w-32" placeholder="Student ID" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
                    <input className="input min-w-[12rem] flex-1" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <SexSelect value={editing.sex} onChange={(sex) => setEditing({ ...editing, sex })} />
                    <input className="input w-52" placeholder="Contact number" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={saveEdit}>Save</button>
                    <button className="btn-light" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className={s.active ? '' : 'text-gray-400 line-through'}>
                    {s.name}
                    {s.sex && <span className="ml-2 text-sm text-gray-500">{s.sex}</span>}
                    {s.code && <span className="ml-2 text-sm text-gray-500">{s.code}</span>}
                    {s.phone && <span className="ml-2 text-sm text-gray-400">{s.phone}</span>}
                  </span>
                  <div className="flex gap-3 text-sm">
                    {s.active ? (
                      <>
                        <button className="text-blue-600 hover:underline" onClick={() => setEditing({ id: s.id, name: s.name, code: s.code, sex: s.sex, phone: s.phone })}>Edit</button>
                        <button className="text-red-600 hover:underline" onClick={() => remove(s)}>Remove</button>
                      </>
                    ) : (
                      <button className="text-blue-600 hover:underline" onClick={() => run(() => api.put(`/students/${s.id}`, { active: true }))}>Restore</button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
