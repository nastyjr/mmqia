import React, { useState, useEffect } from 'react';
import {
    X, ChevronRight, ChevronLeft, Check,
    Book, FileText, Package, Users, Calculator,
    Wallet, Shield, Lightbulb, Rocket
} from 'lucide-react';
import { Button } from './Button';

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: string) => void;
}

interface Step {
    id: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    tip: string;
    action?: { label: string; view: string };
}

const STEPS: Step[] = [
    {
        id: 1,
        title: '¡Bienvenido a ContaPro!',
        description: 'Este sistema contable profesional está diseñado para empresas chilenas. Te guiaremos por los módulos principales.',
        icon: <Rocket className="text-purple-600" size={40} />,
        tip: 'Puedes reiniciar este tutorial desde el menú de ayuda en cualquier momento.'
    },
    {
        id: 2,
        title: 'Plan de Cuentas',
        description: 'Aquí defines tu estructura contable. El sistema viene con un plan predeterminado IFRS adaptado a Chile que puedes personalizar.',
        icon: <Book className="text-blue-600" size={40} />,
        tip: 'Las cuentas están organizadas en niveles: 1=Grupo, 2=Subgrupo, 3=Imputables (donde registras movimientos).',
        action: { label: 'Ver Plan de Cuentas', view: 'PLAN_DE_CUENTAS' }
    },
    {
        id: 3,
        title: 'Clientes y Proveedores (CRM)',
        description: 'Registra tus terceros comerciales con RUT, dirección y giro. Esencial para facturación y órdenes de compra.',
        icon: <Users className="text-emerald-600" size={40} />,
        tip: 'Clasifica como Cliente, Proveedor o Ambos para encontrarlos rápidamente.',
        action: { label: 'Ir a CRM', view: 'CRM' }
    },
    {
        id: 4,
        title: 'Inventario y Productos',
        description: 'Crea tu catálogo de productos con precios, costos y control de stock. El sistema calcula PMP automáticamente.',
        icon: <Package className="text-amber-600" size={40} />,
        tip: 'Los movimientos Kardex se generan automáticamente al comprar o vender.',
        action: { label: 'Ver Inventario', view: 'INVENTORY' }
    },
    {
        id: 5,
        title: 'Facturación Electrónica',
        description: 'Emite Facturas y Boletas que cumplen con la normativa SII. Cada venta actualiza inventario, contabilidad y libro de ventas.',
        icon: <FileText className="text-purple-600" size={40} />,
        tip: 'Necesitas tener clientes y productos creados antes de facturar.',
        action: { label: 'Ir a Facturación', view: 'INVOICING' }
    },
    {
        id: 6,
        title: 'Libro Diario y Contabilidad',
        description: 'Todos los movimientos contables se registran aquí. Las ventas y compras generan asientos automáticos.',
        icon: <Calculator className="text-indigo-600" size={40} />,
        tip: 'Puedes crear asientos manuales para ajustes, traspasos y provisiones.',
        action: { label: 'Ver Libro Diario', view: 'LIBRO_DIARIO' }
    },
    {
        id: 7,
        title: 'Libro de Caja',
        description: 'Controla el efectivo de tu empresa. Registra ingresos, egresos y mantén el saldo actualizado.',
        icon: <Wallet className="text-amber-600" size={40} />,
        tip: 'Ideal para negocios con alto flujo de efectivo.',
        action: { label: 'Ver Libro de Caja', view: 'LIBRO_CAJA' }
    },
    {
        id: 8,
        title: 'Módulos Tributarios',
        description: 'El Libro de Compra/Venta (IEC) se alimenta automáticamente. Prepara tus Formularios 29, F22 y Declaraciones Juradas.',
        icon: <Shield className="text-rose-600" size={40} />,
        tip: 'El sistema calcula IVA Débito y Crédito. Solo revisa y presenta al SII.',
        action: { label: 'Ver Libro IEC', view: 'LIBRO_COMPRA_VENTA' }
    },
    {
        id: 9,
        title: '¡Listo para comenzar!',
        description: 'Has completado el tour. Explora cada módulo a tu ritmo. El sistema tiene alertas automáticas para recordarte tareas importantes.',
        icon: <Check className="text-emerald-500" size={40} />,
        tip: 'Tip Pro: Usa el menú lateral para navegar rápidamente entre módulos.'
    }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose, onNavigate }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        // Reset on open
        if (isOpen) {
            setCurrentStep(0);
            setCompleted(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const step = STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;

    const handleNext = () => {
        if (isLast) {
            setCompleted(true);
            localStorage.setItem('onboarding_completed', 'true');
            onClose();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirst) setCurrentStep(prev => prev - 1);
    };

    const handleAction = () => {
        if (step.action) {
            localStorage.setItem('onboarding_completed', 'true');
            onClose();
            onNavigate(step.action.view);
        }
    };

    const handleSkip = () => {
        localStorage.setItem('onboarding_completed', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Progress Bar */}
                <div className="h-1 bg-slate-100">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                        Paso {currentStep + 1} de {STEPS.length}
                    </span>
                    <button
                        onClick={handleSkip}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                        Saltar tutorial
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        {step.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">{step.title}</h2>
                    <p className="text-slate-600 mb-6">{step.description}</p>

                    {/* Tip Box */}
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-left">
                        <div className="flex items-start gap-3">
                            <Lightbulb size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">{step.tip}</p>
                        </div>
                    </div>

                    {/* Quick Action */}
                    {step.action && (
                        <button
                            onClick={handleAction}
                            className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm underline"
                        >
                            {step.action.label} →
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-slate-50">
                    <Button
                        variant="secondary"
                        onClick={handlePrev}
                        disabled={isFirst}
                        className={isFirst ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        <ChevronLeft size={16} /> Anterior
                    </Button>

                    {/* Step Dots */}
                    <div className="flex gap-1.5">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-indigo-600' :
                                        idx < currentStep ? 'bg-indigo-300' : 'bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>

                    <Button onClick={handleNext}>
                        {isLast ? 'Finalizar' : 'Siguiente'} <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
