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

import { Helper, Model, FilteredAdapter, UpdatableAdapter } from 'casbin';
import { eq, and, SQL } from 'drizzle-orm';
import {
  CasbinRule,
  NewCasbinRule,
  casbinRuleSqlite,
  casbinRulePostgres,
  casbinRuleMysql,
} from './casbinRule';

type DrizzleDb = {
  select: (fields?: any) => any;
  insert: (table: any) => any;
  delete: (table: any) => any;
  update: (table: any) => any;
};

type CasbinRuleTable =
  | typeof casbinRuleSqlite
  | typeof casbinRulePostgres
  | typeof casbinRuleMysql;

export type DrizzleAdapterOptions = {
  db: DrizzleDb;
  table?: CasbinRuleTable;
};

export type FilterOptions = {
  ptype?: string;
  v0?: string;
  v1?: string;
  v2?: string;
  v3?: string;
  v4?: string;
  v5?: string;
};

/**
 * DrizzleAdapter represents the Drizzle ORM adapter for policy storage.
 */
export default class DrizzleAdapter
  implements FilteredAdapter, UpdatableAdapter
{
  private db: DrizzleDb;
  private table: CasbinRuleTable;
  private filtered = false;

  private constructor(db: DrizzleDb, table: CasbinRuleTable) {
    this.db = db;
    this.table = table;
  }

  public isFiltered(): boolean {
    return this.filtered;
  }

  /**
   * newAdapter is the constructor.
   * @param options Drizzle adapter options containing db and optional table
   */
  public static async newAdapter(
    options: DrizzleAdapterOptions,
  ): Promise<DrizzleAdapter> {
    const { db, table = casbinRuleSqlite } = options;
    const adapter = new DrizzleAdapter(db, table);
    return adapter;
  }

  private loadPolicyLine(line: CasbinRule, model: Model): void {
    const result =
      line.ptype +
      ', ' +
      [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5]
        .filter((n) => n)
        .map((n) => `"${n}"`)
        .join(', ');
    Helper.loadPolicyLine(result, model);
  }

  /**
   * loadPolicy loads all policy rules from the storage.
   */
  public async loadPolicy(model: Model): Promise<void> {
    const lines = await this.db.select().from(this.table);

    for (const line of lines) {
      this.loadPolicyLine(line as CasbinRule, model);
    }
  }

  /**
   * loadFilteredPolicy loads policy rules that match the filter from the storage.
   */
  public async loadFilteredPolicy(
    model: Model,
    filter: FilterOptions,
  ): Promise<void> {
    const conditions: SQL[] = [];

    if (filter.ptype !== undefined) {
      conditions.push(eq(this.table.ptype, filter.ptype));
    }
    if (filter.v0 !== undefined) {
      conditions.push(eq(this.table.v0, filter.v0));
    }
    if (filter.v1 !== undefined) {
      conditions.push(eq(this.table.v1, filter.v1));
    }
    if (filter.v2 !== undefined) {
      conditions.push(eq(this.table.v2, filter.v2));
    }
    if (filter.v3 !== undefined) {
      conditions.push(eq(this.table.v3, filter.v3));
    }
    if (filter.v4 !== undefined) {
      conditions.push(eq(this.table.v4, filter.v4));
    }
    if (filter.v5 !== undefined) {
      conditions.push(eq(this.table.v5, filter.v5));
    }

    let query = this.db.select().from(this.table);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const filteredLines = await query;

    for (const line of filteredLines) {
      this.loadPolicyLine(line as CasbinRule, model);
    }
    this.filtered = true;
  }

  private savePolicyLine(ptype: string, rule: string[]): NewCasbinRule {
    const line: NewCasbinRule = {
      ptype,
      v0: rule.length > 0 ? rule[0] : null,
      v1: rule.length > 1 ? rule[1] : null,
      v2: rule.length > 2 ? rule[2] : null,
      v3: rule.length > 3 ? rule[3] : null,
      v4: rule.length > 4 ? rule[4] : null,
      v5: rule.length > 5 ? rule[5] : null,
    };

    return line;
  }

  /**
   * savePolicy saves all policy rules to the storage.
   */
  public async savePolicy(model: Model): Promise<boolean> {
    await this.db.delete(this.table);

    const lines: NewCasbinRule[] = [];

    let astMap = model.model.get('p');
    if (astMap) {
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          const line = this.savePolicyLine(ptype, rule);
          lines.push(line);
        }
      }
    }

    astMap = model.model.get('g');
    if (astMap) {
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          const line = this.savePolicyLine(ptype, rule);
          lines.push(line);
        }
      }
    }

    if (lines.length > 0) {
      await this.db.insert(this.table).values(lines);
    }

    return true;
  }

  /**
   * addPolicy adds a policy rule to the storage.
   */
  public async addPolicy(
    sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    const line = this.savePolicyLine(ptype, rule);
    await this.db.insert(this.table).values(line);
  }

  /**
   * addPolicies adds policy rules to the storage.
   */
  public async addPolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    const lines: NewCasbinRule[] = [];
    for (const rule of rules) {
      const line = this.savePolicyLine(ptype, rule);
      lines.push(line);
    }

    if (lines.length > 0) {
      await this.db.insert(this.table).values(lines);
    }
  }

  /**
   * updatePolicy updates a policy rule from the storage.
   */
  public async updatePolicy(
    sec: string,
    ptype: string,
    oldRule: string[],
    newRule: string[],
  ): Promise<void> {
    const oldLine = this.savePolicyLine(ptype, oldRule);
    const newLine = this.savePolicyLine(ptype, newRule);

    const conditions: SQL[] = [eq(this.table.ptype, ptype)];

    if (oldLine.v0 !== null) {
      conditions.push(eq(this.table.v0, oldLine.v0));
    }
    if (oldLine.v1 !== null) {
      conditions.push(eq(this.table.v1, oldLine.v1));
    }
    if (oldLine.v2 !== null) {
      conditions.push(eq(this.table.v2, oldLine.v2));
    }
    if (oldLine.v3 !== null) {
      conditions.push(eq(this.table.v3, oldLine.v3));
    }
    if (oldLine.v4 !== null) {
      conditions.push(eq(this.table.v4, oldLine.v4));
    }
    if (oldLine.v5 !== null) {
      conditions.push(eq(this.table.v5, oldLine.v5));
    }

    await this.db
      .update(this.table)
      .set({
        ptype: newLine.ptype,
        v0: newLine.v0,
        v1: newLine.v1,
        v2: newLine.v2,
        v3: newLine.v3,
        v4: newLine.v4,
        v5: newLine.v5,
      })
      .where(and(...conditions));
  }

  /**
   * removePolicy removes a policy rule from the storage.
   */
  public async removePolicy(
    sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    const line = this.savePolicyLine(ptype, rule);

    const conditions: SQL[] = [eq(this.table.ptype, ptype)];

    if (line.v0 !== null) {
      conditions.push(eq(this.table.v0, line.v0));
    }
    if (line.v1 !== null) {
      conditions.push(eq(this.table.v1, line.v1));
    }
    if (line.v2 !== null) {
      conditions.push(eq(this.table.v2, line.v2));
    }
    if (line.v3 !== null) {
      conditions.push(eq(this.table.v3, line.v3));
    }
    if (line.v4 !== null) {
      conditions.push(eq(this.table.v4, line.v4));
    }
    if (line.v5 !== null) {
      conditions.push(eq(this.table.v5, line.v5));
    }

    await this.db.delete(this.table).where(and(...conditions));
  }

  /**
   * removePolicies removes policy rules from the storage.
   */
  public async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    for (const rule of rules) {
      await this.removePolicy(sec, ptype, rule);
    }
  }

  /**
   * removeFilteredPolicy removes policy rules that match the filter from the storage.
   */
  public async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const conditions: SQL[] = [];

    if (ptype) {
      conditions.push(eq(this.table.ptype, ptype));
    }

    for (let i = 0; i < fieldValues.length; i++) {
      const fieldIdx = fieldIndex + i;
      const value = fieldValues[i];
      if (value) {
        switch (fieldIdx) {
          case 0:
            conditions.push(eq(this.table.v0, value));
            break;
          case 1:
            conditions.push(eq(this.table.v1, value));
            break;
          case 2:
            conditions.push(eq(this.table.v2, value));
            break;
          case 3:
            conditions.push(eq(this.table.v3, value));
            break;
          case 4:
            conditions.push(eq(this.table.v4, value));
            break;
          case 5:
            conditions.push(eq(this.table.v5, value));
            break;
        }
      }
    }

    if (conditions.length > 0) {
      await this.db.delete(this.table).where(and(...conditions));
    }
  }
}
