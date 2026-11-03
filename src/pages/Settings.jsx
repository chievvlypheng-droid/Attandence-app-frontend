import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get('/settings').then(setS).catch((e) => setMsg({ type: 'error', text: e.message }));
  }, []);

  if (!s) return msg ? <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{msg.text}</div> : null;

  const field = (key, label, placeholder) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input className="input w-full" placeholder={placeholder} value={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
    </label>
  );

  async function save(e) {
    e.preventDefault();
    try {
      const keys = [
        'schoolName', 'className', 'teacherName', 'teacherSex', 'teacherPhone', 'roomNumber',
        'studyShift', 'telegramChatId', 'messageTemplate',
      ];
      setS(await api.put('/settings', Object.fromEntries(keys.map((k) => [k, s[k]]))));
      setMsg({ type: 'ok', text: 'Settings saved.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {msg && (
        <div className={`rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="font-semibold">Class details (printed at the top of the Excel sheet)</h2>
        {field('schoolName', 'School name', 'e.g. Milky Way School, Visionary 8 Chamkar Doung 1')}
        <div className="grid gap-3 sm:grid-cols-2">
          {field('className', 'Level / class', 'e.g. PLE3')}
          {field('roomNumber', 'Room number', 'e.g. 103')}
          {field('studyShift', 'Study shift', 'e.g. Evening')}
          {field('teacherName', 'Class teacher name', '')}
          {field('teacherPhone', 'Teacher phone number', '')}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Teacher sex</span>
            <select className="input w-full" value={s.teacherSex} onChange={(e) => setS({ ...s, teacherSex: e.target.value })}>
              <option value="">Not shown</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Telegram</h2>
        {!s.telegramConfigured && (
          <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
            No bot token found. Add <code>TELEGRAM_BOT_TOKEN</code> to <code>server/.env</code> and restart the server to
            enable sending. Copying the report works without it.
          </p>
        )}
        {field('telegramChatId', 'Group chat ID', 'e.g. -1001234567890')}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Message format</span>
          <textarea
            className="input h-72 w-full font-mono"
            value={s.messageTemplate}
            onChange={(e) => setS({ ...s, messageTemplate: e.target.value })}
          />
        </label>
        <div className="text-xs text-gray-500">
          Placeholders:{' '}
          {s.placeholders.map((p) => (
            <code key={p} className="mr-1.5 rounded bg-gray-100 px-1">{`{{${p}}}`}</code>
          ))}
        </div>
        <button type="button" className="btn-light" onClick={() => setS({ ...s, messageTemplate: s.defaultTemplate })}>
          Reset format to default
        </button>
      </div>

      <button className="btn">Save settings</button>
    </form>
  );
}
