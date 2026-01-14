import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, PayrollProcess, PayrollCalculations } from '../types/payroll';
import { useCompany } from './CompanyContext';

interface PayrollContextType {
    employees: Employee[];
    addEmployee: (employee: Employee) => void;
    updateEmployee: (id: string, employee: Partial<Employee>) => void;
    deleteEmployee: (id: string) => void;

    payrollHistory: PayrollProcess[];
    addPayrollProcess: (process: PayrollProcess) => void;
    deletePayrollProcess: (id: string) => void;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { getScopedKey, activeCompany } = useCompany();
    const [employees, setEmployees] = useState<Employee[]>([]);

    // History State
    const [payrollHistory, setPayrollHistory] = useState<PayrollProcess[]>([]);

    // Load from localStorage on mount or company change
    useEffect(() => {
        if (activeCompany) {
            // Load Employees
            const storedEmp = localStorage.getItem(getScopedKey('employees'));
            if (storedEmp) {
                try { setEmployees(JSON.parse(storedEmp)); } catch (e) { setEmployees([]); }
            } else { setEmployees([]); }

            // Load History
            const storedHistory = localStorage.getItem(getScopedKey('payroll_history'));
            if (storedHistory) {
                try { setPayrollHistory(JSON.parse(storedHistory)); } catch (e) { setPayrollHistory([]); }
            } else { setPayrollHistory([]); }
        }
    }, [activeCompany, getScopedKey]);

    // Save to localStorage whenever employees change
    useEffect(() => {
        if (activeCompany) {
            localStorage.setItem(getScopedKey('employees'), JSON.stringify(employees));
        }
    }, [employees, activeCompany, getScopedKey]);

    // Save History
    useEffect(() => {
        if (activeCompany) {
            localStorage.setItem(getScopedKey('payroll_history'), JSON.stringify(payrollHistory));
        }
    }, [payrollHistory, activeCompany, getScopedKey]);

    const addEmployee = (employee: Employee) => {
        setEmployees(prev => [...prev, employee]);
    };

    const updateEmployee = (id: string, updates: Partial<Employee>) => {
        setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp));
    };

    const deleteEmployee = (id: string) => {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
    };

    // History Actions
    const addPayrollProcess = (process: PayrollProcess) => {
        setPayrollHistory(prev => [...prev, process]);
    };

    const deletePayrollProcess = (id: string) => {
        setPayrollHistory(prev => prev.filter(p => p.id !== id));
    };

    return (
        <PayrollContext.Provider value={{
            employees, addEmployee, updateEmployee, deleteEmployee,
            payrollHistory, addPayrollProcess, deletePayrollProcess
        }}>
            {children}
        </PayrollContext.Provider>
    );
};

export const usePayroll = () => {
    const context = useContext(PayrollContext);
    if (context === undefined) {
        throw new Error('usePayroll must be used within a PayrollProvider');
    }
    return context;
};
