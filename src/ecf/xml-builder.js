import { create } from 'xmlbuilder2';

/**
 * Build e-CF XML following DGII v1.0 specification
 */
export function buildEcfXml(factura, detalles, emisor, comprador) {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('ECF', {
      'xmlns': 'urn:dgii:ecf:2019',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    });

  // ── Encabezado ──
  const encabezado = doc.ele('Encabezado');

  // Version
  encabezado.ele('Version').txt('1.0');

  // IdDoc
  const idDoc = encabezado.ele('IdDoc');
  idDoc.ele('TipoeCF').txt(String(factura.tipo_ecf));
  idDoc.ele('eNCF').txt(factura.encf);
  idDoc.ele('FechaVencimientoSecuencia').txt(formatDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1))));
  idDoc.ele('IndicadorNotaCredito');
  idDoc.ele('TipoIngresos').txt(factura.tipo_ingreso || '01');
  idDoc.ele('TipoPago').txt(String(factura.tipo_pago || 1));
  idDoc.ele('FechaLimitePago').txt(factura.fecha_vencimiento || factura.fecha_emision);
  if (factura.tipo_ecf === 32) {
    idDoc.ele('IndicadorMontoGravado').txt('0');
  }

  // Emisor
  const emisorNode = encabezado.ele('Emisor');
  emisorNode.ele('RNCEmisor').txt(emisor.rnc);
  emisorNode.ele('RazonSocialEmisor').txt(emisor.razon_social);
  if (emisor.nombre_comercial) {
    emisorNode.ele('NombreComercial').txt(emisor.nombre_comercial);
  }
  emisorNode.ele('DireccionEmisor').txt(emisor.direccion || '');
  if (emisor.municipio) emisorNode.ele('MunicipioEmisor').txt(emisor.municipio);
  if (emisor.provincia) emisorNode.ele('ProvinciaEmisor').txt(emisor.provincia);
  if (emisor.telefono) emisorNode.ele('TelefonoEmisor').txt(emisor.telefono);
  if (emisor.correo) emisorNode.ele('CorreoEmisor').txt(emisor.correo);
  if (emisor.website) emisorNode.ele('WebSiteEmisor').txt(emisor.website);
  if (emisor.actividad_economica) emisorNode.ele('ActividadEconomica').txt(emisor.actividad_economica);
  emisorNode.ele('FechaEmision').txt(factura.fecha_emision);

  // Comprador (not required for tipo 32 consumo under threshold)
  if (comprador && comprador.rnc_cedula) {
    const compradorNode = encabezado.ele('Comprador');
    compradorNode.ele('RNCComprador').txt(comprador.rnc_cedula);
    compradorNode.ele('RazonSocialComprador').txt(comprador.razon_social);
    if (comprador.direccion) compradorNode.ele('DireccionComprador').txt(comprador.direccion);
    if (comprador.municipio) compradorNode.ele('MunicipioComprador').txt(comprador.municipio);
    if (comprador.provincia) compradorNode.ele('ProvinciaComprador').txt(comprador.provincia);
    if (comprador.telefono) compradorNode.ele('TelefonoComprador').txt(comprador.telefono);
    if (comprador.correo) compradorNode.ele('CorreoComprador').txt(comprador.correo);
  }

  // Totales
  const totales = encabezado.ele('Totales');
  totales.ele('MontoGravadoTotal').txt(formatMoney(factura.monto_gravado_18 + factura.monto_gravado_16));
  totales.ele('MontoGravadoI1').txt(formatMoney(factura.monto_gravado_18));
  if (factura.monto_gravado_16 > 0) {
    totales.ele('MontoGravadoI2').txt(formatMoney(factura.monto_gravado_16));
  }
  if (factura.monto_exento > 0) {
    totales.ele('MontoExento').txt(formatMoney(factura.monto_exento));
  }
  totales.ele('ITBIS1').txt('18');
  totales.ele('TotalITBIS1').txt(formatMoney(factura.itbis_18));
  if (factura.itbis_16 > 0) {
    totales.ele('ITBIS2').txt('16');
    totales.ele('TotalITBIS2').txt(formatMoney(factura.itbis_16));
  }
  totales.ele('TotalITBIS').txt(formatMoney(factura.itbis_total));
  totales.ele('MontoTotal').txt(formatMoney(factura.monto_total));

  // ── DetallesItems ──
  const detallesNode = doc.ele('DetallesItems');
  for (const item of detalles) {
    const itemNode = detallesNode.ele('Item');
    itemNode.ele('NumeroLinea').txt(String(item.linea));
    if (item.codigo_item) {
      itemNode.ele('TablaCodigoBarras');
      itemNode.ele('CodigoItem').txt(item.codigo_item);
    }
    itemNode.ele('NombreItem').txt(item.descripcion);
    itemNode.ele('IndicadorFacturacion').txt('1');
    itemNode.ele('CantidadItem').txt(String(item.cantidad));
    itemNode.ele('UnidadMedida').txt(item.unidad_medida || 'UND');
    itemNode.ele('PrecioUnitarioItem').txt(formatMoney(item.precio_unitario));

    if (item.descuento_monto > 0) {
      itemNode.ele('DescuentoMonto').txt(formatMoney(item.descuento_monto));
    }

    if (item.tasa_itbis > 0) {
      itemNode.ele('TablaSubDescuento');
      itemNode.ele('TasaITBIS').txt(String(item.tasa_itbis));
      itemNode.ele('ITBISItem').txt(formatMoney(item.itbis_monto));
    }

    itemNode.ele('MontoItem').txt(formatMoney(item.monto_total));
  }

  // ── InformacionReferencia (for NC/ND) ──
  if ((factura.tipo_ecf === 33 || factura.tipo_ecf === 34) && factura.referencia_encf) {
    const ref = doc.ele('InformacionReferencia');
    const refItem = ref.ele('ItemReferencia');
    refItem.ele('NCFModificado').txt(factura.referencia_encf);
    refItem.ele('FechaNCFModificado').txt(factura.fecha_emision);
    refItem.ele('CodigoModificacion').txt(factura.tipo_ecf === 34 ? '1' : '2');
  }

  return doc.end({ prettyPrint: true });
}

function formatDate(date) {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

function formatMoney(amount) {
  return (amount || 0).toFixed(2);
}
