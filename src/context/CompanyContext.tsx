import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Company {
    id: string;
    rut: string;
    name: string;
    industry?: string;
}

interface CompanyContextType {
    companies: Company[];
    activeCompany: Company | null;
    setActiveCompany: (company: Company) => void;
    addCompany: (company: Omit<Company, 'id'>) => void;
    getScopedKey: (key: string) => string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const DEFAULT_COMPANY: Company = {
    id: 'default',
    rut: '76.123.456-7',
    name: 'Mi Empresa SpA',
    industry: 'Servicios de Tecnología'
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);

    // Initialize companies and migrate data if needed
    useEffect(() => {
        const storedCompanies = localStorage.getItem('erp_companies');
        const storedActiveId = localStorage.getItem('erp_active_company_id');

        let initialCompanies: Company[] = [];
        if (storedCompanies) {
            initialCompanies = JSON.parse(storedCompanies);
        } else {
            // First time load: Create default company AND MIGRATE EXISTING DATA
            console.log("Initializing Multi-Company System: Migrating existing data to Default Company...");
            initialCompanies = [DEFAULT_COMPANY];
            localStorage.setItem('erp_companies', JSON.stringify(initialCompanies));

            // Migration List: Keys that were previously global and now need to be scoped
            const keysToMigrate = [
                'journal_entries',
                'inventory_products',
                'inventory_movements',
                'crm_clients',
                'crm_interactions',
                'fixed_assets',
                'bank_movements'
            ];

            keysToMigrate.forEach(key => {
                const existingData = localStorage.getItem(key);
                if (existingData) {
                    // Move to scoped key
                    const newKey = `default_${key}`;
                    localStorage.setItem(newKey, existingData);
                    console.log(`Migrated ${key} -> ${newKey}`);
                    // Optional: Remove old key to clean up, or keep as backup. 
                    // Let's keep it as backup for safety, but maybe rename it specific backup
                    localStorage.setItem(`backup_pre_migration_${key}`, existingData);
                    // localStorage.removeItem(key); // Keeping original for now just in case
                }
            });
        }
        setCompanies(initialCompanies);

        if (storedActiveId) {
            const found = initialCompanies.find(c => c.id === storedActiveId);
            setActiveCompanyState(found || initialCompanies[0]);
        } else {
            setActiveCompanyState(initialCompanies[0]);
        }
    }, []);

    const setActiveCompany = (company: Company) => {
        setActiveCompanyState(company);
        localStorage.setItem('erp_active_company_id', company.id);
        // Force reload to refresh all data contexts with new scope
        window.location.reload();
    };

    const addCompany = (newCompanyData: Omit<Company, 'id'>) => {
        const newCompany: Company = {
            ...newCompanyData,
            id: crypto.randomUUID()
        };
        const updated = [...companies, newCompany];
        setCompanies(updated);
        localStorage.setItem('erp_companies', JSON.stringify(updated));
    };

    // Scopes a localStorage key to the active company
    // Example: 'journal_entries' -> 'default_journal_entries'
    const getScopedKey = (key: string) => {
        if (!activeCompany) return `default_${key}`; // Fallback
        return `${activeCompany.id}_${key}`;
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            activeCompany,
            setActiveCompany,
            addCompany,
            getScopedKey
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};
