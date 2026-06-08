import React, { useEffect, useState } from 'react';
import { subscribeToPrice, subscribeToClosed } from '../services/socket';
import { tradesService } from '../services/api';

export const ActiveTrades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTrades();
    const interval = setInterval(fetchActiveTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubPrice = subscribeToPrice((data) => {
      setTrades((prev) =>
        prev.map((trade) =>
          trade.id === data.tradeId
            ? { ...trade, ltp: data.ltp, pnl: data.pnl, pnlPercentage: data.pnlPercentage }
            : trade
        )
      );
    });

    const unsubClosed = subscribeToClosed((data) => {
      setTrades((prev) => prev.filter((t) => t.id !== data.tradeId));
    });

    return () => {
      unsubPrice();
      unsubClosed();
    };
  }, []);

  const fetchActiveTrades = async () => {
    try {
      const response = await tradesService.getActiveTrades();
      setTrades(response.data.data);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading active trades...</div>;
  }

  if (trades.length === 0) {
    return <div className="text-center py-8 text-gray-600">No active trades</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-xl font-bold text-gray-800">Active Trades</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Symbol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Side</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Entry</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">LTP</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Target</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">SL</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">P&L</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-800">{trade.symbol}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-white text-sm font-semibold ${
                    trade.signal_type === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {trade.signal_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-600">{trade.entryPrice}</td>
                <td className="px-6 py-4 text-right text-gray-800 font-semibold">{trade.ltp}</td>
                <td className="px-6 py-4 text-right text-gray-600">{trade.targetPrice}</td>
                <td className="px-6 py-4 text-right text-gray-600">{trade.stopLoss}</td>
                <td className={`px-6 py-4 text-right font-bold text-lg ${
                  parseFloat(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{trade.pnl} ({trade.pnlPercentage})
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                    {trade.order_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActiveTrades;
