'use client';

import { Card } from '@/components/ui/card';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { Calendar, Database, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import type { DashboardMetrics } from '@/types';

interface SummaryProps {
  metrics: DashboardMetrics;
  sheetsDetected: string[];
}

export function Summary({ metrics, sheetsDetected }: SummaryProps) {
  const { rangoFechas, totalRegistros } = metrics;

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Análisis completado
              </h2>
              <p className="text-sm text-zinc-400">
                Datos procesados con valoración FIFO
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(rangoFechas.desde)} — {formatDate(rangoFechas.hasta)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{sheetsDetected.length} hojas detectadas</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:gap-6">
          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              {formatNumber(totalRegistros.productos)}
            </p>
            <p className="text-xs text-zinc-500">Productos</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              {formatNumber(totalRegistros.ventas)}
            </p>
            <p className="text-xs text-zinc-500">Ventas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              {formatNumber(totalRegistros.compras)}
            </p>
            <p className="text-xs text-zinc-500">Compras</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              {formatNumber(metrics.lotesActivos)}
            </p>
            <p className="text-xs text-zinc-500">Lotes FIFO</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white">
              {formatNumber(totalRegistros.mermas)}
            </p>
            <p className="text-xs text-zinc-500">Mermas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-amber-400">
              {formatNumber(metrics.warnings.length)}
            </p>
            <p className="text-xs text-zinc-500">Alertas</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
