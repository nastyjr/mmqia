/**
 * Intelligent Alerts System 2.0
 * Smart notification grouping, prioritization and trend analysis
 */

export interface SmartAlert {
    id: string;
    title: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'TAX' | 'FINANCE' | 'INVENTORY' | 'SYSTEM' | 'SECURITY';
    timestamp: string;
    isRead: boolean;
    groupId?: string; // For grouped alerts
    actionLink?: string;
    expiryDate?: string;
}

class IntelligentAlertsSystem {
    private alerts: SmartAlert[] = [];
    private readonly STORAGE_KEY = 'smart_alerts_v2';

    constructor() {
        this.loadAlerts();
        this.cleanupExpired();
    }

    /**
     * Create a new smart alert
     */
    create(alert: Omit<SmartAlert, 'id' | 'timestamp' | 'isRead'>): SmartAlert {
        // 1. Check for duplicates/grouping
        const existingGroup = this.findSimilarAlertGroup(alert);

        const newAlert: SmartAlert = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            isRead: false,
            groupId: existingGroup,
            ...alert
        };

        // Auto-dismiss low priority if too many
        if (alert.priority === 'LOW') {
            this.manageLowPriorityQuota();
        }

        this.alerts.unshift(newAlert);
        this.saveAlerts();

        return newAlert;
    }

    /**
     * Find similar alerts to group them
     */
    private findSimilarAlertGroup(alert: Omit<SmartAlert, 'id' | 'timestamp' | 'isRead'>): string | undefined {
        // Logic to group similar alerts (e.g. valid "multiple stock low" alerts)
        const similar = this.alerts.find(a =>
            a.category === alert.category &&
            a.title === alert.title &&
            !a.isRead &&
            new Date(a.timestamp).getTime() > Date.now() - (1000 * 60 * 60) // Last hour
        );
        return similar?.groupId || similar?.id;
    }

    /**
     * Limit low priority alerts
     */
    private manageLowPriorityQuota() {
        const lowPriority = this.alerts.filter(a => a.priority === 'LOW' && !a.isRead);
        if (lowPriority.length > 5) {
            // Auto-read oldest low priority
            const oldest = lowPriority[lowPriority.length - 1];
            oldest.isRead = true;
        }
    }

    /**
     * Get grouped alerts for UI
     */
    getGroupedAlerts(): Record<string, SmartAlert[]> {
        // Group by category or manually defined groups
        const groups: Record<string, SmartAlert[]> = {};

        this.alerts.filter(a => !a.isRead).forEach(alert => {
            const key = alert.category;
            if (!groups[key]) groups[key] = [];
            groups[key].push(alert);
        });

        return groups;
    }

    /**
     * Cleanup expired alerts
     */
    private cleanupExpired() {
        const now = new Date().toISOString();
        this.alerts = this.alerts.filter(a => !a.expiryDate || a.expiryDate > now);
        this.saveAlerts();
    }

    private loadAlerts() {
        try {
            this.alerts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch {
            this.alerts = [];
        }
    }

    private saveAlerts() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.alerts));
    }

    getUnreadCount(): number {
        return this.alerts.filter(a => !a.isRead).length;
    }
}

export const intelligentAlerts = new IntelligentAlertsSystem();
