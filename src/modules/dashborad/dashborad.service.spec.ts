import { Test, TestingModule } from '@nestjs/testing';
import { DashboradService } from './dashborad.service';

describe('DashboradService', () => {
  let service: DashboradService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboradService],
    }).compile();

    service = module.get<DashboradService>(DashboradService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
