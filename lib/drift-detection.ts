import { AnimalBaseline, DailyDeviation, DriftState, EarlyWarningAssessment, HealthMetrics } from '@/types';
import { calculateDeviation } from './baseline-learning';

/**
 * Early Health Drift Detection (EHDD)
 * Preventive intelligence layer that detects micro-deviations before they become critical
 */

// Configuration for drift detection thresholds
export const DRIFT_CONFIG = {
    ROLLING_WINDOW_DAYS: 7,
    MIN_DEVIATION_PCT: 5,    // 5% minimum to flag
    MAX_DEVIATION_PCT: 15,   // 15% max for early warning range
    CONSECUTIVE_DAYS: 3,     // Need 3 consecutive days
    MIN_SIGNALS: 2,          // At least 2 metrics drifting
    ACTION_THRESHOLD_DAYS: 5, // 5+ days → action required
};

/**
 * Calculate daily deviation from personal baseline
 */
export function calculateDailyDeviation(
    currentMetrics: HealthMetrics,
    baseline: AnimalBaseline
): DailyDeviation {
    // Calculate percentage deviations from personal baseline
    const activityDelta = calculateDeviation(
        currentMetrics.activityLevel,
        baseline.avgActivityLevel
    );

    const speedDelta = calculateDeviation(
        currentMetrics.averageSpeed,
        baseline.avgSpeed
    );

    const visitDelta = calculateDeviation(
        currentMetrics.visitFrequency24h,
        baseline.avgVisitsPerDay
    );

    // Count how many signals are in the drift range (5-15%)
    let flagCount = 0;
    const absActivity = Math.abs(activityDelta);
    const absSpeed = Math.abs(speedDelta);
    const absVisit = Math.abs(visitDelta);

    if (absActivity >= DRIFT_CONFIG.MIN_DEVIATION_PCT && absActivity <= DRIFT_CONFIG.MAX_DEVIATION_PCT) {
        flagCount++;
    }
    if (absSpeed >= DRIFT_CONFIG.MIN_DEVIATION_PCT && absSpeed <= DRIFT_CONFIG.MAX_DEVIATION_PCT) {
        flagCount++;
    }
    if (absVisit >= DRIFT_CONFIG.MIN_DEVIATION_PCT && absVisit <= DRIFT_CONFIG.MAX_DEVIATION_PCT) {
        flagCount++;
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    return {
        date: today,
        activityDeltaPct: activityDelta,
        speedDeltaPct: speedDelta,
        visitDeltaPct: visitDelta,
        flagCount,
    };
}

/**
 * Filter deviations to rolling 7-day window
 */
export function filterToRollingWindow(
    allDeviations: DailyDeviation[],
    windowDays: number = DRIFT_CONFIG.ROLLING_WINDOW_DAYS
): DailyDeviation[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    return allDeviations
        .filter(d => new Date(d.date) >= cutoffDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Detect consecutive days with drift
 */
export function detectConsecutiveDrift(
    deviations: DailyDeviation[]
): {
    hasConsecutiveDrift: boolean;
    consecutiveDays: number;
    triggeredSignals: string[];
} {
    // Sort by date, most recent first
    const sorted = [...deviations].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let consecutiveDays = 0;
    const triggeredSignals = new Set<string>();

    // Check consecutive days starting from most recent
    for (const deviation of sorted) {
        // Need at least MIN_SIGNALS flagged to count as drift day
        if (deviation.flagCount >= DRIFT_CONFIG.MIN_SIGNALS) {
            consecutiveDays++;

            // Track which specific signals are drifting
            if (Math.abs(deviation.activityDeltaPct) >= DRIFT_CONFIG.MIN_DEVIATION_PCT) {
                triggeredSignals.add('activity');
            }
            if (Math.abs(deviation.speedDeltaPct) >= DRIFT_CONFIG.MIN_DEVIATION_PCT) {
                triggeredSignals.add('speed');
            }
            if (Math.abs(deviation.visitDeltaPct) >= DRIFT_CONFIG.MIN_DEVIATION_PCT) {
                triggeredSignals.add('visits');
            }
        } else {
            // Consecutive chain is broken
            break;
        }
    }

    return {
        hasConsecutiveDrift: consecutiveDays >= DRIFT_CONFIG.CONSECUTIVE_DAYS,
        consecutiveDays,
        triggeredSignals: Array.from(triggeredSignals),
    };
}

/**
 * Calculate drift state based on consecutive days and max deviation
 */
export function calculateDriftState(
    consecutiveDays: number,
    maxDeviation: number
): DriftState {
    // ACTION_REQUIRED if sustained drift for 5+ days OR deviation exceeds 15%
    if (consecutiveDays >= DRIFT_CONFIG.ACTION_THRESHOLD_DAYS || maxDeviation > DRIFT_CONFIG.MAX_DEVIATION_PCT) {
        return 'ACTION_REQUIRED';
    }

    // EARLY_DRIFT if 3+ consecutive days with micro-deviations  
    if (consecutiveDays >= DRIFT_CONFIG.CONSECUTIVE_DAYS) {
        return 'EARLY_DRIFT';
    }

    // Otherwise stable
    return 'STABLE';
}

/**
 * Generate early warning message based on drift state
 */
export function generateEarlyWarningMessage(
    driftState: DriftState,
    consecutiveDays: number,
    triggeredSignals: string[]
): string | undefined {
    if (driftState === 'STABLE') {
        return undefined;
    }

    const signalsList = triggeredSignals.join(', ');

    if (driftState === 'EARLY_DRIFT') {
        return `Micro-deviations detected for ${consecutiveDays} consecutive days in: ${signalsList}. Consider preventive check-up.`;
    }

    // ACTION_REQUIRED
    return `Sustained behavioral drift over ${consecutiveDays} days in: ${signalsList}. Veterinary consultation recommended.`;
}

/**
 * Main function: Generate early warning assessment
 */
export function generateEarlyWarningAssessment(
    animalId: string,
    recentDeviations: DailyDeviation[]
): EarlyWarningAssessment {
    // Filter to 7-day rolling window
    const windowDeviations = filterToRollingWindow(recentDeviations);

    // Detect consecutive drift
    const { hasConsecutiveDrift, consecutiveDays, triggeredSignals } =
        detectConsecutiveDrift(windowDeviations);

    // Calculate maximum deviation across all metrics and days
    const maxDeviation = windowDeviations.length > 0
        ? Math.max(
            ...windowDeviations.map(d =>
                Math.max(
                    Math.abs(d.activityDeltaPct),
                    Math.abs(d.speedDeltaPct),
                    Math.abs(d.visitDeltaPct)
                )
            )
        )
        : 0;

    // Determine drift state
    const driftState = calculateDriftState(consecutiveDays, maxDeviation);

    // Generate message
    const earlyWarningMessage = generateEarlyWarningMessage(
        driftState,
        consecutiveDays,
        triggeredSignals
    );

    return {
        animalId,
        driftState,
        consecutiveDaysWithDrift: consecutiveDays,
        recentDeviations: windowDeviations,
        triggeredSignals,
        earlyWarningMessage,
    };
}
