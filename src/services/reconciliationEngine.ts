/**
 * Intelligent Bank Reconciliation Engine
 * Advanced matching algorithm with fuzzy logic, date ranges, and pattern learning
 */

export interface BankLine {
    id: string;
    date: string;
    description: string;
    amount: number; // positive = income, negative = expense
    matchedEntryId?: string;
}

export interface AccountingEntry {
    id: string;
    date: string;
    glosa: string;
    total: number;
    lines: Array<{
        accountName: string;
        debit: number;
        credit: number;
    }>;
}

export interface MatchScore {
    entryId: string;
    score: number; // 0-100
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reasons: string[];
}

export interface MatchPattern {
    bankDescription: string;
    entryGlosa: string;
    frequency: number;
    lastMatched: string;
}

const HIGH_CONFIDENCE_THRESHOLD = 80;
const MEDIUM_CONFIDENCE_THRESHOLD = 50;

class ReconciliationEngine {
    private patterns: MatchPattern[] = [];
    private initialized = false;

    constructor() {
        // We cannot await in constructor, so we rely on explicit initialization or lazy loading
    }

    /**
     * Initialize the engine by loading patterns from DB
     */
    async initialize() {
        if (this.initialized) return;
        try {
            // Dynamic import to avoid circular dependency if databaseService imports this engine (it shouldn't but good practice)
            const { reconciliationPatternsService } = await import('./databaseService');
            // Safe check in case service is not fully ready
            if (reconciliationPatternsService) {
                const patterns = await reconciliationPatternsService.getAll();
                this.patterns = patterns || [];
            }
            this.initialized = true;
        } catch (error) {
            console.error('Error loading reconciliation patterns:', error);
            this.patterns = [];
        }
    }

    /**
     * Learn from a successful match
     */
    async learnMatch(bankLine: BankLine, entry: AccountingEntry) {
        if (!this.initialized) await this.initialize();

        const bankDesc = this.normalize(bankLine.description);
        const entryGlosa = this.normalize(entry.glosa);

        const existingRaw = this.patterns.find(
            p => p.bankDescription === bankDesc && p.entryGlosa === entryGlosa
        );
        const existing = existingRaw as any; // Cast to access ID

        const { reconciliationPatternsService } = await import('./databaseService');

        if (existing && existing.id) {
            existing.frequency++;
            existing.lastMatched = new Date().toISOString();
            await reconciliationPatternsService.update(existing.id, {
                frequency: existing.frequency,
                last_matched: existing.lastMatched
            });
        } else {
            const newPattern = {
                bankDescription: bankDesc,
                entryGlosa: entryGlosa,
                frequency: 1,
                lastMatched: new Date().toISOString()
            };
            this.patterns.push(newPattern);

            // Save to DB
            const saved = await reconciliationPatternsService.create({
                bank_description: bankDesc,
                entry_glosa: entryGlosa,
                frequency: 1,
                last_matched: newPattern.lastMatched
            });

            // Update local cache with real ID
            if (saved) {
                const index = this.patterns.indexOf(newPattern);
                if (index !== -1) {
                    this.patterns[index] = { ...newPattern, ...saved }; // merging ID
                }
            }
        }
    }

