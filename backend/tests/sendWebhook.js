(async () => {
  try {
    const payload = {
      message: JSON.stringify({
        symbol: 'AUTOTEST',
        signalType: 'BUY',
        quantity: 1,
        entryPrice: 100,
        targetPrice: 110,
        stopLoss: 95,
      }),
    };

    const webhookRes = await fetch('http://localhost:5000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const webhookText = await webhookRes.text();
    console.log('POST /api/webhook', webhookRes.status, webhookText);

    // Wait briefly to allow background processing
    await new Promise((r) => setTimeout(r, 1000));

    const tradesRes = await fetch('http://localhost:5000/api/trades');
    const tradesText = await tradesRes.text();
    console.log('GET /api/trades', tradesRes.status, tradesText);
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
})();
