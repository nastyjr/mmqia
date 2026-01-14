import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Building2 } from 'lucide-react';
import { Button } from './Button';

export const Login: React.FC<{ onOfflineMode?: () => void }> = ({ onOfflineMode }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyRut, setCompanyRut] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!supabase) {
            setError('Supabase no está configurado. Usa el modo offline.');
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                // Sign Up
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            company_name: companyName,
                            company_rut: companyRut
                        }
                    }
                });

                if (authError) throw authError;

                if (authData.user) {
                    // Create company
                    const { data: companyData, error: companyError } = await supabase
                        .from('companies')
                        .insert({
                            name: companyName,
                            rut: companyRut,
                            email: email
                        })
                        .select()
                        .single();

                    if (companyError) throw companyError;

                    // Link user to company as admin
                    const { error: linkError } = await supabase
                        .from('company_users')
                        .insert({
                            user_id: authData.user.id,
                            company_id: companyData.id,
                            role: 'admin'
                        });

                    if (linkError) throw linkError;

                    alert('✅ Cuenta creada! Por favor verifica tu email.');
                }
            } else {
                // Sign In
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    // If Supabase is not configured, show offline mode option
    if (!supabase) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <Building2 className="text-blue-600" size={40} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">ERP Contabilidad Pro</h1>
                        <p className="text-gray-600">Modo Sin Conexión</p>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-amber-800">
                            ⚠️ Supabase no está configurado. Todos los datos se guardarán localmente en tu navegador.
                        </p>
                    </div>

                    <Button
                        onClick={onOfflineMode}
                        className="w-full"
                    >
                        Continuar en Modo Offline
                    </Button>

                    <div className="mt-4 text-center text-sm text-gray-600">
                        <p>Para habilitar multi-usuario:</p>
                        <ol className="text-left mt-2 ml-6 list-decimal text-xs">
                            <li>Crea un proyecto en supabase.com</li>
                            <li>Copia .env.example a .env</li>
                            <li>Agrega tus credenciales de Supabase</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Building2 className="text-blue-600" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </h1>
                    <p className="text-gray-600">ERP Contabilidad Pro - Multi-usuario</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de la Empresa
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Mi Empresa SPA"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    RUT de la Empresa
                                </label>
                                <input
                                    type="text"
                                    value={companyRut}
                                    onChange={e => setCompanyRut(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="76.123.456-7"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? (
                            <span>Procesando...</span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                                {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                            </span>
                        )}
                    </Button>
                </form>

                {/* Toggle Sign Up / Sign In */}
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                    >
                        {isSignUp
                            ? '¿Ya tienes cuenta? Inicia sesión'
                            : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>

                {/* Offline Mode Option */}
                {onOfflineMode && (
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={onOfflineMode}
                            className="text-gray-500 hover:text-gray-700 text-sm hover:underline"
                        >
                            o continuar en modo offline
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
