import {
    RiskLevel,
    RiskAssessment,
    RiskSignals,
    HealthMetrics,
    HealthBaseline,
} from '@/types';

/**
 * Deterministic health risk engine for livestock monitoring
 * Calculates risk scores based on behavioral patterns without randomness
 */

/**
 * Calculate activity signal (0-40 points)
 * Compares current activity to baseline
 */
function calculateActivitySignal(
    currentActivity: number,
    baselineActivity: number
): { score: number; description: string; isActive: boolean } {
    const percentageChange = ((currentActivity - baselineActivity) / baselineActivity) * 100;

    if (percentageChange <= -30) {
        return {
            score: 40,
            description: `Activity reduced by ${Math.abs(percentageChange).toFixed(1)}%`,
            isActive: true,
        };
    } else if (percentageChange <= -15) {
        return {
            score: 25,
            description: `Activity reduced by ${Math.abs(percentageChange).toFixed(1)}%`,
            isActive: true,
        };
    } else if (percentageChange <= -5) {
        return {
            score: 10,
            description: `Activity slightly reduced by ${Math.abs(percentageChange).toFixed(1)}%`,
            isActive: false,
        };
    }

    return { score: 0, description: 'Activity normal', isActive: false };
}

/**
 * Calculate visit frequency signal (0-35 points)
 * Compares recent visits to baseline
 */
function calculateVisitSignal(
    visits24h: number,
    visits48h: number,
    baselineVisits: number
): { score: number; description: string; isActive: boolean } {
    const percentageChange = ((visits24h - baselineVisits) / baselineVisits) * 100;
    const trend48h = visits48h < baselineVisits * 1.8; // 48h should be ~2x baseline

    if (percentageChange <= -40 || trend48h) {
        return {
            score: 35,
            description: `Corridor visits dropped by ${Math.abs(percentageChange).toFixed(1)}% over 24h`,
            isActive: true,
        };
    } else if (percentageChange <= -20) {
        return {
            score: 20,
            description: `Corridor visits reduced by ${Math.abs(percentageChange).toFixed(1)}%`,
            isActive: true,
        };
    } else if (percentageChange <= -10) {
        return {
            score: 10,
            description: `Slight decrease in visits`,
            isActive: false,
        };
    }

    return { score: 0, description: 'Visit frequency normal', isActive: false };
}

/**
 * Calculate speed anomaly signal (0-25 points)
 * Detects significant speed deviations
 */
function calculateSpeedSignal(
    currentSpeed: number,
    baselineSpeed: number,
    speedStdDev: number
): { score: number; description: string; isActive: boolean } {
    const deviation = Math.abs(currentSpeed - baselineSpeed) / speedStdDev;

    if (deviation > 2.5) {
        return {
            score: 25,
            description: `Speed anomaly detected (${deviation.toFixed(1)} std deviations)`,
            isActive: true,
        };
    } else if (deviation > 1.5) {
        return {
            score: 15,
            description: `Moderate speed deviation detected`,
            isActive: true,
        };
    } else if (deviation > 1.0) {
        return {
            score: 5,
            description: `Minor speed variation`,
            isActive: false,
        };
    }

    return { score: 0, description: 'Speed normal', isActive: false };
}

/**
 * Calculate overall risk level based on total score
 */
function calculateRiskLevel(totalScore: number): RiskLevel {
    if (totalScore >= 66) return 'HIGH';
    if (totalScore >= 31) return 'MODERATE';
    return 'LOW';
}

/**
 * Main health risk scoring function
 * This is the core engine that produces deterministic, traceable risk assessments
 */
export function calculateHealthRisk(
    animalId: string,
    currentMetrics: HealthMetrics,
    baseline: HealthBaseline
): RiskAssessment {
    // Calculate individual signals
    const activitySignal = calculateActivitySignal(
        currentMetrics.activityLevel,
        baseline.avgActivityLevel
    );

    const visitSignal = calculateVisitSignal(
        currentMetrics.visitFrequency24h,
        currentMetrics.visitFrequency48h,
        baseline.avgVisitFrequency
    );

    const speedSignal = calculateSpeedSignal(
        currentMetrics.averageSpeed,
        baseline.avgSpeed,
        baseline.speedStdDev
    );

    // Calculate total risk score
    const totalScore = activitySignal.score + visitSignal.score + speedSignal.score;
    const riskLevel = calculateRiskLevel(totalScore);

    // Build signals object
    const signals: RiskSignals = {
        activityDrop: activitySignal.isActive,
        speedAnomaly: speedSignal.isActive,
        visitReduction: visitSignal.isActive,
    };

    // Collect contributing factors (only active signals)
    const contributingFactors: string[] = [];
    if (activitySignal.isActive) contributingFactors.push(activitySignal.description);
    if (visitSignal.isActive) contributingFactors.push(visitSignal.description);
    if (speedSignal.isActive) contributingFactors.push(speedSignal.description);

    if (contributingFactors.length === 0) {
        contributingFactors.push('All health indicators within normal range');
    }

    const assessment: RiskAssessment = {
        animalId,
        timestamp: new Date().toISOString(),
        riskLevel,
        riskScore: totalScore,
        signals,
        contributingFactors,
    };

    return assessment;
}

/**
 * Generate simulated metrics for demonstration
 * Uses deterministic patterns based on animal ID for consistency
 */
export function generateSimulatedMetrics(
    animalId: string,
    baseline: HealthBaseline,
    riskBias: 'low' | 'moderate' | 'high' = 'low'
): HealthMetrics {
    // Use animal ID hash for deterministic variation
    const hash = animalId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variation = (hash % 20) / 100; // 0-0.19 variation

    let activityMultiplier = 1.0;
    let visitMultiplier = 1.0;
    let speedMultiplier = 1.0;

    // Apply risk bias for demo purposes
    if (riskBias === 'high') {
        activityMultiplier = 0.55 - variation; // Significant drop
        visitMultiplier = 0.50 - variation;
        speedMultiplier = 0.70 - variation;
    } else if (riskBias === 'moderate') {
        activityMultiplier = 0.75 - variation / 2;
        visitMultiplier = 0.70 - variation / 2;
        speedMultiplier = 0.85;
    } else {
        activityMultiplier = 0.95 + variation / 2;
        visitMultiplier = 1.0 + variation / 4;
        speedMultiplier = 1.0 + (variation - 0.1);
    }

    const metrics: HealthMetrics = {
        animalId,
        timestamp: new Date().toISOString(),
        activityLevel: Math.round(baseline.avgActivityLevel * activityMultiplier),
        visitFrequency24h: Math.round(baseline.avgVisitFrequency * visitMultiplier),
        visitFrequency48h: Math.round(baseline.avgVisitFrequency * 2 * visitMultiplier),
        averageSpeed: parseFloat((baseline.avgSpeed * speedMultiplier).toFixed(2)),
        speedDeviation: baseline.speedStdDev,
    };

    return metrics;
}
