/**
 * Backup & Restore Utility
 * Exports and imports all application data
 */

export interface BackupData {
    version: string;
    timestamp: string;
    companyName?: string;
    data: {
        journalEntries?: string;
        budgets?: string;
        period_closures?: string;
        inventory_products?: string;
        inventory_movements?: string;
        crm_third_parties?: string;
        fixed_assets?: string;
        [key: string]: string | undefined;
    };
}

export const createBackup = (): BackupData => {
    const backup: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        companyName: 'Mi Empresa',
        data: {}
    };

    // Collect all localStorage data
    const keys = [
        'journalEntries',
        'budgets',
        'period_closures',
        'inventory_products',
        'inventory_movements',
        'crm_third_parties',
        'fixed_assets',
        'bank_reconciliations'
    ];

    keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            backup.data[key] = value;
        }
    });

    return backup;
};

export const downloadBackup = () => {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const restoreBackup = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const backup: BackupData = JSON.parse(content);

                // Validate backup version
                if (!backup.version || !backup.data) {
                    throw new Error('Formato de backup inválido');
                }

                // Restore all data
                Object.entries(backup.data).forEach(([key, value]) => {
                    if (value) {
                        localStorage.setItem(key, value);
                    }
                });

                resolve();
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
    });
};

export const getBackupInfo = (backup: BackupData) => {
    const items = Object.keys(backup.data).filter(key => backup.data[key]);
    const size = new Blob([JSON.stringify(backup)]).size;

    return {
        version: backup.version,
        timestamp: new Date(backup.timestamp).toLocaleString('es-CL'),
        itemCount: items.length,
        sizeKB: (size / 1024).toFixed(2)
    };
};
