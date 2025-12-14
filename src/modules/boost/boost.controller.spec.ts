import { Test, TestingModule } from '@nestjs/testing';
import { BoostController } from './boost.controller';
import { BoostService } from './boost.service';

describe('BoostController', () => {
  let controller: BoostController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoostController],
      providers: [BoostService],
    }).compile();

    controller = module.get<BoostController>(BoostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
