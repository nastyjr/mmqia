/**
 * Approval Workflow Engine
 * Manages automatic approval rules for expenses and purchases
 */

export interface ApprovalRule {
    id: string;
    name: string;
    entityType: 'purchase_order' | 'expense' | 'invoice' | 'payment';
    conditions: ApprovalCondition[];
    action: 'auto_approve' | 'require_manager' | 'require_cfo' | 'require_board';
    enabled: boolean;
    priority: number; // Lower = higher priority
}

export interface ApprovalCondition {
    field: string; // 'amount', 'supplierId', 'category', etc.
    operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'in' | 'not_in';
    value: any;
}

export interface ApprovalRequest {
    id: string;
    entityType: string;
    entityId: string;
    requestedBy: string;
    requestedAt: string;
    amount: number;
    description: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver?: string;
    approvedAt?: string;
    notes?: string;
}

class ApprovalWorkflowEngine {
    private readonly RULES_KEY = 'approval_rules';
    private readonly REQUESTS_KEY = 'approval_requests';

    /**
     * Initialize with default rules
     */
    initializeDefaultRules(): void {
        const existingRules = this.getRules();
        if (existingRules.length > 0) return;

        const defaultRules: ApprovalRule[] = [
            {
                id: '1',
                name: 'Auto-aprobar compras pequeñas',
                entityType: 'purchase_order',
                conditions: [
                    { field: 'total', operator: 'lt', value: 100000 }
                ],
                action: 'auto_approve',
                enabled: true,
                priority: 1
            },
            {
                id: '2',
                name: 'Gerente: compras medianas',
                entityType: 'purchase_order',
                conditions: [
                    { field: 'total', operator: 'gte', value: 100000 },
                    { field: 'total', operator: 'lt', value: 500000 }
                ],
                action: 'require_manager',
                enabled: true,
                priority: 2
            },
            {
                id: '3',
                name: 'CFO: compras grandes',
                entityType: 'purchase_order',
                conditions: [
                    { field: 'total', operator: 'gte', value: 500000 },
                    { field: 'total', operator: 'lt', value: 2000000 }
                ],
                action: 'require_cfo',
                enabled: true,
                priority: 3
            },
            {
                id: '4',
                name: 'Directorio: compras muy grandes',
                entityType: 'purchase_order',
                conditions: [
                    { field: 'total', operator: 'gte', value: 2000000 }
                ],
                action: 'require_board',
                enabled: true,
                priority: 4
            },
            {
                id: '5',
                name: 'Auto-aprobar proveedores verificados',
                entityType: 'purchase_order',
                conditions: [
                    { field: 'supplierVerified', operator: 'eq', value: true },
                    { field: 'total', operator: 'lt', value: 300000 }
                ],
                action: 'auto_approve',
                enabled: true,
                priority: 0 // Highest priority
            }
        ];

        localStorage.setItem(this.RULES_KEY, JSON.stringify(defaultRules));
    }

