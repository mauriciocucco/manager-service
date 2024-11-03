import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('4')
  customerId: string;
}
