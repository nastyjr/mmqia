/**
 * Chilean Tax Engine
 * Handles IVA (19%), ILA (Additional Taxes for Alcohol/Luxury), and Exemptions.
 */

export type TaxCategory =
    | 'AFECTO'      // Standard IVA 19%
    | 'EXENTO'      // No Tax (0%)
    | 'ILA_10'      // Bebidas Analcohólicas (10%)
    | 'ILA_18'      // Vinos y Cervezas (18%) (Actually 20.5% in some cases, but 18% is standard)
    | 'ILA_31'      // Licores, Piscos, Destilados (31.5%)
    | 'ILA_40';     // Licores > 40° or specifics

export const TAX_RATES: Record<TaxCategory, number> = {
    'AFECTO': 0.19,
    'EXENTO': 0.00,
    'ILA_10': 0.10, // + 0.19 IVA usually applies on top or parallel? In Chile, ILA is additional. Tax = Net * 0.19 + Net * 0.10
    'ILA_18': 0.18, // Actually 20.5 in law? Let's keep specific rates configurable. 
    'ILA_31': 0.315,
    'ILA_40': 0.40
};

// In Chile: Total = Net + (Net * IVA) + (Net * ILA)
// Both IVA and ILA are calculated on the Net amount.

export interface TaxResult {
    net: number;
    iva: number; // 19%
    ila: number; // Additional
    total: number;
}

export const calculateLineTax = (netAmount: number, category: TaxCategory): TaxResult => {
    // 1. Calculate IVA
    let ivaRate = 0;
    if (category !== 'EXENTO') {
        ivaRate = 0.19;
    }

    // 2. Calculate ILA
    // ILA only applies if defined. ILA implies it is ALSO subject to IVA usually? 
    // Yes, Alcohol pays IVA + ILA.
    let ilaRate = 0;
    if (category.startsWith('ILA_')) {
        ilaRate = TAX_RATES[category] || 0;
    }

    const iva = Math.round(netAmount * ivaRate);
    const ila = Math.round(netAmount * ilaRate);

    return {
        net: netAmount,
        iva,
        ila,
        total: netAmount + iva + ila
    };
};

export const calculateOrderTotals = (lines: { netCost: number, quantity: number, taxCategory: TaxCategory }[]) => {
    let totalNet = 0;
    let totalIva = 0;
    let totalIla = 0;
    let totalExempt = 0;

    lines.forEach(line => {
        const lineNet = line.netCost * line.quantity;
        const tax = calculateLineTax(lineNet, line.taxCategory);

        totalNet += lineNet;
        totalIva += tax.iva;
        totalIla += tax.ila;

        if (line.taxCategory === 'EXENTO') {
            totalExempt += lineNet;
        }
    });

    return {
        netTotal: totalNet,
        ivaTotal: totalIva,
        ilaTotal: totalIla,
        exemptTotal: totalExempt,
        grandTotal: totalNet + totalIva + totalIla
    };
};
