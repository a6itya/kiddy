import React, { useState, useEffect } from "react";
import { getDashboardSummary } from "../services/api";
export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getDashboardSummary()
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (loading)
    return (
      <p role="status" className="text-slate-500">
        Loading center overview…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="bg-rose-50 p-6 rounded-xl text-rose-800">
        <p>{error}</p>
        <button
          className="mt-3 underline"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Retry overview
        </button>
      </div>
    );
  const { enrollment, classrooms } = summary;
  return (
    <div className="space-y-8">
      <div className="flex justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Center Overview</h1>
          <p className="text-slate-500 mt-1">
            Enrollment overview. Daily attendance is not available yet.
          </p>
        </div>
        <button
          className="text-indigo-700"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Active enrollment</p>
          <p className="text-3xl font-bold mt-2">
            {enrollment.enrolled}{" "}
            <span className="text-base font-normal text-slate-500">
              / {enrollment.totalCapacity} capacity
            </span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Staffing status</p>
          <p className="text-xl font-semibold mt-2">Not available</p>
          <p className="text-sm text-slate-500 mt-3">
            Live staffing and classroom coverage are not tracked yet.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Unpaid invoices</p>
          <p className="text-xl font-semibold mt-2">Not available</p>
          <p className="text-sm text-slate-500 mt-3">
            Billing is not connected yet.
          </p>
        </div>
      </div>
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h2 className="text-lg font-bold p-6 border-b border-slate-200">
          Enrollment by classroom
        </h2>
        <div className="divide-y divide-slate-200">
          {classrooms.map((room) => (
            <div key={room.id} className="p-6 flex justify-between gap-4">
              <h3 className="font-semibold">{room.name}</h3>
              <p>{room.enrolled} enrolled</p>
            </div>
          ))}
          {classrooms.length === 0 && (
            <p className="p-6 text-slate-500">
              No classrooms have been configured.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
