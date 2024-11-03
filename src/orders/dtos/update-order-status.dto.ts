export class UpdateOrderStatusDto {
  id: string;
  customerId: string;
  statusId: number;
  recipeName?: string;
  createdAt: Date;
  updatedAt: Date;
}
