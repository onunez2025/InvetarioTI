import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

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
}
