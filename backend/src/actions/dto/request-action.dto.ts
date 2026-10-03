import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ActionType } from '@prisma/client';

export class RequestActionDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  exceptionId?: string;

  @IsEnum(ActionType)
  type!: ActionType;

  @IsString()
  requestedBy!: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
