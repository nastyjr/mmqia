/**
 * Multi-Currency System
 * Handles multiple currencies with automatic conversion and FX gain/loss tracking
 */

export type Currency = 'CLP' | 'USD' | 'EUR' | 'UF' | 'BRL' | 'ARS' | 'PEN';

export interface ExchangeRate {
    id: string;
    baseCurrency: Currency;
    targetCurrency: Currency;
    rate: number;
    date: string;
    source: 'MANUAL' | 'API' | 'CENTRAL_BANK';
    validUntil?: string;
}

export interface MultiCurrencyAmount {
    amount: number;
    currency: Currency;
    amountInBase?: number; // Amount in base currency (CLP)
    exchangeRate?: number;
    conversionDate?: string;
}

export interface FXGainLoss {
    id: string;
    type: 'REALIZED' | 'UNREALIZED';
    currency: Currency;
    amount: number; // In base currency
    originalAmount: number;
    originalCurrency: Currency;
    originalRate: number;
    currentRate: number;
    date: string;
    referenceId?: string; // Invoice/Payment ID
    accountingEntryId?: string;
}

export interface CurrencyBalance {
    currency: Currency;
    balance: number;
    balanceInBase: number;
    lastUpdated: string;
}

class MultiCurrencySystem {
    private readonly BASE_CURRENCY: Currency = 'CLP';
    private readonly RATES_KEY = 'exchange_rates';
    private readonly FX_GAINS_KEY = 'fx_gains_losses';

