const Map<String, String> etiquetasRol = {
  'admin_tenant': 'Administrador',
  'supervisor_tenant': 'Supervisor',
  'cobrador_tenant': 'Cobrador',
};

String etiquetaRol(String? rol) => etiquetasRol[rol] ?? '';
