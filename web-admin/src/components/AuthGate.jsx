import React, { useState, useEffect, useRef } from "react";
import { getSession, login, logout } from "../services/api";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setChecking(true);
    setError("");
    setCheckFailed(false);
    getSession()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch((err) => {
        if (active && err.status !== 401) {
          setError(err.message);
          setCheckFailed(true);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    const expired = () => {
      setUser(null);
      setError("Your session has expired. Please sign in again.");
    };
    window.addEventListener("session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("session-expired", expired);
    };
  }, [attempt]);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      setUser(
        (
          await login({
            email: data.get("email"),
            password: data.get("password"),
          })
        ).user,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await logout();
      setUser(null);
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (checking)
    return (
      <p role="status" className="p-10 text-slate-600">
        Checking your session…
      </p>
    );
  if (user)
    return (
      <>
        <div className="ml-64 px-10 py-3 bg-white border-b border-slate-200 flex justify-end gap-4 items-center">
          <span className="text-sm text-slate-600">{user.email}</span>
          <button disabled={busy} onClick={signOut} className="text-indigo-700">
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {error && (
          <p role="alert" className="ml-64 p-4 text-rose-700">
            {error}
          </p>
        )}
        {children}
      </>
    );
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Kiddy Admin</h1>
        <p className="mt-2 mb-6 text-slate-500">
          Sign in to manage your preschool.
        </p>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800"
          >
            {error}
          </p>
        )}
        {checkFailed ? (
          <button
            className="text-indigo-700 underline"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry connection
          </button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium mb-1"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                disabled={busy}
                className="w-full border border-slate-300 p-3 rounded-lg"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={256}
                required
                disabled={busy}
                className="w-full border border-slate-300 p-3 rounded-lg"
              />
            </div>
            <button
              disabled={busy}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
