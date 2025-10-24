import { Test, TestingModule } from '@nestjs/testing';
import { DisposalController } from './disposal.controller';
import { DisposalService } from './disposal.service';

describe('DisposalController', () => {
  let controller: DisposalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisposalController],
      providers: [DisposalService],
    }).compile();

    controller = module.get<DisposalController>(DisposalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
