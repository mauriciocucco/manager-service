import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  UseGuards,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { EventPattern } from '@nestjs/microservices';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { ApiGatewayGuard } from '../common/guards/api-gateway.guard';
import { GetOrdersDto } from './dtos/get-orders.dto';
import { Events } from './enums/events.enum';

@UseGuards(ApiGatewayGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(201)
  async createOrders(@Body() createOrdersDto: CreateOrderDto[]) {
    return await this.ordersService.createBulkOrders(createOrdersDto);
  }

  @Get()
  async getAllOrders(@Query() getOrdersDto?: GetOrdersDto) {
    return this.ordersService.getAllOrders(getOrdersDto);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @EventPattern(Events.ORDER_STATUS_CHANGED)
  async handleOrderChangeStatus(data: UpdateOrderStatusDto) {
    return this.ordersService.handleOrderChangeStatus(data);
  }
}
