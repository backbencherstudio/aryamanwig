import { Module } from "@nestjs/common";
import { BidService } from "./bid.service";
import { BidController } from "./bid.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { MessageModule } from "../chat/message/message.module";

@Module({
  imports: [PrismaModule, MessageModule],
  controllers: [BidController],
  providers: [BidService],
})
export class BidModule {}
