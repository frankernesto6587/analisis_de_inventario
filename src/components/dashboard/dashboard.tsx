'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MetricsGrid } from './metrics-grid';
import { Summary } from './summary';
import { FIFOAlerts } from './fifo-alerts';
import { ProductsTable } from './products-table';
import { SalesChart } from '@/components/charts/sales-chart';
import { TopProductsChart } from '@/components/charts/top-products-chart';
import { PaymentMethodsChart } from '@/components/charts/payment-methods-chart';
import { EntitiesChart } from '@/components/charts/entities-chart';
import { TrendingUp, Package, Building2, CreditCard, BarChart3, Settings } from 'lucide-react';
import type { DashboardMetrics, FIFOLot, FIFOConsumption } from '@/types';

interface DashboardProps {
  metrics: DashboardMetrics;
  sheetsDetected: string[];
  tasaPromedio: number;
  onTasaChange: (tasa: number) => void;
  lotes?: FIFOLot[];
  consumos?: FIFOConsumption[];
}

export function Dashboard({ metrics, sheetsDetected, tasaPromedio, onTasaChange, lotes = [], consumos = [] }: DashboardProps) {
  const [tempTasa, setTempTasa] = useState(tasaPromedio.toString());

  // Sincronizar si el prop cambia externamente
  useEffect(() => {
    setTempTasa(tasaPromedio.toString());
  }, [tasaPromedio]);

  const handleTasaBlur = () => {
    const newTasa = parseFloat(tempTasa);
    if (!isNaN(newTasa) && newTasa > 0) {
      onTasaChange(newTasa);
    } else {
      setTempTasa(tasaPromedio.toString());
    }
  };

  const handleTasaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTasaBlur();
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración de Tasa */}
      <div className="flex items-center justify-end gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Settings className="h-4 w-4" />
          <span>Tasa CUP/USD:</span>
        </div>
        <input
          type="number"
          value={tempTasa}
          onChange={(e) => setTempTasa(e.target.value)}
          onBlur={handleTasaBlur}
          onKeyDown={handleTasaKeyDown}
          className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          min="1"
          step="1"
        />
        <span className="text-xs text-zinc-500">(Recomendado: 400)</span>
      </div>

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
        <ProductsTable data={metrics.porProducto} lotes={lotes} consumos={consumos} />
      </div>
    </div>
  );
}
