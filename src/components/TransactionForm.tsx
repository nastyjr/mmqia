import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, CATEGORIES } from '../types';
import { Button } from './Button';
import { suggestCategory } from '../services/geminiService';
import { Wand2, X } from 'lucide-react';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  initialData?: Transaction;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData 
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('egreso');
  const [category, setCategory] = useState(CATEGORIES[3]); // Default to 'Comida'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDescription(initialData.description);
        setAmount(initialData.amount.toString());
        setType(initialData.type);
        setCategory(initialData.category);
        setDate(initialData.date);
      } else {
        setDescription('');
        setAmount('');
        setType('egreso');
        setCategory(CATEGORIES[3]);
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description,
      amount: parseFloat(amount),
      type,
      category,
      date
    });
    onClose();
  };

  const handleSuggestCategory = async () => {
    if (!description) return;
    setIsSuggesting(true);
    const suggested = await suggestCategory(description);
    if (suggested && CATEGORIES.includes(suggested)) {
      setCategory(suggested);
    }
    setIsSuggesting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {initialData ? 'Editar Transacción' : 'Nueva Transacción'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setType('ingreso')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                      type === 'ingreso' 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('egreso')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border ${
                      type === 'egreso' 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Gasto
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    id="description"
                    required
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                    placeholder="Ej. Cena con clientes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-1 flex items-center">
                    <button 
                      type="button" 
                      onClick={handleSuggestCategory}
                      disabled={!description || isSuggesting}
                      className="text-indigo-600 hover:text-indigo-800 p-1 disabled:opacity-50"
                      title="Autocompletar categoría con IA"
                    >
                      <Wand2 size={16} className={isSuggesting ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Usa el ícono de varita mágica para detectar la categoría automáticamente.</p>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    step="0.01"
                    min="0"
                    required
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                  <select
                    id="category"
                    name="category"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    required
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 border px-3"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <Button type="submit" className="w-full sm:col-start-2">
                  Guardar
                </Button>
                <Button type="button" variant="secondary" onClick={onClose} className="mt-3 w-full sm:mt-0 sm:col-start-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};