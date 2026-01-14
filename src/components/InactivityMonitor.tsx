import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from './Button';

interface InactivityMonitorProps {
  timeoutMinutes?: number;
}

export const InactivityMonitor: React.FC<InactivityMonitorProps> = ({ timeoutMinutes = 5 }) => {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isIdle) return; // Don't auto-reset if already locked

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    resetTimer(); // Start timer

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isIdle, timeoutMinutes]);

  if (!isIdle) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 bg-opacity-95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-amber-500">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 mb-6">
           <AlertTriangle className="h-10 w-10 text-amber-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sesión en Espera</h2>
        <p className="text-gray-500 mb-8">
          Hemos detectado inactividad por más de {timeoutMinutes} minutos. 
          Por seguridad de la información contable, se ha pausado la pantalla.
        </p>

        <Button 
          onClick={() => { setIsIdle(false); resetTimer(); }} 
          className="w-full py-3 text-lg"
        >
          <Lock className="mr-2 h-5 w-5" /> Reanudar Trabajo
        </Button>
      </div>
    </div>
  );
};