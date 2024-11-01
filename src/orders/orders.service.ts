import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderDto } from './dtos/create-order.dto';
import { convertToCamelCase } from '../utils/to-camel-case';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('KITCHEN_SERVICE') private readonly orderClient: ClientProxy,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    try {
      const orderData = {
        ...createOrderDto,
      };
      const order = await this.orderRepository
        .createQueryBuilder()
        .insert()
        .into(OrderEntity)
        .values(orderData)
        .execute();
      const parsedOrder = convertToCamelCase(order.raw[0]);

      this.orderClient.emit('order_dispatched', parsedOrder);

      return {
        message: 'Order dispatched successfully',
        orderId: order.identifiers[0].id,
      };
    } catch (error) {
      console.error('Failed to dispatch order: ', error);

      return {
        message: 'Error dispatching order',
        error: error.message,
      };
    }
  }

  async getOrdersByCustomer(customerId: string) {
    return await this.orderRepository.find({ where: { customerId } });
  }

  @EventPattern('order_status_changed')
  async handleOrderIn(data: UpdateOrderStatusDto) {
    console.log('Order status changed event received:', data);

    const { id: orderId, statusId: newStatusId } = data;

    try {
      await this.orderRepository
        .createQueryBuilder()
        .update(OrderEntity)
        .set({ statusId: newStatusId })
        .where('id = :orderId', { orderId })
        .execute();

      console.log(`Order ${orderId} status updated to ${newStatusId}`);
    } catch (error) {
      console.error(`Failed to update order ${orderId} status: `, error);
    }
  }
}
