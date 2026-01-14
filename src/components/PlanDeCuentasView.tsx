import React from 'react';
import { Account } from '../types';
import { ChevronRight, FileDigit } from 'lucide-react';

interface PlanDeCuentasViewProps {
  accounts: Account[];
}

export const PlanDeCuentasView: React.FC<PlanDeCuentasViewProps> = ({ accounts }) => {
  return (
    <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Plan de Cuentas IFRS</h2>
                <p className="text-gray-500">Nomenclatura contable estándar (Normativa Chilena)</p>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de la Cuenta</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Clasificación</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {accounts.sort((a,b) => a.code.localeCompare(b.code)).map((account) => (
                            <tr key={account.code} className={`hover:bg-slate-50 ${account.level === 1 ? 'bg-slate-50' : ''}`}>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 font-mono font-medium">
                                    {account.code}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        {account.level > 1 && <span className="w-4 h-px bg-slate-300 mr-2 ml-1"></span>}
                                        {account.level > 2 && <span className="w-4 h-px bg-slate-300 mr-2"></span>}
                                        <span className={`text-sm ${
                                            account.level === 1 ? 'font-bold text-slate-900' : 
                                            account.level === 2 ? 'font-semibold text-slate-800' : 
                                            'text-slate-600'
                                        }`}>
                                            {account.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500">
                                    {account.level === 3 ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                            Imputable
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400">Agrupador</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        account.type === 'Activo' ? 'bg-emerald-100 text-emerald-800' :
                                        account.type === 'Pasivo' ? 'bg-red-100 text-red-800' :
                                        account.type === 'Patrimonio' ? 'bg-blue-100 text-blue-800' :
                                        account.type === 'Ingresos' ? 'bg-teal-100 text-teal-800' :
                                        'bg-orange-100 text-orange-800'
                                    }`}>
                                        {account.type.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};