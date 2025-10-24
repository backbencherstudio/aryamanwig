import { PartialType } from '@nestjs/swagger';
import { CreateDisposalDto } from './create-disposal.dto';

export class UpdateDisposalDto extends PartialType(CreateDisposalDto) {}
