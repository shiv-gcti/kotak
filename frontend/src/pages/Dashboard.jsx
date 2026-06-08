import React from 'react';
import StatsOverview from '../components/StatsOverview';
import OpenPositions from '../components/OpenPositions';
import ActiveTrades from '../components/ActiveTrades';
import TradeHistory from '../components/TradeHistory';

export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Trading Dashboard</h1>
          <p className="text-gray-600">Real-time trading signals and P&L tracking</p>
        </div>

        <StatsOverview />
        <OpenPositions />
        <div className="mb-6">
          <ActiveTrades />
        </div>
        <div>
          <TradeHistory />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
