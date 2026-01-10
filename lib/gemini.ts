import {
    RiskLevel,
    RiskSignals,
    GeminiAlert,
    RiskAssessment,
} from '@/types';

/**
 * Livestock Gemini - Explainable AI module for FarmEYE
 * Generates human-readable explanations and recommendations
 */

/**
 * Get severity-based timeframe for action
 */
function getActionTimeframe(severity: RiskLevel): string {
    switch (severity) {
        case 'HIGH':
            return 'within 24 hours';
        case 'MODERATE':
            return 'within 48 hours';
        default:
            return 'during routine checkup';
    }
}

/**
 * Generate specific recommendations based on risk signals
 */
function generateRecommendations(
    severity: RiskLevel,
    signals: RiskSignals
): string[] {
    const recommendations: string[] = [];

    if (severity === 'HIGH') {
        recommendations.push('🚨 Immediate isolation and veterinary inspection required');

        if (signals.activityDrop) {
            recommendations.push('Monitor for signs of lameness, injury, or respiratory distress');
        }

        if (signals.visitReduction) {
            recommendations.push('Check feeding and watering systems; ensure accessibility');
        }

        if (signals.speedAnomaly) {
            recommendations.push('Physical examination for potential pain or discomfort');
        }

        recommendations.push('Document all observations for veterinary review');
    } else if (severity === 'MODERATE') {
        recommendations.push('⚠️ Increased monitoring recommended');

        if (signals.activityDrop || signals.visitReduction) {
            recommendations.push('Observe behavior patterns over next 24 hours');
            recommendations.push('Ensure adequate nutrition and hydration access');
        }

        if (signals.speedAnomaly) {
            recommendations.push('Check for environmental stressors or herd dynamics issues');
        }

        recommendations.push('Schedule veterinary consultation if symptoms persist');
    } else {
        recommendations.push('✅ Continue routine monitoring');
        recommendations.push('Maintain current feeding and care schedule');
    }

    return recommendations;
}

/**
 * Generate human-readable explanation for risk assessment
 */
export function generateExplanation(
    animalId: string,
    assessment: RiskAssessment
): string {
    const { riskLevel, signals, contributingFactors } = assessment;

    // Build explanation header
    let explanation = `${animalId} is flagged as **${riskLevel} RISK**`;

    if (contributingFactors.length > 0 && riskLevel !== 'LOW') {
        explanation += ' because:\n\n';

        contributingFactors.forEach((factor) => {
            explanation += `• ${factor}\n`;
        });
    } else {
        explanation += '. All health indicators are within normal range.';
    }

    return explanation.trim();
}

/**
 * Create a complete Gemini alert from risk assessment
 */
export function createAlertFromAssessment(
    assessment: RiskAssessment
): Omit<GeminiAlert, 'id'> {
    const { animalId, riskLevel, riskScore, signals } = assessment;

    const explanation = generateExplanation(animalId, assessment);
    const recommendations = generateRecommendations(riskLevel, signals);

    return {
        animalId,
        severity: riskLevel,
        timestamp: new Date().toISOString(),
        explanation,
        recommendations,
        signals,
        riskScore,
    };
}

/**
 * Prioritize alerts by severity and recency
 * HIGH alerts come first, then MODERATE, then LOW
 * Within each category, newer alerts come first
 */
export function prioritizeAlerts(alerts: GeminiAlert[]): GeminiAlert[] {
    const severityOrder: Record<RiskLevel, number> = {
        HIGH: 3,
        MODERATE: 2,
        LOW: 1,
    };

    return alerts.sort((a, b) => {
        // First, sort by severity
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;

        // Then by timestamp (newer first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

/**
 * Generate summary insight for dashboard
 */
export function generateDashboardInsight(
    totalAnimals: number,
    alerts: GeminiAlert[]
): string {
    const highRiskCount = alerts.filter((a) => a.severity === 'HIGH').length;
    const moderateRiskCount = alerts.filter((a) => a.severity === 'MODERATE').length;

    if (highRiskCount > 0) {
        return `⚠️ ${highRiskCount} animal${highRiskCount > 1 ? 's' : ''} require immediate attention`;
    }

    if (moderateRiskCount > 0) {
        return `⚡ ${moderateRiskCount} animal${moderateRiskCount > 1 ? 's' : ''} showing early warning signs`;
    }

    return `✅ Herd health appears normal across ${totalAnimals} animals`;
}

/**
 * Format alert explanation for display
 * Converts markdown-style formatting to readable text
 */
export function formatAlertForDisplay(alert: GeminiAlert): {
    title: string;
    message: string;
    actionRequired: string;
} {
    const title = `${alert.animalId} - ${alert.severity} Risk Alert`;
    const actionRequired = getActionTimeframe(alert.severity);

    return {
        title,
        message: alert.explanation,
        actionRequired: `Action required: ${actionRequired}`,
    };
}
