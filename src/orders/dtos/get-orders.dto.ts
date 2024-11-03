import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max } from 'class-validator';

export class GetOrdersDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  statusId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;
}
