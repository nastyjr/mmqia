/**
 * Payroll Tax Calculator Pro
 * Automatic calculation of Chilean payroll taxes and social security
 */

export interface PayrollTaxResult {
    taxableIncome: number;
    incomeTax: number; // Impuesto Segunda Categoría
    socialSecurity: {
        afp: { name: string; amount: number; rate: number };
        salud: { name: string; amount: number; rate: number };
        sis: number; // Seguro Invalidez y Sobrevivencia
        afc: { worker: number; employer: number };
    };
    totalDeductions: number;
    netSalary: number;
    employerCost: number;
}

export interface TaxBracket {
    from: number;
    to: number | null;
    factor: number;
    deduction: number;
}

class PayrollTaxCalculator {
    // UTM Value (should be updated monthly)
    private utm = 65000;

    // UF Value (should be updated daily)
    private uf = 37000;

    // Topes Imponibles (in UF)
    private topeImponibleAFP = 84.3;
    private topeImponibleAFC = 126.6;

    // Tax Brackets (Monthly in UTM) - Updated 2024
    private taxBrackets: TaxBracket[] = [
        { from: 0, to: 13.5, factor: 0, deduction: 0 },
        { from: 13.5, to: 30, factor: 0.04, deduction: 0.54 },
        { from: 30, to: 50, factor: 0.08, deduction: 1.74 },
        { from: 50, to: 70, factor: 0.135, deduction: 4.49 },
        { from: 70, to: 90, factor: 0.23, deduction: 11.14 },
        { from: 90, to: 120, factor: 0.304, deduction: 17.80 },
        { from: 120, to: 310, factor: 0.35, deduction: 23.32 },
        { from: 310, to: null, factor: 0.40, deduction: 38.82 }
    ];

    private afpRates: Record<string, number> = {
        'CAPITAL': 11.44,
        'CUPRUM': 11.44,
        'HABITAT': 11.27,
        'PLANVITAL': 11.16,
        'PROVIDA': 11.45,
        'MODELO': 10.58,
        'UNO': 10.49
    };

    /**
     * Calculate all payroll taxes
     */
    calculate(grossSalary: number, afpName: string, contractType: 'INDEFINITE' | 'FIXED' = 'INDEFINITE'): PayrollTaxResult {
        // 1. Calculate Caps
        const capAFP = this.topeImponibleAFP * this.uf;
        const capAFC = this.topeImponibleAFC * this.uf;

        const taxableForAFP = Math.min(grossSalary, capAFP);
        const taxableForAFC = Math.min(grossSalary, capAFC);

        // 2. Social Security Deductions
        // AFP
        const afpRate = (this.afpRates[afpName.toUpperCase()] || 11.0) / 100;
        const afpAmount = Math.round(taxableForAFP * afpRate);

        // Salud (7% mandatory)
        const saludRate = 0.07;
        const saludAmount = Math.round(taxableForAFP * saludRate);

        // AFC (Seguro Cesantía)
        // Indefinite: Worker 0.6%, Employer 2.4%
        // Fixed: Worker 0%, Employer 3.0%
        let afcWorkerRate = 0;
        let afcEmployerRate = 0;

        if (contractType === 'INDEFINITE') {
            afcWorkerRate = 0.006;
            afcEmployerRate = 0.024;
        } else {
            afcWorkerRate = 0;
            afcEmployerRate = 0.03;
        }

        const afcWorkerAmount = Math.round(taxableForAFC * afcWorkerRate);
        const afcEmployerAmount = Math.round(taxableForAFC * afcEmployerRate);

        // SIS (Employer pays) - Approx 1.49% (varies)
        const sisRate = 0.0149; // 2024 approx
        const sisAmount = Math.round(taxableForAFP * sisRate);

        const totalSocialSecurity = afpAmount + saludAmount + afcWorkerAmount;

        // 3. Taxable Income for Income Tax
        const taxableIncome = grossSalary - totalSocialSecurity;

        // 4. Calculate Income Tax (Impuesto Único)
        const incomeTax = this.calculateIncomeTax(taxableIncome);

        // 5. Totals
        const totalDeductions = totalSocialSecurity + incomeTax;
        const netSalary = grossSalary - totalDeductions;
        const employerCost = grossSalary + afcEmployerAmount + sisAmount;

        return {
            taxableIncome,
            incomeTax,
            socialSecurity: {
                afp: { name: afpName, amount: afpAmount, rate: afpRate },
                salud: { name: 'FONASA/ISAPRE', amount: saludAmount, rate: saludRate },
                sis: sisAmount,
                afc: { worker: afcWorkerAmount, employer: afcEmployerAmount }
            },
            totalDeductions,
            netSalary,
            employerCost
        };
    }

    /**
     * Calculate Income Tax based on brackets
     */
    private calculateIncomeTax(taxableIncome: number): number {
        const incomeInUTM = taxableIncome / this.utm;
        let taxInUTM = 0;

        for (const bracket of this.taxBrackets) {
            if (incomeInUTM > bracket.from) {
                if (bracket.to === null || incomeInUTM <= bracket.to) {
                    // Falls in this bracket
                    taxInUTM = (incomeInUTM * bracket.factor) - bracket.deduction;
                    break;
                }
            }
        }

        return Math.max(0, Math.round(taxInUTM * this.utm));
    }

    /**
     * Update UTM value
     */
    setUTM(value: number) {
        this.utm = value;
    }

    /**
     * Update UF value
     */
    setUF(value: number) {
        this.uf = value;
    }
}

export const payrollTaxCalculator = new PayrollTaxCalculator();
