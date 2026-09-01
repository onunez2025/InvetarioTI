import { IsString, IsOptional, IsEmail, IsBoolean, MaxLength } from 'class-validator';

export class CreateColaboradorDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  dni?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gerencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;
}

export class UpdateColaboradorDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  dni?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gerencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
