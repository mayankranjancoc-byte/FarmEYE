import { NextRequest, NextResponse } from 'next/server';
import {
    getAnimal,
    getHealthBaseline,
    setRiskAssessment,
    addHealthMetrics,
    createGeminiAlert,
} from '@/lib/data-store';
import { calculateHealthRisk, generateSimulatedMetrics } from '@/lib/health-engine';
import { createAlertFromAssessment } from '@/lib/gemini';

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

        // Calculate risk assessment
        const assessment = calculateHealthRisk(animalId, currentMetrics, baseline);

        // Store assessment
        setRiskAssessment(assessment);

        // Create Gemini alert if risk is MODERATE or HIGH
        let alert = null;
        if (assessment.riskLevel === 'MODERATE' || assessment.riskLevel === 'HIGH') {
            const alertData = createAlertFromAssessment(assessment);
            alert = createGeminiAlert(alertData);
        }

        return NextResponse.json({
            success: true,
            data: {
                assessment,
                metrics: currentMetrics,
                alert: alert || null,
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
