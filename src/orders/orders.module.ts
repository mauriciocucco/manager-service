import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StatusEntity } from './entities/status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, StatusEntity])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
