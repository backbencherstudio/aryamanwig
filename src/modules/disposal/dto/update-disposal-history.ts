import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
import { DisposalStatus } from '@prisma/client';

export class UpdateDisposalHistoryDto {
    
  @IsNotEmpty()
  @IsIn([DisposalStatus.COMPLETED, DisposalStatus.PENALTY])
  status: DisposalStatus;

  @ValidateIf((o) => o.status === DisposalStatus.PENALTY)
  @IsNotEmpty({ message: 'Penalty amount is required for penalty status.' })
  @IsNumber()
  penalty_amount: number;

  @ValidateIf((o) => o.status === DisposalStatus.PENALTY)
  @IsNotEmpty({ message: 'Comment is required for penalty status.' })
  @IsString()
  comment: string;
  
}