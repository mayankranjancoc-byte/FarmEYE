import React from 'react';
import { DailyDeviation } from '@/types';

interface MicroDeviationTimelineProps {
    deviations: DailyDeviation[];
    triggeredSignals: string[];
}

/**
 * Simple timeline showing 7 days of micro-deviations
 * Text-based, no chart libraries
 */
export default function MicroDeviationTimeline({ deviations, triggeredSignals }: MicroDeviationTimelineProps) {
    if (deviations.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Micro-Deviation Timeline (7 Days)
                </h4>
                <p className="text-sm text-gray-500">No deviation data available yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Micro-Deviation Timeline (Last 7 Days)
            </h4>

            <div className="space-y-2">
                {deviations.map((deviation, index) => {
                    const daysAgo = index;
                    const hasFlags = deviation.flagCount >= 2;
                    const today = new Date();
                    const deviationDate = new Date(deviation.date);
                    const actualDaysAgo = Math.floor((today.getTime() - deviationDate.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                        <div
                            key={deviation.date}
                            className={`border-l-2 ${hasFlags ? 'border-yellow-400' : 'border-gray-200'} pl-3 py-1.5`}
                        >
                            <p className="text-xs text-gray-500 mb-1">
                                {actualDaysAgo === 0 ? 'Today' : `Day -${actualDaysAgo}`}: {new Date(deviation.date).toLocaleDateString()}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                {Math.abs(deviation.activityDeltaPct) >= 5 && (
                                    <span className={`font-medium ${deviation.activityDeltaPct < 0 ? 'text-orange-600' : 'text-blue-600'
                                        }`}>
                                        Activity {deviation.activityDeltaPct > 0 ? '↑' : '↓'}{' '}
                                        {Math.abs(deviation.activityDeltaPct).toFixed(1)}%
                                    </span>
                                )}
                                {Math.abs(deviation.speedDeltaPct) >= 5 && (
                                    <span className={`font-medium ${deviation.speedDeltaPct < 0 ? 'text-orange-600' : 'text-blue-600'
                                        }`}>
                                        Speed {deviation.speedDeltaPct > 0 ? '↑' : '↓'}{' '}
                                        {Math.abs(deviation.speedDeltaPct).toFixed(1)}%
                                    </span>
                                )}
                                {Math.abs(deviation.visitDeltaPct) >= 5 && (
                                    <span className={`font-medium ${deviation.visitDeltaPct < 0 ? 'text-orange-600' : 'text-blue-600'
                                        }`}>
                                        Visits {deviation.visitDeltaPct > 0 ? '↑' : '↓'}{' '}
                                        {Math.abs(deviation.visitDeltaPct).toFixed(1)}%
                                    </span>
                                )}
                                {Math.abs(deviation.activityDeltaPct) < 5 &&
                                    Math.abs(deviation.speedDeltaPct) < 5 &&
                                    Math.abs(deviation.visitDeltaPct) < 5 && (
                                        <span className="text-green-600 font-medium">Normal range</span>
                                    )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {triggeredSignals.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs font-medium text-yellow-800 mb-1">
                        ⚠️ Early Health Drift Detected
                    </p>
                    <p className="text-xs text-yellow-700">
                        Signals affected: {triggeredSignals.join(', ')}
                    </p>
                </div>
            )}
        </div>
    );
}
