import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';

// Session 82.96 — Supabase-RPC `formular_session_is_valid` ersetzt durch
// `POST /api/formular-access/session/validate` (FastAPI/Mongo).

const SESSION_KEY = 'formular_session_id';
const CONDITIONS_KEY = 'formular_conditions';
const API = getApiBase();

// Ist im Code eine Bank + Produkt hinterlegt, darf der Kunde nur dieses
// Angebot sehen. Alle anderen Bank-/Produktseiten leiten dorthin um.
function lockedTarget() {
  try {
    const raw = sessionStorage.getItem(CONDITIONS_KEY);
    const cond = raw ? JSON.parse(raw) : null;
    if (cond?.bank && cond?.product) return `/banks/${cond.bank}/${cond.product}`;
  } catch { /* ignorieren */ }
  return null;
}

const FormularProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        if (!cancelled) setStatus('denied');
        return;
      }
      try {
        const { data } = await axios.post(
          `${API}/api/formular-access/session/validate`,
          { session_id: sessionId },
          { withCredentials: true },
        );
        if (cancelled) return;
        if (!data?.valid) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem('formular_auth');
          sessionStorage.removeItem(CONDITIONS_KEY);
          setStatus('denied');
          return;
        }
        setStatus('allowed');
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem('formular_auth');
          sessionStorage.removeItem(CONDITIONS_KEY);
          setStatus('denied');
        }
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-bank-bg text-bank-text-muted text-sm">
        Zugang wird geprüft…
      </div>
    );
  }
  if (status === 'denied') {
    return <Navigate to="/formular" replace />;
  }
  const locked = lockedTarget();
  if (locked && !location.pathname.startsWith(locked)) {
    return <Navigate to={`${locked}/vertrag`} replace />;
  }
  return children;
};

export default FormularProtectedRoute;
