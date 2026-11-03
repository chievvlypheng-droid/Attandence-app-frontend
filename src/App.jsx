import { useState } from 'react';
import Attendance from './pages/Attendance.jsx';
import Students from './pages/Students.jsx';
import Calendar from './pages/Calendar.jsx';
import Export from './pages/Export.jsx';
import Settings from './pages/Settings.jsx';

const TABS = [
  ['attendance', 'Attendance', Attendance],
  ['students', 'Students', Students],
  ['calendar', 'Calendar', Calendar],
  ['export', 'Excel & Payroll', Export],
  ['settings', 'Settings', Settings],
];

export default function App() {
  const [tab, setTab] = useState('attendance');
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <h1 className="text-xl font-semibold">Attendance</h1>
        <nav className="flex flex-wrap gap-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      {TABS.map(([id, , Page]) => (tab === id ? <Page key={id} /> : null))}
    </div>
  );
}
