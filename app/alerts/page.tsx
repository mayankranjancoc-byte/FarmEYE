'use client';

import { useEffect, useState } from 'react';
import AlertCard from '@/components/AlertCard';
import { GeminiAlert } from '@/types';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<GeminiAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'HIGH' | 'MODERATE' | 'LOW'>('all');

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const res = await fetch('/api/gemini?limit=100');
                const data = await res.json();
                setAlerts(data.data || []);
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAlerts();
    }, []);

    const filteredAlerts = alerts.filter((alert) => {
        if (filter === 'all') return true;
        return alert.severity === filter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">🔄</div>
                    <p className="text-gray-600">Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Livestock Gemini Alerts</h1>
                <p className="mt-2 text-gray-600">
                    AI-powered health alerts with explainable recommendations
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    All ({alerts.length})
                </button>
                <button
                    onClick={() => setFilter('HIGH')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'HIGH'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    High ({alerts.filter((a) => a.severity === 'HIGH').length})
                </button>
                <button
                    onClick={() => setFilter('MODERATE')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'MODERATE'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    Moderate ({alerts.filter((a) => a.severity === 'MODERATE').length})
                </button>
                <button
                    onClick={() => setFilter('LOW')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'LOW'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    Low ({alerts.filter((a) => a.severity === 'LOW').length})
                </button>
            </div>

            {/* Alerts List */}
            {filteredAlerts.length > 0 ? (
                <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                        <AlertCard key={alert.id} alert={alert} />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-gray-600">
                        {filter === 'all'
                            ? 'No alerts found'
                            : `No ${filter.toLowerCase()} risk alerts`}
                    </p>
                </div>
            )}
        </div>
    );
}
