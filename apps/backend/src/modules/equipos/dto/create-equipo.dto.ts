import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateEquipoDto {
  @IsString() @IsNotEmpty()
  empresa: string;

  @IsString() @IsNotEmpty()
  nombre: string;

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
  tipo?: string;

  @IsString() @IsOptional()
  marca?: string;

  @IsString() @IsOptional()
  modelo?: string;

  @IsString() @IsOptional()
  serie?: string;

  @IsString() @IsOptional()
  firmware?: string;

  @IsString() @IsOptional()
  version?: string;

  @IsDateString() @IsOptional()
  endOfSale?: string;

  @IsDateString() @IsOptional()
  endOfSupport?: string;

  @IsIn(['ACTIVO', 'BAJA', 'MANTENIMIENTO']) @IsOptional()
  estado?: string;
}
