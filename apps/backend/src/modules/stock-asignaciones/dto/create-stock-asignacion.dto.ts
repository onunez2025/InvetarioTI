import { IsInt, IsPositive, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateStockAsignacionDto {
  @IsInt() @IsPositive()    modeloId: number;
  @IsInt() @IsPositive()    colaboradorId: number;
  @IsInt() @IsPositive()    cantidad: number;
  @IsDateString()           fechaInicio: string;
  @IsOptional() @IsString() observaciones?: string;
}
