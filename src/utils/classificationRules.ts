import { JournalEntry } from '../types';
import { classificationLearningService, ClassificationResult } from '../services/classificationLearning';

// Simple types for our rule engine
type AccountMapping = {
    keyword: string;
    accountId: string;
    accountName: string;
};

// Default mapping rules (User could edit this in a future settings page)
const DEFAULT_RULES: AccountMapping[] = [
    { keyword: 'COPEC', accountId: '6.1.10', accountName: 'Combustibles y Lubricantes' },
    { keyword: 'SHELL', accountId: '6.1.10', accountName: 'Combustibles y Lubricantes' },
    { keyword: 'PETROBRAS', accountId: '6.1.10', accountName: 'Combustibles y Lubricantes' },
    { keyword: 'SODIMAC', accountId: '6.1.12', accountName: 'Mantención y Reparaciones' },
    { keyword: 'EASY', accountId: '6.1.12', accountName: 'Mantención y Reparaciones' },
    { keyword: 'CONSTRUMART', accountId: '6.1.12', accountName: 'Mantención y Reparaciones' },
    { keyword: 'LIDER', accountId: '6.1.15', accountName: 'Gastos de Oficina' },
    { keyword: 'JUMBO', accountId: '6.1.15', accountName: 'Gastos de Oficina' },
    { keyword: 'ENTEL', accountId: '6.1.06', accountName: 'Comunicaciones' },
    { keyword: 'VTR', accountId: '6.1.06', accountName: 'Comunicaciones' },
    { keyword: 'MOVISTAR', accountId: '6.1.06', accountName: 'Comunicaciones' },
    { keyword: 'WOM', accountId: '6.1.06', accountName: 'Comunicaciones' },
    { keyword: 'CGE', accountId: '6.1.05', accountName: 'Servicios Básicos (Luz/Agua)' },
    { keyword: 'ENEL', accountId: '6.1.05', accountName: 'Servicios Básicos (Luz/Agua)' },
    { keyword: 'AGUAS', accountId: '6.1.05', accountName: 'Servicios Básicos (Luz/Agua)' },
    { keyword: 'SII', accountId: '6.1.08', accountName: 'Impuestos y Patentes' },
    { keyword: 'TESORERIA', accountId: '6.1.08', accountName: 'Impuestos y Patentes' },
];

/**
 * Enhanced classifier with machine learning and confidence scoring
 */
export const classifyInvoice = (supplierName: string): ClassificationResult => {
    const upperName = supplierName.toUpperCase();

    // 1. Check learned classifications first (highest priority)
    const learnedMatch = classificationLearningService.getBestMatch(supplierName);
    if (learnedMatch && learnedMatch.confidence >= 85) {
        // High confidence learned classification
        return learnedMatch;
    }

    // 2. Check static rules
    const rule = DEFAULT_RULES.find(r => upperName.includes(r.keyword));
    if (rule) {
        return {
            accountId: rule.accountId,
            accountName: rule.accountName,
            confidence: 95, // Rules have high confidence
            source: 'rule',
            alternativeSuggestions: learnedMatch ? [learnedMatch] : undefined
        };
    }

    // 3. Return learned match with lower confidence or default
    if (learnedMatch) {
        return learnedMatch;
    }

    // 4. Default: "Gastos Generales" with low confidence
    return {
        accountId: '6.1.99',
        accountName: 'Gastos Generales (Por Clasificar)',
        confidence: 30,
        source: 'default'
    };
};

/**
 * Learn from a manual classification
 */
export const learnClassification = (supplierName: string, accountId: string, accountName: string) => {
    classificationLearningService.learn(supplierName, accountId, accountName);
};

/**
 * Get multiple suggestions for a supplier
 */
export const getClassificationSuggestions = (supplierName: string) => {
    const learned = classificationLearningService.getSuggestions(supplierName);
    const primaryResult = classifyInvoice(supplierName);

    // Combine and deduplicate
    const all = [primaryResult, ...learned];
    const unique = all.filter((item, index, self) =>
        index === self.findIndex(t => t.accountId === item.accountId)
    );

    return unique.sort((a, b) => b.confidence - a.confidence);
};
