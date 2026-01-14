
// Constants (Values 2024-2025)
const IMM = 500000;
const TOPE_GRATIFICACION = (4.75 * IMM) / 12;
const UF = 38000;
const TOPE_IMPONIBLE_AFP = 84.3 * UF;
const TOPE_IMPONIBLE_AFC = 126.6 * UF;
const UTM = 66000;

export const AFPS = [
    { name: 'UNO', rate: 10.49 },
    { name: 'MODELO', rate: 10.58 },
    { name: 'PLANVITAL', rate: 11.16 },
    { name: 'HABITAT', rate: 11.27 },
    { name: 'CAPITAL', rate: 11.44 },
    { name: 'CUPRUM', rate: 11.44 },
    { name: 'PROVIDA', rate: 11.45 },
];

const TAX_TABLE = [
    { from: 0, to: 13.5 * UTM, factor: 0, deduction: 0 },
    { from: 13.5 * UTM, to: 30 * UTM, factor: 0.04, deduction: 0.54 * UTM },
    { from: 30 * UTM, to: 50 * UTM, factor: 0.08, deduction: 1.74 * UTM },
    { from: 50 * UTM, to: 70 * UTM, factor: 0.135, deduction: 4.49 * UTM },
    { from: 70 * UTM, to: 90 * UTM, factor: 0.23, deduction: 11.14 * UTM },
    { from: 90 * UTM, to: 120 * UTM, factor: 0.304, deduction: 17.80 * UTM },
    { from: 120 * UTM, to: 999999999, factor: 0.35, deduction: 23.32 * UTM },
];

export interface PayrollInput {
    baseSalary: number;
    hasGratification: boolean;
    contractType: 'INDEFINIDO' | 'PLAZO_FIJO';
    afpName: string;
    fonasa: boolean;
    isapreAmount?: number;
    colacion: number;
    movilizacion: number;
}

export const calculatePayroll = (input: PayrollInput) => {
    // 1. Haberes Imponibles
    let gratification = 0;
    if (input.hasGratification) {
        const theoretical = input.baseSalary * 0.25;
        gratification = Math.min(theoretical, TOPE_GRATIFICACION);
    }

    const taxableIncome = input.baseSalary + gratification;
    const cappedTaxableAFP = Math.min(taxableIncome, TOPE_IMPONIBLE_AFP);
    const cappedTaxableAFC = Math.min(taxableIncome, TOPE_IMPONIBLE_AFC);

    // 2. Haberes No Imponibles
    const nonTaxableIncome = input.colacion + input.movilizacion;
    const totalHaberes = taxableIncome + nonTaxableIncome;

    // 3. Descuentos Legales
    const afpObj = AFPS.find(a => a.name === input.afpName) || AFPS[0];
    const afpAmount = Math.round(cappedTaxableAFP * (afpObj.rate / 100));

    let healthMandatory = Math.round(cappedTaxableAFP * 0.07);
    let healthTotal = healthMandatory;

    if (!input.fonasa && input.isapreAmount) {
        if (input.isapreAmount > healthMandatory) {
            healthTotal = input.isapreAmount;
        }
    }

    let afcRateWorker = 0;
    if (input.contractType === 'INDEFINIDO') afcRateWorker = 0.006;
    const afcWorker = Math.round(cappedTaxableAFC * afcRateWorker);

    const totalSocialSecurity = afpAmount + healthTotal + afcWorker;

    // 4. Impuesto
    const taxBase = taxableIncome - totalSocialSecurity;
    let tax = 0;
    if (taxBase > 0) {
        const bracket = TAX_TABLE.find(b => taxBase > b.from && taxBase <= b.to);
        if (bracket) {
            tax = Math.round((taxBase * bracket.factor) - bracket.deduction);
            if (tax < 0) tax = 0;
        }
    }

    const totalDiscounts = totalSocialSecurity + tax;
    const liquid = totalHaberes - totalDiscounts;

    // 5. Employer Cost
    const sis = Math.round(cappedTaxableAFC * 0.0199);

    let afcRateEmployer = 0;
    if (input.contractType === 'INDEFINIDO') afcRateEmployer = 0.024;
    else afcRateEmployer = 0.03;
    const afcEmployer = Math.round(cappedTaxableAFC * afcRateEmployer);

    const mutual = Math.round(taxableIncome * 0.0093);
    const employerCost = totalHaberes + sis + afcEmployer + mutual;

    return {
        baseSalary: input.baseSalary,
        gratification,
        taxableIncome,
        nonTaxableIncome,
        totalHaberes,
        afpName: input.afpName,
        afpAmount,
        healthTotal,
        afcWorker,
        taxBase,
        tax,
        totalDiscounts,
        liquid,
        employerCost,
        sis,
        afcEmployer,
        mutual
    };
};
