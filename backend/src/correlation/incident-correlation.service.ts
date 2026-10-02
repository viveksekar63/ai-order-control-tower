import { Injectable } from '@nestjs/common';
import { ExceptionStatus, MetricType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class IncidentCorrelationService {
  private readonly windowMinutes = 5;
  private readonly highRssBytes = 2 * 1024 * 1024 * 1024;
  private readonly criticalRssBytes = 4 * 1024 * 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async correlateException(exceptionId: string) {
    const exception = await this.prisma.orderException.findUnique({
      where: { id: exceptionId },
      include: { order: true },
    });

    if (!exception) {
      throw new Error(`Exception not found: ${exceptionId}`);
    }

    const center = exception.lastDetectedAt ?? exception.firstDetectedAt;
    const from = new Date(center.getTime() - this.windowMinutes * 60_000);
    const to = new Date(center.getTime() + this.windowMinutes * 60_000);

    const metrics = await this.prisma.phpProcessMetric.findMany({
      where: {
        capturedAt: { gte: from, lte: to },
        OR: [
          { orderId: exception.orderId },
          {
            requestId: {
              in: await this.findRequestIds(exception.orderId, from, to),
            },
          },
        ],
      },
      orderBy: { capturedAt: 'asc' },
      take: 500,
    });

    const relevantMetrics = metrics.filter((metric) => {
      if (metric.orderId === exception.orderId) return true;
      return this.isLikelyMagentoRequest(metric.requestUri);
    });

    const memorySpikes = relevantMetrics
      .filter((metric) => metric.rssBytes >= BigInt(this.highRssBytes))
      .map((metric) => ({
        id: metric.id,
        host: metric.host,
        pid: metric.pid,
        pool: metric.pool,
        rssBytes: metric.rssBytes.toString(),
        virtualBytes: metric.virtualBytes?.toString() ?? null,
        peakBytes: metric.peakBytes?.toString() ?? null,
        cpuPercent: metric.cpuPercent?.toString() ?? null,
        requestUri: metric.requestUri,
        requestId: metric.requestId,
        orderId: metric.orderId,
        capturedAt: metric.capturedAt.toISOString(),
        severity:
          metric.rssBytes >= BigInt(this.criticalRssBytes)
            ? 'CRITICAL'
            : 'HIGH',
      }));

    const evidence = {
      correlatedAt: new Date().toISOString(),
      window: {
        from: from.toISOString(),
        to: to.toISOString(),
        minutes: this.windowMinutes,
      },
      order: {
        id: exception.order.id,
        externalOrderId: exception.order.externalOrderId,
        incrementId: exception.order.incrementId,
        state: exception.order.currentState,
      },
      exception: {
        id: exception.id,
        code: exception.code,
        severity: exception.severity,
      },
      phpCorrelation: {
        status: memorySpikes.length > 0 ? 'CORRELATED' : 'NO_MATCH',
        metricCount: relevantMetrics.length,
        memorySpikeCount: memorySpikes.length,
        thresholds: {
          highRssBytes: this.highRssBytes.toString(),
          criticalRssBytes: this.criticalRssBytes.toString(),
        },
        memorySpikes,
      },
    };

    const updated = await this.prisma.orderException.update({
      where: { id: exception.id },
      data: {
        evidence: this.mergeEvidence(exception.evidence, evidence),
        lastDetectedAt: new Date(),
      },
    });

    return {
      success: true,
      exceptionId: updated.id,
      status: evidence.phpCorrelation.status,
      memorySpikeCount: memorySpikes.length,
      evidence,
    };
  }

  async correlateOpenExceptions() {
    const exceptions = await this.prisma.orderException.findMany({
      where: {
        status: {
          in: [
            ExceptionStatus.OPEN,
            ExceptionStatus.ACKNOWLEDGED,
            ExceptionStatus.INVESTIGATING,
          ],
        },
      },
      select: { id: true },
      take: 500,
    });

    const results = [];
    for (const exception of exceptions) {
      results.push(await this.correlateException(exception.id));
    }

    return {
      success: true,
      correlatedAt: new Date(),
      count: results.length,
      results,
    };
  }

  private async findRequestIds(orderId: string, from: Date, to: Date) {
    const metrics = await this.prisma.phpProcessMetric.findMany({
      where: {
        orderId,
        capturedAt: { gte: from, lte: to },
        requestId: { not: null },
      },
      select: { requestId: true },
    });

    return metrics
      .map((metric) => metric.requestId)
      .filter((requestId): requestId is string => Boolean(requestId));
  }

  private isLikelyMagentoRequest(requestUri?: string | null) {
    if (!requestUri) return false;

    return (
      requestUri.includes('/rest/') ||
      requestUri.includes('/graphql') ||
      requestUri.includes('/soap/') ||
      requestUri.includes('/index.php')
    );
  }

  private mergeEvidence(existing: Prisma.JsonValue | null, correlation: Prisma.JsonObject) {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? existing
        : {};

    return {
      ...base,
      incidentCorrelation: correlation,
    } as Prisma.InputJsonValue;
  }
}
