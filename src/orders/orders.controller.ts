import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  InternalServerErrorException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dtos/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @Post()
  @HttpCode(201)
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const response = await this.orderService.createOrder(createOrderDto);

    if (response.error) {
      throw new InternalServerErrorException(response);
    }

    return {
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('customer/:customerId')
  async getOrdersByCustomer(@Param('customerId') customerId: string) {
    return this.orderService.getOrdersByCustomer(customerId);
  }
}
