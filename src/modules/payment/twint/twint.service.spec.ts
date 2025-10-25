import { Test, TestingModule } from '@nestjs/testing';
import { TwintService } from './twint.service';

describe('TwintService', () => {
  let service: TwintService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwintService],
    }).compile();

    service = module.get<TwintService>(TwintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
