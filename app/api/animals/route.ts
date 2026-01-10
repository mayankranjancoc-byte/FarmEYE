import { NextRequest, NextResponse } from 'next/server';
import {
    getAllAnimals,
    getRiskAssessment,
    getDetectionEvents,
} from '@/lib/data-store';

/**
 * GET /api/animals
 * Get all animals with their latest risk assessments
 */
export async function GET() {
    try {
        const animals = getAllAnimals();

        // Enrich with risk data
        const enrichedAnimals = animals.map((animal) => {
            const risk = getRiskAssessment(animal.id);
            const recentDetections = getDetectionEvents(animal.id, 5);

            return {
                ...animal,
                riskAssessment: risk || null,
                lastSeen: recentDetections[0]?.timestamp || null,
                detectionCount: recentDetections.length,
            };
        });

        // Sort by risk level (HIGH > MODERATE > LOW)
        const sorted = enrichedAnimals.sort((a, b) => {
            const riskOrder = { HIGH: 3, MODERATE: 2, LOW: 1 };
            const aRisk = a.riskAssessment?.riskLevel || 'LOW';
            const bRisk = b.riskAssessment?.riskLevel || 'LOW';
            return riskOrder[bRisk] - riskOrder[aRisk];
        });

        return NextResponse.json({
            success: true,
            data: sorted,
            count: sorted.length,
        });
    } catch (error) {
        console.error('[API] Get animals error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch animals',
            },
            { status: 500 }
        );
    }
}
