interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    subtitle?: string;
}

export default function StatCard({ title, value, icon, trend, subtitle }: StatCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>

                    {subtitle && (
                        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
                    )}

                    {trend && (
                        <div className="mt-2 flex items-center gap-1">
                            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                                {trend.isPositive ? '↑' : '↓'}
                            </span>
                            <span className="text-sm text-gray-600">
                                {Math.abs(trend.value)}%
                            </span>
                        </div>
                    )}
                </div>

                <div className="text-4xl">{icon}</div>
            </div>
        </div>
    );
}
