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

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { mysqlTable, int, varchar as mysqlVarchar } from 'drizzle-orm/mysql-core';

/**
 * SQLite schema for casbin rules
 */
export const casbinRuleSqlite = sqliteTable('casbin_rule', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ptype: text('ptype'),
  v0: text('v0'),
  v1: text('v1'),
  v2: text('v2'),
  v3: text('v3'),
  v4: text('v4'),
  v5: text('v5'),
});

/**
 * PostgreSQL schema for casbin rules
 */
export const casbinRulePostgres = pgTable('casbin_rule', {
  id: serial('id').primaryKey(),
  ptype: varchar('ptype', { length: 255 }),
  v0: varchar('v0', { length: 255 }),
  v1: varchar('v1', { length: 255 }),
  v2: varchar('v2', { length: 255 }),
  v3: varchar('v3', { length: 255 }),
  v4: varchar('v4', { length: 255 }),
  v5: varchar('v5', { length: 255 }),
});

/**
 * MySQL schema for casbin rules
 */
export const casbinRuleMysql = mysqlTable('casbin_rule', {
  id: int('id').primaryKey().autoincrement(),
  ptype: mysqlVarchar('ptype', { length: 255 }),
  v0: mysqlVarchar('v0', { length: 255 }),
  v1: mysqlVarchar('v1', { length: 255 }),
  v2: mysqlVarchar('v2', { length: 255 }),
  v3: mysqlVarchar('v3', { length: 255 }),
  v4: mysqlVarchar('v4', { length: 255 }),
  v5: mysqlVarchar('v5', { length: 255 }),
});

/**
 * Generic CasbinRule type for all database types
 */
export type CasbinRule = {
  id?: number;
  ptype: string | null;
  v0: string | null;
  v1: string | null;
  v2: string | null;
  v3: string | null;
  v4: string | null;
  v5: string | null;
};

/**
 * New CasbinRule type for insertion (without id)
 */
export type NewCasbinRule = Omit<CasbinRule, 'id'>;
