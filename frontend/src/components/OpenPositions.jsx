import React, { useEffect, useState } from 'react';
import { tradesService } from '../services/api';
import { subscribeToPrice } from '../services/socket';

export const OpenPositions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        const res = await tradesService.getActiveTrades();
        if (!mounted) return;
        setPositions(res.data.data || []);
      } catch (err) {
        console.error('OpenPositions fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToPrice((update) => {
      setPositions((prev) =>
        prev.map((p) =>
          p.id === update.tradeId
            ? { ...p, ltp: update.ltp, pnl: update.pnl, pnlPercentage: update.pnlPercentage }
            : p
        )
      );
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="text-center py-4">Loading open positions...</div>;
  if (positions.length === 0) return <div className="text-center py-4 text-gray-600">No open positions</div>;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3">Open Positions</h3>
      <div className="grid grid-cols-1 gap-3">
        {positions.map((pos) => (
          <div key={pos.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-bold">{pos.symbol}</div>
              <div className="text-sm text-gray-600">{pos.signal_type} • Qty: {pos.quantity}</div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Entry</div>
              <div className="font-medium">{pos.entryPrice}</div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Target</div>
              <div className="font-medium">{pos.targetPrice}</div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">P&L</div>
              <div className={`font-semibold ${parseFloat(pos.pnl?.replace(/[^0-9.-]+/g, '')) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pos.pnl} {pos.pnlPercentage ? `(${pos.pnlPercentage})` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpenPositions;
