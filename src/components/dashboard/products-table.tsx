'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn, formatPercent } from '@/lib/utils';
import { FormattedNumber, FormattedCurrency } from '@/components/ui/formatted-value';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Info, Download, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FIFODetailModal } from './fifo-detail-modal';
import type { MetricsByProduct, FIFOLot, FIFOConsumption } from '@/types';

interface ProductsTableProps {
  data: MetricsByProduct[];
  lotes?: FIFOLot[];
  consumos?: FIFOConsumption[];
  tasaPromedio?: number;
}

type SortKey = keyof MetricsByProduct;
type SortDir = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function ProductsTable({ data, lotes = [], consumos = [], tasaPromedio = 400 }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ventasUsd');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProduct, setSelectedProduct] = useState<MetricsByProduct | null>(null);
  const [showDocs, setShowDocs] = useState(false);

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

  const handleDownload = () => {
    const rows = sortedData.map((p) => ({
      'Código': p.codigo,
      'Producto': p.descripcion,
      'Categoría': p.producto,
      'Unidades Vendidas': p.unidadesVendidas,
      'Ventas CUP': Math.round(p.ventasCup * 100) / 100,
      'Ventas USD': Math.round(p.ventasUsd * 100) / 100,
      'COGS (USD)': Math.round(p.cogs * 100) / 100,
      'Margen Bruto (USD)': Math.round(p.margenBruto * 100) / 100,
      'Margen %': Math.round(p.margenPorcentaje * 100) / 100,
      'Costo Unitario (USD)': Math.round(p.costoUnitario * 100) / 100,
      'Stock Actual': p.stockActual,
      'Valor Inventario (USD)': Math.round(p.valorInventario * 100) / 100,
      'Rotación': Math.round(p.rotacion * 100) / 100,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análisis por Producto');

    // Auto-ajustar ancho de columnas
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 12),
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'analisis_productos.xlsx');
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
      {/* Aviso sobre tasa de conversión */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <p className="text-sm text-amber-200">
          Los valores en USD (Ventas USD, COGS, Margen, Valor Inventario) se calculan utilizando la tasa de conversión de <span className="font-semibold text-amber-100">{tasaPromedio.toLocaleString()} CUP/USD</span> configurada en el panel superior. Modifique la tasa para ajustar estos cálculos según el tipo de cambio actual.
        </p>
      </div>

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

        <div className="flex items-center gap-3">
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

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
            title="Descargar como Excel"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
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
              <HeaderCell column="costoUnitario" label="C.Unit." align="right" />
              <HeaderCell column="stockActual" label="Stock" align="right" />
              <HeaderCell column="valorInventario" label="Valor Inv." align="right" />
              <HeaderCell column="rotacion" label="Rotación" align="right" />
              <th className="px-3 py-3 text-center text-zinc-400">FIFO</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-zinc-500">
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
                  <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-400">
                    <FormattedCurrency value={p.costoUnitario} />
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

      {/* Documentación de columnas */}
      <div className="mt-6 border-t border-zinc-800 pt-4">
        <button
          onClick={() => setShowDocs(!showDocs)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          <span>{showDocs ? 'Ocultar' : 'Ver'} documentacion de columnas</span>
          {showDocs ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {showDocs && (
          <div className="mt-4 space-y-4 text-sm text-zinc-400">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Codigo</h4>
                <p>Codigo numerico unico del producto, tomado de la columna <span className="text-emerald-400">Codigo</span> de la hoja <span className="text-amber-300">Productos</span> del Excel.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Producto</h4>
                <p>Nombre y descripcion del producto. Se muestra la <span className="text-emerald-400">Descripcion</span> como titulo y el <span className="text-emerald-400">Producto</span> (categoria/clase) debajo, ambos de la hoja <span className="text-amber-300">Productos</span>.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Vendidas</h4>
                <p>Total de unidades vendidas del producto. Se suman las <span className="text-emerald-400">Unidades Total</span> de todos los items de venta de la hoja <span className="text-amber-300">Ventas</span>. Si la UM es Caja, se multiplica la cantidad por el <span className="text-emerald-400">Factor Caja</span> del producto. Las devoluciones (cantidades negativas) se restan automaticamente.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Ventas CUP</h4>
                <p>Ingresos en CUP por producto. Se calcula como <span className="text-emerald-400">Precio</span> &times; <span className="text-emerald-400">Cantidad</span> de cada item de venta en la hoja <span className="text-amber-300">Ventas</span>, sumando todos los items del mismo producto.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Ventas USD</h4>
                <p>Ingresos convertidos a dolares. Se calcula dividiendo las <span className="text-emerald-400">Ventas CUP</span> entre la <span className="text-amber-300">Tasa de Conversion</span> configurada en el panel superior (por defecto {tasaPromedio} CUP/USD).</p>
                <p className="mt-1 text-xs text-zinc-500">Formula: Ventas USD = Ventas CUP &divide; Tasa</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">COGS (Cost of Goods Sold)</h4>
                <p>Costo de los bienes vendidos, calculado con el metodo <span className="text-amber-300">FIFO</span> (First In, First Out). Cuando se vende una unidad, se consume el costo del lote mas antiguo disponible. Los lotes se crean a partir de las <span className="text-emerald-400">Recepciones</span> del Excel, y su costo unitario se obtiene vinculando con la hoja de <span className="text-amber-300">Compras</span> (mismo producto, fecha &plusmn;7 dias). Valor en USD.</p>
                <p className="mt-1 text-xs text-zinc-500">Origen del costo: Compras &rarr; Recepciones &rarr; Lotes FIFO &rarr; Consumo por venta</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Margen Bruto</h4>
                <p>Ganancia bruta por producto en USD. Es la diferencia entre los ingresos y el costo de lo vendido.</p>
                <p className="mt-1 text-xs text-zinc-500">Formula: Margen = Ventas USD &minus; COGS</p>
                <p className="mt-1 text-xs"><span className="text-emerald-400">Verde</span> = ganancia, <span className="text-red-400">Rojo</span> = perdida.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">% (Margen Porcentaje)</h4>
                <p>Porcentaje de margen bruto sobre las ventas en USD.</p>
                <p className="mt-1 text-xs text-zinc-500">Formula: % = (Margen Bruto &divide; Ventas USD) &times; 100</p>
                <p className="mt-1 text-xs"><span className="text-emerald-400">&ge;20%</span> bueno, <span className="text-yellow-400">0-20%</span> bajo, <span className="text-red-400">&lt;0%</span> perdida.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">C.Unit. (Costo Unitario)</h4>
                <p>Costo unitario promedio ponderado en USD del inventario actual. Se calcula dividiendo el valor total del inventario del producto entre las unidades en stock.</p>
                <p className="mt-1 text-xs text-zinc-500">Formula: C.Unit. = Valor Inventario &divide; Stock Actual</p>
                <p className="mt-1 text-xs text-zinc-500">Refleja el costo promedio de los lotes FIFO que aun tienen existencia.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Stock</h4>
                <p>Unidades actualmente disponibles en inventario. Se calcula sumando la <span className="text-emerald-400">cantidad disponible</span> de todos los lotes FIFO activos del producto.</p>
                <p className="mt-1 text-xs text-zinc-500">Stock = &Sigma; Recepciones &minus; &Sigma; Ventas (incluye deterioro como ventas a precio 0)</p>
                <p className="mt-1 text-xs"><span className="text-red-400">Rojo</span> = stock negativo (mas ventas que recepciones registradas).</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Valor Inv. (Valor Inventario)</h4>
                <p>Valor monetario del inventario actual en USD. Se calcula multiplicando las unidades disponibles de cada lote FIFO por su costo unitario y sumando todos los lotes del producto.</p>
                <p className="mt-1 text-xs text-zinc-500">Formula: Valor Inv. = &Sigma; (Cantidad Disponible del Lote &times; Costo Unitario del Lote)</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="mb-1 font-medium text-zinc-200">Rotacion</h4>
                <p>Indicador de cuantas veces se ha vendido el inventario promedio del producto. Un valor alto indica alta demanda respecto al stock.</p>
                <p className="mt-1 text-xs text-zinc-500">Formula: Rotacion = Unidades Vendidas &divide; Stock Actual</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 sm:col-span-2">
                <h4 className="mb-1 font-medium text-zinc-200">FIFO (Detalle)</h4>
                <p>Al hacer clic en el icono <Eye className="inline h-3.5 w-3.5 text-emerald-400" /> o en cualquier fila, se abre un modal con el desglose completo de los lotes FIFO del producto: fecha de entrada, cantidad inicial y disponible, costo unitario, proveedor, y todos los consumos realizados (ventas y ajustes).</p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-3">
              <h4 className="mb-2 font-medium text-zinc-300">Origen de los datos</h4>
              <div className="space-y-1 text-xs text-zinc-500">
                <p><span className="text-amber-300">Productos</span> &rarr; Codigo, nombre, descripcion, factor de conversion (Caja/Pallet)</p>
                <p><span className="text-amber-300">Ventas</span> &rarr; Items vendidos con precio, cantidad, unidades, metodo de pago (USD, EUR, CUP Transferencia, CUP Efectivo)</p>
                <p><span className="text-amber-300">Compras</span> &rarr; Costo unitario de cada producto por proveedor y fecha</p>
                <p><span className="text-amber-300">Recepciones</span> &rarr; Entrada fisica de mercancia al almacen (crea lotes FIFO)</p>
                <p><span className="text-amber-300">Deterioro</span> &rarr; Registrado como ventas a precio $0 en la hoja de Ventas (ya incluido en el calculo de stock)</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
