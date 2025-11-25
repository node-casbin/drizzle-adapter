Drizzle Adapter
====
[![CI](https://github.com/node-casbin/drizzle-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/node-casbin/drizzle-adapter/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/node-casbin/drizzle-adapter/badge.svg?branch=master)](https://coveralls.io/github/node-casbin/drizzle-adapter?branch=master)
[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]
[![Discord](https://img.shields.io/discord/1022748306096537660?logo=discord&label=discord&color=5865F2)](https://discord.gg/S5UjpzGZjN)

[npm-image]: https://img.shields.io/npm/v/casbin-drizzle-adapter.svg?style=flat-square
[npm-url]: https://npmjs.com/package/casbin-drizzle-adapter
[download-image]: https://img.shields.io/npm/dm/casbin-drizzle-adapter.svg?style=flat-square
[download-url]: https://npmjs.com/package/casbin-drizzle-adapter

Drizzle Adapter is the [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) adapter for [Node-Casbin](https://github.com/casbin/node-casbin). With this library, Node-Casbin can load policy from Drizzle ORM supported database or save policy to it.

Based on [Officially Supported Databases](https://orm.drizzle.team/docs/overview), the current supported databases are:

- PostgreSQL
- MySQL
- SQLite
- Turso
- Neon
- PlanetScale
- Vercel Postgres
- Xata
- And more...

## Installation

```bash
npm install casbin-drizzle-adapter
# or
yarn add casbin-drizzle-adapter
```

## Simple Example

```typescript
import { newEnforcer } from 'casbin';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import DrizzleAdapter, { casbinRuleSqlite } from 'casbin-drizzle-adapter';

async function myFunction() {
    // Initialize a SQLite database
    const sqlite = new Database('casbin.db');
    const db = drizzle(sqlite);
    
    // Create the casbin_rule table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS casbin_rule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ptype TEXT,
            v0 TEXT,
            v1 TEXT,
            v2 TEXT,
            v3 TEXT,
            v4 TEXT,
            v5 TEXT
        )
    `);

    // Initialize a Drizzle adapter and use it in a Node-Casbin enforcer
    const a = await DrizzleAdapter.newAdapter({
        db: db,
        table: casbinRuleSqlite,
    });

    const e = await newEnforcer('examples/rbac_model.conf', a);

    // Load the policy from DB.
    await e.loadPolicy();

    // Check the permission.
    await e.enforce('alice', 'data1', 'read');

    // Modify the policy.
    // await e.addPolicy(...);
    // await e.removePolicy(...);

    // Save the policy back to DB.
    await e.savePolicy();
}
```

## PostgreSQL Example

```typescript
import { newEnforcer } from 'casbin';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import DrizzleAdapter, { casbinRulePostgres } from 'casbin-drizzle-adapter';

async function myFunction() {
    // Initialize a PostgreSQL connection
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: 'casbin',
    });
    const db = drizzle(pool);

    // Initialize a Drizzle adapter
    const a = await DrizzleAdapter.newAdapter({
        db: db,
        table: casbinRulePostgres,
    });

    const e = await newEnforcer('examples/rbac_model.conf', a);

    // Load the policy from DB.
    await e.loadPolicy();

    // Check the permission.
    await e.enforce('alice', 'data1', 'read');
}
```

## MySQL Example

```typescript
import { newEnforcer } from 'casbin';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import DrizzleAdapter, { casbinRuleMysql } from 'casbin-drizzle-adapter';

async function myFunction() {
    // Initialize a MySQL connection
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'casbin',
    });
    const db = drizzle(connection);

    // Initialize a Drizzle adapter
    const a = await DrizzleAdapter.newAdapter({
        db: db,
        table: casbinRuleMysql,
    });

    const e = await newEnforcer('examples/rbac_model.conf', a);

    // Load the policy from DB.
    await e.loadPolicy();

    // Check the permission.
    await e.enforce('alice', 'data1', 'read');
}
```

## Filtered Policy Example

```typescript
import { newEnforcer } from 'casbin';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import DrizzleAdapter, { casbinRuleSqlite } from 'casbin-drizzle-adapter';

async function myFunction() {
    const sqlite = new Database('casbin.db');
    const db = drizzle(sqlite);

    const a = await DrizzleAdapter.newAdapter({
        db: db,
        table: casbinRuleSqlite,
    });

    const e = await newEnforcer('examples/rbac_model.conf', a);

    // Load the filtered policy from DB.
    await e.loadFilteredPolicy({
        'ptype': 'p',
        'v0': 'alice'
    });

    // Check the permission.
    await e.enforce('alice', 'data1', 'read');
}
```

## Custom Table Schema

You can create a custom table schema if you need additional fields or different column names:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import DrizzleAdapter from 'casbin-drizzle-adapter';

// Define a custom table schema
const customCasbinRule = sqliteTable('my_casbin_rules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ptype: text('ptype'),
    v0: text('v0'),
    v1: text('v1'),
    v2: text('v2'),
    v3: text('v3'),
    v4: text('v4'),
    v5: text('v5'),
});

async function myFunction() {
    const sqlite = new Database('casbin.db');
    const db = drizzle(sqlite);

    const a = await DrizzleAdapter.newAdapter({
        db: db,
        table: customCasbinRule,
    });

    const e = await newEnforcer('examples/rbac_model.conf', a);
    await e.loadPolicy();
}
```

## API Reference

### DrizzleAdapter

#### `newAdapter(options: DrizzleAdapterOptions): Promise<DrizzleAdapter>`

Creates a new Drizzle adapter instance.

**Options:**
- `db`: Drizzle database instance
- `table`: (Optional) Drizzle table schema. Defaults to `casbinRuleSqlite`

#### `loadPolicy(model: Model): Promise<void>`

Loads all policy rules from the database.

#### `loadFilteredPolicy(model: Model, filter: FilterOptions): Promise<void>`

Loads policy rules that match the filter from the database.

**FilterOptions:**
- `ptype`: Policy type (e.g., 'p', 'g')
- `v0` to `v5`: Policy values

#### `savePolicy(model: Model): Promise<boolean>`

Saves all policy rules to the database (clears existing policies first).

#### `addPolicy(sec: string, ptype: string, rule: string[]): Promise<void>`

Adds a policy rule to the database.

#### `addPolicies(sec: string, ptype: string, rules: string[][]): Promise<void>`

Adds multiple policy rules to the database.

#### `removePolicy(sec: string, ptype: string, rule: string[]): Promise<void>`

Removes a policy rule from the database.

#### `removePolicies(sec: string, ptype: string, rules: string[][]): Promise<void>`

Removes multiple policy rules from the database.

#### `removeFilteredPolicy(sec: string, ptype: string, fieldIndex: number, ...fieldValues: string[]): Promise<void>`

Removes policy rules that match the filter from the database.

#### `updatePolicy(sec: string, ptype: string, oldRule: string[], newRule: string[]): Promise<void>`

Updates a policy rule in the database.

#### `isFiltered(): boolean`

Returns whether the loaded policy has been filtered.

## Getting Help

- [Node-Casbin](https://github.com/casbin/node-casbin)
- [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm)

## License

This project is under Apache 2.0 License. See the [LICENSE](LICENSE) file for the full license text.