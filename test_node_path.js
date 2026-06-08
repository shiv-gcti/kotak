console.log('NODE_PATH=', process.env.NODE_PATH || '(none)');
console.log('resolve paths for mysql2:', require.resolve.paths('mysql2'));
try {
  console.log('mysql2 resolvable at:', require.resolve('mysql2'));
} catch (err) {
  console.error('mysql2 resolve error:', err.message);
}
