import { getApiBase } from '@/lib/apiBase';
import axios from 'axios';

const BASE = getApiBase();
const client = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

export async function fetchActiveInvestmentTopics() {
  const { data } = await client.get('/investment-topics/active');
  return data?.items || [];
}

export async function fetchInvestmentTopic(slug) {
  const { data } = await client.get(`/investment-topics/${encodeURIComponent(slug)}`);
  return data;
}

export async function submitInvestmentLead(payload) {
  const { data } = await client.post('/investment-topics/lead', payload);
  return data;
}
