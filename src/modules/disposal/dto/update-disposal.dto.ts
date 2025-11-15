import { IsIn, IsString } from 'class-validator';

export class UpdateDisposalStatusDto {
 
  @IsString()
  @IsIn(['APPROVED', 'CANCELLED'])
  status: string;
}