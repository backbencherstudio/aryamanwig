import { DisposalItemSize, DisposalStatus, DisposalType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, ValidateIf } from "class-validator";

export class CreateDisposalDto {

  @IsEnum(DisposalType)
  type: DisposalType;
    
  @ValidateIf((o) => o.type === 'PICKUP')
  @IsEnum(DisposalStatus)
  status: DisposalStatus;

  @ValidateIf((o) => o.type === 'PICKUP')
  @IsEnum(DisposalItemSize)
  item_size: DisposalItemSize;

  @ValidateIf((o) => o.type === 'PICKUP')  
  @IsString()
  place_name: string;

  @IsOptional()
  @IsString()
  place_address?: string;

}  


/*

enum DisposalType {
  PICKUP
  SEND_IN
}

enum DisposalStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum DisposalItemSize {
  SMALL
  MEDIUM
  LARGE
  EXTRA_LARGE
}


type            DisposalType
status          DisposalStatus?  @default(PENDING)
item_size       DisposalItemSize? @default(SMALL)


*/