'use client';

import React, { useState } from 'react';
import { HealthExplanation } from '@/types';
import ConfidenceBadge from './ConfidenceBadge';

interface HealthExplanationPanelProps {
    explanation: HealthExplanation;
    animalId: string;
}

/**
 * Expandable panel showing detailed health score explanation
 * Answers: What? Why? How confident? What action?
 */
export default function HealthExplanationPanel({ explanation, animalId }: HealthExplanationPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            {/* Expandable header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-lg">ℹ️</span>
                    <span className="text-sm font-semibold text-gray-900">
                        Why this score? (Click to {isExpanded ? 'hide' : 'show'} explanation)
                    </span>
                </div>
                <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="p-4 bg-white space-y-4">
                    {/* Health Score */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Health Score</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{explanation.healthScore}</span>
                            <span className="text-lg text-gray-500">/ 100</span>
                        </div>
                        <div className="mt-2 w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${explanation.healthScore >= 70
                                        ? 'bg-green-500'
                                        : explanation.healthScore >= 40
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                    }`}
                                style={{ width: `${explanation.healthScore}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            100 = Perfect health, 0 = Critical condition
                        </p>
                    </div>

                    {/* Contributors */}
                    {explanation.contributors.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                What affected this score:
                            </h4>
                            <ul className="space-y-2">
                                {explanation.contributors.map((contributor, index) => (
                                    <li key={index} className="flex flex-col gap-1 pl-4 border-l-2 border-orange-300">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900">
                                                {contributor.signal}:
                                            </span>
                                            <span className="text-sm font-bold text-orange-600">
                                                −{contributor.impact} points
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-600">{contributor.detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Confidence Level */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Confidence Level</h4>
                        <ConfidenceBadge level={explanation.confidenceLevel} />
                        <p className="text-xs text-gray-600 mt-2">
                            Based on <strong>{explanation.consistencyDays} day{explanation.consistencyDays !== 1 ? 's' : ''}</strong> of consistent data
                            using <strong>{explanation.baselineReference}</strong>
                        </p>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">
                            Recommended Action
                        </h4>
                        <p className="text-sm text-blue-800">{explanation.recommendation}</p>
                    </div>

                    {/* Audit info */}
                    <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            <strong>Animal ID:</strong> {animalId} •
                            <strong> Calculation:</strong> Deterministic (no randomness) •
                            <strong> Auditability:</strong> Full breakdown available
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
