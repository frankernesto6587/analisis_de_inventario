import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/excel-parser';
import { processInventoryFIFO } from '@/lib/fifo-engine';
import { calculateMetrics } from '@/lib/metrics-calculator';
import { hashString } from '@/lib/utils';

export const maxDuration = 60; // seconds

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
    console.log('Parsing Excel...');
    const parsedData = parseExcelFile(buffer);

    console.log(`Parsed: ${parsedData.productos.length} productos, ${parsedData.ventas.length} ventas, ${parsedData.recepciones.length} recepciones`);

    // Procesar FIFO
    console.log('Processing FIFO...');
    const fifoResult = processInventoryFIFO(
      parsedData.productos,
      parsedData.compras,
      parsedData.recepciones,
      parsedData.ventasItems,
      parsedData.mermas
    );

    console.log(`FIFO: ${fifoResult.state.lotes.length} lotes, ${fifoResult.state.warnings.length} warnings`);

    // Calcular métricas (tasa por defecto 400, editable en el dashboard)
    const tasaPromedio = 400;
    console.log('Calculating metrics...');
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

    // Construir respuesta
    const response = {
      success: true,
      data: {
        productos: parsedData.productos,
        ventas: parsedData.ventas,
        ventasItems: fifoResult.processedItems,
        compras: parsedData.compras,
        recepciones: parsedData.recepciones,
        mermas: fifoResult.processedMermas,
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
