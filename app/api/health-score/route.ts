import { NextRequest, NextResponse } from 'next/server';
import {
    getAnimal,
    getHealthBaseline,
    setRiskAssessment,
    addHealthMetrics,
    createGeminiAlert,
    getAnimalBaseline,
    setAnimalBaseline,
    getHealthMetrics,
    storeDeviation,
    setEarlyWarning,
    getDeviationHistory,
} from '@/lib/data-store';
import { calculateHealthRisk, generateSimulatedMetrics, calculatePersonalizedHealthRisk } from '@/lib/health-engine';
import { createAlertFromAssessment } from '@/lib/gemini';
import { addBaselineDataPoint } from '@/lib/baseline-learning';
import { calculateDailyDeviation, generateEarlyWarningAssessment } from '@/lib/drift-detection';

/**
 * POST /api/health-score
 * Calculate health risk score for an animal
 *
 * Body:
 * {
 *   animalId: string,
 *   riskBias?: 'low' | 'moderate' | 'high'  // For demo purposes
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { animalId, riskBias = 'low' } = body;

        if (!animalId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'animalId is required',
                },
                { status: 400 }
            );
        }

        // Check if animal exists
        const animal = getAnimal(animalId);
        if (!animal) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Animal not found',
                },
                { status: 404 }
            );
        }

        // Get baseline metrics
        const baseline = getHealthBaseline(animalId);
        if (!baseline) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Health baseline not found for animal',
                },
                { status: 404 }
            );
        }

        // Generate current metrics (simulated for demo)
        const currentMetrics = generateSimulatedMetrics(animalId, baseline, riskBias);

        // Add metrics to history
        addHealthMetrics(currentMetrics);

        // Get personalized baseline
        let personalBaseline = getAnimalBaseline(animalId);
        if (!personalBaseline) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Personalized baseline not found for animal',
                },
                { status: 404 }
            );
        }

        // Update baseline with new data point
        const allMetrics = getHealthMetrics(animalId, 100);
        personalBaseline = addBaselineDataPoint(personalBaseline, allMetrics);
        setAnimalBaseline(personalBaseline);

        // EHDD: Calculate and store daily deviation if baseline is STABLE
        let earlyWarning = null;
        let warningAssessment = null;
        if (personalBaseline.baselineStatus === 'STABLE') {
            // Calculate today's deviation
            const todayDeviation = calculateDailyDeviation(currentMetrics, personalBaseline);
            storeDeviation(animalId, todayDeviation);

            // Get deviation history and generate early warning assessment
            const deviationHistory = getDeviationHistory(animalId, 7);
            warningAssessment = generateEarlyWarningAssessment(animalId, deviationHistory);
            setEarlyWarning(warningAssessment);

            earlyWarning = {
                driftState: warningAssessment.driftState,
                consecutiveDays: warningAssessment.consecutiveDaysWithDrift,
                message: warningAssessment.earlyWarningMessage,
            };
        }

        // Calculate risk assessment with XHI (pass consistency days and drift state)
        const consistencyDays = warningAssessment?.consecutiveDaysWithDrift || 1;
        const driftState = warningAssessment?.driftState || 'STABLE';
        const assessment = calculatePersonalizedHealthRisk(
            animalId,
            currentMetrics,
            personalBaseline,
            consistencyDays,
            driftState
        );

        // Store assessment
        setRiskAssessment(assessment);

        // Create Gemini alert ONLY if risk is MODERATE/HIGH AND baseline is STABLE
        let alert = null;
        if (
            personalBaseline.baselineStatus === 'STABLE' &&
            (assessment.riskLevel === 'MODERATE' || assessment.riskLevel === 'HIGH')
        ) {
            const alertData = createAlertFromAssessment(assessment);
            alert = createGeminiAlert(alertData);
        }

        return NextResponse.json({
            success: true,
            data: {
                assessment,
                metrics: currentMetrics,
                alert: alert || null,
                baseline: {
                    status: personalBaseline.baselineStatus,
                    progress: personalBaseline.dataPointsCollected / personalBaseline.requiredDataPoints,
                    dataPoints: personalBaseline.dataPointsCollected,
                },
                earlyWarning: earlyWarning || null,
            },
        });
    } catch (error) {
        console.error('[API] Health score error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to calculate health score',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/health-score?animalId=xxx
 * Get latest health score for an animal
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const animalId = searchParams.get('animalId');

        if (!animalId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'animalId is required',
                },
                { status: 400 }
            );
        }

        const assessment = require('@/lib/data-store').getRiskAssessment(animalId);

        if (!assessment) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'No health assessment found for this animal',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: assessment,
        });
    } catch (error) {
        console.error('[API] Get health score error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch health score',
            },
            { status: 500 }
        );
    }
}
