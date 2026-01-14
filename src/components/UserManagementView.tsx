import React, { useState, useEffect } from 'react';
import { UserWithRole, Role, ROLE_DEFINITIONS, Permission } from '../types/roles';
import { ArrowLeft, Plus, Search, Shield, User, Check, X, UserCog, Lock, Unlock, Settings, Trash2, Edit } from 'lucide-react';
import { Button } from './Button';

interface UserManagementViewProps {
    onBack: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ onBack }) => {
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'VIEWER' as Role
    });

    // Load users
    useEffect(() => {
        const savedUsers = localStorage.getItem('system_users');
        if (savedUsers) {
            setUsers(JSON.parse(savedUsers));
        } else {
            // Create default admin
            const defaultAdmin: UserWithRole = {
                id: crypto.randomUUID(),
                username: 'admin',
                email: 'admin@empresa.cl',
                role: 'ADMIN',
                isActive: true,
                createdAt: new Date().toISOString()
            };
            setUsers([defaultAdmin]);
            localStorage.setItem('system_users', JSON.stringify([defaultAdmin]));
        }
    }, []);

    // Save users
    useEffect(() => {
        if (users.length > 0) {
            localStorage.setItem('system_users', JSON.stringify(users));
        }
    }, [users]);

    const handleSaveUser = () => {
        if (!formData.username || !formData.email) {
            alert('Complete todos los campos');
            return;
        }

        if (selectedUser) {
            // Edit existing
            const updated = users.map(u =>
                u.id === selectedUser.id ? { ...u, ...formData } : u
            );
            setUsers(updated);
            alert('Usuario actualizado');
        } else {
            // Create new
            const newUser: UserWithRole = {
                id: crypto.randomUUID(),
                username: formData.username,
                email: formData.email,
                role: formData.role,
                isActive: true,
                createdAt: new Date().toISOString()
            };
            setUsers([...users, newUser]);
            alert(`Usuario ${formData.username} creado`);
        }

        setFormData({ username: '', email: '', password: '', role: 'VIEWER' });
        setSelectedUser(null);
        setIsFormOpen(false);
    };

    const handleToggleActive = (user: UserWithRole) => {
        const updated = users.map(u =>
            u.id === user.id ? { ...u, isActive: !u.isActive } : u
        );
        setUsers(updated);
    };

    const handleDeleteUser = (user: UserWithRole) => {
        if (user.role === 'ADMIN' && users.filter(u => u.role === 'ADMIN').length === 1) {
            alert('No puedes eliminar el único administrador');
            return;
        }
        if (!confirm(`¿Eliminar usuario ${user.username}?`)) return;
        setUsers(users.filter(u => u.id !== user.id));
    };

    const handleEditUser = (user: UserWithRole) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role
        });
        setIsFormOpen(true);
    };

    const getRoleBadge = (role: Role) => {
        const styles: Record<Role, string> = {
            ADMIN: 'bg-purple-100 text-purple-700',
            ACCOUNTANT: 'bg-blue-100 text-blue-700',
            SALESPERSON: 'bg-emerald-100 text-emerald-700',
            VIEWER: 'bg-slate-100 text-slate-700'
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[role]}`}>{ROLE_DEFINITIONS[role].name}</span>;
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Shield className="text-purple-600" /> Gestión de Usuarios
                        </h1>
                        <p className="text-slate-500 text-sm">Roles y permisos de acceso</p>
                    </div>
                </div>
                <Button onClick={() => { setSelectedUser(null); setFormData({ username: '', email: '', password: '', role: 'VIEWER' }); setIsFormOpen(true); }}>
                    <Plus size={16} className="mr-2" /> Nuevo Usuario
                </Button>
            </div>

            {/* Role Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {(Object.entries(ROLE_DEFINITIONS) as [Role, typeof ROLE_DEFINITIONS['ADMIN']][]).map(([role, def]) => (
                    <div key={role} className={`rounded-xl p-4 border-2 ${role === 'ADMIN' ? 'bg-purple-50 border-purple-200' :
                            role === 'ACCOUNTANT' ? 'bg-blue-50 border-blue-200' :
                                role === 'SALESPERSON' ? 'bg-emerald-50 border-emerald-200' :
                                    'bg-slate-50 border-slate-200'
                        }`}>
                        <p className="font-bold text-slate-800">{def.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{def.description}</p>
                        <p className="text-xs text-slate-400 mt-2">{def.permissions.length} permisos</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Usuario</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Rol</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Creado</th>
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                <User size={40} className="mx-auto mb-2 opacity-50" />
                                No hay usuarios registrados
                            </td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className={`hover:bg-slate-50 ${!user.isActive ? 'opacity-50' : ''}`}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                            <User size={16} className="text-slate-600" />
                                        </div>
                                        <span className="font-medium text-slate-700">{user.username}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                                <td className="px-4 py-3">
                                    {user.isActive ? (
                                        <span className="text-emerald-600 flex items-center gap-1"><Unlock size={14} /> Activo</span>
                                    ) : (
                                        <span className="text-rose-600 flex items-center gap-1"><Lock size={14} /> Inactivo</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">
                                    {new Date(user.createdAt).toLocaleDateString('es-CL')}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditUser(user)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={user.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}
                                        >
                                            {user.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                                        </button>
                                        {user.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="text-rose-500 hover:text-rose-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* New/Edit User Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <UserCog className="text-purple-600" />
                            {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre de Usuario *</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Email *</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {!selectedUser && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                                    <input
                                        type="password"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Rol</label>
                                <select
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                                >
                                    {(Object.entries(ROLE_DEFINITIONS) as [Role, typeof ROLE_DEFINITIONS['ADMIN']][]).map(([role, def]) => (
                                        <option key={role} value={role}>{def.name} - {def.description}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Permission Preview */}
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Permisos del rol:</p>
                                <div className="flex flex-wrap gap-1">
                                    {ROLE_DEFINITIONS[formData.role].permissions.map(perm => (
                                        <span key={perm} className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                            {perm}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveUser}>
                                {selectedUser ? 'Guardar Cambios' : 'Crear Usuario'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
