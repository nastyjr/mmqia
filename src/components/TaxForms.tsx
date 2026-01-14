import React from 'react';
import { Button } from './Button';
import { Printer, Save, ArrowLeft, Search } from 'lucide-react';

// --- Shared Components for SII Look & Feel ---

const SIIHeader = ({ title, formNumber, year, version }: { title: string, formNumber: string, year: number, version: string }) => (
    <div className="border-b-2 border-black p-4 bg-gray-50 mb-4">
        <div className="flex justify-between items-end mb-2">
            <h1 className="text-2xl font-extrabold tracking-tighter uppercase font-sans">{title}</h1>
            <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Versión Internet</div>
                <div className="text-xl font-bold font-mono">A.T. {year}</div>
                {version && <div className="text-[10px] text-gray-400">V {version}</div>}
            </div>
        </div>
        <div className="grid grid-cols-12 gap-0 border border-black text-center text-xs">
            <div className="col-span-3 border-r border-black p-1 bg-gray-200 font-bold uppercase">Rol Unico Tributario</div>
            <div className="col-span-6 border-r border-black p-1 bg-white font-mono text-lg tracking-widest">76.123.456-7</div>
            <div className="col-span-3 p-1 bg-gray-200 font-bold uppercase">Folio</div>
        </div>
    </div>
);

const SIISectionHeader = ({ title, sectionNumber }: { title: string, sectionNumber?: string }) => (
    <div className="bg-[#003366] text-white px-2 py-1 text-[11px] font-bold uppercase flex justify-between border-t border-l border-r border-black mt-2">
        <span>{title}</span>
        {sectionNumber && <span>{sectionNumber}</span>}
    </div>
);

const SIILine = ({ label, code, value, type = 'normal', boldLabel = false }: { label: string, code: string, value: string | number, type?: 'normal' | 'total' | 'subtotal', boldLabel?: boolean }) => (
    <div className={`flex items-stretch text-[10px] border-b border-l border-r border-gray-400 ${type === 'total' ? 'bg-yellow-50' : 'bg-white'} h-7`}>
        <div className={`flex-grow px-2 flex items-center ${boldLabel ? 'font-bold' : ''} ${type === 'total' ? 'font-bold uppercase' : ''}`}>
            {label}
        </div>
        <div className="w-10 flex items-center justify-center bg-gray-100 border-l border-r border-gray-400 font-bold text-gray-600 select-none">
            {code}
        </div>
        <div className="w-28 relative border-r border-gray-400">
             <input 
                type="text" 
                defaultValue={value}
                className={`w-full h-full text-right px-2 bg-transparent outline-none font-mono ${type === 'total' ? 'font-bold text-black' : 'text-blue-800'}`}
             />
        </div>
        <div className="w-6 flex items-center justify-center font-bold text-gray-400 bg-gray-50 text-xs">
             {type === 'total' ? '=' : type === 'subtotal' ? '' : '+'}
        </div>
    </div>
);

// --- FORMULARIO 50 (Mensual / Impuestos Varios) ---

export const FormularioF50: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Formulario 50</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onBack} size="sm"><ArrowLeft size={14} className="mr-1"/> Volver</Button>
                    <Button size="sm"><Save size={14} className="mr-1"/> Declarar</Button>
                </div>
            </div>

            <div className="bg-gray-200 p-4 overflow-y-auto rounded-lg border border-gray-300 shadow-inner flex justify-center">
                <div className="bg-white shadow-2xl w-full max-w-[900px] min-h-[1000px] p-8 text-black font-sans">
                    <SIIHeader title="DECLARACION MENSUAL Y PAGO SIMULTANEO" formNumber="50" year={2025} version="1.0" />
                    
                    {/* SECTION 1 */}
                    <SIISectionHeader title="IMPUESTO A LA RENTA (RETENCIONES)" />
                    <SIILine label="Retención de Impuesto con tasa del 10% sobre rentas del Art. 48" code="151" value="0" />
                    <SIILine label="Retención sobre rentas del Art. 42 N° 1 (Sueldos)" code="48" value="1.250.000" />
                    <SIILine label="Retención sobre rentas de directores S.A." code="153" value="0" />
                    <SIILine label="Retención a Suplementeros" code="54" value="0" />
                    <SIILine label="Retención por compra de productos mineros" code="56" value="0" />
                    <SIILine label="TOTAL RETENCIONES IMPUESTO A LA RENTA" code="588" value="1.250.000" type="total" />

                    {/* SECTION 2 */}
                    <SIISectionHeader title="IMPUESTO ADICIONAL ART. 37 D.L. 825" />
                    <SIILine label="Impuesto Adicional a las Bebidas Analcohólicas" code="522" value="0" />
                    <SIILine label="Impuesto Adicional a Licores, Pisco, etc." code="526" value="0" />
                    <SIILine label="TOTAL IMPUESTO ADICIONAL" code="549" value="0" type="total" />

                    {/* SECTION 3 */}
                    <SIISectionHeader title="PAGOS PROVISIONALES" />
                    <SIILine label="PPM Obligatorio 1ra Categoría" code="62" value="450.000" />
                    <SIILine label="PPM Voluntario" code="66" value="0" />
                    <SIILine label="TOTAL PAGOS PROVISIONALES" code="595" value="450.000" type="total" />

                     {/* TOTALS */}
                    <div className="mt-8 border-t-2 border-black pt-4">
                        <div className="flex justify-end items-center gap-4">
                            <span className="font-bold uppercase text-sm">Total a Pagar</span>
                            <div className="border border-black bg-white px-4 py-2 text-2xl font-bold font-mono">
                                $ 1.700.000
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- FORMULARIO 22 (Anual / Renta) ---

