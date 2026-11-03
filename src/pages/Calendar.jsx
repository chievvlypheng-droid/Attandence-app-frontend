import { useEffect, useState } from 'react';
import { api, today, lastDayOfMonth, shiftMonth } from '../api.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [days, setDays] = useState([]);
  const [settings, setSettings] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState({ name: '', from: '', to: '' });
  const [range, setRange] = useState({ from: '', to: '', type: 'holiday', note: '' });
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState(null);

  async function loadDays() {
    try {
      setDays(await api.get(`/calendar?from=${month}-01&to=${lastDayOfMonth(month)}`));
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }
  async function loadPeriods() {
    try {
      setPeriods(await api.get('/periods'));
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }
  useEffect(() => {
    loadDays();
  }, [month]);
  useEffect(() => {
    loadPeriods();
    api.get('/settings').then(setSettings).catch((e) => setMsg({ type: 'error', text: e.message }));
  }, []);

  async function act(fn, okText) {
    setMsg(null);
    try {
      const result = await fn();
      await Promise.all([loadDays(), loadPeriods()]);
      setMsg({ type: 'ok', text: okText ? okText(result) : 'Done.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  // click a day to flip it between school day and holiday
  function toggle(d) {
    if (d.isWorking) {
      const note = window.prompt(`Mark ${d.date} as a holiday. Name (optional):`, d.note || '');
      if (note === null) return;
      act(() => api.put(`/calendar/${d.date}`, { type: 'holiday', note }));
    } else {
      act(() => api.put(`/calendar/${d.date}`, { type: 'working' }));
    }
  }

  function toggleWeekday(n) {
    const set = new Set(settings.workingWeekdays);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    act(async () => {
      setSettings(await api.put('/settings', { workingWeekdays: [...set] }));
    });
  }

  function readFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result));
    reader.readAsText(file);
  }

  const lead = days.length ? days[0].weekday : 0;
  const schoolDays = days.filter((d) => d.isWorking).length;

  const cellClass = (d) => {
    if (d.isWorking) return d.source === 'override' ? 'border-green-500 bg-green-100' : 'border-gray-200 bg-white hover:bg-blue-50';
    if (d.source === 'override') return 'border-red-300 bg-red-100';
    if (d.source === 'outside') return 'border-dashed border-gray-300 bg-gray-50 text-gray-300 hover:bg-gray-100';
    return 'border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200';
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      <div className="card space-y-3">
        <div>
          <h2 className="font-semibold">Study dates</h2>
          <p className="text-sm text-gray-600">
            Set the dates your class is studying, for example 19 Oct to 20 Nov. Once you add one or more ranges, only
            days inside them count as school days. Leave this empty to use the weekly pattern all year.
          </p>
        </div>
        {periods.length > 0 && (
          <ul className="divide-y rounded-md border">
            {periods.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <b>{p.from}</b> to <b>{p.to}</b>
                  {p.name && <span className="ml-2 text-gray-500">{p.name}</span>}
                </span>
                <span className="flex gap-3">
                  <button className="text-blue-600 hover:underline" onClick={() => setMonth(p.from.slice(0, 7))}>
                    Show
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => window.confirm('Delete these study dates? Saved attendance is kept.') && act(() => api.del(`/periods/${p.id}`), () => 'Study dates deleted.')}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} />
          <span className="text-sm">to</span>
          <input type="date" className="input" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} />
          <input className="input min-w-[10rem] flex-1" placeholder="Name (optional)" value={period.name} onChange={(e) => setPeriod({ ...period, name: e.target.value })} />
          <button
            className="btn"
            disabled={!period.from || !period.to}
            onClick={() =>
              act(async () => {
                await api.post('/periods', period);
                setMonth(period.from.slice(0, 7));
                setPeriod({ name: '', from: '', to: '' });
              }, () => 'Study dates added.')
            }
          >
            Add study dates
          </button>
        </div>
      </div>

      {settings && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Normal school days of the week</h2>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((w, n) => (
              <label key={w} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={settings.workingWeekdays.includes(n)} onChange={() => toggleWeekday(n)} />
                {w}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <button className="btn-light" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <div className="text-center">
            <input type="month" className="input" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            <div className="mt-1 text-xs text-gray-500">{schoolDays} school days</div>
          </div>
          <button className="btn-light" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
          {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => toggle(d)}
              title={d.note || (d.isWorking ? 'School day' : 'No school')}
              className={`flex h-16 flex-col items-start rounded-md border p-1.5 text-left text-sm ${cellClass(d)}`}
            >
              <span className="font-medium">{Number(d.date.slice(8))}</span>
              {d.note && <span className="w-full truncate text-[10px] leading-tight">{d.note}</span>}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Click a day to switch it between school day and holiday. White = school day, grey = normally closed,
          faded dashed = outside your study dates, red = holiday, green = extra working day.
        </p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Add a break or holiday range</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <span className="text-sm">to</span>
          <input type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <select className="input" value={range.type} onChange={(e) => setRange({ ...range, type: e.target.value })}>
            <option value="holiday">Holiday</option>
            <option value="working">Working day</option>
          </select>
          <input className="input min-w-[10rem] flex-1" placeholder="Name (e.g. Pchum Ben)" value={range.note} onChange={(e) => setRange({ ...range, note: e.target.value })} />
          <button
            className="btn"
            disabled={!range.from || !range.to}
            onClick={() => act(() => api.post('/calendar/range', range), (r) => `${r.updated} days updated.`)}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Import calendar</h2>
        <p className="text-sm text-gray-600">
          One line per day: <code>date,type,name</code> — for example <code>2026-11-09,holiday,Independence Day</code>.
          Type is <code>holiday</code> or <code>working</code> (a date alone counts as a holiday).
        </p>
        <input type="file" accept=".csv,.txt" onChange={readFile} className="text-sm" />
        <textarea className="input h-32 w-full font-mono" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'2026-11-09,holiday,Independence Day\n2026-11-14,working,Make-up class'} />
        <button
          className="btn"
          disabled={!csv.trim()}
          onClick={() =>
            act(
              () => api.post('/calendar/import', { csv }),
              (r) => `${r.imported} days imported.${r.errors.length ? ` Problems: ${r.errors.join('; ')}` : ''}`,
            )
          }
        >
          Import
        </button>
      </div>
    </div>
  );
}
