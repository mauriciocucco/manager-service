import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('3')
  customerId: string;
}