    /**
     * Get all approval rules
     */
    getRules(): ApprovalRule[] {
        try {
            const data = localStorage.getItem(this.RULES_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Add or update rule
     */
    saveRule(rule: ApprovalRule): void {
        const rules = this.getRules();
        const existingIndex = rules.findIndex(r => r.id === rule.id);

        if (existingIndex >= 0) {
            rules[existingIndex] = rule;
        } else {
            rules.push(rule);
        }

        localStorage.setItem(this.RULES_KEY, JSON.stringify(rules));
    }

    /**
     * Process approval for an entity
     */
    processApproval(entityType: string, entity: any): {
        action: ApprovalRule['action'];
        rule?: ApprovalRule;
        autoApproved: boolean;
    } {
        const rules = this.getRules()
            .filter(r => r.entityType === entityType && r.enabled)
            .sort((a, b) => a.priority - b.priority);

        for (const rule of rules) {
            if (this.evaluateConditions(rule.conditions, entity)) {
                const autoApproved = rule.action === 'auto_approve';

                if (autoApproved) {
                    // Auto-approve
                    this.logApproval({
                        entityType,
                        entityId: entity.id,
                        action: 'APPROVED',
                        approver: 'SYSTEM',
                        rule: rule.name,
                        timestamp: new Date().toISOString()
                    });
                }

                return {
                    action: rule.action,
                    rule,
                    autoApproved
                };
            }
        }

        // No matching rule - default to require manager
        return {
            action: 'require_manager',
            autoApproved: false
        };
    }

    /**
     * Evaluate conditions
     */
    private evaluateConditions(conditions: ApprovalCondition[], entity: any): boolean {
        return conditions.every(condition => {
            const value = this.getNestedValue(entity, condition.field);

            switch (condition.operator) {
                case 'lt': return value < condition.value;
                case 'lte': return value <= condition.value;
                case 'gt': return value > condition.value;
                case 'gte': return value >= condition.value;
                case 'eq': return value === condition.value;
                case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
                case 'not_in': return Array.isArray(condition.value) && !condition.value.includes(value);
                default: return false;
            }
        });
    }

    /**
     * Get nested value from object
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Create approval request
     */
    createApprovalRequest(params: {
        entityType: string;
        entityId: string;
        requestedBy: string;
        amount: number;
        description: string;
    }): ApprovalRequest {
        const request: ApprovalRequest = {
            id: crypto.randomUUID(),
            ...params,
            requestedAt: new Date().toISOString(),
            status: 'PENDING'
        };

        const requests = this.getApprovalRequests();
        requests.push(request);
        localStorage.setItem(this.REQUESTS_KEY, JSON.stringify(requests));

        return request;
    }

    /**
     * Get all approval requests
     */
    getApprovalRequests(): ApprovalRequest[] {
        try {
            const data = localStorage.getItem(this.REQUESTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Approve request
     */
    approveRequest(requestId: string, approver: string, notes?: string): void {
        const requests = this.getApprovalRequests();
        const request = requests.find(r => r.id === requestId);

        if (request) {
            request.status = 'APPROVED';
            request.approver = approver;
            request.approvedAt = new Date().toISOString();
            request.notes = notes;

            localStorage.setItem(this.REQUESTS_KEY, JSON.stringify(requests));

            this.logApproval({
                entityType: request.entityType,
                entityId: request.entityId,
                action: 'APPROVED',
                approver,
                timestamp: request.approvedAt,
                notes
            });
        }
    }

    /**
     * Reject request
     */
    rejectRequest(requestId: string, approver: string, notes: string): void {
        const requests = this.getApprovalRequests();
        const request = requests.find(r => r.id === requestId);

        if (request) {
            request.status = 'REJECTED';
            request.approver = approver;
            request.approvedAt = new Date().toISOString();
            request.notes = notes;

            localStorage.setItem(this.REQUESTS_KEY, JSON.stringify(requests));

            this.logApproval({
                entityType: request.entityType,
                entityId: request.entityId,
                action: 'REJECTED',
                approver,
                timestamp: request.approvedAt,
                notes
            });
        }
    }

    /**
     * Log approval decision
     */
    private logApproval(log: any): void {
        try {
            const logs = JSON.parse(localStorage.getItem('approval_logs') || '[]');
            logs.push(log);

            // Keep last 500 logs
            const trimmed = logs.slice(-500);
            localStorage.setItem('approval_logs', JSON.stringify(trimmed));
        } catch (error) {
            console.error('Error logging approval:', error);
        }
    }

    /**
     * Get pending requests for approver
     */
    getPendingRequests(approverRole?: string): ApprovalRequest[] {
        const requests = this.getApprovalRequests();
        return requests.filter(r => r.status === 'PENDING');
    }
}

export const approvalWorkflowEngine = new ApprovalWorkflowEngine();

// Initialize default rules
approvalWorkflowEngine.initializeDefaultRules();
