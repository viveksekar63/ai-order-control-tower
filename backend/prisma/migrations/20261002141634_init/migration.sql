-- CreateEnum
CREATE TYPE "OrderState" AS ENUM ('ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'INVOICE_PENDING', 'INVOICE_CREATED', 'OMS_PENDING', 'OMS_SUBMITTED', 'OMS_SUBMISSION_FAILED', 'ALLOCATED', 'UNALLOCATED', 'SHIPMENT_PENDING', 'SHIPMENT_CREATED', 'SHIPPED', 'DELIVERED', 'CANCEL_REQUESTED', 'CANCEL_PROCESSING', 'CANCELLED', 'CANCEL_FAILED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_FAILED');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('WEB', 'MOBILE', 'POS', 'CLICK_AND_COLLECT', 'MARKETPLACE', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('RETRY', 'CANCEL', 'REFUND', 'RESYNC', 'REPROCESS', 'ESCALATE', 'NOTIFY');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('PHP_MEMORY', 'PHP_FPM_RSS', 'PHP_FPM_PROCESS_COUNT', 'API_LATENCY', 'API_ERROR_RATE', 'DATABASE_CONNECTIONS', 'REDIS_MEMORY', 'RABBITMQ_QUEUE_DEPTH', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "incrementId" TEXT NOT NULL,
    "customerId" TEXT,
    "channel" "OrderChannel" NOT NULL DEFAULT 'WEB',
    "store" TEXT,
    "currentState" "OrderState" NOT NULL DEFAULT 'ORDER_CREATED',
    "previousState" "OrderState",
    "paymentStatus" TEXT,
    "invoiceStatus" TEXT,
    "omsStatus" TEXT,
    "shipmentStatus" TEXT,
    "refundStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEventAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventId" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStateHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromState" "OrderState",
    "toState" "OrderState" NOT NULL,
    "reason" TEXT,
    "eventId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderException" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "ExceptionSeverity" NOT NULL,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "evidence" JSONB,

    CONSTRAINT "OrderException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "exceptionId" TEXT,
    "type" "ActionType" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OrderAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDiagnosis" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "exceptionId" TEXT,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "probableCause" TEXT,
    "confidence" DECIMAL(5,4),
    "evidence" JSONB,
    "recommendations" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "endpoint" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "errorRate" DECIMAL(7,4),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "source" TEXT NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "unit" TEXT,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhpProcessMetric" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "pool" TEXT,
    "command" TEXT,
    "rssBytes" BIGINT NOT NULL,
    "virtualBytes" BIGINT,
    "peakBytes" BIGINT,
    "cpuPercent" DECIMAL(7,3),
    "requestUri" TEXT,
    "requestId" TEXT,
    "orderId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhpProcessMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "ExceptionSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalOrderId_key" ON "Order"("externalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_incrementId_key" ON "Order"("incrementId");

-- CreateIndex
CREATE INDEX "Order_currentState_idx" ON "Order"("currentState");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_updatedAt_idx" ON "Order"("updatedAt");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_occurredAt_idx" ON "OrderEvent"("orderId", "occurredAt");

-- CreateIndex
CREATE INDEX "OrderEvent_eventType_occurredAt_idx" ON "OrderEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "OrderEvent_source_occurredAt_idx" ON "OrderEvent"("source", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_source_eventId_key" ON "OrderEvent"("source", "eventId");

-- CreateIndex
CREATE INDEX "OrderStateHistory_orderId_changedAt_idx" ON "OrderStateHistory"("orderId", "changedAt");

-- CreateIndex
CREATE INDEX "OrderException_status_severity_idx" ON "OrderException"("status", "severity");

-- CreateIndex
CREATE INDEX "OrderException_orderId_status_idx" ON "OrderException"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderException_code_firstDetectedAt_idx" ON "OrderException"("code", "firstDetectedAt");

-- CreateIndex
CREATE INDEX "OrderAction_orderId_requestedAt_idx" ON "OrderAction"("orderId", "requestedAt");

-- CreateIndex
CREATE INDEX "OrderAction_status_requestedAt_idx" ON "OrderAction"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "AiDiagnosis_orderId_createdAt_idx" ON "AiDiagnosis"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDiagnosis_status_createdAt_idx" ON "AiDiagnosis"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_name_key" ON "Integration"("name");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

-- CreateIndex
CREATE INDEX "SystemMetric_metricType_recordedAt_idx" ON "SystemMetric"("metricType", "recordedAt");

-- CreateIndex
CREATE INDEX "SystemMetric_source_recordedAt_idx" ON "SystemMetric"("source", "recordedAt");

-- CreateIndex
CREATE INDEX "PhpProcessMetric_host_capturedAt_idx" ON "PhpProcessMetric"("host", "capturedAt");

-- CreateIndex
CREATE INDEX "PhpProcessMetric_pid_capturedAt_idx" ON "PhpProcessMetric"("pid", "capturedAt");

-- CreateIndex
CREATE INDEX "PhpProcessMetric_orderId_capturedAt_idx" ON "PhpProcessMetric"("orderId", "capturedAt");

-- CreateIndex
CREATE INDEX "Alert_status_severity_idx" ON "Alert"("status", "severity");

-- CreateIndex
CREATE INDEX "Alert_source_openedAt_idx" ON "Alert"("source", "openedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStateHistory" ADD CONSTRAINT "OrderStateHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderException" ADD CONSTRAINT "OrderException_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAction" ADD CONSTRAINT "OrderAction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAction" ADD CONSTRAINT "OrderAction_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "OrderException"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDiagnosis" ADD CONSTRAINT "AiDiagnosis_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDiagnosis" ADD CONSTRAINT "AiDiagnosis_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "OrderException"("id") ON DELETE SET NULL ON UPDATE CASCADE;
