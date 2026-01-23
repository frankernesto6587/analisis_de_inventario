import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/excel-parser';
import { processInventoryFIFO } from '@/lib/fifo-engine';
import { calculateMetrics } from '@/lib/metrics-calculator';
import { hashString } from '@/lib/utils';
import type { SaleItem, Product, Shrinkage } from '@/types';

export const maxDuration = 60; // seconds

// Obtener factor de conversión según UM
function obtenerFactorUM(um: string, producto: Product): number {
  const umLower = um.toLowerCase().trim();

  // Detectar si es Caja
  if (umLower === 'caja' || umLower === 'cajas' || umLower === 'cj' || umLower === 'c') {
    return producto.factorCaja || 1;
  }
  // Detectar si es Pallet
  if (umLower === 'pallet' || umLower === 'pallets' || umLower === 'plt' || umLower === 'p') {
    return producto.factorPallet || 1;
  }

  return 1;
}

// Convertir unidades de ventas según UM y factor del producto
function convertirUnidadesVentas(items: SaleItem[], productos: Product[]): SaleItem[] {
  const productosMap = new Map<number, Product>();
  for (const p of productos) {
    productosMap.set(p.codigo, p);
  }

  return items.map((item) => {
    const producto = productosMap.get(item.productoCodigo);
    if (!producto) return item;

    const factor = obtenerFactorUM(item.um, producto);

    // Si el factor es 1, no hay conversión necesaria
    if (factor === 1) return item;

    // Calcular unidades reales
    const unidadesReales = Math.abs(item.cantidad) * factor;

    // Solo actualizar si unidadesTotal no fue calculado correctamente
    // (es decir, si es igual a cantidad, significa que no se convirtió)
    if (Math.abs(item.unidadesTotal - Math.abs(item.cantidad)) < 0.01) {
      return {
        ...item,
        unidadesTotal: item.cantidad >= 0 ? unidadesReales : -unidadesReales,
      };
    }

    return item;
  });
}

// Convertir unidades de mermas según UM y factor del producto
function convertirUnidadesMermas(mermas: Shrinkage[], productos: Product[]): Shrinkage[] {
  const productosMap = new Map<number, Product>();
  for (const p of productos) {
    productosMap.set(p.codigo, p);
  }

  return mermas.map((merma) => {
    const producto = productosMap.get(merma.productoCodigo);
    if (!producto) return merma;

    const factor = obtenerFactorUM(merma.um, producto);

    // Si el factor es 1, no hay conversión necesaria
    if (factor === 1) return merma;

    // Convertir cantidad
    return {
      ...merma,
      cantidad: merma.cantidad * factor,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Formato de archivo no válido. Use .xlsx o .xls' },
        { status: 400 }
      );
    }

    // Leer archivo
    const buffer = await file.arrayBuffer();
    const fileHash = hashString(file.name + file.size + file.lastModified);

    // Parsear Excel
    const parsedData = parseExcelFile(buffer);

    // Convertir unidades según UM (Caja -> unidades, Pallet -> unidades)
    const ventasItemsConvertidos = convertirUnidadesVentas(parsedData.ventasItems, parsedData.productos);
    const mermasConvertidas = convertirUnidadesMermas(parsedData.mermas, parsedData.productos);

    // Procesar FIFO
    const fifoResult = processInventoryFIFO(
      parsedData.productos,
      parsedData.compras,
      parsedData.recepciones,
      ventasItemsConvertidos,
      mermasConvertidas
    );

    // Calcular métricas (tasa por defecto 400, editable en el dashboard)
    const tasaPromedio = 400;
    const metrics = calculateMetrics({
      productos: parsedData.productos,
      ventas: parsedData.ventas,
      ventasItems: fifoResult.processedItems,
      compras: parsedData.compras,
      mermas: fifoResult.processedMermas,
      gastos: parsedData.gastos,
      retiros: parsedData.retiros,
      fifoState: fifoResult.state,
      inventoryValue: fifoResult.inventoryValue,
      cogs: fifoResult.cogs,
      shrinkageCost: fifoResult.shrinkageCost,
      tasaPromedio,
    });

    // Construir respuesta (usar items convertidos)
    const response = {
      success: true,
      data: {
        productos: parsedData.productos,
        ventas: parsedData.ventas,
        ventasItems: fifoResult.processedItems, // Ya procesados con unidades convertidas
        compras: parsedData.compras,
        recepciones: parsedData.recepciones,
        mermas: fifoResult.processedMermas, // Ya procesadas con unidades convertidas
        gastos: parsedData.gastos,
        retiros: parsedData.retiros,
        fifoState: fifoResult.state,
        metadata: {
          archivoHash: fileHash,
          fechaProcesamiento: new Date(),
          hojasDetectadas: parsedData.hojasDetectadas,
          erroresParsing: parsedData.errores,
        },
      },
      metrics,
      // Datos para recálculo cuando cambie la tasa
      recalcData: {
        cogs: fifoResult.cogs,
        inventoryValue: fifoResult.inventoryValue,
        shrinkageCost: fifoResult.shrinkageCost,
        tasaPromedio,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      {
        error: 'Error procesando archivo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
