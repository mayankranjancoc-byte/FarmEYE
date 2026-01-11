import React from 'react';
import { BaselineStatus } from '@/types';

interface BaselineStatusBadgeProps {
    status: BaselineStatus;
    progress?: number; // 0-1 range
    dataPoints?: number;
    requiredDataPoints?: number;
}

/**
 * Visual indicator for animal baseline learning status
 * Shows either LEARNING progress or STABLE confirmation
 */
export default function BaselineStatusBadge({
    status,
    progress = 0,
    dataPoints = 0,
    requiredDataPoints = 20,
}: BaselineStatusBadgeProps) {
    if (status === 'LEARNING') {
        const percentage = Math.round(progress * 100);
        const daysSinceStart = Math.ceil(progress * 14); // Assuming 14 day window

        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🟡</span>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-yellow-800">
                            Baseline Learning in Progress
                        </h4>
                        <p className="text-xs text-yellow-600">
                            Day {daysSinceStart} / 14 • {dataPoints} / {requiredDataPoints} data points collected
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                    <div className="w-full bg-yellow-100 rounded-full h-2.5">
                        <div
                            className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-yellow-600 mt-1 text-right">{percentage}% complete</p>
                </div>

                {/* Information box */}
                <div className="mt-3 bg-white bg-opacity-50 rounded p-3 border border-yellow-100">
                    <p className="text-xs text-yellow-700">
                        <strong>ℹ️ During baseline learning:</strong><br />
                        • No health alerts will be generated<br />
                        • System is learning this animal&apos;s normal behavior patterns<br />
                        • Health monitoring will activate once baseline is stable
                    </p>
                </div>
            </div>
        );
    }

    // STABLE status
    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-800">
                        Personal Baseline Active
                    </h4>
                    <p className="text-xs text-green-600">
                        Health scores are calculated using this animal&apos;s own behavior patterns
                    </p>
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 rounded-full">
                    <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    <span className="text-xs font-medium text-green-700">Stable</span>
                </div>
            </div>

            <div className="mt-3 bg-white bg-opacity-50 rounded p-3 border border-green-100">
                <p className="text-xs text-green-700">
                    <strong>✓ Personalized monitoring enabled:</strong><br />
                    • Risk assessments compare against individual baseline<br />
                    • Alerts trigger only when behavior deviates from this animal&apos;s normal<br />
                    • More accurate than herd-level averages
                </p>
            </div>
        </div>
    );
}
