import { IsString, IsBoolean, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateModeloDto {
  @IsString() @MaxLength(50)  codigo: string;
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(100)  marca?: string;
  @IsOptional() @IsString() @MaxLength(50)   tipo?: string;
  @IsOptional() @IsString() @MaxLength(500)  descripcion?: string;
  @IsBoolean()                               tieneSerie: boolean;
  @IsOptional() @IsDateString()              endOfSale?: string;
  @IsOptional() @IsDateString()              endOfSupport?: string;
  @IsOptional() @IsString() @MaxLength(100)  firmwareRef?: string;
}

export class UpdateModeloDto extends CreateModeloDto {}