    /**
     * Get current exchange rate
     */
    async getExchangeRate(from: Currency, to: Currency, date?: string): Promise<number> {
        if (from === to) return 1;

        // Try to get from storage
        const rates = this.getAllRates();
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Find exact match
        let rate = rates.find(r =>
            r.baseCurrency === from &&
            r.targetCurrency === to &&
            r.date === targetDate
        );

        if (rate) return rate.rate;

        // Try reverse rate
        rate = rates.find(r =>
            r.baseCurrency === to &&
            r.targetCurrency === from &&
            r.date === targetDate
        );

        if (rate) return 1 / rate.rate;

        // Get most recent rate
        const recentRate = rates
            .filter(r =>
                (r.baseCurrency === from && r.targetCurrency === to) ||
                (r.baseCurrency === to && r.targetCurrency === from)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (recentRate) {
            return recentRate.baseCurrency === from ? recentRate.rate : 1 / recentRate.rate;
        }

        // Fallback to default rates (as of 2025)
        return this.getDefaultRate(from, to);
    }

    /**
     * Default exchange rates (fallback)
     */
    private getDefaultRate(from: Currency, to: Currency): number {
        const defaultRates: Record<Currency, Record<Currency, number>> = {
            'CLP': {
                'CLP': 1,
                'USD': 0.0010,  // ~1000 CLP = 1 USD
                'EUR': 0.0009,  // ~1100 CLP = 1 EUR
                'UF': 0.000025, // ~40,000 CLP = 1 UF
                'BRL': 0.0055,  // ~180 CLP = 1 BRL
                'ARS': 0.9,     // ~1.1 CLP = 1 ARS
                'PEN': 0.0027   // ~370 CLP = 1 PEN
            },
            'USD': {
                'CLP': 1000,
                'USD': 1,
                'EUR': 0.92,
                'UF': 0.025,
                'BRL': 5.5,
                'ARS': 900,
                'PEN': 2.7
            },
            'EUR': {
                'CLP': 1100,
                'USD': 1.09,
                'EUR': 1,
                'UF': 0.027,
                'BRL': 6.0,
                'ARS': 980,
                'PEN': 2.95
            },
            'UF': {
                'CLP': 40000,
                'USD': 40,
                'EUR': 37,
                'UF': 1,
                'BRL': 220,
                'ARS': 36000,
                'PEN': 108
            },
            'BRL': {
                'CLP': 180,
                'USD': 0.18,
                'EUR': 0.17,
                'UF': 0.0045,
                'BRL': 1,
                'ARS': 162,
                'PEN': 0.49
            },
            'ARS': {
                'CLP': 1.1,
                'USD': 0.0011,
                'EUR': 0.001,
                'UF': 0.000028,
                'BRL': 0.0062,
                'ARS': 1,
                'PEN': 0.003
            },
            'PEN': {
                'CLP': 370,
                'USD': 0.37,
                'EUR': 0.34,
                'UF': 0.0093,
                'BRL': 2.04,
                'ARS': 333,
                'PEN': 1
            }
        };

        return defaultRates[from]?.[to] || 1;
    }

    /**
     * Convert amount between currencies
     */
    async convertCurrency(amount: number, from: Currency, to: Currency, date?: string): Promise<MultiCurrencyAmount> {
        const rate = await this.getExchangeRate(from, to, date);
        const convertedAmount = amount * rate;

        return {
            amount: convertedAmount,
            currency: to,
            exchangeRate: rate,
            conversionDate: date || new Date().toISOString().split('T')[0]
        };
    }

    /**
     * Convert to base currency (CLP)
     */
    async toBaseCurrency(amount: number, from: Currency, date?: string): Promise<number> {
        if (from === this.BASE_CURRENCY) return amount;
        const result = await this.convertCurrency(amount, from, this.BASE_CURRENCY, date);
        return result.amount;
    }

    /**
     * Update exchange rate
     */
    async updateExchangeRate(from: Currency, to: Currency, rate: number, source: ExchangeRate['source'] = 'MANUAL'): Promise<ExchangeRate> {
        const newRate: ExchangeRate = {
            id: crypto.randomUUID(),
            baseCurrency: from,
            targetCurrency: to,
            rate,
            date: new Date().toISOString().split('T')[0],
            source
        };

        const rates = this.getAllRates();
        rates.push(newRate);
        localStorage.setItem(this.RATES_KEY, JSON.stringify(rates));

        return newRate;
    }

    /**
     * Fetch latest exchange rates (simplified - in production would call API)
     */
    async fetchLatestRates(): Promise<ExchangeRate[]> {
        // In production, this would call:
        // - Banco Central de Chile API for official rates
        // - mindicador.cl API for UF and other Chilean units
        // - exchangeratesapi.io or similar for international rates

        const newRates: ExchangeRate[] = [];
        const today = new Date().toISOString().split('T')[0];

        // Simulate fetching rates
        const currenciesToFetch: Currency[] = ['USD', 'EUR', 'UF', 'BRL', 'ARS', 'PEN'];

        for (const currency of currenciesToFetch) {
            const rate = this.getDefaultRate(this.BASE_CURRENCY, currency);

            // Add small random variation to simulate market changes
            const variation = 1 + (Math.random() - 0.5) * 0.02; // ±1%
            const adjustedRate = rate * variation;

            newRates.push({
                id: crypto.randomUUID(),
                baseCurrency: this.BASE_CURRENCY,
                targetCurrency: currency,
                rate: adjustedRate,
                date: today,
                source: 'API'
            });
        }

        // Save rates
        const existingRates = this.getAllRates();
        const updatedRates = [...existingRates, ...newRates];
        localStorage.setItem(this.RATES_KEY, JSON.stringify(updatedRates));

        return newRates;
    }

    /**
     * Calculate FX gain/loss
     */
    async calculateFXGainLoss(
        originalAmount: number,
        originalCurrency: Currency,
        originalRate: number,
        currentDate?: string
    ): Promise<FXGainLoss> {
        const currentRate = await this.getExchangeRate(originalCurrency, this.BASE_CURRENCY, currentDate);

        const originalValueInBase = originalAmount * originalRate;
        const currentValueInBase = originalAmount * currentRate;
        const fxGainLoss = currentValueInBase - originalValueInBase;

        return {
            id: crypto.randomUUID(),
            type: 'UNREALIZED',
            currency: originalCurrency,
            amount: fxGainLoss,
            originalAmount,
            originalCurrency,
            originalRate,
            currentRate,
            date: currentDate || new Date().toISOString()
        };
    }

    /**
     * Realize FX gain/loss (when transaction is settled)
     */
    async realizeFXGainLoss(
        originalAmount: number,
        originalCurrency: Currency,
        originalRate: number,
        settlementRate: number,
        referenceId?: string
    ): Promise<FXGainLoss> {
        const originalValueInBase = originalAmount * originalRate;
        const settledValueInBase = originalAmount * settlementRate;
        const realizedGainLoss = settledValueInBase - originalValueInBase;

        const fxEntry: FXGainLoss = {
            id: crypto.randomUUID(),
            type: 'REALIZED',
            currency: originalCurrency,
            amount: realizedGainLoss,
            originalAmount,
            originalCurrency,
            originalRate,
            currentRate: settlementRate,
            date: new Date().toISOString(),
            referenceId
        };

        // Save to history
        const history = this.getAllFXGainLosses();
        history.push(fxEntry);
        localStorage.setItem(this.FX_GAINS_KEY, JSON.stringify(history));

        // Create accounting entry for realized FX
        if (Math.abs(realizedGainLoss) > 100) { // Only if significant
            await this.createFXAccountingEntry(fxEntry);
        }

        return fxEntry;
    }

    /**
     * Create accounting entry for FX gain/loss
     */
    private async createFXAccountingEntry(fx: FXGainLoss): Promise<void> {
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        const newEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            gloss: `${fx.type === 'REALIZED' ? 'Realización' : 'Registro'} de ${fx.amount > 0 ? 'Utilidad' : 'Pérdida'} en Cambio - ${fx.currency}`,
            type: fx.amount > 0 ? 'ingreso' : 'egreso',
            total: Math.abs(fx.amount),
            lines: [
                {
                    id: crypto.randomUUID(),
                    accountId: fx.amount > 0 ? '1.1.01.001' : '5.2.01.001', // Caja or Pérdida cambio
                    debit: fx.amount > 0 ? Math.abs(fx.amount) : 0,
                    credit: fx.amount > 0 ? 0 : Math.abs(fx.amount)
                },
                {
                    id: crypto.randomUUID(),
                    accountId: fx.amount > 0 ? '4.3.01.001' : '1.1.01.001', // Utilidad cambio or Caja
                    debit: fx.amount > 0 ? 0 : Math.abs(fx.amount),
                    credit: fx.amount > 0 ? Math.abs(fx.amount) : 0
                }
            ],
            fxGainLossId: fx.id
        };

        entries.push(newEntry);
        localStorage.setItem('accounting_journal', JSON.stringify(entries));
    }