export const FormularioF22: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Formulario 22</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onBack} size="sm"><ArrowLeft size={14} className="mr-1"/> Volver</Button>
                    <Button size="sm"><Save size={14} className="mr-1"/> Declarar Renta</Button>
                </div>
            </div>

            <div className="bg-gray-200 p-4 overflow-y-auto rounded-lg border border-gray-300 shadow-inner flex justify-center">
                <div className="bg-white shadow-2xl w-full max-w-[950px] min-h-[1200px] p-6 text-black font-sans text-xs">
                    <SIIHeader title="IMPUESTOS ANUALES A LA RENTA" formNumber="22" year={2026} version="2026.01" />

                    {/* ANVERSO */}
                    <div className="mb-2 font-bold text-center border bg-gray-100 uppercase py-1">Anverso</div>

                    <SIISectionHeader title="A. BASE IMPONIBLE DE PRIMERA CATEGORÍA" />
                    <SIILine label="Ingresos del Giro (Percibidos o Devengados)" code="628" value="120.500.000" />
                    <SIILine label="(-) Costos Directos y Gastos Necesarios" code="629" value="85.200.000" />
                    <SIILine label="Renta Líquida Imponible (o Pérdida Tributaria)" code="630" value="35.300.000" boldLabel />
                    
                    <SIISectionHeader title="B. IMPUESTO DE PRIMERA CATEGORÍA" />
                    <SIILine label="Impuesto Determinado (25% s/ RLI)" code="10" value="8.825.000" type="subtotal" />
                    <SIILine label="(-) Crédito por donaciones" code="20" value="0" />
                    <SIILine label="TOTAL IMPUESTO PRIMERA CATEGORÍA" code="102" value="8.825.000" type="total" />

                    <SIISectionHeader title="C. IMPUESTO GLOBAL COMPLEMENTARIO" />
                    <SIILine label="Rentas del trabajo dependiente (Sueldos)" code="104" value="0" />
                    <SIILine label="Retiros o Dividendos percibidos" code="105" value="0" />
                    <SIILine label="Otras rentas" code="106" value="0" />
                    <SIILine label="BASE IMPONIBLE GLOBAL COMPLEMENTARIO" code="158" value="0" type="subtotal" boldLabel />

                    <SIISectionHeader title="D. DEDUCCIONES A LOS IMPUESTOS" />
                    <SIILine label="(-) Pagos Provisionales Mensuales (PPM) actualizados" code="36" value="4.500.000" />
                    <SIILine label="(-) Crédito por Gastos de Capacitación" code="37" value="0" />
                    
                    <div className="mt-6 border-t border-black p-2 bg-slate-100 flex justify-between items-center">
                        <span className="font-bold text-lg">SALDO A PAGAR</span>
                        <div className="flex items-center gap-2">
                             <div className="bg-gray-100 border border-black px-2 py-1 font-bold">90</div>
                             <div className="text-xl font-bold font-mono">$ 4.325.000</div>
                        </div>
                    </div>
                     <div className="border-b border-black p-2 bg-slate-100 flex justify-between items-center">
                        <span className="font-bold text-lg">SALDO A FAVOR (DEVOLUCIÓN)</span>
                        <div className="flex items-center gap-2">
                             <div className="bg-gray-100 border border-black px-2 py-1 font-bold">85</div>
                             <div className="text-xl font-bold font-mono text-gray-400">$ 0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- DECLARACIONES JURADAS (Tabla Genérica) ---

interface DJProps {
    number: string;
    title: string;
    columns: string[];
    data: any[][];
    onBack: () => void;
}

