import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TwintService } from './twint.service';
import { CreateTwintDto } from './dto/create-twint.dto';
import { UpdateTwintDto } from './dto/update-twint.dto';

@Controller('twint')
export class TwintController {
  constructor(private readonly twintService: TwintService) {}

  
}
