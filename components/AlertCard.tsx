import Link from 'next/link';
import RiskBadge from './RiskBadge';
import { GeminiAlert } from '@/types';

interface AlertCardProps {
    alert: GeminiAlert;
}

export default function AlertCard({ alert }: AlertCardProps) {
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getBorderColor = () => {
        switch (alert.severity) {
            case 'HIGH':
                return 'border-l-red-500';
            case 'MODERATE':
                return 'border-l-yellow-500';
            case 'LOW':
                return 'border-l-green-500';
        }
    };

    return (
        <div className={`bg-white rounded-lg border-l-4 border border-gray-200 p-5 ${getBorderColor()}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Link
                            href={`/animals/${alert.animalId}`}
                            className="font-semibold text-gray-900 hover:text-green-600 hover:underline"
                        >
                            {alert.animalId}
                        </Link>
                        <RiskBadge level={alert.severity} />
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(alert.timestamp)}</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 whitespace-pre-line">{alert.explanation}</p>
                </div>

                {alert.recommendations && alert.recommendations.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
                        {alert.recommendations.map((rec, index) => (
                            <p key={index} className="text-xs text-gray-600 pl-2">
                                {rec}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
