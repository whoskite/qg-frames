import { Sparkles, Heart, History } from 'lucide-react';

interface BottomNavProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeSection, 
  onNavigate,
  className = ''
}) => {
  const navItems = [
    { name: 'Generate', id: 'generate', icon: Sparkles },
    { name: 'Favorites', id: 'favorites', icon: Heart },
    { name: 'History', id: 'history', icon: History }
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 border-t border-white/10 z-50 ${className}`}>
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