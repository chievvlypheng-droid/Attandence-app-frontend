import { useEffect, useMemo, useRef, useState } from 'react';
import { api, today } from '../api.js';

const OPTIONS = {
  P: {
    label: 'Present',
    on: 'border-green-600 bg-green-600 text-white',
    off: 'border-green-300 text-green-700 hover:bg-green-50',
    row: 'border-l-green-500 bg-green-50',
  },
  A: {
    label: 'Absent',
    on: 'border-red-600 bg-red-600 text-white',
    off: 'border-red-300 text-red-700 hover:bg-red-50',
    row: 'border-l-red-500 bg-red-50',
  },
  PM: {
    label: 'Permission',
    on: 'border-amber-500 bg-amber-500 text-white',
    off: 'border-amber-300 text-amber-700 hover:bg-amber-50',
    row: 'border-l-amber-500 bg-amber-50',
  },
};

export default function Attendance() {
  const [date, setDate] = useState(today());
  const [day, setDay] = useState(null);
  const [marks, setMarks] = useState({}); // id -> { status, reason }
  const [dirty, setDirty] = useState(false);
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null); // { type: 'ok' | 'error', text }
  const reportRef = useRef(null);

  async function load(d) {
    setMsg(null);
    try {
      const data = await api.get(`/attendance?date=${d}`);
      setDay(data);
      setMarks(Object.fromEntries(data.students.map((s) => [s.id, { status: s.status, reason: s.reason }])));
      setDirty(false);
      if (data.isWorkingDay && data.students.some((s) => s.status)) {
        setReport((await api.get(`/reports/telegram?date=${d}`)).text);
      } else {
        setReport('');
      }
    } catch (e) {
      setDay(null);
      setMsg({ type: 'error', text: e.message });
    }
  }

  useEffect(() => {
    if (date) load(date);
  }, [date]);

  const counts = useMemo(() => {
    const c = { P: 0, A: 0, PM: 0, none: 0 };
    for (const s of day?.students || []) c[marks[s.id]?.status || 'none'] += 1;
    return c;
  }, [day, marks]);

  function setStatus(id, status) {
    setMarks((m) => ({
      ...m,
      // clicking the active button again clears it
      [id]: { status: m[id]?.status === status ? null : status, reason: m[id]?.reason || '' },
    }));
    setDirty(true);
  }

  function setReason(id, reason) {
    setMarks((m) => ({ ...m, [id]: { ...m[id], reason } }));
    setDirty(true);
  }

  function markRemainingPresent() {
    setMarks((m) => {
      const next = { ...m };
      for (const s of day.students) if (!next[s.id]?.status) next[s.id] = { status: 'P', reason: '' };
      return next;
    });
    setDirty(true);
  }

  async function save() {
    const missing = day.students.filter((s) => marks[s.id]?.status === 'PM' && !marks[s.id].reason.trim());
    if (missing.length) {
      setMsg({ type: 'error', text: `Enter a reason for: ${missing.map((s) => s.name).join(', ')}` });
      return;
    }
    setBusy('save');
    try {
      await api.put('/attendance', {
        date,
        records: day.students.map((s) => ({
          student: s.id,
          status: marks[s.id]?.status || null,
          reason: marks[s.id]?.reason || '',
        })),
      });
      await load(date);
      setMsg({ type: 'ok', text: 'Attendance saved.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setBusy('');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      reportRef.current.select();
      document.execCommand('copy');
    }
    setMsg({ type: 'ok', text: 'Report copied.' });
  }

  async function sendTelegram() {
    setBusy('send');
    try {
      await api.post('/reports/telegram/send', { date, text: report });
      setMsg({ type: 'ok', text: 'Sent to Telegram.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setBusy('');
  }

  async function regenerate() {
    try {
      setReport((await api.get(`/reports/telegram?date=${date}`)).text);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Date</label>
        <input type="date" className="input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        {day && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              day.isWorkingDay ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {day.isWorkingDay ? 'School day' : `Not a school day${day.note ? ` — ${day.note}` : ''}`}
          </span>
        )}
      </div>

      {msg && (
        <div className={`rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {day && !day.isWorkingDay && (
        <div className="card text-sm text-gray-600">
          This date is not a scheduled school day, so attendance can't be recorded. If the school is open, mark it as a
          working day in the Calendar tab.
        </div>
      )}

      {day && day.isWorkingDay && day.students.length === 0 && (
        <div className="card text-sm text-gray-600">No students yet. Add them in the Students tab.</div>
      )}

      {day && day.isWorkingDay && day.students.length > 0 && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="text-green-700">Present {counts.P}</span>
              <span className="text-red-700">Absent {counts.A}</span>
              <span className="text-amber-700">Permission {counts.PM}</span>
              <span className="text-gray-500">Not marked {counts.none}</span>
            </div>
            <button className="btn-light" onClick={markRemainingPresent} disabled={counts.none === 0}>
              Mark remaining as Present
            </button>
          </div>

          <ul className="space-y-2">
            {day.students.map((s, i) => {
              const m = marks[s.id] || {};
              return (
                <li
                  key={s.id}
                  className={`rounded-md border border-l-4 p-3 ${m.status ? OPTIONS[m.status].row : 'border-l-gray-300 bg-white'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      <span className="mr-2 text-gray-400">{i + 1}.</span>
                      {s.name}
                    </span>
                    <div className="flex gap-1.5">
                      {Object.entries(OPTIONS).map(([code, o]) => (
                        <button
                          key={code}
                          onClick={() => setStatus(s.id, code)}
                          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${m.status === code ? o.on : `bg-white ${o.off}`}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {m.status === 'PM' && (
                    <input
                      className="input mt-2 w-full"
                      placeholder="Reason for permission (required)"
                      value={m.reason || ''}
                      onChange={(e) => setReason(s.id, e.target.value)}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <button className="btn" onClick={save} disabled={busy === 'save'}>
              {busy === 'save' ? 'Saving…' : 'Save attendance'}
            </button>
            {dirty && <span className="text-sm text-amber-700">Unsaved changes</span>}
          </div>
        </div>
      )}

      {report && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Telegram report</h2>
            <button className="text-sm text-blue-600 hover:underline" onClick={regenerate}>
              Reset to generated text
            </button>
          </div>
          {dirty && (
            <p className="text-sm text-amber-700">You have unsaved changes — save first so the report matches.</p>
          )}
          <textarea
            ref={reportRef}
            className="input h-72 w-full font-mono"
            value={report}
            onChange={(e) => setReport(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-light" onClick={copy}>Copy</button>
            <button className="btn" onClick={sendTelegram} disabled={busy === 'send'}>
              {busy === 'send' ? 'Sending…' : 'Send to Telegram'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
