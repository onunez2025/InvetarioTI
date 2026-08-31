import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';

export class CreateCatalogoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  extra?: string;

  /** ID del catálogo padre (gerencia.id para departamentos, departamento.id para ubicaciones) */
  @IsOptional()
  @IsNumber()
  parentId?: number;
}

export class UpdateCatalogoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  extra?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}
