import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrderEntity } from './entities/order.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CreateOrderDto } from './dtos/create-order.dto';
import { ClientProxy } from '@nestjs/microservices';
import { InternalServerErrorException } from '@nestjs/common';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Events } from './enums/events.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: DeepMocked<Repository<OrderEntity>>;
  let dataSource: DeepMocked<DataSource>;
  let queryRunner: DeepMocked<QueryRunner>;
  let kitchenClient: DeepMocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: createMock<Repository<OrderEntity>>(),
        },
        {
          provide: DataSource,
          useValue: createMock<DataSource>(),
        },
        {
          provide: 'KITCHEN_SERVICE',
          useValue: createMock<ClientProxy>(),
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(OrderEntity));
    dataSource = module.get(DataSource);
    kitchenClient = module.get<ClientProxy>(
      'KITCHEN_SERVICE',
    ) as DeepMocked<ClientProxy>;

    // Mock the QueryRunner
    queryRunner = createMock<QueryRunner>();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBulkOrders', () => {
    it('should create and save orders, then emit events', async () => {
      const createOrdersDto: CreateOrderDto[] = [
        { customerId: 'customer-uuid' },
      ];

      const orders = createOrdersDto.map((dto) => ({ ...dto }));
      const savedOrders = orders.map((order, index) => ({
        ...order,
        id: `order-uuid-${index + 1}`,
      }));

      // Mock repository methods
      orderRepository.create.mockReturnValue(orders as any);
      orderRepository.save.mockResolvedValue(savedOrders as any);

      // Mock queryRunner methods
      queryRunner.connect.mockResolvedValue(undefined);
      queryRunner.startTransaction.mockResolvedValue(undefined);
      queryRunner.commitTransaction.mockResolvedValue(undefined);
      queryRunner.release.mockResolvedValue(undefined);

      // Mock kitchenClient.emit
      kitchenClient.emit.mockReturnValue(undefined);

      const result = await service.createBulkOrders(createOrdersDto);

      // Assertions
      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);

      expect(orderRepository.create).toHaveBeenCalledWith(createOrdersDto);
      expect(orderRepository.save).toHaveBeenCalledWith(orders);

      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);

      expect(kitchenClient.emit).toHaveBeenCalledWith(
        Events.ORDER_DISPATCHED,
        savedOrders,
      );

      expect(result).toEqual({
        message: 'Order dispatched successfully',
        orders,
      });
    });

    it('should rollback transaction and throw an error if something goes wrong', async () => {
      const createOrdersDto: CreateOrderDto[] = [
        { customerId: 'customer-uuid' },
      ];

      const orders = createOrdersDto.map((dto) => ({ ...dto }));

      // Mock repository methods
      orderRepository.create.mockReturnValue(orders as any);
      orderRepository.save.mockRejectedValue(new Error('Test error'));

      // Mock queryRunner methods
      queryRunner.connect.mockResolvedValue(undefined);
      queryRunner.startTransaction.mockResolvedValue(undefined);
      queryRunner.rollbackTransaction.mockResolvedValue(undefined);
      queryRunner.release.mockResolvedValue(undefined);

      // Mock kitchenClient.emit (should not be called)
      kitchenClient.emit.mockReturnValue(undefined);

      await expect(service.createBulkOrders(createOrdersDto)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Assertions
      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);

      expect(orderRepository.create).toHaveBeenCalledWith(createOrdersDto);
      expect(orderRepository.save).toHaveBeenCalledWith(orders);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);

      expect(kitchenClient.emit).not.toHaveBeenCalled();
    });
  });
});
