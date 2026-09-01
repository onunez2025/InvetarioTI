import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateProveedorDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(20)  ruc?: string;
  @IsOptional() @IsString() @MaxLength(30)  telefono?: string;
  @IsOptional() @IsEmail() @MaxLength(100)  email?: string;
}

export class UpdateProveedorDto extends CreateProveedorDto {}
