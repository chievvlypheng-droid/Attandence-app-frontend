import { useEffect, useState } from 'react';
import { api, download, today, lastDayOfMonth } from '../api.js';

export default function Export() {
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [from, setFrom] = useState(`${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/periods').then(setPeriods).catch(() => {});
  }, []);

  function pickPeriod(id) {
    const p = periods.find((x) => x.id === id);
    if (!p) return;
    setMode('range');
    setFrom(p.from);
    setTo(p.to);
  }

  const range = mode === 'month' ? { from: `${month}-01`, to: lastDayOfMonth(month) } : { from, to };
  const valid = range.from && range.to && range.from <= range.to;

  useEffect(() => {
    if (!valid) return;
    setError('');
    api
      .get(`/reports/summary?from=${range.from}&to=${range.to}`)
      .then(setSummary)
      .catch((e) => {
        setSummary(null);
        setError(e.message);
      });
  }, [range.from, range.to]);

  async function get(kind, file) {
    setBusy(kind);
    setError('');
    try {
      await download(`/export/${file}?from=${range.from}&to=${range.to}`, `${kind}_${range.from}_to_${range.to}.xlsx`);
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        {periods.length > 0 && (
          <select className="input" value="" onChange={(e) => pickPeriod(e.target.value)}>
            <option value="">Use my study dates…</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.from} to {p.to}{p.name ? ` (${p.name})` : ''}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === 'month'} onChange={() => setMode('month')} /> Month
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === 'range'} onChange={() => setMode('range')} /> Date range
          </label>
        </div>
        {mode === 'month' ? (
          <input type="month" className="input" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        ) : (
          <div className="flex items-center gap-2">
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-sm">to</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={!valid || busy} onClick={() => get('attendance', 'attendance.xlsx')}>
            {busy === 'attendance' ? 'Preparing…' : 'Download printable attendance sheet'}
          </button>
          <button className="btn-light" disabled={!valid || busy} onClick={() => get('payroll_attendance', 'payroll.xlsx')}>
            {busy === 'payroll_attendance' ? 'Preparing…' : 'Download payroll export'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          The printable sheet follows your school's "Daily Student Attendance List" form (A4 landscape) for the dates
          you choose, plus a Summary tab with each student's totals. Cells show marks only (✓ present, A absent, P
          permission), no reasons. Pick your saved study dates above, or use Date range for any closing dates. The
          payroll export also lists permission reasons.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{error}</div>}

      {summary && (
        <div className="card">
          <h2 className="mb-1 font-semibold">Preview — {summary.scheduled} school days in range</h2>
          <div className="mb-2 text-xs text-gray-500">{summary.months.map((m) => `${m.label}: ${m.scheduled}`).join(' · ')}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-1.5 pr-2">Student</th>
                  <th className="px-2 text-center">P</th>
                  <th className="px-2 text-center">A</th>
                  <th className="px-2 text-center">PM</th>
                  <th className="px-2 text-center">Not recorded</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">{r.name}</td>
                    <td className="px-2 text-center text-green-700">{r.P}</td>
                    <td className="px-2 text-center text-red-700">{r.A}</td>
                    <td className="px-2 text-center text-amber-700">{r.PM}</td>
                    <td className={`px-2 text-center ${r.unrecorded ? 'text-gray-900' : 'text-gray-400'}`}>{r.unrecorded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
