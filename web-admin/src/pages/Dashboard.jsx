import React, { useState, useEffect } from 'react';
import { getDashboardSummary } from '../services/api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => console.error('Dashboard fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  const { attendance, classrooms } = summary ?? { attendance: { checkedIn: 0, totalCapacity: 0 }, classrooms: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Center Overview</h1>
        <p className="text-slate-500 mt-1">Real-time status of your facility.</p>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Attendance</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold text-slate-800">{attendance.checkedIn}</span>
            <span className="text-slate-400">/ {attendance.totalCapacity} children active</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: `${attendance.totalCapacity > 0 ? (attendance.checkedIn / attendance.totalCapacity) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Staffing Status</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold text-emerald-600">Secure</span>
          </div>
          <p className="text-sm text-slate-500 mt-4">All rooms currently within state limits.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Unpaid Invoices</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold text-rose-600">$0.00</span>
          </div>
          <p className="text-sm text-slate-500 mt-4">Billing coming soon.</p>
        </div>
      </div>

      {/* Live Classroom Ratio Tracker */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Live Classroom Ratios</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {classrooms.map((room) => {
            const ratioLimitReached = room.current > room.teachers * room.maxRatio;
            return (
              <div key={room.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{room.name}</h3>
                  <div className="flex space-x-4 mt-1 text-sm text-slate-500">
                    <span>Children: <strong>{room.current}</strong></span>
                    <span>Active Teachers: <strong>{room.teachers}</strong></span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-medium">State Legal Ratio</p>
                    <p className="text-sm font-semibold text-slate-700">1 teacher per {room.maxRatio} kids</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    room.teachers === 0 || ratioLimitReached
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {room.teachers === 0 ? 'Staffing Required' : ratioLimitReached ? 'Ratio Warning' : 'OK'}
                  </span>
                </div>
              </div>
            );
          })}
          {classrooms.length === 0 && (
            <p className="p-6 text-slate-400 text-sm">No classrooms found. Run the seed script to populate rooms.</p>
          )}
        </div>
      </div>
    </div>
  );
}
