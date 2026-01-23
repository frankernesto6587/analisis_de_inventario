import type {
  FIFOLot,
  FIFOConsumption,
  FIFOWarning,
  FIFOInventoryState,
  Product,
  Reception,
  Purchase,
  SaleItem,
  Shrinkage,
} from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

interface InventoryMovement {
  type: 'ENTRADA' | 'SALIDA';
  fecha: Date;
  productoCodigo: number;
  cantidad: number;
  costoUnitario: number | null;
  referencia: string;
  tipoSalida?: 'VENTA' | 'MERMA' | 'AJUSTE';
  proveedor?: string | null;
}

// ============================================
// MOTOR FIFO
// ============================================

export class FIFOEngine {
  private lotes: Map<number, FIFOLot[]> = new Map(); // productoCodigo -> lotes ordenados por fecha
  private consumos: FIFOConsumption[] = [];
  private warnings: FIFOWarning[] = [];
  private productos: Map<number, Product> = new Map();
  private comprasPorNumero: Map<number, Purchase> = new Map();

  constructor(productos: Product[], compras: Purchase[]) {
    // Indexar productos
    for (const p of productos) {
      this.productos.set(p.codigo, p);
    }
    // Indexar compras por número para vincular con recepciones
    for (const c of compras) {
      this.comprasPorNumero.set(c.numero, c);
    }
  }

  // Obtener costo unitario desde compras vinculadas a recepción
  private getCostoFromCompra(recepcion: Reception): number | null {
    // Buscar compra del mismo producto en fecha cercana
    for (const [, compra] of this.comprasPorNumero) {
      if (compra.productoCodigo === recepcion.productoCodigo) {
        // Si las fechas son cercanas (dentro de 7 días)
        const diffDays = Math.abs(
          (recepcion.fecha.getTime() - compra.fecha.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= 7 && compra.unidades > 0) {
          return compra.importeTotal / compra.unidades;
        }
      }
    }
    return null;
  }

  // Crear lotes desde recepciones
  processRecepciones(recepciones: Reception[]): void {
    // Ordenar por fecha
    const sorted = [...recepciones].sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime()
    );

    for (const rec of sorted) {
      if (rec.unidades <= 0) continue;

      // Obtener costo desde compras
      let costoUnitario = rec.costoUnitario;
      if (costoUnitario === null) {
        costoUnitario = this.getCostoFromCompra(rec);
      }

      // Si aún no hay costo, usar el costo del producto
      if (costoUnitario === null) {
        const producto = this.productos.get(rec.productoCodigo);
        costoUnitario = producto?.costoUnitario || null;
      }

      if (costoUnitario === null) {
        // Advertencia: recepción sin costo
        this.warnings.push({
          tipo: 'SIN_COSTO',
          productoCodigo: rec.productoCodigo,
          producto: rec.producto,
          mensaje: `Recepción sin costo unitario determinable`,
          fecha: rec.fecha,
          referencia: `RECEPCION-${rec.numero}`,
        });
        // Usar costo 0 para permitir continuar
        costoUnitario = 0;
      }

      const lote: FIFOLot = {
        id: generateId(),
        productoCodigo: rec.productoCodigo,
        fechaEntrada: rec.fecha,
        cantidadInicial: rec.unidades,
        cantidadDisponible: rec.unidades,
        costoUnitario,
        referenciaOrigen: `RECEPCION-${rec.numero}`,
        proveedor: rec.proveedor,
      };

      // Agregar al mapa de lotes
      if (!this.lotes.has(rec.productoCodigo)) {
        this.lotes.set(rec.productoCodigo, []);
      }
      this.lotes.get(rec.productoCodigo)!.push(lote);
    }
  }

  // Procesar salida FIFO (venta o merma)
  private processSalida(
    productoCodigo: number,
    cantidad: number,
    fecha: Date,
    tipoSalida: 'VENTA' | 'MERMA' | 'AJUSTE',
    referencia: string
  ): { costoTotal: number; consumos: FIFOConsumption[] } {
    const lotes = this.lotes.get(productoCodigo) || [];
    let cantidadPendiente = Math.abs(cantidad);
    let costoTotal = 0;
    const consumosGenerados: FIFOConsumption[] = [];

    // Ordenar lotes por fecha (FIFO)
    lotes.sort((a, b) => a.fechaEntrada.getTime() - b.fechaEntrada.getTime());

    for (const lote of lotes) {
      if (cantidadPendiente <= 0) break;
      if (lote.cantidadDisponible <= 0) continue;

      const cantidadConsumida = Math.min(lote.cantidadDisponible, cantidadPendiente);
      const costoConsumo = cantidadConsumida * lote.costoUnitario;

      lote.cantidadDisponible -= cantidadConsumida;
      cantidadPendiente -= cantidadConsumida;
      costoTotal += costoConsumo;

      const consumo: FIFOConsumption = {
        id: generateId(),
        loteId: lote.id,
        productoCodigo,
        fechaSalida: fecha,
        cantidad: cantidadConsumida,
        costoUnitario: lote.costoUnitario,
        costoTotal: costoConsumo,
        tipoSalida,
        referenciaSalida: referencia,
      };

      consumosGenerados.push(consumo);
      this.consumos.push(consumo);
    }

    // Si quedó cantidad pendiente, stock negativo
    if (cantidadPendiente > 0) {
      const producto = this.productos.get(productoCodigo);
      this.warnings.push({
        tipo: 'STOCK_NEGATIVO',
        productoCodigo,
        producto: producto?.descripcion || `Producto ${productoCodigo}`,
        mensaje: `Stock insuficiente. Faltaron ${cantidadPendiente} unidades`,
        fecha,
        referencia,
      });

      // Crear consumo virtual con costo promedio disponible o cero
      const costoPromedio = lotes.length > 0
        ? lotes.reduce((sum, l) => sum + l.costoUnitario, 0) / lotes.length
        : 0;

      costoTotal += cantidadPendiente * costoPromedio;

      consumosGenerados.push({
        id: generateId(),
        loteId: 'VIRTUAL_NEGATIVO',
        productoCodigo,
        fechaSalida: fecha,
        cantidad: cantidadPendiente,
        costoUnitario: costoPromedio,
        costoTotal: cantidadPendiente * costoPromedio,
        tipoSalida,
        referenciaSalida: referencia,
      });
    }

    return { costoTotal, consumos: consumosGenerados };
  }

