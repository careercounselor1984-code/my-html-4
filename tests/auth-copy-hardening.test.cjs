'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const section = html.split('<!-- CC_AUTH_TEST_UI_BEGIN -->')[1].split('<!-- CC_AUTH_TEST_UI_END -->')[0];
const authCode = [...section.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .find(match => match[1].includes('var LOGIN_FUNCTION='))[1];
const markup = section.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const user = {id: '00000000-0000-4000-8000-000000000001', email: 'staff@example.test'};
const settle = () => new Promise(resolve => setImmediate(resolve));

async function scenario(url, options = {}) {
  const dom = new JSDOM('<!doctype html><html class="cc-auth-pending"><body>' + markup + '</body></html>', {
    url, runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window;
  const stats = {userChecks: 0, serverChecks: 0, signouts: 0, opinionCalls: 0};
  const heartbeats = [];
  w.setInterval = callback => { heartbeats.push(callback); return heartbeats.length; };
  w.clearInterval = () => {};
  w.console.error = () => {};
  w.console.warn = () => {};
  if (!url.startsWith('file:')) w.localStorage.setItem('cc_device_id_v1', 'device-test');
  const client = {
    auth: {
      onAuthStateChange() {},
      async getUser() { stats.userChecks++; return {data: {user: options.signedIn ? user : null}}; },
      async getSession() { return {data: {session: {access_token: 'mock-user-token'}}}; },
      async signOut() { stats.signouts++; return {}; }
    },
    from() {
      const result = {data: {user_id: user.id, device_id: options.otherDevice ? 'other-device' : 'device-test',
        expires_at: '2099-01-01T00:00:00Z'}};
      const query = {select() {return query;}, update() {return query;}, eq() {return query;},
        async maybeSingle() {return result;}, then(resolve, reject) {return Promise.resolve(result).then(resolve, reject);}};
      return query;
    }
  };
  if (!options.noSdk) w.supabase = {createClient() {return client;}};
  w.GoodJobPrivacy={storage:{}};w.GoodJobBackup={};
  w.fetch = async (url, request) => {
    if(url.endsWith('/journal-stipend')) {
      assert.equal(request.headers.Authorization,'Bearer mock-user-token');
      assert.equal(request.headers['x-journal-device-id'],'device-test');
      return {ok:true,async json(){return {ok:true,version:1,calc:{pay:12345}}}};
    }
    if(url.endsWith('/journal-protected-core')) {
      assert.equal(request.headers.Authorization,'Bearer mock-user-token');
      assert.equal(request.headers['x-journal-device-id'],'device-test');
      const body=JSON.parse(request.body);assert.equal(body.fields.operation,'schoolInitial');
      return {ok:true,async json(){return {ok:true,version:1,result:{text:'protected core result'}}}};
    }
    if(url.endsWith('/journal-iap-opinion')) {
      assert.equal(request.headers.Authorization,'Bearer mock-user-token');
      assert.equal(request.headers['x-journal-device-id'],'device-test');
      return {ok:true,async json(){return {ok:true,version:1,text:'IAP server opinion'}}};
    }
    if(url.endsWith('/journal-opinion')) {
      stats.opinionCalls++;
      assert.equal(request.headers.Authorization,'Bearer mock-user-token');
      assert.equal(request.headers['x-journal-device-id'],'device-test');
      const body=JSON.parse(request.body);assert.equal(body.version,1);assert.equal(body.fields.strategyTargetJob,'test-job');
      if(options.opinionHook)await options.opinionHook();
      return {ok:true,async json(){return {ok:true,version:1,text:'server opinion'}}};
    }
    stats.serverChecks++;
    if (options.networkError) throw new Error('network unavailable');
    return {ok: !options.inactive, async json() {
      return options.inactive ? {error: 'account_inactive'} : {ok: true, user: {
        name: '테스트 상담사', role: 'staff', login_id: 'test', must_change_password: !!options.changePassword
      }};
    }};
  };
  w.eval(authCode);
  await settle();
  return {w, stats, heartbeats, close: () => w.close()};
}

function assertLocked(w) {
  assert(w.document.documentElement.classList.contains('cc-auth-pending'));
  assert(!w.document.getElementById('ccAuthGate').classList.contains('cc-hidden'));
  assert.equal(w.clgJobArchiveClient(), null);
  assert.equal(w.__CLG_JOURNAL_EMPLOYEE, null);
}

(async () => {
  const urls = ['https://careercounselor1984-code.github.io/my-html-4/', 'file:///tmp/copied-index.html',
    'http://localhost/', 'http://127.0.0.1/', 'http://0.0.0.0/', 'http://[::1]/', 'http://preview.localhost/'];
  for (const url of urls) {
    const s = await scenario(url);
    try { assertLocked(s.w); assert.equal(s.stats.userChecks, 1, url + ' must check auth'); }
    finally { s.close(); }
  }
  for (const options of [{noSdk: true}, {signedIn: true, inactive: true}, {signedIn: true, networkError: true},
    {signedIn: true, otherDevice: true}]) {
    const s = await scenario(urls[0], options);
    try { assertLocked(s.w); } finally { s.close(); }
  }
  const password = await scenario(urls[0], {signedIn: true, changePassword: true});
  try {
    assert(password.w.document.getElementById('ccPasswordOverlay').classList.contains('show'));
    assert(password.w.document.documentElement.classList.contains('cc-auth-pending'));
    assert.equal(password.w.clgJobArchiveClient(), null);
    assert.equal(password.stats.serverChecks, 1);
  } finally { password.close(); }

  const options = {signedIn: true};
  const active = await scenario(urls[0], options);
  try {
    assert(!active.w.document.documentElement.classList.contains('cc-auth-pending'));
    assert(active.w.document.getElementById('ccAuthGate').classList.contains('cc-hidden'));
    assert(active.w.clgJobArchiveClient());
    assert.equal(active.stats.serverChecks, 1);
    assert.equal(active.w.__CLG_JOURNAL_EMPLOYEE.email, user.email);
    assert.equal(await active.w.clgGenerateInitialOpinion({strategyTargetJob:'test-job'}),'server opinion');
    assert.equal((await active.w.clgComputeStipend({ratePct:100})).pay,12345);
    assert.equal(await active.w.clgGenerateIapOpinion({wishJob:'test-job'}),'IAP server opinion');
    assert.equal((await active.w.clgRunProtectedCore('schoolInitial',{})).text,'protected core result');
    let release;
    options.opinionHook=()=>new Promise(resolve=>{release=resolve});
    const late=active.w.clgGenerateInitialOpinion({strategyTargetJob:'test-job'});
    await settle();
    options.inactive = true;
    await active.heartbeats[0]();
    await settle();
    assertLocked(active.w);
    assert.equal(active.stats.signouts, 1);
    release();await assert.rejects(late,/로그인 상태가 변경/);
    await assert.rejects(active.w.clgGenerateInitialOpinion({strategyTargetJob:'test-job'}),/로그인 상태/);
    await assert.rejects(active.w.clgComputeStipend({ratePct:100}),/로그인 상태/);
    await assert.rejects(active.w.clgGenerateIapOpinion({wishJob:'test-job'}),/로그인 상태/);
    await assert.rejects(active.w.clgRunProtectedCore('schoolInitial',{}),/로그인 상태/);
    assert.equal(active.stats.opinionCalls,2);
  } finally { active.close(); }

  for (const name of ['login-test.html', 'p11-decoded.html']) {
    const alias = fs.readFileSync(name, 'utf8');
    assert(!alias.includes('const PAGES = '), name + ' must not contain an old app');
    assert(!alias.includes('buildRecordText'), name + ' must not expose a standalone generator');
    let target;
    vm.runInNewContext(alias.match(/<script>([\s\S]*?)<\/script>/)[1], {
      location: {search: '?recover=1', hash: '#recovery-token', replace(value) {target = value;}}
    });
    assert.equal(target, './index.html?recover=1#recovery-token', name + ' preserves recovery links');
  }
  console.log('PASS: 7 origins require authentication; missing SDK/network/inactive/other PC fail closed; password change enforced; active staff unlock; revoked staff lock; legacy routes preserve recovery parameters.');
})().catch(error => {console.error(error); process.exitCode = 1;});
