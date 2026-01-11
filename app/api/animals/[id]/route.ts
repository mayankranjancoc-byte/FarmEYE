import { NextRequest, NextResponse } from 'next/server';
import {
    getAnimal,
    getRiskAssessment,
    getDetectionEvents,
    getHealthMetrics,
    getGeminiAlerts,
    getAnimalBaseline,
    getEarlyWarning,
} from '@/lib/data-store';
import { calculateLearningProgress } from '@/lib/baseline-learning';

/**
 * GET /api/animals/[id]
 * Get detailed information about a specific animal
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const animal = getAnimal(id);
        if (!animal) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Animal not found',
                },
                { status: 404 }
            );
        }

        const risk = getRiskAssessment(id);
        const detections = getDetectionEvents(id, 20);
        const metrics = getHealthMetrics(id, 10);
        const alerts = getGeminiAlerts(id, 10);
        const baseline = getAnimalBaseline(id);
        const earlyWarning = getEarlyWarning(id);

        return NextResponse.json({
            success: true,
            data: {
                animal,
                riskAssessment: risk || null,
                detectionHistory: detections,
                healthMetrics: metrics,
                alerts,
                baseline: baseline ? {
                    status: baseline.baselineStatus,
                    progress: calculateLearningProgress(baseline),
                    dataPoints: baseline.dataPointsCollected,
                    requiredDataPoints: baseline.requiredDataPoints,
                    startDate: baseline.baselineStartDate,
                } : null,
                earlyWarning: earlyWarning ? {
                    driftState: earlyWarning.driftState,
                    consecutiveDays: earlyWarning.consecutiveDaysWithDrift,
                    recentDeviations: earlyWarning.recentDeviations,
                    triggeredSignals: earlyWarning.triggeredSignals,
                    message: earlyWarning.earlyWarningMessage,
                } : null,
            },
        });
    } catch (error) {
        console.error('[API] Get animal detail error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch animal details',
            },
            { status: 500 }
        );
    }
}
