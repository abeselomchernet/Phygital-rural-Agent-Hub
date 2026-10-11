import assert from 'node:assert/strict';
const port=Number(process.env.TARGET_PORT || 3000);
const response=await fetch(`http://127.0.0.1:${port}/api/health`);
assert.equal(response.status,200);
assert.match(response.headers.get('content-type') || '',/application\/json/);
assert.equal((await response.json()).status,'ok');
console.log('PASS: API health returns HTTP 200 and status ok');
