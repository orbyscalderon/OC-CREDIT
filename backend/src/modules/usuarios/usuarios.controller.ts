import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuariosService, CrearEmpleadoDto } from './usuarios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Permiso } from '../../common/constants/permisos.enum';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

class ToggleActivoDto {
  @IsBoolean()
  activo: boolean;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  nueva_password: string;
}

class SetPermisosDto {
  // null = borra la personalización, vuelve al set por defecto del rol.
  @IsOptional()
  @IsArray()
  @IsEnum(Permiso, { each: true })
  permisos: Permiso[] | null;
}

@ApiTags('Empleados')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @RequierePermiso(Permiso.EMPLEADOS_VER)
  @ApiOperation({ summary: 'Listar empleados del tenant' })
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.tenantId);
  }

  @Post()
  @RequierePermiso(Permiso.EMPLEADOS_GESTIONAR)
  @ApiOperation({ summary: 'Crear cobrador o supervisor' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearEmpleadoDto) {
    return this.service.crear(user.tenantId, dto);
  }

  @Patch(':id/activo')
  @RequierePermiso(Permiso.EMPLEADOS_GESTIONAR)
  @ApiOperation({ summary: 'Activar o desactivar un empleado' })
  toggleActivo(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleActivoDto,
  ) {
    return this.service.toggleActivo(user.tenantId, id, dto.activo);
  }

  @Patch(':id/reset-password')
  @RequierePermiso(Permiso.EMPLEADOS_GESTIONAR)
  @ApiOperation({ summary: 'Resetear contraseña de un empleado' })
  resetPassword(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.service.resetPassword(user.tenantId, id, dto.nueva_password);
  }

  @Patch(':id/permisos')
  @RequierePermiso(Permiso.EMPLEADOS_GESTIONAR)
  @ApiOperation({
    summary: 'Personalizar los permisos de un empleado puntual',
    description: 'permisos=null vuelve al set por defecto de su rol base.',
  })
  setPermisos(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPermisosDto,
  ) {
    return this.service.setPermisos(user.tenantId, id, dto.permisos ?? null);
  }
}
