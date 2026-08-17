import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'formular_session_id';

const FormularProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        if (!cancelled) setStatus('denied');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('formular_session_is_valid', {
          p_session_id: sessionId,
        });
        if (cancelled) return;
        if (error || !data) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem('formular_auth');
          setStatus('denied');
          return;
        }
        setStatus('allowed');
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem('formular_auth');
          setStatus('denied');
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
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

  return children;
};

export default FormularProtectedRoute;
