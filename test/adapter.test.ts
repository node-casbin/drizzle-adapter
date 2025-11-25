// Copyright 2024 The Casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Enforcer, setDefaultFileSystem } from 'casbin';
import DrizzleAdapter from '../src/index';
import { createTestDb } from './config';
import * as fs from 'fs';

setDefaultFileSystem(fs as any);

describe('DrizzleAdapter', () => {
  let db: ReturnType<typeof createTestDb>['db'];
  let sqlite: ReturnType<typeof createTestDb>['sqlite'];
  let table: ReturnType<typeof createTestDb>['table'];
  let adapter: DrizzleAdapter;

  beforeEach(async () => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
    table = testDb.table;
    adapter = await DrizzleAdapter.newAdapter({ db, table });
  });

  afterEach(() => {
    sqlite.close();
  });

  test('TestAdapter', async () => {
    // Because the DB is empty at first,
    // so we need to load the policy from the file adapter (.CSV) first.
    let e = new Enforcer();

    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );

    // This is a trick to save the current policy to the DB.
    // We can't call e.savePolicy() because the adapter in the enforcer is still the file adapter.
    // The current policy means the policy in the Node-Casbin enforcer (aka in memory).
    await adapter.savePolicy(e.getModel());

    // Clear the current policy.
    e.clearPolicy();
    expect(await e.getPolicy()).toEqual([]);

    // Load the policy from DB.
    await adapter.loadPolicy(e.getModel());
    expect(await e.getPolicy()).toEqual([
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
    ]);

    // Note: you don't need to look at the above code
    // if you already have a working DB with policy inside.

    // Now the DB has policy, so we can provide a normal use case.
    // Create an adapter and an enforcer.
    // newEnforcer() will load the policy automatically.
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
    ]);

    // Test filtered policy loading
    e.clearPolicy();
    await adapter.loadFilteredPolicy(e.getModel(), { ptype: 'p', v0: 'alice' });
    expect(await e.getFilteredNamedPolicy('p', 0, 'alice')).toEqual([
      ['alice', 'data1', 'read'],
    ]);
  }, 60000);

  test('TestAddPolicy', async () => {
    let e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    // Add policy to DB
    await adapter.addPolicy('', 'p', ['role', 'res', 'action']);
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
      ['role', 'res', 'action'],
    ]);
  }, 60000);

  test('TestAddPolicies', async () => {
    let e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    await adapter.addPolicies('', 'p', [
      ['role1', 'res1', 'action1'],
      ['role2', 'res2', 'action2'],
      ['role3', 'res3', 'action3'],
    ]);
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
      ['role1', 'res1', 'action1'],
      ['role2', 'res2', 'action2'],
      ['role3', 'res3', 'action3'],
    ]);
  }, 60000);

  test('TestRemovePolicy', async () => {
    let e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    // Remove policy from DB
    await adapter.removePolicy('', 'p', ['alice', 'data1', 'read']);
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['bob', 'data2', 'write'],
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
    ]);
  }, 60000);

  test('TestRemovePolicies', async () => {
    let e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    await adapter.removePolicies('', 'p', [
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
    ]);
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
    ]);
  }, 60000);

  test('TestRemoveFilteredPolicy', async () => {
    let e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    // Remove filtered policy from DB
    await adapter.removeFilteredPolicy('', 'p', 0, 'data2_admin');
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
    ]);
  }, 60000);

  test('TestUpdatePolicy', async () => {
    let e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    // Update policy in DB
    await adapter.updatePolicy(
      '',
      'p',
      ['alice', 'data1', 'read'],
      ['alice', 'data1', 'write'],
    );
    e = new Enforcer();
    await e.initWithAdapter('examples/rbac_model.conf', adapter);
    expect(await e.getPolicy()).toEqual([
      ['alice', 'data1', 'write'],
      ['bob', 'data2', 'write'],
      ['data2_admin', 'data2', 'read'],
      ['data2_admin', 'data2', 'write'],
    ]);
  }, 60000);

  test('TestIsFiltered', async () => {
    expect(adapter.isFiltered()).toBe(false);

    const e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    e.clearPolicy();
    await adapter.loadFilteredPolicy(e.getModel(), { ptype: 'p', v0: 'alice' });

    expect(adapter.isFiltered()).toBe(true);
  }, 60000);

  test('TestEnforce', async () => {
    const e = new Enforcer();
    await e.initWithFile(
      'examples/rbac_model.conf',
      'examples/rbac_policy.csv',
    );
    await adapter.savePolicy(e.getModel());

    const e2 = new Enforcer();
    await e2.initWithAdapter('examples/rbac_model.conf', adapter);

    expect(await e2.enforce('alice', 'data1', 'read')).toBe(true);
    expect(await e2.enforce('alice', 'data1', 'write')).toBe(false);
    expect(await e2.enforce('bob', 'data2', 'write')).toBe(true);
    expect(await e2.enforce('bob', 'data2', 'read')).toBe(false);
    expect(await e2.enforce('alice', 'data2', 'read')).toBe(true);
    expect(await e2.enforce('alice', 'data2', 'write')).toBe(true);
  }, 60000);
});