  // Procesar ventas
  processVentas(items: SaleItem[]): SaleItem[] {
    // Ordenar por fecha (necesitamos la fecha de la venta, pero solo tenemos ventaId)
    // Procesar en orden de aparición que debería ser cronológico
    const processedItems: SaleItem[] = [];

    for (const item of items) {
      // Solo procesar cantidades positivas (no ajustes negativos)
      const cantidad = item.unidadesTotal > 0 ? item.unidadesTotal : Math.abs(item.cantidad);

      if (cantidad <= 0) {
        processedItems.push({ ...item, costoFifo: 0, margenBruto: 0 });
        continue;
      }

      const { costoTotal } = this.processSalida(
        item.productoCodigo,
        cantidad,
        new Date(), // Usamos fecha actual como proxy
        'VENTA',
        `VENTA-${item.id}`
      );

      const precio = item.precio || 0;
      const ingresoTotal = precio * Math.abs(item.cantidad);
      const margenBruto = ingresoTotal - costoTotal;

      processedItems.push({
        ...item,
        costoFifo: costoTotal,
        margenBruto,
      });
    }

    return processedItems;
  }

  // Procesar mermas
  processMermas(mermas: Shrinkage[]): Shrinkage[] {
    // Ordenar por fecha
    const sorted = [...mermas].sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime()
    );

    const processedMermas: Shrinkage[] = [];

    for (const merma of sorted) {
      const { costoTotal } = this.processSalida(
        merma.productoCodigo,
        merma.cantidad,
        merma.fecha,
        'MERMA',
        `MERMA-${merma.id}`
      );

      processedMermas.push({
        ...merma,
        costoFifo: costoTotal,
      });
    }

    return processedMermas;
  }

  // Obtener estado actual
  getState(): FIFOInventoryState {
    const allLotes: FIFOLot[] = [];
    for (const [, lotes] of this.lotes) {
      allLotes.push(...lotes);
    }

    return {
      lotes: allLotes,
      consumos: this.consumos,
      warnings: this.warnings,
    };
  }

  // Calcular valor de inventario actual
  getInventoryValue(): { total: number; byProduct: Map<number, { cantidad: number; valor: number }> } {
    let total = 0;
    const byProduct = new Map<number, { cantidad: number; valor: number }>();

    for (const [productoCodigo, lotes] of this.lotes) {
      let cantidadTotal = 0;
      let valorTotal = 0;

      for (const lote of lotes) {
        if (lote.cantidadDisponible > 0) {
          cantidadTotal += lote.cantidadDisponible;
          valorTotal += lote.cantidadDisponible * lote.costoUnitario;
        }
      }

      if (cantidadTotal > 0) {
        byProduct.set(productoCodigo, { cantidad: cantidadTotal, valor: valorTotal });
        total += valorTotal;
      }
    }

    return { total, byProduct };
  }

  // Obtener COGS total
  getCOGS(): number {
    return this.consumos
      .filter((c) => c.tipoSalida === 'VENTA')
      .reduce((sum, c) => sum + c.costoTotal, 0);
  }

  // Obtener costo de mermas
  getShrinkageCost(): number {
    return this.consumos
      .filter((c) => c.tipoSalida === 'MERMA')
      .reduce((sum, c) => sum + c.costoTotal, 0);
  }

  // Explicar FIFO para un producto específico
  explainFIFO(productoCodigo: number): {
    lotes: FIFOLot[];
    consumos: FIFOConsumption[];
    stockActual: number;
    valorActual: number;
  } {
    const lotes = this.lotes.get(productoCodigo) || [];
    const consumos = this.consumos.filter((c) => c.productoCodigo === productoCodigo);

    let stockActual = 0;
    let valorActual = 0;

    for (const lote of lotes) {
      if (lote.cantidadDisponible > 0) {
        stockActual += lote.cantidadDisponible;
        valorActual += lote.cantidadDisponible * lote.costoUnitario;
      }
    }

    return { lotes, consumos, stockActual, valorActual };
  }
}

// ============================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO
// ============================================

export function processInventoryFIFO(
  productos: Product[],
  compras: Purchase[],
  recepciones: Reception[],
  ventasItems: SaleItem[],
  mermas: Shrinkage[]
): {
  processedItems: SaleItem[];
  processedMermas: Shrinkage[];
  state: FIFOInventoryState;
  inventoryValue: number;
  cogs: number;
  shrinkageCost: number;
} {
  const engine = new FIFOEngine(productos, compras);

  // 1. Crear lotes desde recepciones
  engine.processRecepciones(recepciones);

  // 2. Procesar salidas en orden cronológico
  // Combinar ventas y mermas, ordenar por fecha aproximada
  const processedMermas = engine.processMermas(mermas);
  const processedItems = engine.processVentas(ventasItems);

  // 3. Obtener resultados
  const state = engine.getState();
  const { total: inventoryValue } = engine.getInventoryValue();
  const cogs = engine.getCOGS();
  const shrinkageCost = engine.getShrinkageCost();

  return {
    processedItems,
    processedMermas,
    state,
    inventoryValue,
    cogs,
    shrinkageCost,
  };
}
