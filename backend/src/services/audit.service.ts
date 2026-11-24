import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

interface LogActionParams {
  userId: string | mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(params: LogActionParams): Promise<void> {
  try {
    await AuditLog.create({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    logger.error({ err, params }, 'Failed to record audit log entry');
  }
}

export async function getAuditLogs(page = 1, limit = 50, entityType?: string) {
  const query: Record<string, unknown> = {};
  if (entityType && entityType !== 'all') {
    query.entityType = entityType;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
