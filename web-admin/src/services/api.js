async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  if (res.status === 204) return null;
  return res.json();
}

export const getChildren = () => request('/api/children');
export const createChild = (data) => request('/api/children', { method: 'POST', body: JSON.stringify(data) });
export const updateChild = (id, data) => request(`/api/children/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChild = (id) => request(`/api/children/${id}`, { method: 'DELETE' });

export const getClassrooms = () => request('/api/classrooms');

export const getDashboardSummary = () => request('/api/dashboard/summary');
