'use client';

import { useState, useCallback, useMemo } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/components/dashboard/dashboard';
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import type { NormalizedData, DashboardMetrics } from '@/types';

// Datos adicionales necesarios para recalcular métricas
interface RecalculationData {
  cogs: number;
  inventoryValue: number;
  shrinkageCost: number;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NormalizedData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tasaPromedio, setTasaPromedio] = useState<number>(400);
  const [recalcData, setRecalcData] = useState<RecalculationData | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error procesando archivo');
      }

      setData(result.data);
      setMetrics(result.metrics);
      setRecalcData(result.recalcData);
      setTasaPromedio(result.recalcData?.tasaPromedio || 400);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setData(null);
    setMetrics(null);
    setRecalcData(null);
    setError(null);
    setTasaPromedio(400);
  }, []);

  // Recalcular métricas cuando cambie la tasa
  const metricsWithRate = useMemo(() => {
    if (!metrics || !recalcData) return metrics;

    const { cogs, inventoryValue, shrinkageCost } = recalcData;
    const totalVentasCup = metrics.ventasTotales.total;

    // Recalcular valores que dependen de la tasa
    const ingresosTotalUsd = totalVentasCup / tasaPromedio;
    const margenBruto = ingresosTotalUsd - cogs;
    const margenPorcentaje = ingresosTotalUsd > 0 ? (margenBruto / ingresosTotalUsd) * 100 : 0;

    return {
      ...metrics,
      tasaPromedio,
      margenBruto,
      margenPorcentaje,
    };
  }, [metrics, recalcData, tasaPromedio]);

  const handleTasaChange = useCallback((newTasa: number) => {
    if (newTasa > 0) {
      setTasaPromedio(newTasa);
    }
  }, []);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Merxbit Analytics
              </h1>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Dashboard de Inventario con FIFO
              </p>
            </div>
          </div>

          {data && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo análisis</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!data ? (
          // Upload View
          <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center">
            <div className="w-full max-w-xl space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                  Sube tu archivo Excel
                </h2>
                <p className="mt-2 text-zinc-400">
                  Analiza inventario, ventas y genera KPIs automáticamente
                </p>
              </div>

              <FileUpload
                onFileSelect={handleFileSelect}
                isLoading={isLoading}
              />

              {isLoading && (
                <div className="flex items-center justify-center gap-3 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Procesando archivo...</span>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="mb-3 text-sm font-medium text-zinc-300">
                  Características
                </h3>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Detección automática de hojas y columnas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Valoración de inventario con método FIFO
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    KPIs: Margen bruto, rotación, mermas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Soporte multi-moneda (USD, CUP, EUR)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Trazabilidad completa hasta el lote original
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : metricsWithRate ? (
          // Dashboard View
          <div className="animate-fade-in">
            <Dashboard
              metrics={metricsWithRate}
              sheetsDetected={data.metadata.hojasDetectadas}
              tasaPromedio={tasaPromedio}
              onTasaChange={handleTasaChange}
            />
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-zinc-600 sm:px-6 lg:px-8">
          Procesamiento local. Tus datos no se almacenan en ningún servidor.
        </div>
      </footer>
    </main>
  );
}
