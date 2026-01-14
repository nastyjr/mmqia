/**
 * Automated Backup Service
 * Schedules and manages automatic backups
 */

export interface BackupMetadata {
    id: string;
    timestamp: string;
    size: number; // bytes
    entities: {
        invoices: number;
        products: number;
        entries: number;
        customers: number;
        assets: number;
    };
    version: string;
}

export interface BackupSchedule {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM (24h format)
    retention: {
        daily: number; // Keep last N days
        weekly: number; // Keep last N weeks
        monthly: number; // Keep last N months
    };
    lastRun?: string;
}

class BackupService {
    private readonly STORAGE_KEY_PREFIX = 'backup_';
    private readonly SCHEDULE_KEY = 'backup_schedule';
    private readonly METADATA_KEY = 'backup_metadata';

    /**
     * Create full backup of all data
     */
    createBackup(): BackupMetadata {
        const timestamp = new Date().toISOString();
        const id = `backup_${Date.now()}`;

        // Collect all data
        const data: any = {
            version: '1.0.0',
            timestamp,
            data: {
                invoices: this.getStorageData('invoicing_db'),
                products: this.getStorageData('inventory_products'),
                productStocks: this.getStorageData('product_stocks'),
                customers: this.getStorageData('customers_db'),
                suppliers: this.getStorageData('suppliers_db'),
                journalEntries: this.getStorageData('accounting_journal'),
                purchaseOrders: this.getStorageData('purchase_orders_db'),
                quotes: this.getStorageData('quotes_db'),
                fixedAssets: this.getStorageData('fixed_assets_db'),
                closures: this.getStorageData('period_closures'),
                settings: {
                    chartOfAccounts: this.getStorageData('chart_of_accounts'),
                    company: this.getStorageData('company_info')
                }
            }
        };

        // Calculate sizes
        const entities = {
            invoices: data.data.invoices?.length || 0,
            products: data.data.products?.length || 0,
            entries: data.data.journalEntries?.length || 0,
            customers: data.data.customers?.length || 0,
            assets: data.data.fixedAssets?.length || 0
        };

        const jsonString = JSON.stringify(data);
        const size = new Blob([jsonString]).size;

        const metadata: BackupMetadata = {
            id,
            timestamp,
            size,
            entities,
            version: '1.0.0'
        };

        // Save backup
        try {
            localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${id}`, jsonString);
            this.saveBackupMetadata(metadata);

            // Clean old backups
            this.applyRetentionPolicy();

            return metadata;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Failed to create backup. Storage might be full.');
        }
    }

    /**
     * Get data from localStorage
     */
    private getStorageData(key: string): any {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    /**
     * Save backup metadata
     */
    private saveBackupMetadata(metadata: BackupMetadata): void {
        try {
            const existing = this.getAllBackupMetadata();
            existing.push(metadata);
            localStorage.setItem(this.METADATA_KEY, JSON.stringify(existing));
        } catch (error) {
            console.error('Error saving backup metadata:', error);
        }
    }

    /**
     * Get all backup metadata
     */
    getAllBackupMetadata(): BackupMetadata[] {
        try {
            const data = localStorage.getItem(this.METADATA_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Restore from backup
     */
    restoreBackup(backupId: string): boolean {
        try {
            const backupData = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${backupId}`);
            if (!backupData) {
                throw new Error('Backup not found');
            }

            const backup = JSON.parse(backupData);

            // Restore all data
            Object.entries(backup.data).forEach(([category, value]: [string, any]) => {
                if (category === 'settings') {
                    Object.entries(value).forEach(([key, val]) => {
                        localStorage.setItem(key, JSON.stringify(val));
                    });
                } else {
                    localStorage.setItem(this.getStorageKeyForCategory(category), JSON.stringify(value));
                }
            });

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }

    /**
     * Map category to storage key
     */
    private getStorageKeyForCategory(category: string): string {
        const mapping: { [key: string]: string } = {
            'invoices': 'invoicing_db',
            'products': 'inventory_products',
            'productStocks': 'product_stocks',
            'customers': 'customers_db',
            'suppliers': 'suppliers_db',
            'journalEntries': 'accounting_journal',
            'purchaseOrders': 'purchase_orders_db',
            'quotes': 'quotes_db',
            'fixedAssets': 'fixed_assets_db',
            'closures': 'period_closures'
        };
        return mapping[category] || category;
    }

