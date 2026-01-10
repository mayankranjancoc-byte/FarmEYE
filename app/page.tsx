'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import AlertCard from '@/components/AlertCard';
import { DashboardStats, GeminiAlert } from '@/types';
import Link from 'next/link';

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<GeminiAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, alertsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/gemini?limit=5'),
        ]);

        const statsData = await statsRes.json();
        const alertsData = await alertsRes.json();

        setStats(statsData.data);
        setAlerts(alertsData.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Herd Overview</h1>
        <p className="mt-2 text-gray-600">
          Real-time monitoring powered by Livestock Gemini AI
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Animals"
            value={stats.totalAnimals}
            icon="🐄"
            subtitle="Registered in system"
          />
          <StatCard
            title="Active Alerts"
            value={stats.activeAlerts}
            icon="🔔"
            subtitle="Require attention"
          />
          <StatCard
            title="Health Score"
            value={`${stats.averageHealthScore.toFixed(1)}%`}
            icon="💚"
            subtitle="Herd average"
          />
          <StatCard
            title="24h Detections"
            value={stats.recentDetections}
            icon="📊"
            subtitle="Corridor passages"
          />
        </div>
      )}

      {/* Risk Distribution */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.riskDistribution.low}</div>
              <div className="text-sm text-gray-600 mt-1">Low Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.riskDistribution.moderate}</div>
              <div className="text-sm text-gray-600 mt-1">Moderate Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.riskDistribution.high}</div>
              <div className="text-sm text-gray-600 mt-1">High Risk</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
          <Link
            href="/alerts"
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-600">No active alerts. Herd health looks good!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/animals"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all duration-200"
        >
          <div className="text-3xl mb-2">🐄</div>
          <h3 className="font-semibold text-gray-900 mb-1">View Animals</h3>
          <p className="text-sm text-gray-600">Browse all registered livestock</p>
        </Link>

        <Link
          href="/corridor"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all duration-200"
        >
          <div className="text-3xl mb-2">📹</div>
          <h3 className="font-semibold text-gray-900 mb-1">Smart Corridor</h3>
          <p className="text-sm text-gray-600">Simulate detection events</p>
        </Link>

        <Link
          href="/alerts"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all duration-200"
        >
          <div className="text-3xl mb-2">🔔</div>
          <h3 className="font-semibold text-gray-900 mb-1">All Alerts</h3>
          <p className="text-sm text-gray-600">Review Gemini recommendations</p>
        </Link>
      </div>
    </div>
  );
}