    /**
     * Find best matches for a bank line across all accounting entries
     */
    async findMatches(bankLine: BankLine, entries: AccountingEntry[]): Promise<MatchScore[]> {
        if (!this.initialized) await this.initialize();

        const matches: MatchScore[] = [];

        for (const entry of entries) {
            if (this.isEntryAlreadyMatched(entry.id, bankLine.id)) continue;

            const score = await this.calculateMatchScore(bankLine, entry);
            if (score.score >= 40) {
                matches.push(score);
            }
        }

        return matches.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate match score between bank line and accounting entry
     */
    private async calculateMatchScore(bankLine: BankLine, entry: AccountingEntry): Promise<MatchScore> {
        let score = 0;
        const reasons: string[] = [];

        // 1. AMOUNT MATCHING
        const amountDiff = Math.abs(bankLine.amount - entry.total);
        if (amountDiff === 0) {
            score += 50;
            reasons.push('✓ Monto exacto');
        } else if (amountDiff <= 100) {
            score += 40;
            reasons.push(`≈ Monto cercano ($${amountDiff} diferencia)`);
        } else if (amountDiff <= 1000) {
            score += 20;
            reasons.push(`~ Monto similar ($${amountDiff} diferencia)`);
        }

        // 2. DATE MATCHING
        const daysDiff = this.daysDifference(bankLine.date, entry.date);
        if (daysDiff === 0) {
            score += 30;
            reasons.push('✓ Fecha exacta');
        } else if (daysDiff <= 1) {
            score += 25;
            reasons.push(`≈ 1 día de diferencia`);
        } else if (daysDiff <= 3) {
            score += 20 - (daysDiff * 3);
            reasons.push(`~ ${daysDiff} días de diferencia`);
        } else if (daysDiff <= 7) {
            score += 10;
            reasons.push(`Misma semana (${daysDiff}d)`);
        }

        // 3. DESCRIPTION SIMILARITY
        const textSimilarity = this.calculateTextSimilarity(bankLine.description, entry.glosa);
        if (textSimilarity > 0.8) {
            score += 20;
            reasons.push('✓ Descripción muy similar');
        } else if (textSimilarity > 0.6) {
            score += 15;
            reasons.push('≈ Descripción similar');
        } else if (textSimilarity > 0.4) {
            score += 10;
            reasons.push('~ Descripción parcialmente similar');
        }

        // 4. LEARNED PATTERN BONUS
        const patternBonus = await this.getPatternBonus(bankLine.description, entry.glosa);
        if (patternBonus > 0) {
            score += patternBonus;
            reasons.push(`⭐ Patrón aprendido (+${patternBonus})`);
        }

        let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        if (score >= HIGH_CONFIDENCE_THRESHOLD) confidence = 'HIGH';
        else if (score >= MEDIUM_CONFIDENCE_THRESHOLD) confidence = 'MEDIUM';
        else confidence = 'LOW';

        return {
            entryId: entry.id,
            score: Math.min(100, Math.round(score)),
            confidence,
            reasons
        };
    }

    /**
     * Check if pattern exists from previous matches
     */
    private async getPatternBonus(bankDesc: string, entryGlosa: string): Promise<number> {
        if (!this.initialized) await this.initialize();

        const normalizedBank = this.normalize(bankDesc);
        const normalizedEntry = this.normalize(entryGlosa);

        const pattern = this.patterns.find(
            p => this.calculateTextSimilarity(p.bankDescription, normalizedBank) > 0.7 &&
                this.calculateTextSimilarity(p.entryGlosa, normalizedEntry) > 0.7
        );

        if (!pattern) return 0;
        return Math.min(30, Math.log(pattern.frequency + 1) * 10);
    }

    // Helper methods need to be included if I replace the whole class block
    private calculateTextSimilarity(str1: string, str2: string): number {
        const norm1 = this.normalize(str1);
        const norm2 = this.normalize(str2);
        if (norm1 === norm2) return 1.0;
        if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;
        const distance = this.levenshteinDistance(norm1, norm2);
        const maxLen = Math.max(norm1.length, norm2.length);
        return maxLen === 0 ? 0 : (maxLen - distance) / maxLen;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    private daysDifference(date1: string, date2: string): number {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private normalize(text: string): string {
        return text.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    private isEntryAlreadyMatched(entryId: string, excludeBankLineId: string): boolean {
        return false;
    }

    /**
     * Batch auto-match high-confidence items
     */
    async autoMatch(bankLines: BankLine[], entries: AccountingEntry[]): Promise<Array<{ bankLineId: string; entryId: string; confidence: string }>> {
        if (!this.initialized) await this.initialize();

        const autoMatches: Array<{ bankLineId: string; entryId: string; confidence: string }> = [];

        for (const bankLine of bankLines) {
            if (bankLine.matchedEntryId) continue;

            const matches = await this.findMatches(bankLine, entries);
            const bestMatch = matches[0];

            if (bestMatch && bestMatch.confidence === 'HIGH') {
                const secondBest = matches[1];
                const scoreDiff = secondBest ? bestMatch.score - secondBest.score : 100;

                if (scoreDiff >= 20) {
                    autoMatches.push({
                        bankLineId: bankLine.id,
                        entryId: bestMatch.entryId,
                        confidence: bestMatch.confidence
                    });
                }
            }
        }

        return autoMatches;
    }
    /**
     * Find a learned pattern for a bank description
     */
    async findMatchingPattern(bankDescription: string): Promise<MatchPattern | null> {
        if (!this.initialized) await this.initialize();

        const normalizedBank = this.normalize(bankDescription);

        // Find best matching pattern
        const pattern = this.patterns.find(
            p => this.calculateTextSimilarity(p.bankDescription, normalizedBank) > 0.85
        );

        return pattern || null;
    }
}

export const reconciliationEngine = new ReconciliationEngine();
