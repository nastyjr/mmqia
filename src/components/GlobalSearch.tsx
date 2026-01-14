import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Package, Users, Calendar, X, ArrowRight } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';

interface SearchResult {
    type: 'entry' | 'product' | 'customer' | 'supplier';
    id: string;
    title: string;
    subtitle: string;
    date?: string;
    amount?: number;
    icon: React.ReactNode;
}

export const GlobalSearch: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: string, id?: string) => void;
}> = ({ isOpen, onClose, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const { journalEntries } = useAccounting();

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        // Search in Journal Entries
        journalEntries.forEach(entry => {
            const matchesGloss = entry.gloss?.toLowerCase().includes(lowerQuery);
            const matchesDate = entry.date.includes(query);
            const matchesId = entry.id.toLowerCase().includes(lowerQuery);

            if (matchesGloss || matchesDate || matchesId) {
                const total = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                searchResults.push({
                    type: 'entry',
                    id: entry.id,
                    title: entry.gloss || 'Sin glosa',
                    subtitle: `Asiento ${entry.id.slice(0, 8)}`,
                    date: entry.date,
                    amount: total,
                    icon: <FileText size={16} className="text-blue-600" />
                });
            }
        });

        // Search in Products (from localStorage)
        try {
            const productsData = localStorage.getItem('inventory_products');
            if (productsData) {
                const products = JSON.parse(productsData);
                products.forEach((product: any) => {
                    const matchesName = product.name?.toLowerCase().includes(lowerQuery);
                    const matchesSku = product.sku?.toLowerCase().includes(lowerQuery);

                    if (matchesName || matchesSku) {
                        searchResults.push({
                            type: 'product',
                            id: product.id,
                            title: product.name,
                            subtitle: `SKU: ${product.sku} | Stock: ${product.currentStock}`,
                            amount: product.weightedAverageCost,
                            icon: <Package size={16} className="text-emerald-600" />
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Error searching products:', e);
        }

        // Search in Third Parties (CRM)
        try {
            const partiesData = localStorage.getItem('crm_third_parties');
            if (partiesData) {
                const parties = JSON.parse(partiesData);
                parties.forEach((party: any) => {
                    const matchesRut = party.rut?.includes(query);
                    const matchesName = party.name?.toLowerCase().includes(lowerQuery);

                    if (matchesRut || matchesName) {
                        searchResults.push({
                            type: party.type === 'CUSTOMER' ? 'customer' : 'supplier',
                            id: party.id,
                            title: party.name,
                            subtitle: `RUT: ${party.rut}`,
                            icon: <Users size={16} className="text-purple-600" />
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Error searching third parties:', e);
        }

        setResults(searchResults.slice(0, 20)); // Limit to 20 results
        setSelectedIndex(0);
    }, [query, journalEntries]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleSelect = (result: SearchResult) => {
        // Navigate based on result type
        if (result.type === 'entry') {
            onNavigate('LIBRO_DIARIO');
        } else if (result.type === 'product') {
            onNavigate('INVENTORY');
        } else if (result.type === 'customer' || result.type === 'supplier') {
            onNavigate('CRM');
        }
        onClose();
    };

    if (!isOpen) return null;

    const groupedResults = {
        entries: results.filter(r => r.type === 'entry'),
        products: results.filter(r => r.type === 'product'),
        parties: results.filter(r => r.type === 'customer' || r.type === 'supplier')
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-32 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
                {/* Search Input */}
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Search className="text-slate-400" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar por RUT, Glosa, Producto, SKU, Fecha..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-grow outline-none text-slate-800 placeholder:text-slate-400"
                        />
                        <kbd className="px-2 py-1 text-xs bg-slate-100 border border-slate-300 rounded text-slate-600">
                            ESC
                        </kbd>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {query && results.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            <Search size={48} className="mx-auto mb-3 opacity-50" />
                            <p>No se encontraron resultados para "{query}"</p>
                        </div>
                    )}

                    {!query && (
                        <div className="p-8 text-center text-slate-400">
                            <Search size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="mb-2">Buscar en todo el sistema</p>
                            <p className="text-xs">Asientos, Productos, Clientes, Proveedores</p>
                        </div>
                    )}

                    {/* Journal Entries */}
                    {groupedResults.entries.length > 0 && (
                        <div className="border-b border-slate-100">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                Asientos Contables ({groupedResults.entries.length})
                            </div>
                            {groupedResults.entries.map((result, idx) => {
                                const globalIdx = results.indexOf(result);
                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors ${selectedIndex === globalIdx ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                            }`}
                                    >
                                        {result.icon}
                                        <div className="flex-grow text-left">
                                            <p className="text-sm font-medium text-slate-800">{result.title}</p>
                                            <p className="text-xs text-slate-500">{result.subtitle} • {result.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-700">{formatCLP(result.amount || 0)}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Products */}
                    {groupedResults.products.length > 0 && (
                        <div className="border-b border-slate-100">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                Productos ({groupedResults.products.length})
                            </div>
                            {groupedResults.products.map((result) => {
                                const globalIdx = results.indexOf(result);
                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors ${selectedIndex === globalIdx ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                                            }`}
                                    >
                                        {result.icon}
                                        <div className="flex-grow text-left">
                                            <p className="text-sm font-medium text-slate-800">{result.title}</p>
                                            <p className="text-xs text-slate-500">{result.subtitle}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-600">PMP: {formatCLP(result.amount || 0)}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Third Parties */}
                    {groupedResults.parties.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                Terceros ({groupedResults.parties.length})
                            </div>
                            {groupedResults.parties.map((result) => {
                                const globalIdx = results.indexOf(result);
                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors ${selectedIndex === globalIdx ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                                            }`}
                                    >
                                        {result.icon}
                                        <div className="flex-grow text-left">
                                            <p className="text-sm font-medium text-slate-800">{result.title}</p>
                                            <p className="text-xs text-slate-500">{result.subtitle}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Hint */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex gap-4">
                        <span><kbd className="px-1 bg-white border border-slate-300 rounded">↑↓</kbd> Navegar</span>
                        <span><kbd className="px-1 bg-white border border-slate-300 rounded">Enter</kbd> Abrir</span>
                    </div>
                    <span>{results.length} resultado(s)</span>
                </div>
            </div>
        </div>
    );
};
