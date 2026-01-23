'use client';

import { Card } from '@/components/ui/card';
import { MetricsGrid } from './metrics-grid';
import { Summary } from './summary';
import { FIFOAlerts } from './fifo-alerts';
import { ProductsTable } from './products-table';
import { SalesChart } from '@/components/charts/sales-chart';
import { TopProductsChart } from '@/components/charts/top-products-chart';
import { PaymentMethodsChart } from '@/components/charts/payment-methods-chart';
import { EntitiesChart } from '@/components/charts/entities-chart';
import { TrendingUp, Package, Building2, CreditCard, BarChart3 } from 'lucide-react';
import type { DashboardMetrics } from '@/types';

interface DashboardProps {
  metrics: DashboardMetrics;
  sheetsDetected: string[];
}

export function Dashboard({ metrics, sheetsDetected }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Summary metrics={metrics} sheetsDetected={sheetsDetected} />

      {/* KPIs principales */}
      <MetricsGrid metrics={metrics} />

      {/* Gráficos principales */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Evolución de Ventas"
          subtitle="Tendencia mensual"
          icon={<TrendingUp className="h-5 w-5" />}
        >
          <SalesChart data={metrics.porPeriodo} />
        </Card>

        <Card
          title="Top Productos"
          subtitle="Por volumen de ventas"
          icon={<Package className="h-5 w-5" />}
        >
          <TopProductsChart data={metrics.topProductosVentas} metric="ventas" />
        </Card>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Ventas por Entidad"
          subtitle="Comparativo de sucursales"
          icon={<Building2 className="h-5 w-5" />}
        >
          <EntitiesChart data={metrics.porEntidad} />
        </Card>

        <Card
          title="Medios de Pago"
          subtitle="Distribución de ingresos"
          icon={<CreditCard className="h-5 w-5" />}
        >
          <PaymentMethodsChart data={metrics.porMedioPago} />
        </Card>

        <FIFOAlerts warnings={metrics.warnings} maxDisplay={5} />
      </div>

      {/* Productos con mayor merma */}
      {metrics.topProductosMerma.length > 0 && (
        <Card
          title="Productos con Mayor Merma"
          subtitle="Impacto en inventario"
          icon={<BarChart3 className="h-5 w-5" />}
        >
          <TopProductsChart data={metrics.topProductosMerma} metric="unidades" />
        </Card>
      )}

      {/* Tabla de productos */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Análisis por Producto
        </h2>
        <ProductsTable data={metrics.porProducto} />
      </div>
    </div>
  );
}
