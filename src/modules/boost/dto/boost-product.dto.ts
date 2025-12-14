import { IsEnum, IsString } from 'class-validator';


export enum BoostTierEnum {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export class BoostProductDto {
  @IsString()
  product_id: string;

  @IsEnum(BoostTierEnum, { message: 'Invalid boost tier selected.' })
  boost_tier: BoostTierEnum;
}

