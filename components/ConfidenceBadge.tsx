import React from 'react';
import { ConfidenceLevel } from '@/types';

interface ConfidenceBadgeProps {
    level: ConfidenceLevel;
}

/**
 * Visual indicator for explanation confidence level
 */
export default function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
    const config = {
        HIGH: {
            color: 'bg-green-50 border-green-200 text-green-700',
            icon: '✓✓✓',
            text: 'High Confidence',
            description: 'Consistent pattern over multiple days'
        },
        MEDIUM: {
            color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
            icon: '✓✓',
            text: 'Medium Confidence',
            description: 'Pattern emerging, monitor closely'
        },
        LOW: {
            color: 'bg-gray-50 border-gray-200 text-gray-700',
            icon: '✓',
            text: 'Low Confidence',
            description: 'Limited data, baseline still being' +
                ' established'
        },
    };

    const { color, icon, text, description } = config[level];

    return (
        <div className={`inline-flex flex-col gap-1 px-3 py-2 border rounded-lg ${color}`}>
            <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{icon}</span>
                <span className="text-xs font-semibold">{text}</span>
            </div>
            <p className="text-xs opacity-80">{description}</p>
        </div>
    );
}
