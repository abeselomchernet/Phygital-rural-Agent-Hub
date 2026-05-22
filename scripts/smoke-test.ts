import http from 'http';

console.log('==============================================');
console.log('🚀 SOVEREIGN NEXUS: E2E SMOKE TEST SEQUENCE 🚀');
console.log('==============================================');

console.log('[1/3] Detecting Main Application Server on :3000 ...');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET',
}, (res) => {
  if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 304) {
    console.log('✅ [SUCCESS] Main Application Server detected on :3000');
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
