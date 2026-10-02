import { Injectable } from '@nestjs/common';
import { DiagnosisStatus, Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AiRcaService {
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-5.5';
  private readonly promptVersion = 'v1';

  constructor(private readonly prisma: PrismaService) {}

  async diagnose(exceptionId: string) {
    const exception = await this.prisma.orderException.findUnique({
      where: { id: exceptionId },
      include: {
        order: {
          include: {
            events: {
              orderBy: { occurredAt: 'desc' },
              take: 30,
            },
            stateHistory: {
              orderBy: { changedAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!exception) {
      throw new Error(`Exception not found: ${exceptionId}`);
    }

    const diagnosis = await this.prisma.aiDiagnosis.create({
      data: {
        orderId: exception.orderId,
        exceptionId: exception.id,
        status: DiagnosisStatus.RUNNING,
        promptVersion: this.promptVersion,
        model: this.model,
      },
    });

    try {
      const evidence = {
        exception: {
          id: exception.id,
          code: exception.code,
          title: exception.title,
          description: exception.description,
          severity: exception.severity,
          status: exception.status,
          firstDetectedAt: exception.firstDetectedAt,
          lastDetectedAt: exception.lastDetectedAt,
          evidence: exception.evidence,
        },
        order: {
          id: exception.order.id,
          externalOrderId: exception.order.externalOrderId,
          incrementId: exception.order.incrementId,
          channel: exception.order.channel,
          store: exception.order.store,
          currentState: exception.order.currentState,
          paymentStatus: exception.order.paymentStatus,
          invoiceStatus: exception.order.invoiceStatus,
          omsStatus: exception.order.omsStatus,
          shipmentStatus: exception.order.shipmentStatus,
          refundStatus: exception.order.refundStatus,
          events: exception.order.events,
          stateHistory: exception.order.stateHistory,
        },
      };

      const client = new OpenAI();
      const response = await client.responses.create({
        model: this.model,
        instructions: [
          'You are an incident RCA assistant for a Magento order operations control tower.',
          'Use ONLY the supplied evidence. Do not invent logs, metrics, events, causes, or system behavior.',
          'Separate observed evidence from inference.',
          'If evidence is insufficient, say so explicitly.',
          'Do not execute or recommend irreversible production actions without human approval.',
          'Return ONLY valid JSON with exactly these keys:',
          'summary, probableCause, confidence, evidence, recommendations.',
          'confidence must be a number between 0 and 1.',
          'evidence and recommendations must be arrays of strings.',
        ].join(' '),
        input: JSON.stringify(evidence),
      });

      const parsed = this.parseJson(response.output_text);

      const updated = await this.prisma.aiDiagnosis.update({
        where: { id: diagnosis.id },
        data: {
          status: DiagnosisStatus.COMPLETED,
          summary: parsed.summary,
          probableCause: parsed.probableCause,
          confidence: parsed.confidence,
          evidence: {
            items: parsed.evidence,
            sourceEvidence: evidence,
          } as Prisma.InputJsonValue,
          recommendations: parsed.recommendations as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        diagnosisId: updated.id,
        status: updated.status,
        model: updated.model,
        summary: updated.summary,
        probableCause: updated.probableCause,
        confidence: updated.confidence,
        evidence: updated.evidence,
        recommendations: updated.recommendations,
      };
    } catch (error) {
      await this.prisma.aiDiagnosis.update({
        where: { id: diagnosis.id },
        data: {
          status: DiagnosisStatus.FAILED,
          evidence: {
            error: error instanceof Error ? error.message : 'Unknown AI RCA error',
          } as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private parseJson(text: string) {
    try {
      const parsed = JSON.parse(text);

      return {
        summary: String(parsed.summary ?? ''),
        probableCause: String(parsed.probableCause ?? ''),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0))),
        evidence: Array.isArray(parsed.evidence)
          ? parsed.evidence.map(String)
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map(String)
          : [],
      };
    } catch {
      throw new Error('AI RCA returned invalid JSON');
    }
  }
}