    /**
     * Download backup as file
     */
    downloadBackup(backupId: string, filename?: string): void {
        const backupData = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${backupId}`);
        if (!backupData) {
            throw new Error('Backup not found');
        }

        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `backup_${backupId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Apply retention policy to old backups
     */
    private applyRetentionPolicy(): void {
        const schedule = this.getSchedule();
        const backups = this.getAllBackupMetadata();

        if (!schedule.enabled) return;

        const now = new Date();
        const toDelete: string[] = [];

        // Group by type
        const daily: BackupMetadata[] = [];
        const weekly: BackupMetadata[] = [];
        const monthly: BackupMetadata[] = [];

        backups.forEach(backup => {
            const backupDate = new Date(backup.timestamp);
            const ageInDays = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24));

            if (ageInDays <= 7) {
                daily.push(backup);
            } else if (ageInDays <= 30) {
                weekly.push(backup);
            } else {
                monthly.push(backup);
            }
        });

        // Apply retention
        if (daily.length > schedule.retention.daily) {
            const excess = daily.slice(schedule.retention.daily);
            toDelete.push(...excess.map(b => b.id));
        }

        if (weekly.length > schedule.retention.weekly) {
            const excess = weekly.slice(schedule.retention.weekly);
            toDelete.push(...excess.map(b => b.id));
        }

        if (monthly.length > schedule.retention.monthly) {
            const excess = monthly.slice(schedule.retention.monthly);
            toDelete.push(...excess.map(b => b.id));
        }

        // Delete old backups
        toDelete.forEach(id => {
            localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${id}`);
        });

        // Update metadata
        const remaining = backups.filter(b => !toDelete.includes(b.id));
        localStorage.setItem(this.METADATA_KEY, JSON.stringify(remaining));
    }

    /**
     * Get backup schedule
     */
    getSchedule(): BackupSchedule {
        try {
            const data = localStorage.getItem(this.SCHEDULE_KEY);
            return data ? JSON.parse(data) : this.getDefaultSchedule();
        } catch {
            return this.getDefaultSchedule();
        }
    }

    /**
     * Update backup schedule
     */
    updateSchedule(schedule: Partial<BackupSchedule>): void {
        const current = this.getSchedule();
        const updated = { ...current, ...schedule };
        localStorage.setItem(this.SCHEDULE_KEY, JSON.stringify(updated));
    }

    /**
     * Get default schedule
     */
    private getDefaultSchedule(): BackupSchedule {
        return {
            enabled: true,
            frequency: 'daily',
            time: '02:00',
            retention: {
                daily: 7,
                weekly: 4,
                monthly: 12
            }
        };
    }

    /**
     * Check if backup should run now
     */
    shouldRunBackup(): boolean {
        const schedule = this.getSchedule();
        if (!schedule.enabled) return false;

        const now = new Date();
        const [hours, minutes] = schedule.time.split(':').map(Number);

        // Check if current time matches schedule (within 1 minute)
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const diffMinutes = Math.abs(now.getTime() - scheduledTime.getTime()) / (1000 * 60);

        if (diffMinutes > 1) return false;

        // Check last run
        if (schedule.lastRun) {
            const lastRun = new Date(schedule.lastRun);
            const daysSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24);

            if (schedule.frequency === 'daily' && daysSinceLastRun < 1) return false;
            if (schedule.frequency === 'weekly' && daysSinceLastRun < 7) return false;
            if (schedule.frequency === 'monthly' && daysSinceLastRun < 30) return false;
        }

        return true;
    }

    /**
     * Run scheduled backup
     */
    runScheduledBackup(): BackupMetadata | null {
        if (!this.shouldRunBackup()) return null;

        try {
            const metadata = this.createBackup();

            // Update last run
            const schedule = this.getSchedule();
            schedule.lastRun = new Date().toISOString();
            this.updateSchedule(schedule);

            return metadata;
        } catch (error) {
            console.error('Scheduled backup failed:', error);
            return null;
        }
    }
}

export const backupService = new BackupService();
