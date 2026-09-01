import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroEquiposDto {
  @IsOptional() @IsString()
  departamento?: string;

  @IsOptional() @IsString()
  ubicacion?: string;

  @IsOptional() @IsString()
  estado?: string;

  @IsOptional() @IsString()
  busqueda?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}
