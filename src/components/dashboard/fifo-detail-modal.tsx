'use client';

import { useMemo } from 'react';
import { X, Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { FIFOLot, FIFOConsumption } from '@/types';

interface FIFODetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productoCodigo: number;
  productoNombre: string;
  lotes: FIFOLot[];
  consumos: FIFOConsumption[];
}

export function FIFODetailModal({
  isOpen,
  onClose,
  productoCodigo,
  productoNombre,
  lotes,
  consumos,
}: FIFODetailModalProps) {
  // Filtrar lotes y consumos para este producto
  const productLotes = useMemo(
    () => lotes.filter((l) => l.productoCodigo === productoCodigo),
    [lotes, productoCodigo]
  );

  const productConsumos = useMemo(
    () => consumos.filter((c) => c.productoCodigo === productoCodigo),
    [consumos, productoCodigo]
  );

  // Calcular totales
  const totals = useMemo(() => {
    const totalEntradas = productLotes.reduce((sum, l) => sum + l.cantidadInicial, 0);
    const totalDisponible = productLotes.reduce((sum, l) => sum + l.cantidadDisponible, 0);
    const valorInventario = productLotes.reduce(
      (sum, l) => sum + l.cantidadDisponible * l.costoUnitario,
      0
    );

    const consumosPorTipo = {
      VENTA: productConsumos.filter((c) => c.tipoSalida === 'VENTA'),
      MERMA: productConsumos.filter((c) => c.tipoSalida === 'MERMA'),
    };

    const cogsTotal = consumosPorTipo.VENTA.reduce((sum, c) => sum + c.costoTotal, 0);
    const mermaTotal = consumosPorTipo.MERMA.reduce((sum, c) => sum + c.costoTotal, 0);
    const unidadesVendidas = consumosPorTipo.VENTA.reduce((sum, c) => sum + c.cantidad, 0);
    const unidadesMerma = consumosPorTipo.MERMA.reduce((sum, c) => sum + c.cantidad, 0);

    return {
      totalEntradas,
      totalDisponible,
      valorInventario,
      cogsTotal,
      mermaTotal,
      unidadesVendidas,
      unidadesMerma,
      costoPromedioVenta: unidadesVendidas > 0 ? cogsTotal / unidadesVendidas : 0,
    };
  }, [productLotes, productConsumos]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Desglose FIFO - {productoNombre}
            </h2>
            <p className="text-sm text-zinc-400">Código: {productoCodigo}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          {/* Resumen */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500">Entradas Totales</p>
              <p className="text-xl font-semibold text-white">
                {formatNumber(totals.totalEntradas)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500">Stock Actual</p>
              <p className={`text-xl font-semibold ${totals.totalDisponible < 0 ? 'text-red-400' : 'text-white'}`}>
                {formatNumber(totals.totalDisponible)}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-4">
              <p className="text-xs text-emerald-400">COGS (Ventas)</p>
              <p className="text-xl font-semibold text-emerald-400">
                {formatCurrency(totals.cogsTotal)}
              </p>
              <p className="text-xs text-zinc-500">
                {formatNumber(totals.unidadesVendidas)} unidades
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-4">
              <p className="text-xs text-amber-400">Costo Mermas</p>
              <p className="text-xl font-semibold text-amber-400">
                {formatCurrency(totals.mermaTotal)}
              </p>
              <p className="text-xs text-zinc-500">
                {formatNumber(totals.unidadesMerma)} unidades
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-blue-500/10 p-3">
            <p className="text-sm text-blue-400">
              <strong>Costo promedio por unidad vendida:</strong>{' '}
              {formatCurrency(totals.costoPromedioVenta)}
            </p>
          </div>

          {/* Lotes (Entradas) */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Package className="h-4 w-4" />
              Lotes de Entrada ({productLotes.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50 text-zinc-400">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Referencia</th>
                    <th className="px-3 py-2">Proveedor</th>
                    <th className="px-3 py-2 text-right">Inicial</th>
                    <th className="px-3 py-2 text-right">Disponible</th>
                    <th className="px-3 py-2 text-right">Costo/u</th>
                    <th className="px-3 py-2 text-right">Valor Disp.</th>
                  </tr>
                </thead>
                <tbody>
                  {productLotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-zinc-500">
                        <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-400" />
                        No hay lotes registrados para este producto
                      </td>
                    </tr>
                  ) : (
                    productLotes
                      .sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime())
                      .map((lote) => (
                        <tr
                          key={lote.id}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-zinc-300">
                            {new Date(lote.fechaEntrada).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">{lote.referenciaOrigen}</td>
                          <td className="px-3 py-2 text-zinc-400">{lote.proveedor || '-'}</td>
                          <td className="px-3 py-2 text-right text-zinc-300">
                            {formatNumber(lote.cantidadInicial)}
                          </td>
                          <td className={`px-3 py-2 text-right ${lote.cantidadDisponible <= 0 ? 'text-zinc-500' : 'text-zinc-300'}`}>
                            {formatNumber(lote.cantidadDisponible)}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400">
                            {formatCurrency(lote.costoUnitario)}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-300">
                            {formatCurrency(lote.cantidadDisponible * lote.costoUnitario)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consumos (Salidas) */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <TrendingDown className="h-4 w-4" />
              Consumos FIFO ({productConsumos.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50 text-zinc-400">
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Referencia</th>
                    <th className="px-3 py-2">Lote</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Costo/u</th>
                    <th className="px-3 py-2 text-right">Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productConsumos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-zinc-500">
                        No hay consumos registrados
                      </td>
                    </tr>
                  ) : (
                    productConsumos.slice(0, 100).map((consumo) => (
                      <tr
                        key={consumo.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              consumo.tipoSalida === 'VENTA'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : consumo.tipoSalida === 'MERMA'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-zinc-500/20 text-zinc-400'
                            }`}
                          >
                            {consumo.tipoSalida}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 text-xs">
                          {consumo.referenciaSalida}
                        </td>
                        <td className="px-3 py-2 text-zinc-500 text-xs">
                          {consumo.loteId === 'VIRTUAL_NEGATIVO' ? (
                            <span className="text-red-400">Stock Negativo</span>
                          ) : (
                            consumo.loteId.substring(0, 8) + '...'
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300">
                          {formatNumber(consumo.cantidad)}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-400">
                          {formatCurrency(consumo.costoUnitario)}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300">
                          {formatCurrency(consumo.costoTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                  {productConsumos.length > 100 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-center text-zinc-500">
                        ... y {productConsumos.length - 100} consumos más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
