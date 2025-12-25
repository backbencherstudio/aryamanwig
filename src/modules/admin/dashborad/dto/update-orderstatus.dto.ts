import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['DELIVERED', 'CANCELLED'])
  status!: 'DELIVERED' | 'CANCELLED';
}