import React from 'react';
import { Button } from './Button';
import { Printer, Save, AlertCircle, FileText } from 'lucide-react';

interface TaxFormPlaceholderProps {
  title: string;
  formNumber: string;
  description: string;
  onBack: () => void;
  year?: number;
}

export const TaxFormPlaceholder: React.FC<TaxFormPlaceholderProps> = ({ 
  title, 
  formNumber, 
  description, 
  onBack,
  year = new Date().getFullYear() 
}) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Formulario {formNumber}
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-200 uppercase">Borrador</span>
          </h2>
          <p className="text-gray-500">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack}>Volver</Button>
          <Button variant="secondary" disabled><Printer size={16} className="mr-2" /> Imprimir</Button>
          <Button disabled><Save size={16} className="mr-2" /> Enviar al SII</Button>
        </div>
      </div>

      {/* Form Simulation Container */}
      <div className="flex-grow bg-slate-100 rounded-xl border border-slate-300 p-6 overflow-auto shadow-inner flex justify-center">
        <div className="max-w-4xl w-full bg-white shadow-2xl min-h-[600px] relative flex flex-col">
          
          {/* Official Header Look */}
          <div className="border-b-2 border-black p-4 bg-gray-50">
            <div className="flex justify-between items-end mb-2">
              <h1 className="text-2xl font-extrabold tracking-tighter uppercase">Formulario {formNumber}</h1>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Versión Internet</div>
                <div className="text-xl font-bold font-mono">A.T. {year}</div>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-0 border border-black text-center text-xs">
              <div className="col-span-3 border-r border-black p-1 bg-gray-200 font-bold">ROL UNICO TRIBUTARIO</div>
              <div className="col-span-9 p-1 font-mono text-lg tracking-widest bg-white">76.123.456-7</div>
            </div>
          </div>

          {/* Placeholder Content */}
          <div className="p-12 flex flex-col items-center justify-center flex-grow text-center">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                 <FileText className="w-10 h-10 text-gray-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
             <p className="text-gray-500 max-w-md mb-8">
               El módulo para la generación automática de este formulario está habilitado visualmente. Los cálculos automáticos basados en la contabilidad se desplegarán aquí.
             </p>
             
             {/* Fake Form Lines */}
             <div className="w-full max-w-2xl border border-gray-200 rounded-lg overflow-hidden opacity-50 bg-white">
                {[1,2,3,4,5].map((i) => (
                   <div key={i} className="flex border-b border-gray-100 last:border-0 h-10">
                      <div className="w-16 bg-gray-50 border-r border-gray-200 p-2"></div>
                      <div className="flex-grow p-2"></div>
                      <div className="w-32 border-l border-gray-200 p-2 bg-gray-50"></div>
                   </div>
                ))}
             </div>
          </div>
          
          <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs text-gray-400 text-center">
             Documento no válido para declaración oficial hasta completar validación de datos.
          </div>
        </div>
      </div>
    </div>
  );
};