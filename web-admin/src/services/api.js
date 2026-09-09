async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = new Error(
      body?.error || `Request failed (${res.status}). Please try again.`,
    );
    error.status = res.status;
    if (res.status === 401 && !path.startsWith("/api/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}
export const getSession = () => request("/api/auth/me");
export const login = (data) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
export const logout = () =>
  request("/api/auth/logout", { method: "POST", body: "{}" });
export const getChildren = () => request("/api/children");
export const createChild = (data) =>
  request("/api/children", { method: "POST", body: JSON.stringify(data) });
export const updateChild = (id, data) =>
  request(`/api/children/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const withdrawChild = (id) =>
  request(`/api/children/${id}/withdraw`, { method: "POST", body: "{}" });
export const getClassrooms = () => request("/api/classrooms");
export const getDashboardSummary = () => request("/api/dashboard/summary");
