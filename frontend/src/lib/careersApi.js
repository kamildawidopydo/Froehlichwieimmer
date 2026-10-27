import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';

export const careersApi = axios.create({ baseURL: `${getApiBase()}/api/careers`, withCredentials: true });

export const errMsg = (e, fallback = 'Es ist ein Fehler aufgetreten.') => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return 'Bitte prüfen Sie Ihre Eingaben.';
  return fallback;
};

export const fileUrl = (fileId) => `${getApiBase()}/api/careers/admin/files/${fileId}`;
