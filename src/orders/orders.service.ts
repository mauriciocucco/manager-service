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
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const orders = await this.orderRepository.create(createOrdersDto);
      const savedOrders = await this.orderRepository.save(orders);

      await queryRunner.commitTransaction();

      this.kitchenClient.emit(Events.ORDER_DISPATCHED, savedOrders);

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

  async handleOrderChangeStatus(data: UpdateOrderStatusDto[]) {
    console.log('Order/s status/es changed event received:', data);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const updateDtos = Array.isArray(data) ? data : [data];

      for (const updateDto of updateDtos) {
        const { id: orderId, statusId: newStatusId } = updateDto;
        const updateData: Partial<OrderEntity> = { statusId: newStatusId };

        if (updateDto.recipeName) {
          updateData.recipeName = updateDto.recipeName;
        }

        await this.orderRepository
          .createQueryBuilder()
          .update(OrderEntity)
          .set(updateData)
          .where('id = :orderId', { orderId })
          .execute();

        console.log(`Order ${orderId} status updated to ${newStatusId}`);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      console.error('Failed to update orders statuses:', error);

      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
