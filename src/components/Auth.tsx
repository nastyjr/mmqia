import React, { useState } from 'react';
import { Button } from './Button';
import { User } from '../types';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Chrome } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Login con Google
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redirige de vuelta a la app
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Login / Registro con Email
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (view === 'login') {
        // --- INICIAR SESIÓN ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        // App.tsx detectará el cambio de sesión automáticamente
      } else {
        // --- REGISTRARSE ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        // Si la confirmación de email está DESACTIVADA en Supabase, data.session existirá.
        if (data.session) {
           // Login automático, App.tsx lo detectará
        } else {
           // Si por alguna razón el backend aún pide confirmación, mostramos éxito simple
           setSuccessMsg('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
           setView('login');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-xl shadow-lg mb-4">
            <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          ContaSmart AI
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Software Contable Inteligente & ERP
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 border border-slate-100 sm:rounded-xl sm:px-10">
          
          {/* Título del Formulario */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {view === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta gratis'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'login' ? 'Ingresa tus credenciales para acceder.' : 'Comienza a gestionar tu contabilidad hoy.'}
            </p>
          </div>

          {/* Botón Google */}
          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Chrome className="h-5 w-5 text-red-500 mr-2" />
              <span>Continuar con Google</span>
            </button>
          </div>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 uppercase font-medium text-xs">O con correo</span>
            </div>
          </div>

          {/* Formulario Email */}
          <form className="space-y-5 mt-6" onSubmit={handleSubmit}>
            
            {view === 'register' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={view === 'register'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {view === 'register' && (
                  <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres.</p>
              )}
            </div>

            {/* Mensajes de Error y Éxito */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {successMsg && (
              <div className="rounded-lg bg-green-50 p-3 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-green-700">{successMsg}</p>
              </div>
            )}

            <Button type="submit" className="w-full flex justify-center py-2.5 rounded-lg" isLoading={isLoading}>
              {view === 'login' ? 'Iniciar Sesión' : 'Registrarse'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {view === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              {' '}
              <button
                onClick={() => {
                    setView(view === 'login' ? 'register' : 'login');
                    setError('');
                    setSuccessMsg('');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                {view === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};