import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderDto } from './dtos/create-order.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { GetOrdersDto } from './dtos/get-orders.dto';
import { Events } from './enums/events.enum';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('KITCHEN_SERVICE') private readonly kitchenClient: ClientProxy,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
  ) {
    this.kitchenClient.connect();
  }

  async createBulkOrders(createOrdersDto: CreateOrderDto[]) {
    const orderData = createOrdersDto.map((orderDto) => ({ ...orderDto }));
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const orders = await this.orderRepository.create(orderData);
      const savedOrders = await this.orderRepository.save(orders);

      await queryRunner.commitTransaction();

      for (const order of savedOrders) {
        this.kitchenClient.emit(Events.ORDER_DISPATCHED, order);
      }

      return {
        message: 'Order dispatched successfully',
        orders,
      };
    } catch (error) {
      console.error('Failed to dispatch orders: ', error);

      await queryRunner.rollbackTransaction();

      throw new InternalServerErrorException('Failed to dispatch orders');
    } finally {
      await queryRunner.release();
    }
  }

  async getAllOrders(getOrdersDto?: GetOrdersDto) {
    const { page, limit } = getOrdersDto;
    const skip = (page - 1) * limit;
    const query = this.orderRepository.createQueryBuilder('order');

    if (getOrdersDto.statusId) {
      query.where('order.statusId = :statusId', {
        statusId: getOrdersDto.statusId,
      });
    }

    const [data, total] = await query
      .orderBy('order.createdAt', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      page,
      limit,
      totalPages,
      totalItems: total,
    };
  }

  async getOrderById(id: string): Promise<OrderEntity> {
    return this.orderRepository.findOne({ where: { id } });
  }

  async handleOrderChangeStatus(data: UpdateOrderStatusDto) {
    console.log('Order status changed event received:', data);

    const { id: orderId, statusId: newStatusId } = data;

    try {
      const updateData: Partial<OrderEntity> = { statusId: newStatusId };

      if (data.recipeName) {
        updateData.recipeName = data.recipeName;
      }

      await this.orderRepository
        .createQueryBuilder()
        .update(OrderEntity)
        .set(updateData)
        .where('id = :orderId', { orderId })
        .execute();

      console.log(`Order ${orderId} status updated to ${newStatusId}`);
    } catch (error) {
      console.error(`Failed to update order ${orderId} status: `, error);
    }
  }
}
