import { RiskLevel } from '@/types';

interface RiskBadgeProps {
    level: RiskLevel;
    score?: number;
    className?: string;
}

export default function RiskBadge({ level, score, className = '' }: RiskBadgeProps) {
    const getStyles = () => {
        switch (level) {
            case 'HIGH':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'MODERATE':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'LOW':
                return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    const getIcon = () => {
        switch (level) {
            case 'HIGH':
                return '🚨';
            case 'MODERATE':
                return '⚠️';
            case 'LOW':
                return '✅';
        }
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
        border ${getStyles()} ${className}
      `}
        >
            <span>{getIcon()}</span>
            <span>{level}</span>
            {score !== undefined && (
                <span className="opacity-75">({score})</span>
            )}
        </span>
    );
}
