import pathExists from 'path-exists';
import test from 'ava';
import {exec, stdlib, rimraf} from '../common';

test.before('mkdir', async t => {
  await rimraf('function-new');
  await exec('mkdir function-new');
  t.truthy(true);
})

test('stdib f:new', async t => {
  await stdlib('f:new foo', 'function-new');
  const exist = await pathExists('function-new/package.json');
  t.truthy(exist, 'package.json exists');
});

test.after('cleanup', async t => {
  await rimraf('function-new');
  t.truthy(true);
});
