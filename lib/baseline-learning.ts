import { AnimalBaseline, BaselineStatus, HealthMetrics } from '@/types';

/**
 * Baseline learning module for personalized animal health monitoring
 * Each animal learns its own normal behavior patterns over 7-14 days
 */

// Configuration constants
export const BASELINE_CONFIG = {
    MIN_DATA_POINTS: 20, // Minimum samples needed
    MIN_DAYS: 7, // Minimum days of observation
    MAX_DAYS: 14, // Maximum learning period
    LEARNING_WINDOW_DAYS: 14,
};

/**
 * Initialize a new baseline for an animal
 */
export function initializeBaseline(animalId: string): AnimalBaseline {
    return {
        animalId,
        avgSpeed: 0,
        avgVisitsPerDay: 0,
        avgActivityLevel: 0,
        speedStdDev: 0,
        activityStdDev: 0,
        baselineStartDate: new Date().toISOString(),
        baselineStatus: 'LEARNING',
        dataPointsCollected: 0,
        requiredDataPoints: BASELINE_CONFIG.MIN_DATA_POINTS,
    };
}

/**
 * Calculate mean of an array of numbers
 */
function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

/**
 * Add a data point to the baseline and recalculate if needed
 */
export function addBaselineDataPoint(
    baseline: AnimalBaseline,
    dataPoints: HealthMetrics[]
): AnimalBaseline {
    // If already stable, don't add more learning data
    if (baseline.baselineStatus === 'STABLE') {
        return baseline;
    }

    const updatedBaseline = { ...baseline };
    updatedBaseline.dataPointsCollected = dataPoints.length;

    // Need at least 2 points to calculate baseline
    if (dataPoints.length < 2) {
        return updatedBaseline;
    }

    // Calculate averages from all data points
    updatedBaseline.avgSpeed = mean(dataPoints.map(d => d.averageSpeed));
    updatedBaseline.avgVisitsPerDay = mean(dataPoints.map(d => d.visitFrequency24h));
    updatedBaseline.avgActivityLevel = mean(dataPoints.map(d => d.activityLevel));

    // Calculate standard deviations
    updatedBaseline.speedStdDev = standardDeviation(dataPoints.map(d => d.averageSpeed));
    updatedBaseline.activityStdDev = standardDeviation(dataPoints.map(d => d.activityLevel));

    // Check if we should transition to STABLE
    const daysSinceStart = getDaysBetween(baseline.baselineStartDate, new Date().toISOString());

    if (
        dataPoints.length >= BASELINE_CONFIG.MIN_DATA_POINTS &&
        daysSinceStart >= BASELINE_CONFIG.MIN_DAYS
    ) {
        updatedBaseline.baselineStatus = 'STABLE';
    }

    return updatedBaseline;
}

/**
 * Calculate days between two ISO date strings
 */
function getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Calculate learning progress (0-1 range)
 */
export function calculateLearningProgress(baseline: AnimalBaseline): number {
    if (baseline.baselineStatus === 'STABLE') return 1;

    const dataProgress = baseline.dataPointsCollected / baseline.requiredDataPoints;
    const daysSinceStart = getDaysBetween(baseline.baselineStartDate, new Date().toISOString());
    const timeProgress = daysSinceStart / BASELINE_CONFIG.MIN_DAYS;

    // Progress is the minimum of both requirements
    return Math.min(dataProgress, timeProgress, 1);
}

/**
 * Get user-friendly baseline status message
 */
export function getBaselineStatusMessage(baseline: AnimalBaseline): string {
    if (baseline.baselineStatus === 'STABLE') {
        return 'Personal Baseline Active';
    }

    const daysSinceStart = getDaysBetween(baseline.baselineStartDate, new Date().toISOString());
    return `Learning (Day ${daysSinceStart} / ${BASELINE_CONFIG.LEARNING_WINDOW_DAYS})`;
}

/**
 * Check if baseline is ready for health scoring
 */
export function isBaselineReady(baseline: AnimalBaseline): boolean {
    return baseline.baselineStatus === 'STABLE';
}

/**
 * Calculate deviation percentage from baseline
 */
export function calculateDeviation(current: number, baseline: number): number {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
}
