'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const preset=require('../counselor-management/period-presets.js');

test('year preset is an internal Nov-to-Oct reporting window',()=>{
  assert.deepEqual(preset.forYear(2027),{year:2027,start:'2026-11-01',end:'2027-10-31'});
  assert.deepEqual(preset.forYear('2028'),{year:2028,start:'2027-11-01',end:'2028-10-31'});
});
test('custom date range is not incorrectly forced into an annual preset',()=>{
  assert.equal(preset.detect('2026-11-01','2027-10-31'),'2027');
  assert.equal(preset.detect('2026-12-01','2027-10-31'),'custom');
  assert.equal(preset.detect('2026-11-01','2027-11-30'),'custom');
  assert.throws(()=>preset.forYear('2027A'),/관리연도/);
});
