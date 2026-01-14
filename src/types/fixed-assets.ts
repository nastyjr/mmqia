export interface FixedAsset {
    id: string;
    name: string;
    description?: string;
    purchaseDate: string; // YYYY-MM-DD
    purchaseValue: number; // Neto
    residualValue: number; // Valor Residual estimado (scrappage value)
    usefulLifeYears: number; // Vida util tributaria inicial en años
    usefulLifeMonths: number; // Vida util total en meses

    // Status
    status: 'ACTIVE' | 'SOLD' | 'DISPOSED' | 'FULLY_DEPRECIATED';

    // Linked Account (e.g., 1.2.02 Equipos)
    assetAccountId: string;

    // Depreciation History
    lastDepreciationDate?: string;
    accumulatedDepreciation: number;
    accumulatedCM: number; // Corrección Monetaria acumulada del activo
    currentValue: number; // Valor Libro Actual (Net + CM - Dep)
}

export const ASSET_CATEGORIES = [
    { id: '1.2.01', name: 'Muebles y Útiles', lifeYears: 7 },
    { id: '1.2.02', name: 'Equipos Computacionales', lifeYears: 3 },
    { id: '1.2.03', name: 'Vehículos', lifeYears: 7 },
    { id: '1.2.04', name: 'Maquinarias', lifeYears: 10 },
    { id: '1.2.05', name: 'Herramientas', lifeYears: 5 },
];
