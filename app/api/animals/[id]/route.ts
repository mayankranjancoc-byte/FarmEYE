import { NextRequest, NextResponse } from 'next/server';
import {
    getAnimal,
    getRiskAssessment,
    getDetectionEvents,
    getHealthMetrics,
    getGeminiAlerts,
} from '@/lib/data-store';

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

        return NextResponse.json({
            success: true,
            data: {
                animal,
                riskAssessment: risk || null,
                detectionHistory: detections,
                healthMetrics: metrics,
                alerts,
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
