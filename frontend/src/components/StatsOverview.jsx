import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiTarget } from 'react-icons/fi';
import { tradesService } from '../services/api';

export const StatCard = ({ title, value, icon: Icon, color, suffix = '' }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {value}
            {suffix}
          </p>
        </div>
        <Icon className="text-3xl" style={{ color }} />
      </div>
    </div>
  );
};

export const StatsOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await tradesService.getStats();
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-red-600">Failed to load stats</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total P&L"
        value={`₹${stats.totalPnL}`}
        icon={FiDollarSign}
        color="#10b981"
      />
      <StatCard
        title="Open Trades"
        value={stats.openTrades}
        icon={FiTarget}
        color="#3b82f6"
      />
      <StatCard
        title="Win Rate"
        value={stats.winRate}
        icon={FiTrendingUp}
        color="#f59e0b"
      />
      <StatCard
        title="Closed Trades"
        value={stats.closedTrades}
        icon={FiTrendingDown}
        color="#ef4444"
      />
    </div>
  );
};

export default StatsOverview;
