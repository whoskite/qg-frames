import { Sparkles, Heart, History } from 'lucide-react';

interface BottomNavProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export function BottomNav({ onNavigate, activeSection }: BottomNavProps) {
  const navItems = [
    { name: 'Generate', id: 'generate', icon: Sparkles },
    { name: 'Favorites', id: 'favorites', icon: Heart },
    { name: 'History', id: 'history', icon: History }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-gray-800 z-50">
      <div className="max-w-md mx-auto px-4">
        <ul className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center space-y-1 ${
                  activeSection === item.id
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
} 