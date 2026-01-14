import React, { useState } from 'react';
import { usePayroll } from '../context/PayrollContext';
import { Employee, ContractDetails } from '../types/payroll';
import { Users, Plus, UserPlus, Search, Edit2, Trash2, X, Save, Building, FileText, CheckCircle2, Settings2 } from 'lucide-react';

const INITIAL_CONTRACT: ContractDetails = {
    startDate: new Date().toISOString().split('T')[0],
    type: 'INDEFINIDO',
    position: 'Administrativo',
    baseSalary: 500000,
    gratificationLegal: true,
    colacion: 50000,
    movilizacion: 50000,
    afp: 'MODELO',
    healthSystem: 'FONASA',
    afcWorker: true
};

import { PayrollBatchRunner } from './PayrollBatchRunner';

export const EmployeeManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { employees, addEmployee, updateEmployee, deleteEmployee } = usePayroll();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'LIST' | 'BATCH'>('LIST');

    // Form State
    const [formData, setFormData] = useState<Partial<Employee>>({ isActive: true });
    const [contractData, setContractData] = useState<ContractDetails>(INITIAL_CONTRACT);

    if (viewMode === 'BATCH') {
        return <PayrollBatchRunner onBack={() => setViewMode('LIST')} />;
    }

    const filteredEmployees = employees.filter(e =>
        e.names.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.rut.includes(searchTerm)
    );

    const handleOpenModal = (employee?: Employee) => {
        if (employee) {
            setEditingId(employee.id);
            setFormData(employee);
            setContractData(employee.contract);
        } else {
            setEditingId(null);
            setFormData({ isActive: true });
            setContractData(INITIAL_CONTRACT);
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.names || !formData.rut || !formData.fatherName) {
            alert("Por favor complete los campos obligatorios (Nombre, RUT)");
            return;
        }

        const employee: Employee = {
            id: editingId || crypto.randomUUID(),
            rut: formData.rut || '',
            names: formData.names || '',
            fatherName: formData.fatherName || '',
            motherName: formData.motherName || '',
            email: formData.email || '',
            phone: formData.phone || '',
            address: formData.address || '',
            isActive: formData.isActive || true,
            createdAt: editingId ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString(),
            contract: contractData
        };

        if (editingId) {
            updateEmployee(editingId, employee);
        } else {
            addEmployee(employee);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-blue-600" /> Ficha de Colaboradores
                    </h1>
                    <p className="text-slate-500">Gestione la información contractual de su equipo</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setViewMode('BATCH')}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-colors shadow-lg"
                    >
                        <Settings2 size={18} /> Procesar Nómina Masiva
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <UserPlus size={18} /> Nuevo Colaborador
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Search Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por Nombre o RUT..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="mt-4 text-xs text-slate-500 font-medium uppercase tracking-wider">
                            {filteredEmployees.length} Colaboradores encontrados
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-9">
                    {filteredEmployees.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
                            <Users className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-slate-600">No hay colaboradores registrados</h3>
                            <p className="text-slate-400 text-sm mb-6">Comience agregando a su primer empleado</p>
                            <button onClick={() => handleOpenModal()} className="text-blue-600 font-bold hover:underline">
                                Agregar ahora
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredEmployees.map(emp => (
                                <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                                            {emp.names.charAt(0)}{emp.fatherName.charAt(0)}
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${emp.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {emp.isActive ? 'ACTIVO' : 'INACTIVO'}
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-slate-800 truncate">{emp.names} {emp.fatherName}</h3>
                                    <p className="text-xs text-slate-500 font-mono mb-4">{emp.rut}</p>

                                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                                        <div className="flex justify-between">
                                            <span>Cargo:</span>
                                            <span className="font-semibold">{emp.contract.position}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Sueldo Base:</span>
                                            <span className="font-semibold text-slate-800">${emp.contract.baseSalary.toLocaleString('es-CL')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>AFP/Salud:</span>
                                            <span>{emp.contract.afp} / {emp.contract.healthSystem}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(emp)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1">
                                            <Edit2 size={12} /> Editar
                                        </button>
                                        <button onClick={() => { if (confirm('¿Seguro?')) deleteEmployee(emp.id) }} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {editingId ? <Edit2 className="text-blue-500" /> : <Plus className="text-blue-500" />}
                                {editingId ? 'Editar Colaborador' : 'Nuevo Colaborador'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-2">
                                    <Users size={18} /> Información Personal
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="label-text">RUT</label>
                                        <input type="text" value={formData.rut || ''} onChange={e => setFormData({ ...formData, rut: e.target.value })} className="input-std w-full" placeholder="12.345.678-9" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label-text">Nombres</label>
                                        <input type="text" value={formData.names || ''} onChange={e => setFormData({ ...formData, names: e.target.value })} className="input-std w-full" />
                                    </div>
                                    <div>
                                        <label className="label-text">Apellido Paterno</label>
                                        <input type="text" value={formData.fatherName || ''} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} className="input-std w-full" />
                                    </div>
                                    <div>
                                        <label className="label-text">Apellido Materno</label>
                                        <input type="text" value={formData.motherName || ''} onChange={e => setFormData({ ...formData, motherName: e.target.value })} className="input-std w-full" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label-text">Email</label>
                                        <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-std w-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Contract Info */}
                            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-2 border-slate-200">
                                    <FileText size={18} /> Datos Contractuales
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-text">Cargo</label>
                                        <input type="text" value={contractData.position} onChange={e => setContractData({ ...contractData, position: e.target.value })} className="input-std w-full" />
                                    </div>
                                    <div>
                                        <label className="label-text">Tipo Contrato</label>
                                        <select value={contractData.type} onChange={e => setContractData({ ...contractData, type: e.target.value as any })} className="input-std w-full">
                                            <option value="INDEFINIDO">Indefinido</option>
                                            <option value="PLAZO_FIJO">Plazo Fijo</option>
                                            <option value="POR_OBRA">Por Obra</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label-text">Sueldo Base</label>
                                        <input type="number" value={contractData.baseSalary} onChange={e => setContractData({ ...contractData, baseSalary: Number(e.target.value) })} className="input-std w-full font-bold text-lg" />
                                    </div>

                                    <div>
                                        <label className="label-text">AFP</label>
                                        <select value={contractData.afp} onChange={e => setContractData({ ...contractData, afp: e.target.value })} className="input-std w-full">
                                            {['CAPITAL', 'CUPRUM', 'HABITAT', 'MODELO', 'PLANVITAL', 'PROVIDA', 'UNO'].map(afp => (
                                                <option key={afp} value={afp}>{afp}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-text">Salud</label>
                                        <select value={contractData.healthSystem} onChange={e => setContractData({ ...contractData, healthSystem: e.target.value as any })} className="input-std w-full">
                                            <option value="FONASA">FONASA</option>
                                            <option value="ISAPRE">ISAPRE</option>
                                        </select>
                                    </div>

                                    {contractData.healthSystem === 'ISAPRE' && (
                                        <div className="col-span-2 animate-in fade-in">
                                            <label className="label-text">Monto Pactado en Pesos (Aprox)</label>
                                            <input type="number" value={contractData.isapreAmount || 0} onChange={e => setContractData({ ...contractData, isapreAmount: Number(e.target.value) })} className="input-std w-full" />
                                        </div>
                                    )}

                                    <div className="col-span-2 flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            checked={contractData.gratificationLegal}
                                            onChange={e => setContractData({ ...contractData, gratificationLegal: e.target.checked })}
                                            id="grat"
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <label htmlFor="grat" className="text-sm text-slate-700">Incluir Gratificación Legal (Tope 4.75 IMM)</label>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                                Guardar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .label-text {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    margin-bottom: 0.25rem;
                }
                .input-std {
                    width: 100%;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-std:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
            `}</style>
        </div>
    );
};
