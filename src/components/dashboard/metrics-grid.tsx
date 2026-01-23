'use client';

import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Percent,
  CreditCard,
  Wallet,
  Banknote,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { DashboardMetrics } from '@/types';

interface MetricsGridProps {
  metrics: DashboardMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="space-y-6">
      {/* Fila principal: Total de Ventas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Ventas"
          value={formatCurrency(metrics.ventasTotales.total, 'CUP')}
          subtitle={`${formatNumber(metrics.numeroVentas)} transacciones | Ticket prom: ${formatCurrency(metrics.ticketPromedio.cup, 'CUP')}`}
          icon={<Banknote className="h-5 w-5" />}
          className="sm:col-span-2 lg:col-span-1 border-emerald-500/30"
        />

        <MetricCard
          title="Margen Bruto"
          value={formatCurrency(metrics.margenBruto)}
          subtitle={`${formatPercent(metrics.margenPorcentaje)} de rentabilidad`}
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <MetricCard
          title="COGS (FIFO)"
          value={formatCurrency(metrics.cogs)}
          subtitle="Costo de ventas"
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        <MetricCard
          title="Inventario"
          value={formatCurrency(metrics.valorInventario)}
          subtitle={`${formatNumber(metrics.lotesActivos)} lotes activos`}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Fila secundaria: Desglose y otros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Pagos USD"
          value={formatCurrency(metrics.ventasTotales.usd)}
          icon={<DollarSign className="h-5 w-5" />}
        />

        <MetricCard
          title="Pagos EUR"
          value={formatCurrency(metrics.ventasTotales.euro, 'EUR')}
          icon={<DollarSign className="h-5 w-5" />}
        />

        <MetricCard
          title="CUP Transferencia"
          value={formatCurrency(metrics.ventasTotales.cupTransferencia, 'CUP')}
          icon={<CreditCard className="h-5 w-5" />}
        />

        <MetricCard
          title="CUP Efectivo"
          value={formatCurrency(metrics.ventasTotales.cupEfectivo, 'CUP')}
          icon={<Wallet className="h-5 w-5" />}
        />

        <MetricCard
          title="Compras"
          value={formatCurrency(metrics.comprasTotales.usd)}
          subtitle="Total comprado USD"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      {/* Fila terciaria: Mermas, Gastos, Retiros */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Mermas"
          value={formatNumber(metrics.mermaTotal)}
          subtitle={`Costo FIFO: ${formatCurrency(metrics.mermaCosto)}`}
          icon={<AlertTriangle className="h-5 w-5" />}
        />

        <MetricCard
          title="Gastos"
          value={formatCurrency(metrics.gastosTotal, 'CUP')}
          subtitle="Gastos operativos"
          icon={<Percent className="h-5 w-5" />}
        />

        <MetricCard
          title="Retiros"
          value={formatCurrency(metrics.retirosTotal)}
          subtitle="Retiros accionistas (USD)"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
