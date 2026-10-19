import client, { extractErrorMessage } from '@/services/apiClient';

export const panelApi = {
  get: (p, params) => client.get(`/admin/panel/${p}`, { params }).then((r) => r.data),
  post: (p, d) => client.post(`/admin/panel/${p}`, d).then((r) => r.data),
  patch: (p, d) => client.patch(`/admin/panel/${p}`, d).then((r) => r.data),
  put: (p, d) => client.put(`/admin/panel/${p}`, d).then((r) => r.data),
  del: (p, d) => client.delete(`/admin/panel/${p}`, { data: d }).then((r) => r.data),
};

export const kundeApi = {
  get: (p) => client.get(`/kunde/${p}`).then((r) => r.data),
  post: (p, d) => client.post(`/kunde/${p}`, d, { timeout: 60000 }).then((r) => r.data),
};

export { extractErrorMessage };
export { API_BASE } from '@/services/apiClient';

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    r.readAsDataURL(file);
  });
}
