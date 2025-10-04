import { PartialType } from '@nestjs/swagger';
import { CreateDashboradDto } from './create-dashborad.dto';

export class UpdateDashboradDto extends PartialType(CreateDashboradDto) {}
