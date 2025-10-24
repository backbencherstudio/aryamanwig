import { Test, TestingModule } from '@nestjs/testing';
import { DisposalService } from './disposal.service';

describe('DisposalService', () => {
  let service: DisposalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisposalService],
    }).compile();

    service = module.get<DisposalService>(DisposalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
