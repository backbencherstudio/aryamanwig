import { PartialType } from '@nestjs/swagger';
import { CreateTwintDto } from './create-twint.dto';

export class UpdateTwintDto extends PartialType(CreateTwintDto) {}
