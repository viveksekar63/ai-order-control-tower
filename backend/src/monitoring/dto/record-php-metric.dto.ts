import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordPhpMetricDto {
  @IsString()
  host!: string;

  @IsInt()
  @Min(1)
  pid!: number;

  @IsOptional()
  @IsString()
  pool?: string;

  @IsOptional()
  @IsString()
  command?: string;

  @IsNumber()
  @Min(0)
  rssBytes!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  virtualBytes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peakBytes?: number;

  @IsOptional()
  @IsNumber()
  cpuPercent?: number;

  @IsOptional()
  @IsString()
  requestUri?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  capturedAt?: string;
}
