import React from 'react';
import { DriftState } from '@/types';

interface DriftStateBadgeProps {
    driftState: DriftState;
    consecutiveDays?: number;
}

/**
 * Visual badge indicating drift state
 * STABLE = green, EARLY_DRIFT = yellow, ACTION_REQUIRED = orange
 */
export default function DriftStateBadge({ driftState, consecutiveDays = 0 }: DriftStateBadgeProps) {
    if (driftState === 'STABLE') {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-green-700">Stable</span>
            </div>
        );
    }

    if (driftState === 'EARLY_DRIFT') {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-300 rounded-full">
                <span className="text-yellow-600 text-sm">⚠️</span>
                <span className="text-xs font-medium text-yellow-700">
                    Early Drift ({consecutiveDays}d)
                </span>
            </div>
        );
    }

    // ACTION_REQUIRED
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-300 rounded-full">
            <span className="text-orange-600 text-sm">🔔</span>
            <span className="text-xs font-medium text-orange-700">
                Action Required
            </span>
        </div>
    );
}
