import { NextRequest, NextResponse } from 'next/server';
import { getGeminiAlerts } from '@/lib/data-store';
import { prioritizeAlerts } from '@/lib/gemini';

/**
 * GET /api/gemini
 * Get Livestock Gemini alerts
 *
 * Query params:
 * - animalId?: string  // Filter by specific animal
 * - limit?: number     // Max alerts to return (default: 50)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const animalId = searchParams.get('animalId') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');

        // Get alerts from data store
        const alerts = getGeminiAlerts(animalId, limit);

        // Prioritize by severity and recency
        const prioritizedAlerts = prioritizeAlerts(alerts);

        return NextResponse.json({
            success: true,
            data: prioritizedAlerts,
            count: prioritizedAlerts.length,
            summary: {
                high: prioritizedAlerts.filter((a) => a.severity === 'HIGH').length,
                moderate: prioritizedAlerts.filter((a) => a.severity === 'MODERATE').length,
                low: prioritizedAlerts.filter((a) => a.severity === 'LOW').length,
            },
        });
    } catch (error) {
        console.error('[API] Gemini alerts error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch Gemini alerts',
            },
            { status: 500 }
        );
    }
}
