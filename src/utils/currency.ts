
export interface CurrencyIndicator {
    code: 'UF' | 'USD' | 'EUR' | 'UTM';
    name: string;
    value: number;
    date: string;
}

export const fetchIndicators = async (): Promise<CurrencyIndicator[]> => {
    try {
        const response = await fetch('https://mindicador.cl/api');
        const data = await response.json();

        return [
            { code: 'UF', name: 'Unidad de Fomento', value: data.uf.valor, date: data.uf.fecha },
            { code: 'USD', name: 'Dólar Observado', value: data.dolar.valor, date: data.dolar.fecha },
            { code: 'EUR', name: 'Euro', value: data.euro.valor, date: data.euro.fecha },
            { code: 'UTM', name: 'UTM', value: data.utm.valor, date: data.utm.fecha },
        ];
    } catch (error) {
        console.error('Error fetching indicators:', error);
        // Fallback values if API fails (approximate)
        return [
            { code: 'UF', name: 'Unidad de Fomento', value: 36563, date: new Date().toISOString() },
            { code: 'USD', name: 'Dólar Observado', value: 950, date: new Date().toISOString() },
            { code: 'EUR', name: 'Euro', value: 1020, date: new Date().toISOString() },
            { code: 'UTM', name: 'UTM', value: 64231, date: new Date().toISOString() },
        ];
    }
};
