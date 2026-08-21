/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de Acciona
 * ============================================================
 * Mismo esquema que Code-Gespania.gs / Code-Salfa.gs / Code-Euro.gs /
 * Code-Ando.gs / Code-PMS.gs / Code-CCU.gs: writeObjetivos borra solo por
 * empresa_id + mes + Objetivo exacto (no por prefijo de empresa completo
 * ni solo por empresa_id+mes), soporte para tipo:'totalResiduos', y doGet
 * expone la hoja RESPEL propia del Sheet (Residuo -> TRUE/FALSE).
 *
 * CAMBIOS (2026-08-20) respecto a la versión anterior:
 * 1. doGet ahora envuelve la respuesta en JSONP cuando llega ?callback=...
 *    (el visor carga los datos con un <script src="..."> y necesita esto;
 *    sin el wrapper, el navegador recibe un objeto JSON "pelado" que no es
 *    JS válido como sentencia y el visor nunca dispara su callback).
 * 2. doGet soporta ?minutas=1 para devolver las filas crudas de la pestaña
 *    "Minuta" (necesario para la sección de Minutas del visor).
 * 3. doPost soporta tipo:'minutas' para guardar los cambios de Minutas de
 *    vuelta en la pestaña "Minuta", y acepta tanto POST con body JSON
 *    (fetch) como POST vía formulario oculto (fallback cuando fetch falla
 *    por CORS: llega como e.parameter.payload en vez de e.postData.contents).
 * 4. writeObjetivos: reaplicado el fix del 2026-08-14 (borrar por
 *    empresa_id+mes+Objetivo, no solo empresa_id+mes) — la versión que
 *    traía este archivo antes de agregar JSONP/Minutas no lo tenía, así
 *    que sincronizar un objetivo calculado (trazabilidad, etc.) borraba de
 *    paso las filas de objetivos "manual" (ej. CES) de la MISMA
 *    sucursal+mes sin que nada las reemplazara.
 * ============================================================
 */

function doPost(e) {
  try {
    var data;
    if (e.parameter && e.parameter.payload) {
      // Fallback vía formulario oculto (application/x-www-form-urlencoded)
      data = JSON.parse(e.parameter.payload);
    } else {
      // Camino normal: fetch() con body JSON
      data = JSON.parse(e.postData.contents);
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tipo = data.tipo;

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'valorizacion_metas') writeMetas(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data);
    else if (tipo === 'minutas') writeMinutas(ss, data);

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
    // borrarse — evita el bug que le borró la Meta % a Ando el 2026-07-27 al
    // subir el Excel antes de que "Cargar desde Sheets" terminara.
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

// Borra solo las filas cuyo empresa_id+mes+Objetivo coincide exactamente con
// lo que se esta reinsertando (no por prefijo de empresa completo, ni solo
// por empresa_id+mes), para no perder historico de objetivos de otras
// sucursales/meses/objetivos al sincronizar.
// FIX (2026-08-14): antes borraba por empresa_id+mes, lo que hacia que
// sincronizar un objetivo calculado (trazabilidad, sinader, etc.) borrara de
// paso las filas de objetivos "manual" (ej. CES) de la MISMA sucursal+mes,
// aunque el sync nunca vuelve a mandarlas (calcObjetivos() nunca calcula un
// estado para tipo 'manual', asi que no se reinsertan). Ahora borra por
// empresa_id+mes+Objetivo exacto, para no arrastrar filas de otros objetivos.
function writeObjetivos(ss, data) {
  const sheet = ss.getSheetByName('🎯 Objetivos') || ss.getSheetByName('Objetivos');
  if (!sheet) throw new Error('Hoja Objetivos no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[3]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2] + '|' + r[3])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// ── Total Residuos + RESPEL ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal" o "Residuo") y devuelve el numero de fila (1-indexed).
// Evita asumir que el header esta en una fila fija, ya que estas 2 hojas
// no tienen las filas decorativas de titulo/instrucciones que si tienen
// las 3 hojas principales.
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
// el cliente. El cliente siempre envia el set completo vigente (calculado
// desde el Excel cargado), asi que no hace falta borrado selectivo por
// empresa_id como en writeValorizacion (esta hoja no tiene esa columna).
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var numCols = 7; // Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, numCols).clearContent();
  }
  if (data.filas && data.filas.length > 0) {
    sheet.getRange(startRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// Lee la hoja RESPEL (Residuo -> TRUE/FALSE) como array de objetos, igual
// formato que las otras hojas.
function readRespelSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RESPEL');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Residuo');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  return data.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
}

// ── Minutas ──

// Lee TODAS las celdas de la pestaña "Minuta" tal cual están (título de
// sesión, sub-encabezado Tema/Revisado/Detalle/Acuerdos/Resuelto, e ítems),
// como array de arrays — el visor hace su propio parseo de estructura
// (mnRowsToSessions) porque distintos clientes usan órdenes de columna
// distintos.
function readMinutaRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Minuta');
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 5);
  if (lastRow < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

// Guarda de vuelta las sesiones editadas en el visor. Cada sesión trae
// headerRow/dataStartRow/colMap tal cual se leyeron al cargar, así que
// escribe en las mismas filas/columnas de origen sin reordenar la hoja.
function writeMinutas(ss, data) {
  var sheet = ss.getSheetByName(data.sheetName || 'Minuta');
  if (!sheet) throw new Error('Hoja "' + (data.sheetName || 'Minuta') + '" no encontrada');

  (data.sessions || []).forEach(function (sess) {
    if (sess.headerRow) {
      sheet.getRange(sess.headerRow, 1).setValue(sess.title || '');
    }
    var colMap = sess.colMap || { item: 0, cumplido: 1, comentario: 2, acuerdos: 3, revisado: 4 };
    var startRow = sess.dataStartRow;
    if (!startRow) return;
    (sess.items || []).forEach(function (it, idx) {
      var row = startRow + idx;
      sheet.getRange(row, colMap.item + 1).setValue(it.item || '');
      sheet.getRange(row, colMap.cumplido + 1).setValue(it.cumplido ? 'TRUE' : 'FALSE');
      sheet.getRange(row, colMap.comentario + 1).setValue(it.comentario || '');
      sheet.getRange(row, colMap.acuerdos + 1).setValue(it.acuerdos || '');
      sheet.getRange(row, colMap.revisado + 1).setValue(it.revisado ? 'TRUE' : 'FALSE');
    });
  });
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = params.callback;

  // Envuelve la respuesta en JSONP cuando el visor pide ?callback=... (así
  // funciona el <script src="..."> que usa cargarDatos()/mnFetchSheet()).
  // Sin callback, se comporta como antes: JSON plano.
  function respond(obj) {
    var json = JSON.stringify(obj);
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Minutas: ?minutas=1 ──
  if (params.minutas === '1') {
    return respond({ rows: readMinutaRows_() });
  }

  // ── Payload normal del visor de objetivos ──
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

  const result = {
    valorizacion: readSheet('♻️ Valorización') || readSheet('Valorización'),
    trazabilidad: readSheet('📊 Trazabilidad_Docs') || readSheet('Trazabilidad_Docs'),
    objetivos: readSheet('🎯 Objetivos') || readSheet('Objetivos'),
    respel: readRespelSheet_()
  };

  return respond(result);
}
