import { Test, TestingModule } from '@nestjs/testing';
import { DashboradController } from './dashborad.controller';
import { DashboradService } from './dashborad.service';

describe('DashboradController', () => {
  let controller: DashboradController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboradController],
      providers: [DashboradService],
    }).compile();

    controller = module.get<DashboradController>(DashboradController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
