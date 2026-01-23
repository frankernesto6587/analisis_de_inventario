'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import type { MetricsByProduct } from '@/types';

interface ProductsTableProps {
  data: MetricsByProduct[];
}

type SortKey = 'descripcion' | 'unidadesVendidas' | 'ventasTotales' | 'margenBruto' | 'stockActual' | 'rotacion';
type SortDir = 'asc' | 'desc';

export function ProductsTable({ data }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ventasTotales');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filteredData = data.filter(
    (p) =>
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      p.producto.toLowerCase().includes(search.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (column !== sortKey) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <Card>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th
                onClick={() => handleSort('descripcion')}
                className="cursor-pointer whitespace-nowrap px-3 py-3 font-medium hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  Producto
                  <SortIcon column="descripcion" />
                </div>
              </th>
              <th
                onClick={() => handleSort('unidadesVendidas')}
                className="cursor-pointer whitespace-nowrap px-3 py-3 text-right font-medium hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  Vendidas
                  <SortIcon column="unidadesVendidas" />
                </div>
              </th>
              <th
                onClick={() => handleSort('ventasTotales')}
                className="cursor-pointer whitespace-nowrap px-3 py-3 text-right font-medium hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  Ventas
                  <SortIcon column="ventasTotales" />
                </div>
              </th>
              <th
                onClick={() => handleSort('margenBruto')}
                className="cursor-pointer whitespace-nowrap px-3 py-3 text-right font-medium hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  Margen
                  <SortIcon column="margenBruto" />
                </div>
              </th>
              <th
                onClick={() => handleSort('stockActual')}
                className="cursor-pointer whitespace-nowrap px-3 py-3 text-right font-medium hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  Stock
                  <SortIcon column="stockActual" />
                </div>
              </th>
              <th
                onClick={() => handleSort('rotacion')}
                className="cursor-pointer whitespace-nowrap px-3 py-3 text-right font-medium hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  Rotación
                  <SortIcon column="rotacion" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.slice(0, 20).map((p) => (
              <tr
                key={p.codigo}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
              >
                <td className="px-3 py-3">
                  <div className="max-w-[200px]">
                    <p className="truncate font-medium text-zinc-200" title={p.descripcion}>
                      {p.descripcion}
                    </p>
                    <p className="text-xs text-zinc-500">{p.producto}</p>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                  {formatNumber(p.unidadesVendidas)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                  {formatCurrency(p.ventasTotales)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <span
                    className={cn(
                      p.margenBruto >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {formatCurrency(p.margenBruto)}
                  </span>
                  <span className="ml-1 text-xs text-zinc-500">
                    ({formatPercent(p.margenPorcentaje)})
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                  {formatNumber(p.stockActual)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                  {p.rotacion.toFixed(2)}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length > 20 && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Mostrando 20 de {sortedData.length} productos
        </p>
      )}
    </Card>
  );
}
