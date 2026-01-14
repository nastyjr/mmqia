import { eventBus, EVENTS } from '../eventBus';

// Threshold could be dynamic per product, but hardcoded for MVP
const MIN_STOCK_THRESHOLD = 5;

export const initInventoryReactor = () => {
    eventBus.on(EVENTS.STOCK_MOVED, (movement: any) => {
        // movement structure expected: { productId, productName, newQuantity, type }
        console.log(`📦 Inventory Reactor: Analyzing movement for ${movement.productName} (New Qty: ${movement.newQuantity})`);

        if (movement.newQuantity !== undefined && movement.newQuantity <= MIN_STOCK_THRESHOLD) {
            console.warn(`⚠️ LOW STOCK ALERT: ${movement.productName} is at ${movement.newQuantity} units!`);

            eventBus.emit(EVENTS.LOW_STOCK_DETECTED, {
                productId: movement.productId,
                productName: movement.productName,
                quantity: movement.newQuantity,
                severity: movement.newQuantity === 0 ? 'CRITICAL' : 'HIGH'
            });
        }
    });
};
