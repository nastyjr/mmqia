import React from 'react';
import { Button } from './Button';
import { Download, Printer, ArrowLeft, Table } from 'lucide-react';

export interface ColumnDef {
  header: string;
  key: string;
  width?: string;
  isNumeric?: boolean;
}

interface GenericBookViewProps {
  title: string;
  subtitle: string;
  columns: ColumnDef[];
  data: any[];
  onBack: () => void;
}

export const GenericBookView: React.FC<GenericBookViewProps> = ({ 
  title, subtitle, columns, data, onBack 
}) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={onBack}>
                <ArrowLeft size={16} className="mr-2" /> Volver
            </Button>
            <Button variant="secondary">
                <Printer size={16} className="mr-2" /> Imprimir
            </Button>
            <Button>
                <Download size={16} className="mr-2" /> Exportar Excel (CSV)
            </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow flex flex-col">
        {/* Table Toolbar */}
        <div className="bg-slate-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Table size={14} />
                <span className="font-semibold uppercase">Vista Preliminar - Formato Legal SII</span>
            </div>
            <div className="text-xs text-slate-400">
                Mostrando {data.length} registros
            </div>
        </div>

        <div className="overflow-auto flex-grow">
          <table className="min-w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                {columns.map((col, idx) => (
                  <th 
                    key={idx}
                    className={`px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 ${col.isNumeric ? 'text-right' : ''}`}
                    style={{ minWidth: col.width || '100px' }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                    <td colSpan={columns.length} className="px-6 py-20 text-center text-gray-400 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center">
                            <Table className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="font-medium">Sin movimientos en este periodo</p>
                            <p className="text-xs mt-1">Los datos aparecerán aquí automáticamente según los asientos ingresados.</p>
                        </div>
                    </td>
                </tr>
              ) : (
                data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col, cIdx) => (
                      <td 
                        key={cIdx} 
                        className={`px-4 py-3 whitespace-nowrap text-xs text-gray-700 border-r border-slate-100 ${col.isNumeric ? 'text-right font-mono' : ''}`}
                      >
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
