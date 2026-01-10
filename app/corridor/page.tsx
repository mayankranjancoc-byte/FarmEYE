'use client';

import { useState } from 'react';
import ConfidenceMeter from '@/components/ConfidenceMeter';
import { DetectionEvent } from '@/types';

export default function CorridorPage() {
    const [detecting, setDetecting] = useState(false);
    const [latestEvent, setLatestEvent] = useState<DetectionEvent | null>(null);
    const [eventLog, setEventLog] = useState<DetectionEvent[]>([]);

    const simulateDetection = async () => {
        setDetecting(true);

        try {
            const res = await fetch('/api/detection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const result = await res.json();
            if (result.success) {
                const event = result.data.event;
                setLatestEvent(event);
                setEventLog((prev) => [event, ...prev].slice(0, 10));

                // Optionally trigger health score calculation
                await fetch('/api/health-score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ animalId: event.animalId }),
                });
            }
        } catch (error) {
            console.error('Detection failed:', error);
        } finally {
            setTimeout(() => setDetecting(false), 1000);
        }
    };

    return (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Smart Corridor</h1>
                <p className="mt-2 text-gray-600">
                    Simulate animal detection events with AI-powered identification
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Feed Simulation */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Feed</h2>

                    {/* Video Placeholder */}
                    <div className="relative aspect-video bg-gradient-to-br from-green-100 to-green-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <div className="text-center">
                            <div className="text-6xl mb-2">📹</div>
                            <p className="text-sm text-gray-600">Corridor Camera View</p>
                        </div>

                        {detecting && (
                            <div className="absolute inset-0 bg-green-500 bg-opacity-20 animate-pulse-slow flex items-center justify-center">
                                <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
                                    <p className="text-sm font-medium text-green-700">🔍 Detecting...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Simulate Button */}
                    <button
                        onClick={simulateDetection}
                        disabled={detecting}
                        className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${detecting
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                            }`}
                    >
                        {detecting ? '🔄 Detecting...' : '▶ Simulate Animal Entry'}
                    </button>

                    {/* Latest Detection */}
                    {latestEvent && (
                        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-green-900 mb-2">Latest Detection</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Animal ID:</span>
                                    <span className="font-semibold text-gray-900">{latestEvent.animalId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Source:</span>
                                    <span className="text-gray-900">{latestEvent.source}</span>
                                </div>
                                <ConfidenceMeter confidence={latestEvent.confidence} />
                                {latestEvent.metadata && (
                                    <div className="flex justify-between text-xs text-gray-600 pt-2 border-t">
                                        <span>Entry: {latestEvent.metadata.entrySpeed}km/h</span>
                                        <span>Exit: {latestEvent.metadata.exitSpeed}km/h</span>
                                        <span>Duration: {latestEvent.metadata.durationSeconds}s</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Event Log */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection Log</h2>

                    {eventLog.length > 0 ? (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {eventLog.map((event) => (
                                <div
                                    key={event.id}
                                    className="border-l-2 border-green-500 pl-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{event.animalId}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(event.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                            {Math.round(event.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600">{event.source}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-2">📋</div>
                            <p className="text-gray-600 text-sm">No events yet. Click the button to simulate.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                    <div className="text-2xl">ℹ️</div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">How it works</p>
                        <p className="text-sm text-blue-700">
                            This corridor uses multi-modal detection (Vision AI + RFID) to identify animals as they pass through.
                            Each detection triggers automatic health risk assessment by Livestock Gemini.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
