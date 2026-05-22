import http from 'http';

console.log('==============================================');
console.log('🚀 SOVEREIGN NEXUS: E2E SMOKE TEST SEQUENCE 🚀');
console.log('==============================================');

const port = process.env.TARGET_PORT ? Number(process.env.TARGET_PORT) : 3000;
console.log(`[1/3] Detecting Main Application Server on :${port} ...`);

const req = http.request({
  hostname: '127.0.0.1',
  port: port,
  path: '/api/health',
  method: 'GET',
}, (res) => {
  if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 304) {
    console.log(`✅ [SUCCESS] Main Application Server detected on :${port}`);
    process.exit(0);
  } else {
    console.log(`❌ [FAIL] Server responded with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.log(`❌ [FAIL] Network request refused: ${error.message}`);
  process.exit(1);
});

req.end();
