import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiList, FiSettings, FiLogOut } from 'react-icons/fi';

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/trades', label: 'Trades', icon: FiList },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ];

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold">📊 Kotak Neo Trader</h1>
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 transition ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <button className="text-gray-300 hover:text-white transition">
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
