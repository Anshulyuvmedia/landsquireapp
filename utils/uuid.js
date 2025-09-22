// utils/uuid.js
import * as Crypto from 'expo-crypto';

// Synchronous drop-in replacement for uuid.v4()
export function getUUIDSync() {
    try {
        return Crypto.randomUUID();
    } catch (error) {
        console.error("UUID generation failed:", error);
        // Fallback to timestamp + random number
        return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    }
}
