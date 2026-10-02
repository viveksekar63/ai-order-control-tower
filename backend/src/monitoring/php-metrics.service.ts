import { Injectable } from '@nestjs/common';
import { MetricType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { RecordPhpMetricDto } from './dto/record-php-metric.dto';

@Injectable()
export class PhpMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(dto: RecordPhpMetricDto) {
    const capturedAt = dto.capturedAt ? new Date(dto.capturedAt) : new Date();

    const metric = await this.prisma.phpProcessMetric.create({
      data: {
        host: dto.host,
        pid: dto.pid,
        pool: dto.pool,
        command: dto.command,
        rssBytes: BigInt(dto.rssBytes),
        virtualBytes: dto.virtualBytes != null ? BigInt(dto.virtualBytes) : undefined,
        peakBytes: dto.peakBytes != null ? BigInt(dto.peakBytes) : undefined,
        cpuPercent: dto.cpuPercent,
        requestUri: dto.requestUri,
        requestId: dto.requestId,
        orderId: dto.orderId,
        capturedAt,
      },
    });

    await this.prisma.systemMetric.create({
      data: {
        metricType: MetricType.PHP_FPM_RSS,
        source: dto.host,
        value: dto.rssBytes,
        unit: 'bytes',
        metadata: {
          pid: dto.pid,
          pool: dto.pool ?? null,
          requestUri: dto.requestUri ?? null,
          requestId: dto.requestId ?? null,
          orderId: dto.orderId ?? null,
        } as Prisma.InputJsonValue,
        recordedAt: capturedAt,
      },
    });

    return {
      success: true,
      metricId: metric.id,
      capturedAt,
    };
  }
}
