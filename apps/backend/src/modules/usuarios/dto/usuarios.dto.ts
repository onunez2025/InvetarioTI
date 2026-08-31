import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, MaxLength, IsIn } from 'class-validator';

const ROLES = ['ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR'] as const;

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsIn(ROLES)
  rol: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;
}

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsIn(ROLES)
  rol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CambiarPasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
