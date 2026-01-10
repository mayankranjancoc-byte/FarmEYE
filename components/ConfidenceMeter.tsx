interface ConfidenceMeterProps {
    confidence: number; // 0-1 range
    label?: string;
}

export default function ConfidenceMeter({ confidence, label = 'Confidence' }: ConfidenceMeterProps) {
    const percentage = Math.round(confidence * 100);

    const getColor = () => {
        if (percentage >= 90) return 'bg-green-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{percentage}%</span>
            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor()} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
