import { Test, TestingModule } from '@nestjs/testing';
import { TwintController } from './twint.controller';
import { TwintService } from './twint.service';

describe('TwintController', () => {
  let controller: TwintController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwintController],
      providers: [TwintService],
    }).compile();

    controller = module.get<TwintController>(TwintController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
