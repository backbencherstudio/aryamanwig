
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BidStatus } from '@prisma/client';

export class UpdateStatusBidDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(BidStatus, { message: 'Status must be one of: PENDING, ACCEPTED, or REJECTED' })
  status: BidStatus;
}