const DeclaracionJurada: React.FC<DJProps> = ({ number, title, columns, data, onBack }) => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">DJ {number}</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onBack} size="sm"><ArrowLeft size={14} className="mr-1"/> Volver</Button>
                    <Button size="sm"><Save size={14} className="mr-1"/> Enviar DJ</Button>
                </div>
            </div>

            <div className="bg-gray-200 p-4 overflow-y-auto rounded-lg border border-gray-300 shadow-inner flex justify-center">
                <div className="bg-white shadow-2xl w-full max-w-[1000px] min-h-[800px] p-8 text-black font-sans">
                    
                    {/* DJ Header */}
                    <div className="border-2 border-black mb-6">
                        <div className="flex">
                            <div className="w-1/4 p-4 border-r border-black flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-3xl font-extrabold">{number}</div>
                                    <div className="text-[10px] uppercase font-bold mt-1">Declaración Jurada</div>
                                </div>
                            </div>
                            <div className="w-3/4 p-2">
                                <h1 className="font-bold text-sm uppercase text-center mb-2">{title}</h1>
                                <div className="grid grid-cols-2 gap-2 text-xs border-t border-black pt-2">
                                    <div>
                                        <span className="font-bold block">RUT Declarante:</span>
                                        <span className="font-mono text-sm">76.123.456-7</span>
                                    </div>
                                    <div>
                                        <span className="font-bold block">Año Tributario:</span>
                                        <span className="font-mono text-sm">2026</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Informados */}
                    <div className="mb-2 flex justify-between items-end">
                        <h3 className="text-xs font-bold uppercase border-b-2 border-black inline-block">Sección A: Detalle de Informados</h3>
                        <div className="text-xs text-gray-500">Total Casos: {data.length}</div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden border border-black">
                        <table className="min-w-full divide-y divide-black">
                            <thead className="bg-gray-100">
                                <tr className="divide-x divide-black">
                                    {columns.map((col, idx) => (
                                        <th key={idx} className="px-2 py-2 text-center text-[10px] font-bold uppercase text-black">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300">
                                {data.map((row, rIdx) => (
                                    <tr key={rIdx} className="divide-x divide-gray-300 hover:bg-yellow-50">
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className={`px-2 py-1 text-xs text-black ${cIdx > 1 ? 'text-right font-mono' : 'text-center'}`}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {/* Mock Rows to fill space */}
                                {[...Array(5)].map((_, i) => (
                                    <tr key={`empty-${i}`} className="divide-x divide-gray-300 h-6">
                                        {columns.map((_, c) => <td key={c} className="px-2 py-1"></td>)}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 border-t border-black font-bold">
                                <tr className="divide-x divide-black">
                                    <td colSpan={2} className="px-2 py-1 text-xs text-right uppercase">Totales</td>
                                    {/* Mock logic assuming numeric columns start at index 2 */}
                                    {columns.slice(2).map((_, idx) => (
                                         <td key={idx} className="px-2 py-1 text-xs text-right font-mono">$ -</td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Signatures */}
                    <div className="mt-12 grid grid-cols-2 gap-20">
                         <div className="border-t border-black text-center pt-2">
                             <div className="text-xs font-bold">Firma Representante Legal</div>
                             <div className="text-[10px]">RUT: 11.222.333-4</div>
                         </div>
                         <div className="border-t border-black text-center pt-2">
                             <div className="text-xs font-bold">Timbre de Recepción SII</div>
                         </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- WRAPPERS FOR SPECIFIC DJS ---

export const DJ1887View: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const columns = ["RUT Trabajador", "Nombre Completo", "Renta Neta Pagada", "Impuesto Único", "Retención Mayor Valor"];
    const data = [
        ["15.111.222-3", "JUAN PEREZ GONZALEZ", "12.500.000", "150.000", "0"],
        ["18.444.555-6", "MARIA LOPEZ SOTO", "18.200.000", "420.000", "0"],
        ["10.999.888-7", "PEDRO TAPIA RUIZ", "9.800.000", "45.000", "0"],
    ];
    return <DeclaracionJurada number="1887" title="Sueldos, Pensiones, Jubilaciones y Otras Rentas Similares (Art. 42 N°1)" columns={columns} data={data} onBack={onBack} />;
};

export const DJ1879View: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const columns = ["RUT Prestador", "Apellido Paterno", "Apellido Materno", "Nombres", "Monto Bruto Anual", "Retención 13.75%"];
    const data = [
        ["9.111.222-3", "ROJAS", "PEREZ", "ALBERTO", "5.000.000", "687.500"],
        ["12.333.444-5", "SANTOS", "DIAZ", "CAMILA", "2.500.000", "343.750"],
    ];
    return <DeclaracionJurada number="1879" title="Retención de Honorarios y Participación de Directores (Art. 42 N°2)" columns={columns} data={data} onBack={onBack} />;
};

export const DJ1926View: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const columns = ["RUT Propietario", "Monto Retiro", "Crédito IPE", "Crédito Ipe > 2017", "Total"];
    const data = [];
    return <DeclaracionJurada number="1926" title="Base Imponible de Primera Categoría y Datos Contables Balance" columns={columns} data={data} onBack={onBack} />;
};
