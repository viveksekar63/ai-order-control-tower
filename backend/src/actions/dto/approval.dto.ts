import { IsOptional, IsString } from 'class-validator';

export class ApprovalDto {
  @IsOptional()
  @IsString()
  actorId?: string;
}
