
import { JournalEntry } from '../types';

/**
 * SII Proxy Mock for Frontend Demo
 * This replaces the real backend call to allow the app to work 
 * in a browser-only environment without CORS errors.
 */
export const SIIProxy = {
    
    /**
     * Simulation of connection to SII
     */
    async connect(pfxFile: File | null, password: string): Promise<boolean> {
        console.log("Simulating connection to SII...");
        
        // Simulate network delay
        await new Promise(r => setTimeout(r, 1500));
        
        // Mock successful token
        sessionStorage.setItem('sii_token', 'MOCK_TOKEN_XYZ_123');
        return true;
    },

    /**
     * Mock RCV Synchronization
     */
    async syncRCV(month: number, year: number): Promise<any[]> {
        console.log(`Simulating RCV Sync for ${month}/${year}`);
        await new Promise(r => setTimeout(r, 1000));
        
        // Return dummy data
        return [
            { id: 1, type: '33', folio: 1234, amount: 150000, date: `${year}-${month}-05` },
            { id: 2, type: '33', folio: 1235, amount: 45000, date: `${year}-${month}-12` },
            { id: 3, type: '61', folio: 50, amount: -5000, date: `${year}-${month}-15` },
        ];
    },

    /**
     * Mock DTE Sending
     */
    async sendDTE(entry: JournalEntry) {
        console.log("Simulating DTE Send...", entry);
        await new Promise(r => setTimeout(r, 2000));
        return { trackId: 'TRACK_998877', status: 'RECEIVED' };
    }
};
