/**
 * Classification Learning Service
 * Learns from user classifications to improve auto-classification accuracy
 */

export interface LearnedClassification {
    supplierPattern: string;
    accountId: string;
    accountName: string;
    frequency: number;
    lastUsed: string;
    createdAt: string;
}

export interface ClassificationResult {
    accountId: string;
    accountName: string;
    confidence: number; // 0-100
    source: 'rule' | 'learned' | 'default';
    alternativeSuggestions?: Array<{
        accountId: string;
        accountName: string;
        confidence: number;
    }>;
}

const STORAGE_KEY = 'classification_learning_db';

class ClassificationLearningService {
    private classifications: LearnedClassification[] = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            this.classifications = data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading classifications:', error);
            this.classifications = [];
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.classifications));
        } catch (error) {
            console.error('Error saving classifications:', error);
        }
    }

    /**
     * Learn from a user classification
     */
    learn(supplierName: string, accountId: string, accountName: string) {
        const pattern = this.normalizePattern(supplierName);

        // Find existing classification
        const existing = this.classifications.find(
            c => c.supplierPattern === pattern && c.accountId === accountId
        );

        if (existing) {
            // Increment frequency
            existing.frequency++;
            existing.lastUsed = new Date().toISOString();
        } else {
            // Create new learned classification
            this.classifications.push({
                supplierPattern: pattern,
                accountId,
                accountName,
                frequency: 1,
                lastUsed: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
        }

        this.saveToStorage();
    }

    /**
     * Get classification suggestions for a supplier
     */
    getSuggestions(supplierName: string): ClassificationResult[] {
        const pattern = this.normalizePattern(supplierName);
        const matches: Array<{ classification: LearnedClassification; similarity: number }> = [];

        // Find all potential matches
        for (const classification of this.classifications) {
            const similarity = this.calculateSimilarity(pattern, classification.supplierPattern);
            if (similarity > 0.5) { // Threshold for considering a match
                matches.push({ classification, similarity });
            }
        }

        // Sort by relevance (similarity * frequency)
        matches.sort((a, b) => {
            const scoreA = a.similarity * Math.log(a.classification.frequency + 1);
            const scoreB = b.similarity * Math.log(b.classification.frequency + 1);
            return scoreB - scoreA;
        });

        // Convert to results with confidence
        return matches.map(({ classification, similarity }) => ({
            accountId: classification.accountId,
            accountName: classification.accountName,
            confidence: Math.round(similarity * 100),
            source: 'learned' as const
        }));
    }

    /**
     * Get best suggestion (highest confidence)
     */
    getBestMatch(supplierName: string): ClassificationResult | null {
        const suggestions = this.getSuggestions(supplierName);
        return suggestions.length > 0 ? suggestions[0] : null;
    }

    /**
     * Normalize supplier name for pattern matching
     */
    private normalizePattern(name: string): string {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ' ') // Remove special chars
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim()
            .substring(0, 50); // Limit length
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        // Check for exact substring match first
        if (longer.includes(shorter) || shorter.includes(longer)) {
            return 0.9;
        }

        // Levenshtein distance
        const distance = this.levenshteinDistance(str1, str2);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Levenshtein distance algorithm
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Get statistics about learned classifications
     */
    getStats() {
        return {
            totalClassifications: this.classifications.length,
            totalFrequency: this.classifications.reduce((sum, c) => sum + c.frequency, 0),
            mostUsed: this.classifications
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5)
        };
    }

    /**
     * Clear all learned classifications
     */
    clear() {
        this.classifications = [];
        this.saveToStorage();
    }
}

export const classificationLearningService = new ClassificationLearningService();
