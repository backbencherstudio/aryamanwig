import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
