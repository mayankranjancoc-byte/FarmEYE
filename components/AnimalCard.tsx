import Link from 'next/link';
import RiskBadge from './RiskBadge';
import { AnimalProfile, RiskAssessment } from '@/types';

interface AnimalCardProps {
    animal: AnimalProfile;
    riskAssessment?: RiskAssessment | null;
    lastSeen?: string | null;
}

export default function AnimalCard({ animal, riskAssessment, lastSeen }: AnimalCardProps) {
    const formatDate = (date: string | null | undefined) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Link
            href={`/animals/${animal.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-green-300 transition-all duration-200"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{animal.id}</h3>
                    <p className="text-sm text-gray-500">{animal.species}</p>
                </div>

                {riskAssessment && (
                    <RiskBadge level={riskAssessment.riskLevel} score={riskAssessment.riskScore} />
                )}
            </div>

            <div className="space-y-2">
                {animal.metadata && (
                    <div className="flex gap-4 text-sm text-gray-600">
                        {animal.metadata.breed && (
                            <span>🔖 {animal.metadata.breed}</span>
                        )}
                        {animal.metadata.weight && (
                            <span>⚖️ {animal.metadata.weight}kg</span>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span>Last seen: {formatDate(lastSeen)}</span>
                    <span className="text-green-600 hover:underline">View details →</span>
                </div>
            </div>
        </Link>
    );
}
