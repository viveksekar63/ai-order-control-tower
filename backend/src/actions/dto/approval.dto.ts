import { IsString } from 'class-validator';

export class ApprovalDto {
  @IsString()
  actorId!: string;
}
