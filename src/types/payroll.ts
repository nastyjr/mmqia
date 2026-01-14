export type ContractType = 'INDEFINIDO' | 'PLAZO_FIJO' | 'POR_OBRA';

export interface Employee {
    id: string;
    rut: string; // ID number
    names: string;
    fatherName: string;
    motherName: string;
    email: string;
    phone?: string;
    address?: string;
    birthDate?: string;

    // Active Status
    isActive: boolean;
    createdAt: string;

    contract: ContractDetails;
}

export interface ContractDetails {
    startDate: string;
    endDate?: string; // For fixed term
    type: ContractType;
    position: string; // Cargo

    // Salary Details
    baseSalary: number; // Sueldo Base
    gratificationLegal: boolean; // 25% con tope 4.75 IMM

    // Non-Taxable Allowances
    colacion: number; // Lunch
    movilizacion: number; // Transport

    // Pension & Health
    afp: string; // AFP Name
    healthSystem: 'FONASA' | 'ISAPRE';
    isapreAmount?: number; // In CLP or UF (simplified to CLP for now)

    // Unemployment Ins.
    afcWorker: boolean; // Usually true for Indefinite
}

export interface PayrollProcess {
    id: string;
    month: number;
    year: number;
    employeeId: string;

    // Calculated Values (Snapshot)
    calculations: PayrollCalculations;

    status: 'DRAFT' | 'PROCESSED' | 'PAID';
}

export interface PayrollCalculations {
    baseSalary: number;
    gratification: number;
    totalTaxable: number; // Total Imponible

    totalNonTaxable: number; // Total No Imponible (Col+Mov)

    // Discounts
    afpAmount: number;
    healthAmount: number;
    afcAmount: number;
    tax: number; // Impuesto Unico

    totalDiscounts: number;

    liquidSalary: number; // To Pay

    // Employer Cost
    employerCost: number;
}
