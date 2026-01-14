export type ThirdPartyType = 'CLIENTE' | 'PROVEEDOR' | 'AMBOS' | 'EMPLEADO' | 'OTRO';

export interface ThirdParty {
    id: string;
    rut: string; // XX.XXX.XXX-X
    name: string; // Razón Social o Nombre Completo
    type: ThirdPartyType;

    // Contact Info
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    giro?: string; // Business Activity

    // Financial Config
    paymentTermsDays?: number; // Plazo pago habitual
    creditLimit?: number;
}
