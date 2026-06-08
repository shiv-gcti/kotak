import React from 'react';

export const Settings = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kotak Neo Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Kotak Neo Configuration</h2>
            <div className="space-y-4 text-gray-600">
              <p>✓ Configuration from .env file</p>
              <p>API Key: Configured</p>
              <p>API Secret: Configured</p>
              <p className="text-sm mt-4 text-yellow-600">
                ⚠️ To update credentials, edit the .env file in the backend directory and restart the server.
              </p>
            </div>
          </div>

          {/* Trading Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Trading Configuration</h2>
            <div className="space-y-4 text-gray-600">
              <p>Duplicate Order Interval: 45 seconds</p>
              <p>Squareoff Check Interval: 10 seconds</p>
              <p>Order Type: Market/Limit</p>
              <p className="text-sm mt-4 text-blue-600">
                ℹ️ Modify intervals in .env file for fine-tuning.
              </p>
            </div>
          </div>

          {/* Database Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Database Configuration</h2>
            <div className="space-y-4 text-gray-600">
              <p>Host: Configured</p>
              <p>Database: kotakneo_trading</p>
              <p>Connection Status: ✓ Active</p>
            </div>
          </div>

          {/* TradingView Webhook */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">TradingView Webhook</h2>
            <div className="space-y-4">
              <p className="text-gray-600 font-semibold">Webhook URL:</p>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm text-gray-700 break-all">
                http://your-server:5000/api/webhook
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Configure this URL in your TradingView alerts for automated trading signals.
              </p>
            </div>
          </div>

          {/* Signal Format */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Expected Signal Format</h2>
            <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
              <pre>{`{
  "message": "symbol=RELIANCE
signalType=BUY
quantity=1
entryPrice=2500.00
targetPrice=2600.00
stopLoss=2450.00"
}`}</pre>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Use this format in TradingView webhook message or send as JSON with these fields.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
