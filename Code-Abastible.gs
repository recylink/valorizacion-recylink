/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de ABASTIBLE
 * ============================================================
 * Reemplaza por completo el Code.gs actual del proyecto de Apps Script
 * ligado al Sheet de Abastible. Cambios respecto al que había:
 *
 * 1) NUEVO: soporte para tipo:'totalResiduos' en doPost, que sincroniza
 *    la hoja "Total Residuos" (Sucursal | Mes | Residuo |
 *    Valorizado/No Valorizado | Respel no respel | Total KG | Total M3).
 *    Requiere crear esa pestaña manualmente en el Sheet (con esos
 *    headers, en cualquier fila — el código ubica la fila de encabezado
 *    buscando "Sucursal" en la columna A).
 *
 * 2) FIX: writeObjetivos borraba TODAS las filas de la empresa completa
 *    (agrupaba por el primer token del empresa_id, ej. "abastible"),
 *    así que sincronizar un mes borraba el histórico de objetivos de
 *    TODAS las sucursales y meses. Ahora borra solo por
 *    empresa_id + mes exacto, igual que ya se corrigió para Socovesa.
 *
 * 3) NUEVO (2026-08-04): se agregó la hoja "Respel" al Sheet (mismo formato
 *    que usa Copec/Euro: columnas Residuo | RESPEL con TRUE/FALSE). doGet
 *    ahora la lee y la expone como "respel", igual que las otras empresas,
 *    para que el visor use esa clasificación en vez del fallback por nombre
 *    de residuo. Se usa para excluir los residuos Respel de la exigencia de
 *    declaración SINADER (no se les debe exigir).
 * ============================================================
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tipo = data.tipo;

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'valorizacion_metas') writeMetas(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data);
    else if (tipo === 'costoIngreso') writeCostoIngreso(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeValorizacion(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    // Borrar por empresa_id+Tipo (no solo empresa_id): si el cliente no manda
    // la fila "Meta %" (porque todavía no conoce el valor real), esta no debe
    // borrarse — antes se borraban las 3 filas (% Real/% Acumulado/Meta %) por
    // cualquier coincidencia de empresa_id, perdiendo la meta ya guardada.
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

function writeMetas(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  data.filas.forEach(function(fila) {
    const id = fila[0];
    let found = false;
    rows.forEach(function(row, i) {
      if (row[0] === id && row[2] === 'Meta %') {
        sheet.getRange(startRow + i, 1, 1, fila.length).setValues([fila]);
        found = true;
      }
    });
    if (!found) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, fila.length).setValues([fila]);
    }
  });
}

