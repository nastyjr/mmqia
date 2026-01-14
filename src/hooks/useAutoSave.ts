/**
 * Auto-Save Hook for Forms
 * Automatically saves draft data to localStorage at intervals
 */

import { useEffect, useRef } from 'react';

interface AutoSaveOptions {
    key: string;
    data: any;
    enabled?: boolean;
    interval?: number; // milliseconds
    onSave?: () => void;
}

export const useAutoSave = ({
    key,
    data,
    enabled = true,
    interval = 30000, // 30 seconds default
    onSave
}: AutoSaveOptions) => {
    const dataRef = useRef(data);
    const lastSavedRef = useRef<string>('');

    // Update ref when data changes
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        if (!enabled) return;

        const saveData = () => {
            try {
                const currentDataStr = JSON.stringify(dataRef.current);

                // Only save if data has changed
                if (currentDataStr !== lastSavedRef.current) {
                    localStorage.setItem(`draft_${key}`, currentDataStr);
                    localStorage.setItem(`draft_${key}_timestamp`, new Date().toISOString());
                    lastSavedRef.current = currentDataStr;

                    if (onSave) {
                        onSave();
                    }

                    console.log(`[AutoSave] Draft saved for ${key}`);
                }
            } catch (error) {
                console.error('[AutoSave] Error saving draft:', error);
            }
        };

        // Save immediately on mount if there's data
        if (dataRef.current && Object.keys(dataRef.current).length > 0) {
            saveData();
        }

        // Set up interval
        const intervalId = setInterval(saveData, interval);

        // Cleanup
        return () => {
            clearInterval(intervalId);
            // Save one last time on unmount
            saveData();
        };
    }, [key, enabled, interval, onSave]);
};

/**
 * Load draft from localStorage
 */
export const loadDraft = <T>(key: string): { data: T | null; timestamp: string | null } => {
    try {
        const dataStr = localStorage.getItem(`draft_${key}`);
        const timestamp = localStorage.getItem(`draft_${key}_timestamp`);

        if (!dataStr) {
            return { data: null, timestamp: null };
        }

        const data = JSON.parse(dataStr) as T;
        return { data, timestamp };
    } catch (error) {
        console.error('[AutoSave] Error loading draft:', error);
        return { data: null, timestamp: null };
    }
};

/**
 * Clear draft from localStorage
 */
export const clearDraft = (key: string): void => {
    try {
        localStorage.removeItem(`draft_${key}`);
        localStorage.removeItem(`draft_${key}_timestamp`);
        console.log(`[AutoSave] Draft cleared for ${key}`);
    } catch (error) {
        console.error('[AutoSave] Error clearing draft:', error);
    }
};

/**
 * Check if a draft exists
 */
export const hasDraft = (key: string): boolean => {
    return localStorage.getItem(`draft_${key}`) !== null;
};

/**
 * Get human-readable time since last save
 */
export const getTimeSinceLastSave = (timestamp: string | null): string => {
    if (!timestamp) return 'nunca';

    const now = new Date();
    const saved = new Date(timestamp);
    const diffMs = now.getTime() - saved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return 'hace unos segundos';
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    return saved.toLocaleDateString('es-CL');
};
