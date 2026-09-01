import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt } from 'class-validator';

export class CreateEquipoDto {
  @IsString() @IsNotEmpty()
  empresa: string;

  @IsString() @IsOptional()
  nombre?: string;

  @IsString() @IsOptional()
  gerencia?: string;

  @IsString() @IsOptional()
  departamento?: string;

  @IsString() @IsOptional()
  codigo?: string;

  @IsString() @IsOptional()
  ceco?: string;

  @IsString() @IsOptional()
  ubicacion?: string;

  @IsString() @IsOptional()
  serie?: string;

  @IsInt() @IsOptional()
  modeloId?: number;

  @IsInt() @IsOptional()
  compraDetalleId?: number;

  @IsIn(['ACTIVO', 'BAJA', 'MANTENIMIENTO']) @IsOptional()
  estado?: string;
}
