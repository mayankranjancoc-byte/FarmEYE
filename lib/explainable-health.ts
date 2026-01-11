import {
    AnimalBaseline,
    ConfidenceLevel,
    DriftState,
    HealthExplanation,
    HealthMetrics,
    PersonalizedRiskAssessment,
    RiskLevel,
    SignalContributor,
    BaselineStatus,
} from '@/types';
import { calculateDeviation } from './baseline-learning';

/**
 * Explainable Health Intelligence (XHI)
 * Makes every health decision transparent, auditable, and human-readable
 */

/**
 * Calculate impact points from activity deviation
 * Mirrors logic from health-engine.ts
 */
function calculateActivityImpact(deviationPct: number): number {
    const absDeviation = Math.abs(deviationPct);
    if (absDeviation >= 30) return 40;
    if (absDeviation >= 15) return 25;
    if (absDeviation >= 5) return 10;
    return 0;
}

/**
 * Calculate impact points from visit deviation
 */
function calculateVisitImpact(deviationPct: number): number {
    const absDeviation = Math.abs(deviationPct);
    if (absDeviation >= 40) return 35;
    if (absDeviation >= 20) return 20;
    if (absDeviation >= 10) return 10;
    return 0;
}

/**
 * Calculate impact points from speed deviation
 */
function calculateSpeedImpact(deviationPct: number, stdDev: number): number {
    if (stdDev === 0) return 0;

    const zScore = Math.abs(deviationPct) / (stdDev * 100);
    if (zScore > 2.5) return 25;
    if (zScore > 1.5) return 15;
    if (zScore > 1.0) return 5;
    return 0;
}

/**
 * Build detailed breakdown of what contributed to the health score
 */
function buildContributorBreakdown(
    assessment: PersonalizedRiskAssessment,
    currentMetrics: HealthMetrics,
    baseline: AnimalBaseline
): SignalContributor[] {
    const contributors: SignalContributor[] = [];

    // Activity contributor
    if (assessment.signals.activityDrop) {
        const deviation = calculateDeviation(
            currentMetrics.activityLevel,
            baseline.avgActivityLevel
        );
        const impact = calculateActivityImpact(deviation);

        if (impact > 0) {
            contributors.push({
                signal: 'Low Activity',
                impact,
                detail: `Activity ${Math.abs(deviation).toFixed(1)}% below personal baseline`,
            });
        }
    }

    // Visit contributor
    if (assessment.signals.visitReduction) {
        const deviation = calculateDeviation(
            currentMetrics.visitFrequency24h,
            baseline.avgVisitsPerDay
        );
        const impact = calculateVisitImpact(deviation);

        if (impact > 0) {
            contributors.push({
                signal: 'Reduced Visits',
                impact,
                detail: `Visits ${Math.abs(deviation).toFixed(1)}% below personal baseline`,
            });
        }
    }

    // Speed contributor
    if (assessment.signals.speedAnomaly) {
        const deviation = calculateDeviation(
            currentMetrics.averageSpeed,
            baseline.avgSpeed
        );
        const impact = calculateSpeedImpact(deviation, baseline.speedStdDev);

        if (impact > 0) {
            const zScore = baseline.speedStdDev > 0
                ? Math.abs(deviation) / (baseline.speedStdDev * 100)
                : 0;

            contributors.push({
                signal: 'Slower Speed',
                impact,
                detail: `Speed ${Math.abs(deviation).toFixed(1)}% below personal baseline (${zScore.toFixed(1)}σ deviation)`,
            });
        }
    }

    // Sort by impact (highest first) for clarity
    return contributors.sort((a, b) => b.impact - a.impact);
}

/**
 * Calculate confidence level based on data consistency and reliability
 */
function calculateConfidence(
    consistencyDays: number,
    baselineStatus: BaselineStatus,
    signalCount: number
): ConfidenceLevel {
    // Baseline must be stable for high confidence
    if (baselineStatus !== 'STABLE') {
        return 'LOW';
    }

    // More days + more signals = higher confidence
    if (consistencyDays >= 5 && signalCount >= 2) {
        return 'HIGH';
    }

    if (consistencyDays >= 3 || signalCount >= 2) {
        return 'MEDIUM';
    }

    return 'LOW';
}

/**
 * Generate clear, actionable recommendation based on risk and confidence
 */
function generateRecommendation(
    riskLevel: RiskLevel,
    driftState: DriftState,
    confidenceLevel: ConfidenceLevel,
    contributorCount: number
): string {
    // HIGH risk = immediate action
    if (riskLevel === 'HIGH') {
        if (contributorCount >= 2) {
            return 'Immediate veterinary consultation recommended. Multiple concerning health signals detected with consistent pattern.';
        }
        return 'Immediate veterinary consultation recommended. Significant health concern detected.';
    }

    // MODERATE risk = schedule check-up
    if (riskLevel === 'MODERATE') {
        if (confidenceLevel === 'HIGH') {
            return 'Schedule veterinary check-up within 24-48 hours. Pattern is consistent and reliable over multiple days.';
        }
        if (confidenceLevel === 'MEDIUM') {
            return 'Consider scheduling veterinary check-up. Monitor closely for next 1-2 days.';
        }
        return 'Monitor closely. If pattern continues for 2-3 more days, schedule veterinary consultation.';
    }

    // LOW risk but drift detected
    if (driftState === 'EARLY_DRIFT') {
        return 'Early warning detected: Consider preventive health check-up. Small behavioral changes observed over multiple days.';
    }

    if (driftState === 'ACTION_REQUIRED') {
        return 'Sustained behavioral drift detected over several days. Preventive veterinary consultation advised to rule out early-stage issues.';
    }

    // All clear
    return 'Continue normal monitoring. All health indicators are within expected range for this animal.';
}

/**
 * Generate complete health explanation (main XHI function)
 */
export function generateHealthExplanation(
    assessment: PersonalizedRiskAssessment,
    currentMetrics: HealthMetrics,
    baseline: AnimalBaseline,
    consistencyDays: number = 1,
    driftState: DriftState = 'STABLE'
): HealthExplanation {
    // Build contributor breakdown
    const contributors = buildContributorBreakdown(assessment, currentMetrics, baseline);

    // Calculate confidence level
    const confidenceLevel = calculateConfidence(
        consistencyDays,
        assessment.baselineStatus,
        contributors.length
    );

    // Generate recommendation
    const recommendation = generateRecommendation(
        assessment.riskLevel,
        driftState,
        confidenceLevel,
        contributors.length
    );

    // Determine baseline reference
    const baselineReference = assessment.baselineUsed
        ? 'Personal baseline (learned from this animal\'s behavior over 7-14 days)'
        : 'Herd-level baseline (global average)';

    // Convert risk score to health score (100 = perfect health)
    const healthScore = 100 - assessment.riskScore;

    return {
        healthScore,
        contributors,
        confidenceLevel,
        consistencyDays,
        baselineReference,
        recommendation,
    };
}
