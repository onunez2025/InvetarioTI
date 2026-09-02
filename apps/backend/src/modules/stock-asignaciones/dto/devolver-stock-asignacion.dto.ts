import { IsDateString, IsNotEmpty } from 'class-validator';

export class DevolverStockAsignacionDto {
  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;
}
