import { initReconciliationReactor } from './reconciliationReactor';
import { initAnomalyReactor } from './anomalyReactor';
import { initInventoryReactor } from './inventoryReactor';

import { initRecurringBillingReactor } from './recurringBillingReactor';
import { initSIIReactor } from './siiReactor';
import { initCollectionsReactor } from './collectionsReactor';

export const initReactors = () => {
    initAnomalyReactor();
    initReconciliationReactor();
    initInventoryReactor();
    initRecurringBillingReactor();
    initSIIReactor();
    initCollectionsReactor();

    console.log('⚛️ System Reactors Initialized');
};
