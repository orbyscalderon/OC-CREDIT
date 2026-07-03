import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuariosService, CrearEmpleadoDto } from './usuarios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';
import { IsBoolean, IsString, MinLength } from 'class-validator';

class ToggleActivoDto {
  @IsBoolean()
  activo: boolean;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  nueva_password: string;
}

@ApiTags('Empleados')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Listar empleados del tenant' })
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.tenantId);
  }

  @Post()
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Crear cobrador o supervisor' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearEmpleadoDto) {
    return this.service.crear(user.tenantId, dto);
  }

  @Patch(':id/activo')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Activar o desactivar un empleado' })
  toggleActivo(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleActivoDto,
  ) {
    return this.service.toggleActivo(user.tenantId, id, dto.activo);
  }

  @Patch(':id/reset-password')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Resetear contraseña de un empleado' })
  resetPassword(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.service.resetPassword(user.tenantId, id, dto.nueva_password);
  }
}
