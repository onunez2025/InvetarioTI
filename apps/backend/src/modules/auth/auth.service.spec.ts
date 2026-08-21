import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as bcrypt from 'bcryptjs';

const mockUsuario: Usuario = {
  id: 1,
  nombre: 'Admin',
  email: 'admin@test.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  rol: 'ADMIN',
  departamento: 'TI',
  activo: true,
  creadoEn: new Date(),
  ultimoLogin: null,
};

describe('AuthService', () => {
  let service: AuthService;

  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('token_jwt_mock'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('debe retornar tokens si credenciales son válidas', async () => {
    mockRepo.findOne.mockResolvedValue(mockUsuario);
    const result = await service.login('admin@test.com', 'password123');
    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
  });

  it('debe lanzar UnauthorizedException si email no existe', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.login('noexiste@test.com', 'pass123')).rejects.toThrow();
  });

  it('debe lanzar UnauthorizedException si contraseña incorrecta', async () => {
    mockRepo.findOne.mockResolvedValue(mockUsuario);
    await expect(service.login('admin@test.com', 'wrongpass')).rejects.toThrow();
  });
});
