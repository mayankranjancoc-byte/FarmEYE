'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RiskBadge from '@/components/RiskBadge';
import ConfidenceMeter from '@/components/ConfidenceMeter';
import AlertCard from '@/components/AlertCard';
import { AnimalProfile, RiskAssessment, DetectionEvent, GeminiAlert } from '@/types';

interface AnimalDetailData {
    animal: AnimalProfile;
    riskAssessment: RiskAssessment | null;
    detectionHistory: DetectionEvent[];
    alerts: GeminiAlert[];
}

export default function AnimalDetailPage() {
    const params = useParams();
    const animalId = params.id as string;

    const [data, setData] = useState<AnimalDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnimalData() {
            try {
                const res = await fetch(`/api/animals/${animalId}`);
                const result = await res.json();
                setData(result.data);
            } catch (error) {
                console.error('Failed to fetch animal data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnimalData();
    }, [animalId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">🔄</div>
                    <p className="text-gray-600">Loading animal details...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-gray-600">Animal not found</p>
                    <Link href="/animals" className="text-green-600 hover:underline mt-4 block">
                        ← Back to animals
                    </Link>
                </div>
            </div>
        );
    }

    const { animal, riskAssessment, detectionHistory, alerts } = data;

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Back Link */}
            <Link
                href="/animals"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
                ← Back to animals
            </Link>

            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{animal.id}</h1>
                        <p className="text-gray-600 mt-1">{animal.species}</p>
                        {animal.metadata && (
                            <div className="flex gap-4 mt-3 text-sm text-gray-600">
                                {animal.metadata.breed && <span>🔖 {animal.metadata.breed}</span>}
                                {animal.metadata.age && <span>📅 {animal.metadata.age} years</span>}
                                {animal.metadata.weight && <span>⚖️ {animal.metadata.weight}kg</span>}
                            </div>
                        )}
                    </div>
                    {riskAssessment && (
                        <RiskBadge level={riskAssessment.riskLevel} score={riskAssessment.riskScore} />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Risk Assessment */}
                    {riskAssessment && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Risk Assessment</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">Risk Score</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${riskAssessment.riskLevel === 'HIGH'
                                                        ? 'bg-red-500'
                                                        : riskAssessment.riskLevel === 'MODERATE'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${riskAssessment.riskScore}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="font-semibold text-gray-900">{riskAssessment.riskScore}/100</span>
                                    </div>
                                </div>

                                {riskAssessment.contributingFactors.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Contributing Factors:</p>
                                        <ul className="space-y-1">
                                            {riskAssessment.contributingFactors.map((factor, index) => (
                                                <li key={index} className="text-sm text-gray-600 pl-4">
                                                    • {factor}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gemini Alerts</h2>
                            <div className="space-y-4">
                                {alerts.map((alert) => (
                                    <AlertCard key={alert.id} alert={alert} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detection History */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection History</h2>
                        {detectionHistory.length > 0 ? (
                            <div className="space-y-3">
                                {detectionHistory.map((event) => (
                                    <div key={event.id} className="border-l-2 border-green-500 pl-4 py-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-gray-500">{event.source}</p>
                                            </div>
                                            <div className="text-right">
                                                <ConfidenceMeter confidence={event.confidence} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No detection events recorded</p>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Registration</h3>
                        <p className="text-sm text-gray-600">
                            Registered: {new Date(animal.registeredAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
