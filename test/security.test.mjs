import { test, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.COPILOT_PROXY_API_KEY = 'test-only-credential-at-least-32-characters';
const {app, HOST} = await import('../index.js');
const server = app.listen(0,'127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());
const authorization = 'Bearer ' + process.env.COPILOT_PROXY_API_KEY;
test('native default binds to loopback', () => assert.equal(HOST, '127.0.0.1'));
test('private endpoint needs correct bearer key', async () => {
  assert.equal((await fetch(base+'/health')).status, 401);
  assert.equal((await fetch(base+'/health',{headers:{Authorization:'Bearer wrong'}})).status, 401);
  assert.equal((await fetch(base+'/health',{headers:{Authorization:authorization}})).status, 200);
});
test('tool and function invocations are rejected before processing', async () => {
 for (const body of [{tools:[{type:'function'}]},{functions:[{name:'x'}]},{messages:[{role:'tool',content:'x'}]},{input:[{type:'function_call_output',output:'x'}]}]) {
  const r = await fetch(base+'/v1/chat/completions',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(r.status,400);assert.match((await r.json()).error.message,/disabled/);
 }
});
