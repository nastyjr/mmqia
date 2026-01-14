import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ThirdParty, ThirdPartyType } from '../types/crm';
import { ArrowLeft, Plus, Search, Users, Building2, Briefcase, Phone, Mail, MapPin, Receipt, Wallet } from 'lucide-react';
import { Button } from './Button';
import { thirdPartiesService } from '../services/databaseService';

export const CRMView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [directory, setDirectory] = useState<ThirdParty[]>([]);

    const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'CURRENT_ACCOUNT'>('DIRECTORY');
    const [selectedRut, setSelectedRut] = useState<string | null>(null);

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newContact, setNewContact] = useState<Partial<ThirdParty>>({
        rut: '', name: '', type: 'CLIENTE', email: '', phone: '', address: ''
    });

    // Persistence
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await thirdPartiesService.getAll();
            setDirectory(data as ThirdParty[]);
        } catch (error) {
            console.error('Error loading CRM data:', error);
        }
    };

    // Logic
    const handleSaveContact = async () => {
        if (!newContact.rut || !newContact.name) return;

        try {
            const contactData = {
                rut: newContact.rut!,
                name: newContact.name!,
                type: (newContact.type || 'CLIENTE') as 'CLIENTE' | 'PROVEEDOR' | 'AMBOS',
                email: newContact.email,
                phone: newContact.phone,
                address: newContact.address,
                giro: newContact.giro,
                payment_terms: 30 // Default
            };

            await thirdPartiesService.create(contactData);

            // Reload to get the ID from DB
            loadData();

            setIsFormOpen(false);
            setNewContact({ rut: '', name: '', type: 'CLIENTE', email: '', phone: '', address: '' });
        } catch (error) {
            console.error('Error saving contact:', error);
            alert('Error al guardar contacto');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar contacto?')) {
            try {
                await thirdPartiesService.delete(id);
                setDirectory(directory.filter(d => d.id !== id));
            } catch (error) {
                console.error('Error deleting contact:', error);
                alert('Error al eliminar contacto');
            }
        }
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    // Filtered list
    const filteredDirectory = directory.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.rut.includes(searchTerm)
    );

    // Current Account Logic
    const getMovementsForRut = (rut: string) => {
        const movements: any[] = [];
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                // Heuristic: check line.rut or glosa
                if (line.rut === rut || entry.glosa.includes(rut)) {
                    movements.push({
                        date: entry.date,
                        glosa: entry.glosa, // Entry description
                        type: entry.type,
                        lineDesc: line.accountName, // Line account
                        debit: line.debit,
                        credit: line.credit,
                        docRef: entry.id.substring(0, 8) // Placeholder ref
                    });
                }
            });
        });
        return movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const calculateBalance = (movements: any[]) => {
        // Balance = Sum(Debits) - Sum(Credits)
        // Interpretation depends on Account Type (Asset vs Liability), but for "Cuenta Corriente" view:
        // Positive usually means "They owe us" (Receivable)
        // Negative usually means "We owe them" (Payable)
        // But strictly it's Net Debit - Net Credit.
        return movements.reduce((acc, m) => acc + m.debit - m.credit, 0);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Users className="text-indigo-600" /> Directorio y Cuentas Corrientes
                        </h1>
                        <p className="text-slate-500 text-sm">Gestión de Terceros (CRM)</p>
                    </div>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('DIRECTORY')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'DIRECTORY' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Directorio
                    </button>
                    <button
                        onClick={() => setActiveTab('CURRENT_ACCOUNT')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'CURRENT_ACCOUNT' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Cuentas Corrientes
                    </button>
                </div>
            </div>

            {activeTab === 'DIRECTORY' && (
                <>
                    <div className="flex justify-between mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por Nombre o RUT..."
                                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-80 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-2" /> Nuevo Contacto
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDirectory.map(contact => (
                            <div key={contact.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${contact.type === 'CLIENTE' ? 'bg-emerald-100 text-emerald-600' : contact.type === 'PROVEEDOR' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {contact.type === 'CLIENTE' ? <Briefcase size={20} /> : contact.type === 'PROVEEDOR' ? <Building2 size={20} /> : <Users size={20} />}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full">{contact.type}</span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1">{contact.name}</h3>
                                <p className="text-sm font-mono text-slate-500 mb-4">{contact.rut}</p>

                                <div className="space-y-2 text-sm text-slate-600">
                                    {contact.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {contact.email}</div>}
                                    {contact.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {contact.phone}</div>}
                                    {contact.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {contact.address}</div>}
                                </div>

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setSelectedRut(contact.rut); setActiveTab('CURRENT_ACCOUNT'); }} className="text-xs text-indigo-600 font-bold hover:underline mb-2 block text-right">
                                        Ver Pagos
                                    </button>
                                    <button onClick={() => handleDelete(contact.id)} className="text-xs text-red-500 font-bold hover:underline block text-right">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredDirectory.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400">
                                No se encontraron contactos.
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'CURRENT_ACCOUNT' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Selector */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit">
                        <h3 className="font-bold text-slate-700 mb-3 px-2">Seleccionar Tercero</h3>
                        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                            {directory.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setSelectedRut(d.rut)}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex justify-between items-center ${selectedRut === d.rut ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <span className="truncate">{d.name}</span>
                                    <span className={`text-[9px] uppercase px-1 rounded ${d.type === 'CLIENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.type.substring(0, 3)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ledger View */}
                    <div className="lg:col-span-3">
                        {selectedRut ? (
                            (() => {
                                const movements = getMovementsForRut(selectedRut);
                                const balance = calculateBalance(movements);
                                const contact = directory.find(d => d.rut === selectedRut);

                                return (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
                                        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-lg font-bold text-slate-800">{contact?.name || selectedRut}</h2>
                                                    <p className="text-slate-500 font-mono text-xs">RUT: {selectedRut}</p>
                                                </div>
                                                <div className={`px-4 py-2 rounded-xl text-right ${balance > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : balance < 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>
                                                    <p className="text-[10px] font-bold uppercase opacity-70">Saldo Cuenta Corriente</p>
                                                    <p className="text-xl font-bold">{formatCLP(Math.abs(balance))} {balance > 0 ? '(A Favor)' : balance < 0 ? '(En Contra)' : '(Saldado)'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto flex-grow">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-2 w-24">Fecha</th>
                                                        <th className="px-4 py-2">Documento / Glosa</th>
                                                        <th className="px-4 py-2 text-right">Debe (Cargos)</th>
                                                        <th className="px-4 py-2 text-right">Haber (Abonos)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {movements.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                                No hay movimientos contables registrados con este RUT.
                                                            </td>
                                                        </tr>
                                                    ) : movements.map((m, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="px-4 py-2 text-slate-500">{m.date}</td>
                                                            <td className="px-4 py-2">
                                                                <div className="font-bold text-slate-700">{m.glosa}</div>
                                                                <div className="text-[10px] text-slate-400">{m.lineDesc}</div>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-mono text-slate-600">{m.debit > 0 ? formatCLP(m.debit) : '-'}</td>
                                                            <td className="px-4 py-2 text-right font-mono text-slate-600">{m.credit > 0 ? formatCLP(m.credit) : '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12">
                                <Wallet size={48} className="mb-4 opacity-50" />
                                <p className="font-medium">Selecciona un tercero para ver su estado de cuenta</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Contact Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Nuevo Contacto</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full border p-2 rounded text-sm" placeholder="RUT (12.345.678-9)" value={newContact.rut} onChange={e => setNewContact({ ...newContact, rut: e.target.value })} />
                                <select className="w-full border p-2 rounded text-sm" value={newContact.type} onChange={e => setNewContact({ ...newContact, type: e.target.value as ThirdPartyType })}>
                                    <option value="CLIENTE">Cliente</option>
                                    <option value="PROVEEDOR">Proveedor</option>
                                    <option value="EMPLEADO">Empleado</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                            <input className="w-full border p-2 rounded text-sm" placeholder="Razón Social / Nombre" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                            <input className="w-full border p-2 rounded text-sm" placeholder="Giro / Actividad" value={newContact.giro || ''} onChange={e => setNewContact({ ...newContact, giro: e.target.value })} />
                            <div className="border-t border-slate-100 pt-3 space-y-3">
                                <input className="w-full border p-2 rounded text-sm" placeholder="Email" value={newContact.email || ''} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                                <input className="w-full border p-2 rounded text-sm" placeholder="Teléfono" value={newContact.phone || ''} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                                <input className="w-full border p-2 rounded text-sm" placeholder="Dirección" value={newContact.address || ''} onChange={e => setNewContact({ ...newContact, address: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveContact}>Guardar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
