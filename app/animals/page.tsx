'use client';

import { useEffect, useState } from 'react';
import AnimalCard from '@/components/AnimalCard';
import { AnimalProfile, RiskAssessment } from '@/types';

interface EnrichedAnimal extends AnimalProfile {
    riskAssessment: RiskAssessment | null;
    lastSeen: string | null;
}

export default function AnimalsPage() {
    const [animals, setAnimals] = useState<EnrichedAnimal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'HIGH' | 'MODERATE' | 'LOW'>('all');

    useEffect(() => {
        async function fetchAnimals() {
            try {
                const res = await fetch('/api/animals');
                const data = await res.json();
                setAnimals(data.data || []);
            } catch (error) {
                console.error('Failed to fetch animals:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnimals();
    }, []);

    const filteredAnimals = animals.filter((animal) => {
        if (filter === 'all') return true;
        return animal.riskAssessment?.riskLevel === filter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">🔄</div>
                    <p className="text-gray-600">Loading animals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Animals</h1>
                <p className="mt-2 text-gray-600">
                    Registered livestock with health assessments
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
                    All ({animals.length})
                </button>
                <button
                    onClick={() => setFilter('HIGH')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'HIGH'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    High Risk ({animals.filter((a) => a.riskAssessment?.riskLevel === 'HIGH').length})
                </button>
                <button
                    onClick={() => setFilter('MODERATE')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'MODERATE'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    Moderate ({animals.filter((a) => a.riskAssessment?.riskLevel === 'MODERATE').length})
                </button>
                <button
                    onClick={() => setFilter('LOW')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'LOW'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    Low Risk ({animals.filter((a) => a.riskAssessment?.riskLevel === 'LOW').length})
                </button>
            </div>

            {/* Animals Grid */}
            {filteredAnimals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAnimals.map((animal) => (
                        <AnimalCard
                            key={animal.id}
                            animal={animal}
                            riskAssessment={animal.riskAssessment}
                            lastSeen={animal.lastSeen}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-gray-600">No animals found with the selected filter</p>
                </div>
            )}
        </div>
    );
}
