import { IsArray, IsString, ArrayNotEmpty, IsOptional } from 'class-validator';

export class RegistrarUnidadesDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  series: string[];

  @IsString()
  empresa: string;

  @IsOptional() @IsString() gerencia?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() ubicacion?: string;
  @IsOptional() @IsString() ceco?: string;
}
