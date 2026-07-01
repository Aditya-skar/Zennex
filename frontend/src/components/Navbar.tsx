import React from 'react';
import { Map, Home, Search, MessageSquare, User } from 'lucide-react';
import './Navbar.css';

export type TabType = 'explore' | 'home' | 'discover' | 'chat' | 'profile';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'explore' as TabType, label: 'Explore', icon: Map },
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'discover' as TabType, label: 'Discover', icon: Search },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="bottom-navbar" aria-label="Main navigation">
      <div className="navbar-island">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-item-surface">
                <Icon size={20} className="nav-icon" strokeWidth={isActive ? 2.25 : 1.75} />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
