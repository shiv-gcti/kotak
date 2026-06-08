import React, { useEffect, useState } from 'react';
import { tradesService } from '../services/api';

export const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTrades(page);
  }, [page]);

  const fetchTrades = async (pageNum) => {
    try {
      setLoading(true);
      const response = await tradesService.getAllTrades(pageNum, 10);
      setTrades(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching trade history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-xl font-bold text-gray-800">Trade History</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No trades yet</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Symbol</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Side</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Entry</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Exit</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">P&L</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{trade.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-white text-sm font-semibold ${
                        trade.signal_type === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {trade.signal_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{trade.entryPrice}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{trade.squareoff_price || '-'}</td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      parseFloat(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{trade.pnl} ({trade.pnlPercentage})
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-semibold ${
                        trade.squareoff_status === 'EXECUTED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {trade.squareoff_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{trade.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeHistory;
