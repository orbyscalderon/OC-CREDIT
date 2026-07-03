import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/Layout/AppLayout';
import { LandingPage } from '@/pages/Landing/LandingPage';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { ClientesPage } from '@/pages/Clientes/ClientesPage';
import { ClienteDetallePage } from '@/pages/Clientes/ClienteDetallePage';
import { ClienteNuevoPage } from '@/pages/Clientes/ClienteNuevoPage';
import { PrestamosPage } from '@/pages/Prestamos/PrestamosPage';
import { PrestamoNuevoPage } from '@/pages/Prestamos/PrestamoNuevoPage';
import { PrestamoDetallePage } from '@/pages/Prestamos/PrestamoDetallePage';
import { PrestamoRenovarPage } from '@/pages/Prestamos/PrestamoRenovarPage';
import { CajasPage } from '@/pages/Cajas/CajasPage';
import { CajaArqueoPage } from '@/pages/Cajas/CajaArqueoPage';
import { RutasPage } from '@/pages/Rutas/RutasPage';
import { RutaNuevaPage } from '@/pages/Rutas/RutaNuevaPage';
import { RutaMapaPage } from '@/pages/Rutas/RutaMapaPage';
import { BuroPage } from '@/pages/Buro/BuroPage';
import { BuroConsultaPage } from '@/pages/Buro/BuroConsultaPage';
import { ReportesPage } from '@/pages/Reportes/ReportesPage';
import { CuentasCobrarPage } from '@/pages/Reportes/CuentasCobrarPage';
import { ConfigPage } from '@/pages/Config/ConfigPage';
import { BackupPage } from '@/pages/Config/BackupPage';
import { HistorialPagosPage } from '@/pages/Prestamos/HistorialPagosPage';
import { EmpleadosPage } from '@/pages/Empleados/EmpleadosPage';
import { CobroNuevoPage } from '@/pages/Cobros/CobroNuevoPage';
import { RutaDetallePage } from '@/pages/Rutas/RutaDetallePage';
import { MiRutaPage } from '@/pages/Rutas/MiRutaPage';
import { FeriadosPage } from '@/pages/Config/FeriadosPage';
import { PortalClientePage } from '@/pages/Portal/PortalClientePage';
import { SuperAdminPage } from '@/pages/SuperAdmin/SuperAdminPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal" element={<PortalClientePage />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />

        {/* Panel admin — requiere autenticación */}
        <Route element={<AppLayout />}>
          <Route path="/panel" element={<DashboardPage />} />

          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<ClienteNuevoPage />} />
          <Route path="/clientes/:id" element={<ClienteDetallePage />} />

          <Route path="/prestamos" element={<PrestamosPage />} />
          <Route path="/prestamos/nueva-solicitud" element={<PrestamoNuevoPage />} />
          <Route path="/prestamos/:id" element={<PrestamoDetallePage />} />
          <Route path="/prestamos/:id/renovar" element={<PrestamoRenovarPage />} />
          <Route path="/prestamos/:id/historial" element={<HistorialPagosPage />} />

          <Route path="/cajas" element={<CajasPage />} />
          <Route path="/cajas/:id/arqueo" element={<CajaArqueoPage />} />
          <Route path="/cobros/nuevo" element={<CobroNuevoPage />} />

          <Route path="/rutas" element={<RutasPage />} />
          <Route path="/rutas/nueva" element={<RutaNuevaPage />} />
          <Route path="/rutas/:id" element={<RutaDetallePage />} />
          <Route path="/rutas/:id/mapa" element={<RutaMapaPage />} />
          <Route path="/mi-ruta" element={<MiRutaPage />} />

          <Route path="/empleados" element={<EmpleadosPage />} />

          <Route path="/buro" element={<BuroPage />} />
          <Route path="/buro/consultar" element={<BuroConsultaPage />} />

          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/cuentas-cobrar" element={<CuentasCobrarPage />} />

          <Route path="/config" element={<ConfigPage />} />
          <Route path="/config/feriados" element={<FeriadosPage />} />
          <Route path="/config/backup" element={<BackupPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
