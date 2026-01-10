import { NextResponse } from 'next/server';
import {
    getAllAnimals,
    getAllRiskAssessments,
    getGeminiAlerts,
    getDetectionEvents,
} from '@/lib/data-store';
import { DashboardStats } from '@/types';

/**
 * GET /api/dashboard
 * Get dashboard summary statistics
 */
export async function GET() {
    try {
        const animals = getAllAnimals();
        const assessments = getAllRiskAssessments();
        const alerts = getGeminiAlerts(undefined, 100);
        const recentDetections = getDetectionEvents(undefined, 100);

        // Calculate stats
        const totalAnimals = animals.length;
        const activeAlerts = alerts.filter(
            (a) => a.severity === 'HIGH' || a.severity === 'MODERATE'
        ).length;

        // Calculate average health score
        const avgScore = assessments.length > 0
            ? assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length
            : 0;

        // Risk distribution
        const riskDistribution = {
            low: assessments.filter((a) => a.riskLevel === 'LOW').length,
            moderate: assessments.filter((a) => a.riskLevel === 'MODERATE').length,
            high: assessments.filter((a) => a.riskLevel === 'HIGH').length,
        };

        // Recent detections (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentCount = recentDetections.filter((d) => d.timestamp > oneDayAgo).length;

        const stats: DashboardStats = {
            totalAnimals,
            activeAlerts,
            averageHealthScore: Math.round((100 - avgScore) * 10) / 10, // Invert score for display
            riskDistribution,
            recentDetections: recentCount,
        };

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('[API] Dashboard stats error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch dashboard statistics',
            },
            { status: 500 }
        );
    }
}
