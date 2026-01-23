'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn, formatPercent } from '@/lib/utils';
import { FormattedNumber, FormattedCurrency } from '@/components/ui/formatted-value';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react';
import { FIFODetailModal } from './fifo-detail-modal';
import type { MetricsByProduct, FIFOLot, FIFOConsumption } from '@/types';

interface ProductsTableProps {
  data: MetricsByProduct[];
  lotes?: FIFOLot[];
  consumos?: FIFOConsumption[];
}

type SortKey = keyof MetricsByProduct;
type SortDir = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function ProductsTable({ data, lotes = [], consumos = [] }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ventasUsd');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProduct, setSelectedProduct] = useState<MetricsByProduct | null>(null);

  // Filtrar
  const filteredData = useMemo(() => {
    return data.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        p.producto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toString().includes(search)
    );
  }, [data, search]);

  // Ordenar
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredData, sortKey, sortDir]);

  // Paginación
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset página cuando cambia el filtro
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (column !== sortKey) {
      return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-emerald-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-emerald-400" />
    );
  };

  const HeaderCell = ({
    column,
    label,
    align = 'left'
  }: {
    column: SortKey;
    label: string;
    align?: 'left' | 'right';
  }) => (
    <th
      onClick={() => handleSort(column)}
      className={cn(
        "group cursor-pointer whitespace-nowrap px-3 py-3 font-medium hover:text-zinc-200 transition-colors",
        align === 'right' && "text-right"
      )}
    >
      <div className={cn(
        "flex items-center gap-1",
        align === 'right' && "justify-end"
      )}>
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <Card>
      {/* Barra de búsqueda y controles */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por código, producto..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Mostrar:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>de {sortedData.length}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <HeaderCell column="codigo" label="Código" />
              <HeaderCell column="descripcion" label="Producto" />
              <HeaderCell column="unidadesVendidas" label="Vendidas" align="right" />
              <HeaderCell column="ventasCup" label="Ventas CUP" align="right" />
              <HeaderCell column="ventasUsd" label="Ventas USD" align="right" />
              <HeaderCell column="cogs" label="COGS" align="right" />
              <HeaderCell column="margenBruto" label="Margen" align="right" />
              <HeaderCell column="margenPorcentaje" label="%" align="right" />
              <HeaderCell column="stockActual" label="Stock" align="right" />
              <HeaderCell column="valorInventario" label="Valor Inv." align="right" />
              <HeaderCell column="rotacion" label="Rotación" align="right" />
              <th className="px-3 py-3 text-center text-zinc-400">FIFO</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-zinc-500">
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              paginatedData.map((p) => (
                <tr
                  key={p.codigo}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedProduct(p)}
                >
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                    {p.codigo}
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[250px]">
                      <p className="truncate font-medium text-zinc-200" title={p.descripcion}>
                        {p.descripcion}
                      </p>
                      <p className="text-xs text-zinc-500">{p.producto}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                    <FormattedNumber value={p.unidadesVendidas} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                    <FormattedNumber value={p.ventasCup} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                    <FormattedCurrency value={p.ventasUsd} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-400">
                    <FormattedCurrency value={p.cogs} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <FormattedCurrency
                      value={p.margenBruto}
                      className={cn(
                        p.margenBruto >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        p.margenPorcentaje >= 20
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.margenPorcentaje >= 0
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {formatPercent(p.margenPorcentaje)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <FormattedNumber
                      value={p.stockActual}
                      className={cn(
                        p.stockActual < 0 ? 'text-red-400' : 'text-zinc-300'
                      )}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-400">
                    <FormattedCurrency value={p.valorInventario} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-300">
                    {p.rotacion.toFixed(2)}x
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(p);
                      }}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400"
                      title="Ver desglose FIFO"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-500">
            Mostrando {startIndex + 1}-{Math.min(endIndex, sortedData.length)} de {sortedData.length} productos
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200"
              title="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200"
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              {/* Mostrar números de página */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "min-w-[32px] h-8 rounded text-sm font-medium transition-colors",
                      currentPage === pageNum
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200"
              title="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200"
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalles FIFO */}
      {selectedProduct && (
        <FIFODetailModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          productoCodigo={selectedProduct.codigo}
          productoNombre={selectedProduct.descripcion}
          lotes={lotes}
          consumos={consumos}
        />
      )}
    </Card>
  );
}
