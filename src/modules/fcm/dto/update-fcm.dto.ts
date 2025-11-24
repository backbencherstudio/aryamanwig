import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateFcmTokenDto {


  @IsString()
  @IsNotEmpty()
  token: string;

 
  @IsString()
  @IsOptional()
  @IsIn(['android', 'ios', 'web', 'unknown'])
  deviceType?: string;
}