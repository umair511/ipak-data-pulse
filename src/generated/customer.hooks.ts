// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Shogo Technologies, Inc.
/**
 * Customer Hooks
 *
 * Customize business logic for CRUD operations.
 * This file is safe to edit - it will not be overwritten.
 */

/**
 * Result from a hook that can modify or reject the operation
 */
export interface HookResult<T = any> {
  ok: boolean
  error?: { code: string; message: string }
  data?: T
}

/**
 * Hook context with Prisma client
 */
export interface HookContext {
  body: any
  params: Record<string, string>
  query: Record<string, string>
  userId?: string
  tunnelAuthenticated: boolean
  prisma: any
}

/**
 * Hooks for Customer routes
 */
export interface CustomerHooks {
  /**
   * Called before listing records. Can modify where/include/orderBy.
   * Note: Query parameters (except limit, offset, userId, include, orderBy) are automatically
   * added to the where clause. This hook receives them and can override/extend them.
   */
  beforeList?: (ctx: HookContext) => Promise<HookResult<{ where?: any; include?: any; orderBy?: any }> | void>
  /** Called before getting a single record. Can reject access. */
  beforeGet?: (id: string, ctx: HookContext) => Promise<HookResult | void>
  /** Called before creating a record. Can modify input or reject. */
  beforeCreate?: (input: any, ctx: HookContext) => Promise<HookResult<any> | void>
  /** Called after creating a record. Can perform side effects. */
  afterCreate?: (record: any, ctx: HookContext) => Promise<void>
  /** Called before updating a record. Can modify input or reject. */
  beforeUpdate?: (id: string, input: any, ctx: HookContext) => Promise<HookResult<any> | void>
  /** Called after updating a record. Can perform side effects. */
  afterUpdate?: (record: any, ctx: HookContext) => Promise<void>
  /** Called before deleting a record. Can reject deletion. */
  beforeDelete?: (id: string, ctx: HookContext) => Promise<HookResult | void>
  /** Called after deleting a record. Can perform cleanup. */
  afterDelete?: (id: string, ctx: HookContext) => Promise<void>
}

/**
 * Default Customer hooks (customize as needed)
 */
export const customerHooks: CustomerHooks = {
  afterCreate: async (record, ctx) => {
    try {
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId || 'u1',
          userName: 'Admin',
          action: 'create',
          module: 'customers',
          details: JSON.stringify({ name: record.name, plant: record.plantName }),
        },
      });
    } catch (e: any) {
      console.error('Audit log (customer create) failed:', e.message);
    }
  },
  afterUpdate: async (record, ctx) => {
    try {
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId || 'u1',
          userName: 'Admin',
          action: 'update',
          module: 'customers',
          details: JSON.stringify({ id: record.id, name: record.name }),
        },
      });
    } catch (e: any) {
      console.error('Audit log (customer update) failed:', e.message);
    }
  },
  afterDelete: async (id, ctx) => {
    try {
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId || 'u1',
          userName: 'Admin',
          action: 'delete',
          module: 'customers',
          details: JSON.stringify({ deletedId: id }),
        },
      });
    } catch (e: any) {
      console.error('Audit log (customer delete) failed:', e.message);
    }
  },
}