    /**
     * Get currency balances
     */
    async getCurrencyBalances(): Promise<CurrencyBalance[]> {
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const balances = new Map<Currency, number>();

        // Calculate balances from invoices
        invoices.forEach((inv: any) => {
            if (inv.currency && inv.currency !== this.BASE_CURRENCY) {
                const current = balances.get(inv.currency) || 0;
                if (inv.status !== 'PAID') {
                    balances.set(inv.currency, current + (inv.total || 0));
                }
            }
        });

        // Convert to CurrencyBalance objects
        const result: CurrencyBalance[] = [];

        for (const [currency, balance] of balances) {
            const balanceInBase = await this.toBaseCurrency(balance, currency);

            result.push({
                currency,
                balance,
                balanceInBase,
                lastUpdated: new Date().toISOString()
            });
        }

        return result;
    }

    /**
     * Get FX exposure report
     */
    async getFXExposureReport(): Promise<{
        totalExposure: number;
        byCurrency: Map<Currency, number>;
        unrealizedGainLoss: number;
        atRisk: Currency[];
    }> {
        const balances = await this.getCurrencyBalances();
        const byCurrency = new Map<Currency, number>();
        let totalExposure = 0;
        let unrealizedGainLoss = 0;

        for (const balance of balances) {
            byCurrency.set(balance.currency, balance.balanceInBase);
            totalExposure += balance.balanceInBase;
        }

        // Calculate unrealized gains/losses
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');

        for (const inv of invoices) {
            if (inv.currency && inv.currency !== this.BASE_CURRENCY && inv.status !== 'PAID') {
                const originalRate = inv.exchangeRate || await this.getExchangeRate(inv.currency, this.BASE_CURRENCY, inv.date);
                const currentRate = await this.getExchangeRate(inv.currency, this.BASE_CURRENCY);

                const originalValue = inv.total * originalRate;
                const currentValue = inv.total * currentRate;

                unrealizedGainLoss += currentValue - originalValue;
            }
        }

        // Identify at-risk currencies (high exposure)
        const atRisk = Array.from(byCurrency.entries())
            .filter(([_, amount]) => amount > 5000000) // > 5M CLP
            .map(([currency]) => currency);

        return {
            totalExposure,
            byCurrency,
            unrealizedGainLoss,
            atRisk
        };
    }

    /**
     * Get all exchange rates
     */
    getAllRates(): ExchangeRate[] {
        try {
            return JSON.parse(localStorage.getItem(this.RATES_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Get all FX gains/losses
     */
    getAllFXGainLosses(): FXGainLoss[] {
        try {
            return JSON.parse(localStorage.getItem(this.FX_GAINS_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Get FX summary for period
     */
    getFXSummary(startDate: string, endDate: string): {
        totalRealized: number;
        totalUnrealized: number;
        byType: Map<'GAIN' | 'LOSS', number>;
        byCurrency: Map<Currency, number>;
    } {
        const allFX = this.getAllFXGainLosses();
        const filtered = allFX.filter(fx =>
            fx.date >= startDate && fx.date <= endDate
        );

        let totalRealized = 0;
        let totalUnrealized = 0;
        const byType = new Map<'GAIN' | 'LOSS', number>();
        const byCurrency = new Map<Currency, number>();

        filtered.forEach(fx => {
            if (fx.type === 'REALIZED') {
                totalRealized += fx.amount;
            } else {
                totalUnrealized += fx.amount;
            }

            const type = fx.amount > 0 ? 'GAIN' : 'LOSS';
            byType.set(type, (byType.get(type) || 0) + Math.abs(fx.amount));

            byCurrency.set(fx.currency, (byCurrency.get(fx.currency) || 0) + fx.amount);
        });

        return {
            totalRealized,
            totalUnrealized,
            byType,
            byCurrency
        };
    }

    /**
     * Format currency display
     */
    formatCurrency(amount: number, currency: Currency): string {
        const decimals = currency === 'CLP' ? 0 : 2;

        const symbols: Record<Currency, string> = {
            'CLP': '$',
            'USD': 'USD $',
            'EUR': '€',
            'UF': 'UF ',
            'BRL': 'R$',
            'ARS': 'ARS $',
            'PEN': 'S/'
        };

        const formatted = amount.toLocaleString('es-CL', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });

        return `${symbols[currency]}${formatted}`;
    }
}

export const multiCurrencySystem = new MultiCurrencySystem();
