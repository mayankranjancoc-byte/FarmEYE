'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Animals', href: '/animals', icon: '🐄' },
    { name: 'Alerts', href: '/alerts', icon: '🔔' },
    { name: 'Smart Corridor', href: '/corridor', icon: '📹' },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">🚜</div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">FarmEYE</h1>
                            <p className="text-xs text-gray-500">Livestock Gemini</p>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex gap-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-green-50 text-green-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }
                  `}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-500">System Active</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