function writeTrazabilidad(ss, data) {
  const sheet = ss.getSheetByName('📊 Trazabilidad_Docs') || ss.getSheetByName('Trazabilidad_Docs');
  if (!sheet) throw new Error('Hoja Trazabilidad_Docs no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// FIX: antes borraba por prefijo de empresa completo (data.filas[0][0].split('_')[0]),
// lo que eliminaba el histórico de objetivos de TODAS las sucursales/meses de Abastible
// al sincronizar. Ahora borra solo las filas cuyo empresa_id+mes coincide exactamente
// con lo que se está reinsertando (igual que writeTrazabilidad y que la corrección ya
// aplicada en Socovesa).
function writeObjetivos(ss, data) {
  const sheet = ss.getSheetByName('🎯 Objetivos') || ss.getSheetByName('Objetivos');
  if (!sheet) throw new Error('Hoja Objetivos no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// ── NUEVO: Total Residuos ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal") y devuelve el número de fila (1-indexed). Evita asumir
// que el header está en una fila fija, ya que "Total Residuos" no tiene
// las filas decorativas de título que sí tienen las hojas principales.
function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// Reemplaza TODAS las filas de datos de "Total Residuos" por las que manda
// el cliente. El cliente siempre envía el set completo vigente (calculado
// desde el Excel cargado), así que no hace falta borrado selectivo por
// empresa_id como en writeValorizacion (esta hoja no tiene esa columna).
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var numCols = 8; // Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, numCols).clearContent();
  }
  if (data.filas && data.filas.length > 0) {
    sheet.getRange(startRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// ── NUEVO: Costo e Ingreso por residuo ──
// Alimenta el seguimiento del KPI "costo e ingreso" (objetivo kpi_costo):
// una fila por Sucursal+Mes+Residuo con el costo de transporte y el ingreso
// por venta acumulados. Requiere crear la pestaña "Costo e Ingreso" a mano en
// el Sheet (headers: Sucursal | Mes | Residuo | Total KG | Costo Total |
// Ingreso Total | Neto (Ingreso - Costo)), mismo criterio que "Total Residuos"
// (el código ubica el header buscando "Sucursal" en la columna A, no asume
// fila fija). Mismo patrón de reemplazo total que writeTotalResiduos: el
// cliente siempre envía el set completo vigente, calculado desde el Excel
// cargado.
function writeCostoIngreso(ss, data) {
  var sheet = ss.getSheetByName('Costo e Ingreso');
  if (!sheet) throw new Error('Hoja "Costo e Ingreso" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Costo e Ingreso');
  var startRow = headerRow + 1;
  var numCols = 7; // Sucursal | Mes | Residuo | Total KG | Costo Total | Ingreso Total | Neto (Ingreso - Costo)
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, numCols).clearContent();
  }
  if (data.filas && data.filas.length > 0) {
    sheet.getRange(startRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Residuo") y devuelve el número de fila (1-indexed).
function buscarFilaEncabezadoRespel_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// Lee la hoja Respel (Residuo -> TRUE/FALSE), mismo formato que Copec/Euro.
function readRespelSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Respel') || ss.getSheetByName('RESPEL');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezadoRespel_(sheet, 'Residuo');
  if (!headerRow) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return [];
  var headers = sheet.getRange(headerRow, 1, 1, 2).getValues()[0];
  var data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 2).getValues();
  return data.filter(function(r) { return r[0] !== ''; }).map(function(r) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = r[i]; });
    return obj;
  });
}

// ============================================================
// NUEVO (2026-08-04): payload JSONP para el visor standalone
// "Visor-de-Objetivos-Abastible" (repo aparte, GitHub Pages).
// Ese visor no usa fetch() sino un <script src="...exec?callback=NOMBRE">
// (JSONP) y espera un payload distinto al de doGet clásico:
// {EMPRESAS, VAL_DATA, MESES_ACTIVOS}, donde cada "EMPRESA" es en
// realidad una SUCURSAL de Abastible. Se arma aquí a partir de las
// mismas 3 hojas que ya lee doGet (Valorización/Trazabilidad_Docs/
// Objetivos), sin tocar el formato que consume el visor multi-empresa.
// ============================================================

var MESES_ES_LIST_ = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Mismo parseo tolerante que usa el visor multi-empresa (JS del HTML):
// admite "57.6%" (string con %), 0.3 (fraccion) o 30 (ya en %).
function parsePct_(val) {
  var raw = (val + '').replace('%', '').replace(',', '.').trim();
  var pct = parseFloat(raw);
  if (isNaN(pct)) return null;
  var hasPercent = (val + '').indexOf('%') >= 0;
  if (!hasPercent && pct > 0 && pct < 1) pct = pct * 100;
  else if (!hasPercent && pct === 1) pct = 100;
  return pct;
}

function numOrNull_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

// Elige el primer valor "presente" entre varios nombres de columna alternativos
// (distintas empresas usan headers ligeramente distintos). A diferencia de
// "a || b", esto NO descarta un 0 legitimo (0 documentos cargados = "Falta"),
// solo avanza al siguiente candidato si el campo esta vacio/ausente.
function pickField_(row, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = row[keys[i]];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

// Slug simple y estable para usar como id (clave de objeto, atributo onclick sin comillas).
function slugify_(s) {
  s = (s || '').toString().trim().toLowerCase();
  s = s.replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
       .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'sucursal';
}

function iniciales_(s) {
  var palabras = (s || '').trim().split(/\s+/).filter(function(w) { return w.length > 0; });
  var letras = palabras.map(function(w) { return w.charAt(0).toUpperCase(); }).join('');
  return letras.slice(0, 2) || '?';
}

function buildLegacyPayload_(valorizacionRows, trazabilidadRows, objetivosRows) {
  var sucSet = {};
  valorizacionRows.forEach(function(r) {
    if ((r['Tipo'] || '') === '% Real') { var s = (r['Sucursal'] || '') + ''; if (s) sucSet[s] = 1; }
  });
  trazabilidadRows.forEach(function(r) { var s = (r['Sucursal'] || '') + ''; if (s) sucSet[s] = 1; });
  var sucursales = Object.keys(sucSet).sort();

  // Meses activos: Enero..(ultimo mes con algun '% Real' cargado en cualquier sucursal).
  var lastIdx = -1;
  valorizacionRows.forEach(function(r) {
    if ((r['Tipo'] || '') !== '% Real') return;
    MESES_ES_LIST_.forEach(function(mes, i) {
      if (parsePct_(r[mes]) !== null && i > lastIdx) lastIdx = i;
    });
  });
  var mesesActivos = lastIdx >= 0 ? MESES_ES_LIST_.slice(0, lastIdx + 1) : MESES_ES_LIST_.slice(0, 1);

  var valMeses = {}, valMeta = {}, valAcum = {};
  valorizacionRows.forEach(function(r) {
    var suc = (r['Sucursal'] || '') + '';
    if (!suc) return;
    var tipo = (r['Tipo'] || '') + '';
    var destino = tipo === '% Real' ? valMeses : tipo === 'Meta %' ? valMeta : tipo === '% Acumulado' ? valAcum : null;
    if (!destino) return;
    if (!destino[suc]) destino[suc] = {};
    mesesActivos.forEach(function(mes) {
      var pct = parsePct_(r[mes]);
      if (pct !== null) destino[suc][mes] = pct;
    });
  });

  // Trazabilidad agrupada por sucursal -> mes -> residuos[]
  var mensualPorSuc = {};
  trazabilidadRows.forEach(function(r) {
    var suc = (r['Sucursal'] || '') + '';
    var mes = (r['Mes'] || '') + '';
    if (!suc || mesesActivos.indexOf(mes) < 0) return;
    if (!mensualPorSuc[suc]) mensualPorSuc[suc] = {};
    if (!mensualPorSuc[suc][mes]) mensualPorSuc[suc][mes] = [];
    mensualPorSuc[suc][mes].push({
      nombre: (r['Residuo'] || '') + '',
      imp: numOrNull_(pickField_(r, ['Importaciones', 'Imp.'])) || 0,
      docs: {
        'Cert. tratamiento': numOrNull_(pickField_(r, ['Cert. tratamiento', 'Cert. trat.'])),
        'Factura': numOrNull_(r['Factura']),
        'Cert. declaración': numOrNull_(pickField_(r, ['Cert. declaración', 'Cert. declaracion', 'Cert. decl.'])),
        'Transportista': numOrNull_(r['Transportista']),
        'Disposición final': numOrNull_(pickField_(r, ['Disposición final', 'Disposicion final', 'Disp. final']))
      }
    });
  });

  // Objetivos por sucursal: se queda con el valor del mes activo mas reciente
  // para cada texto de objetivo (el Sheet trae 1 fila por mes).
  var objPorSuc = {};
  objetivosRows.forEach(function(r) {
    var suc = (r['Sucursal'] || '') + '';
    var texto = (r['Objetivo'] || '') + '';
    if (!suc || !texto) return;
    var mesIdx = MESES_ES_LIST_.indexOf((r['Mes'] || '') + '');
    var avance = parsePct_(r['% cumplimiento']);
    if (avance === null) avance = 0;
    if (!objPorSuc[suc]) objPorSuc[suc] = {};
    var prev = objPorSuc[suc][texto];
    if (!prev || mesIdx > prev.mesIdx) {
      objPorSuc[suc][texto] = { mesIdx: mesIdx, texto: texto, ok: avance >= 100, meta: 100, avance: avance };
    }
  });

  var empresas = sucursales.map(function(suc) {
    var mensual = {};
    mesesActivos.forEach(function(mes) {
      mensual[mes] = { residuos: (mensualPorSuc[suc] && mensualPorSuc[suc][mes]) || [] };
    });
    var objetivos = objPorSuc[suc] ? Object.keys(objPorSuc[suc]).map(function(k) {
      var o = objPorSuc[suc][k];
      return { texto: o.texto, ok: o.ok, meta: o.meta, avance: o.avance };
    }) : [];
    return {
      id: slugify_(suc),
      sucursal: suc,
      nombre: 'Abastible',
      logo: '',
      color: '#175CD3',
      colorBg: '#EFF8FF',
      letra: iniciales_(suc),
      mensual: mensual,
      anual: {},
      cse: { correo: {}, reunion: {}, encuesta: {} },
      objetivos: objetivos
    };
  });

  var valData = {};
  sucursales.forEach(function(suc) {
    valData[slugify_(suc)] = {
      meses: valMeses[suc] || {},
      acumulado: valAcum[suc] || {},
      meta: valMeta[suc] || {}
    };
  });

  return { EMPRESAS: empresas, VAL_DATA: valData, MESES_ACTIVOS: mesesActivos };
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startRow = 6;

  function readSheet(nombre) {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet || sheet.getLastRow() < startRow) return [];
    const headers = sheet.getRange(5, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();
    return data.filter(r => r[0] !== '').map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
  }

  const valorizacionRows = readSheet('♻️ Valorización') || readSheet('Valorización');
  const trazabilidadRows = readSheet('📊 Trazabilidad_Docs') || readSheet('Trazabilidad_Docs');
  const objetivosRows = readSheet('🎯 Objetivos') || readSheet('Objetivos');

  // Peticion JSONP (Visor-de-Objetivos-Abastible): responde con
  // callback({EMPRESAS, VAL_DATA, MESES_ACTIVOS}) en vez de JSON plano.
  const callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[A-Za-z0-9_]+$/.test(callback)) {
    const legacyPayload = buildLegacyPayload_(valorizacionRows, trazabilidadRows, objetivosRows);
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(legacyPayload) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  const result = {
    valorizacion: valorizacionRows,
    trazabilidad: trazabilidadRows,
    objetivos: objetivosRows,
    respel: readRespelSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
