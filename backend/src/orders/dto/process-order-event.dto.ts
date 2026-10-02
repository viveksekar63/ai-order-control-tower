import { IsEnum, IsISO8601, IsObject, IsOptional, IsString } from 'class-validator';

export enum OrderEventType {
  ORDER_PLACED = 'ORDER_PLACED',
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVOICE_PENDING = 'INVOICE_PENDING',
  INVOICE_CREATED = 'INVOICE_CREATED',
  OMS_PENDING = 'OMS_PENDING',
  OMS_SUBMITTED = 'OMS_SUBMITTED',
  OMS_SUBMISSION_FAILED = 'OMS_SUBMISSION_FAILED',
  ALLOCATED = 'ALLOCATED',
  UNALLOCATED = 'UNALLOCATED',
  SHIPMENT_PENDING = 'SHIPMENT_PENDING',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  CANCEL_PROCESSING = 'CANCEL_PROCESSING',
  CANCELLED = 'CANCELLED',
  CANCEL_FAILED = 'CANCEL_FAILED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUND_PROCESSING = 'REFUND_PROCESSING',
  REFUNDED = 'REFUNDED',
  REFUND_FAILED = 'REFUND_FAILED',
}

export class ProcessOrderEventDto {
  @IsString()
  eventId!: string;

  @IsString()
  source!: string;

  @IsString()
  externalOrderId!: string;

  @IsString()
  incrementId!: string;

  @IsEnum(OrderEventType)
  eventType!: OrderEventType;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  store?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
