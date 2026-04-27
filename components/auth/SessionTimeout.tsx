'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {createClient} from '@/lib/supabase/client';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {logAutoLogout} from '@/lib/actions/auth';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT = 1 * 60 * 1000; // 1 minute warning

export function SessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const {data: {session}} = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    
    checkSession();
    
    const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
      setHasSession(!!session);
      if (event === 'SIGNED_OUT') {
        setShowWarning(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    
    try {
      // Log the event before signing out
      await logAutoLogout();
      
      // Perform the logout
      await supabase.auth.signOut();
      
      // Redirect to login
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowWarning(false);
    }
  }, [supabase.auth, router, isLoggingOut]);

  const resetTimers = useCallback(() => {
    if (!hasSession || showWarning || isLoggingOut) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_TIMEOUT);

    // Set absolute timeout timer
    timerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout, showWarning, isLoggingOut, hasSession]);

  useEffect(() => {
    if (!hasSession) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimers();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetTimers();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [resetTimers]);

  return (
    <ConfirmDialog
      open={showWarning}
      title={t('session_timeout_title')}
      description={t('session_timeout_description')}
      confirmLabel={isLoggingOut ? t('logging_out') : t('stay_logged_in')}
      cancelLabel={t('logging_out')}
      onConfirm={() => {
        setShowWarning(false);
        resetTimers();
      }}
      onCancel={logout}
    />
  );
}
