/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet — VERSIÓN FUSIONADA
 * ============================================================
 * Este archivo reemplaza por completo tu Code.gs actual.
 *
 *  1) EL OTRO DESARROLLO (sin tocar la lógica):
 *     - doPost: escribe valorización / metas / trazabilidad / objetivos / total residuos
 *     - doGet "clásico": devuelve el volcado plano de las hojas
 *       (usado por valorizacion-recylink.html y cualquier otro consumidor existente)
 *
 *  2) EL VISOR DE TRAZABILIDAD:
 *     - Se activa SOLO si la request trae ?callback=... o ?visor=1
 *     - Si no viene ninguno de esos dos parámetros, doGet responde
 *       EXACTAMENTE igual que antes → el otro desarrollo no se entera de nada.
 *     - Incluye el % Acumulado real (fila "% Acumulado" en Valorización).
 *
 *  3) EL VISOR DE MINUTAS (integrado al visor de objetivos):
 *     - Se activa SOLO si la request trae ?minutas=1
 *     - Devuelve las filas crudas de la pestaña "Minuta" vía JSONP,
 *       usando el mismo Apps Script (no depende de que el Sheet esté
 *       compartido públicamente).
 * ============================================================
 */


// ============================================================
// 1) DOPOST — OTRO DESARROLLO, SIN CAMBIOS
// ============================================================

function doPost(e) {
  try {
    // Soporta tanto el POST directo (fetch, JSON en el body) como el método
    // de respaldo del Visor de Minutas (formulario oculto, que llega como
    // e.parameter.payload). Si no viene ninguno de los dos, se comporta
    // exactamente como antes.
    var raw;
    if (e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    } else {
      raw = e.postData.contents;
    }

    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tipo = data.tipo;

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'valorizacion_metas') writeMetas(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data);
    else if (tipo === 'minutas') writeMinutas_(ss, data); // NUEVO — Visor de Minutas

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
    const col = sheet.getRange(startRow, 1, lastRow - startRow + 1, 1).getValues();
    const ids = new Set(data.filas.map(f => f[0]));
    const toDelete = [];
    col.forEach((r, i) => { if (ids.has(r[0])) toDelete.push(startRow + i); });
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

// ── Total Residuos + RESPEL (otro desarrollo) ──

function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// FIX (2026-09-16): numCols pasó de 7 a 8 — el cliente (valorizacion-recylink.html,
// generaCO2TR) manda "Tons. CO2eq. evitadas" como 8va columna para Copec (el write
// de abajo ya escribía las 8 con el largo real de la fila), pero el borrado previo
// seguía limitado a 7 — si un resync traía menos filas que antes, la columna de
// CO2 de las filas sobrantes quedaba con el valor viejo sin limpiar.
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

// Lee "Total Residuos" (Sucursal | Mes | Residuo | Valorizado/No Valorizado |
// Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas) como array
// de objetos, mismo formato que readRespelSheet_().
// FIX (2026-09-16, caso real: Copec "Planta Maipú" seguía en 27% después de
// sincronizar): writeTotalResiduos() sí guardaba los datos en el Sheet, pero
// nunca se devolvían de vuelta al cliente en doGetClasico_ — faltaba esta
// función y su entrada en "result". Sin esto, "Cargar desde Sheets" dejaba
// totalResiduosDesdeSheets siempre vacío en el cliente, así que el cálculo
// en vivo de % valorización (getAcumReal_, que excluye Respel para Copec)
// nunca encontraba datos y caía de vuelta al snapshot viejo ya sincronizado
// — solo funcionaba subiendo un Excel fresco en la misma sesión (que sí
// llena totalResiduosRows en memoria).
function readTotalResiduosSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  return data.filter(function (r) { return String(r[0] || '').trim() !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
}


// ============================================================
// VISOR DE MINUTAS: escritura en la hoja "Minuta "
// ============================================================

var SHEET_MINUTA_CANDIDATOS = ['Minuta ', 'Minuta', '📝 Minuta'];

function encontrarHojaMinuta_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < SHEET_MINUTA_CANDIDATOS.length; i++) {
    var sheet = ss.getSheetByName(SHEET_MINUTA_CANDIDATOS[i]);
    if (sheet) return sheet;
  }
  throw new Error('No se encontró la hoja de Minutas: ' + SHEET_MINUTA_CANDIDATOS.join(' / '));
}

/**
 * data.sessions viene del visor con esta forma:
 * [{ headerRow, title, items: [{item, cumplido, comentario, acuerdos, revisado}, ...] }, ...]
 *
 * Para cada sesión:
 *  1) Si trae headerRow (fila real 1-indexed del título), la usa directo.
 *     Si no, intenta ubicarla por texto exacto del título (compatibilidad
 *     con minutas antiguas sin headerRow) — y si tampoco la encuentra así,
 *     es una minuta NUEVA creada desde el visor: se agrega al final de la hoja.
 *  2) Escribe/actualiza el título en la columna A de esa fila (por si cambió
 *     la etiqueta de tipo de reunión: "· Oficina Central" / "· Sucursal: X").
 *  3) Si la fila siguiente es un sub-encabezado ("Items", "Item" o "Tema"), la salta.
 *  4) Escribe cada ítem en su fila correspondiente (A=Item, B=Cumplimiento,
 *     C=Comentario, D=Acuerdos, E=Revisado), agregando filas si hacen falta.
 */

function writeMinutas_(ss, data) {
  var sheet = encontrarHojaMinuta_();
  var searchFrom = 1;

  (data.sessions || []).forEach(function (session) {
    var headerRow = session.headerRow || -1;

    if (headerRow === -1) {
      headerRow = buscarSesionMinuta_(sheet, session.title, searchFrom);
    }

    if (headerRow === -1) {
      // Minuta nueva (creada desde el visor): se agrega al final de la hoja.
      headerRow = sheet.getLastRow() + 1;
    }

    sheet.getRange(headerRow, 1).setValue(session.title || '');

    var dataStartRow = headerRow + 1;
    var maybeSub = String(sheet.getRange(dataStartRow, 1).getValue()).trim().toLowerCase();
    if (maybeSub === 'items' || maybeSub === 'item' || maybeSub === 'tema') dataStartRow++;

    var blockEnd = buscarFinBloqueMinuta_(sheet, dataStartRow);
    var currentSize = blockEnd - dataStartRow;
    var rows = session.items || [];
    var neededSize = rows.length;

    if (neededSize > currentSize) {
      sheet.insertRowsBefore(blockEnd, neededSize - currentSize);
    }

    for (var i = 0; i < neededSize; i++) {
      var row = rows[i];
      var targetRow = dataStartRow + i;
      sheet.getRange(targetRow, 1).setValue(row.item || '');
      sheet.getRange(targetRow, 2).setValue(!!row.cumplido);
      sheet.getRange(targetRow, 3).setValue(row.comentario || '');
      sheet.getRange(targetRow, 4).setValue(row.acuerdos || '');
      sheet.getRange(targetRow, 5).setValue(!!row.revisado);
    }

    searchFrom = headerRow + 1;
  });
}

// Busca una fila cuya columna A coincida EXACTO (trim, sin distinguir mayúsculas)
// con el título de la sesión, empezando desde fromRow.
function buscarSesionMinuta_(sheet, title, fromRow) {
  var lastRow = sheet.getLastRow();
  var target = (title || '').trim().toLowerCase();
  for (var r = fromRow; r <= lastRow; r++) {
    var val = String(sheet.getRange(r, 1).getValue()).trim().toLowerCase();
    if (val === target) return r;
  }
  return -1;
}

// El bloque de una minuta termina cuando aparece otra fila que empieza con
// "minuta" (nueva sesión) o al llegar al final de la hoja.
function buscarFinBloqueMinuta_(sheet, fromRow) {
  var lastRow = sheet.getLastRow();
  for (var r = fromRow; r <= lastRow; r++) {
    var val = String(sheet.getRange(r, 1).getValue()).trim().toLowerCase();
    if (val.indexOf('minuta') === 0) return r;
  }
  return lastRow + 1;
}


// ============================================================
// 2) DOGET FUSIONADO — despacha según el parámetro de la URL
// ============================================================

function doGet(e) {
  const quiereMinutas = e && e.parameter && e.parameter.minutas === '1';
  if (quiereMinutas) return doGetMinutas_(e);

  const quiereVisor = e && e.parameter && (e.parameter.callback || e.parameter.visor === '1');
  if (quiereVisor) return doGetVisor_(e);
  return doGetClasico_(e);
}

// ── OTRO DESARROLLO, RENOMBRADO (comportamiento intacto) + respel + total residuos ──
function doGetClasico_(e) {
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
    respel: readRespelSheet_(),
    // FIX (2026-09-16): faltaba devolver "Total Residuos" — ver readTotalResiduosSheet_
    // más arriba para el detalle del bug que esto causaba (% valorización en vivo de
    // Copec, que excluye Respel, nunca encontraba datos al "Cargar desde Sheets").
    totalResiduos: readTotalResiduosSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── NUEVO — VISOR DE MINUTAS: lectura vía JSONP ──
// Devuelve las filas crudas (A:E) de la pestaña "Minuta" tal cual están en
// el Sheet, para que el visor las parsee con su propia lógica de sesiones.
function doGetMinutas_(e) {
  var payload;
  try {
    var sheet = encontrarHojaMinuta_();
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 5);
    var rows = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
    payload = { rows: rows };
  } catch (err) {
    payload = { error: true, message: String(err) };
  }

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    var js = callback + "(" + JSON.stringify(payload) + ");";
    return ContentService.createTextOutput(js)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── VISOR DE TRAZABILIDAD ──

var EMPRESA_NOMBRE  = "COPEC";
var EMPRESA_COLOR   = "#175CD3";
var EMPRESA_COLOR_L = "#EFF8FF";

var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];


function doGetVisor_(e) {
  var payload;
  try {
    payload = buildPayload_();
  } catch (err) {
    payload = { error: true, message: String(err) };
  }

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    var js = callback + "(" + JSON.stringify(payload) + ");";
    return ContentService.createTextOutput(js)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_() {
  var traza = leerTrazabilidad_();
  var val   = leerValorizacion_();

  var sucursalToEmpId = {};
  Object.keys(traza.sucursales).forEach(function (empId) {
    sucursalToEmpId[traza.sucursales[empId]] = empId;
  });

  var cse   = leerCSE_(sucursalToEmpId);
  var empresas = construirEmpresas_(traza, val, cse);
  var mesesActivos = calcularMesesActivos_(traza, val, cse);

  return {
    generatedAt: new Date().toISOString(),
    EMPRESA_NOMBRE: EMPRESA_NOMBRE,
    EMPRESA_COLOR: EMPRESA_COLOR,
    EMPRESA_COLOR_L: EMPRESA_COLOR_L,
    MESES_ACTIVOS: mesesActivos,
    EMPRESAS: empresas,
    VAL_DATA: val
  };
}


// ── Lectura de hojas ──

function encontrarHoja_(candidatos) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < candidatos.length; i++) {
    var sheet = ss.getSheetByName(candidatos[i]);
    if (sheet) return sheet;
  }
  throw new Error("No se encontró ninguna hoja llamada: " + candidatos.join(" / "));
}

function getSheetRows_(candidatos) {
  var sheet = encontrarHoja_(candidatos);
  var data = sheet.getDataRange().getValues();
  var headerRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    var cell = String(data[i][0] || "").trim().toLowerCase();
    if (cell === "empresa_id") { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) {
    throw new Error("No se encontró la fila de encabezado ('empresa_id') en: " + sheet.getName());
  }

  var header = data[headerRowIdx].map(function (h) { return String(h || "").trim(); });
  var rows = data.slice(headerRowIdx + 1);
  return { header: header, rows: rows };
}

function leerTrazabilidad_() {
  var sr = getSheetRows_(SHEET_TRAZA_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxRes = h.indexOf("Residuo");
  var idxImp = h.indexOf("Importaciones");
  var docIdx = DOC_COLS.map(function (c) { return h.lastIndexOf(c); });

  var sucursales = {};
  var porEmpresaMes = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]);
    var residuo = String(r[idxRes] || "").trim();
    if (!mes || !residuo) return;

    sucursales[empId] = suc;

    var docs = {};
    DOC_COLS.forEach(function (c, i) {
      var col = docIdx[i];
      docs[c] = col === -1 ? null : normalizeInt_(r[col]);
    });

    porEmpresaMes[empId] = porEmpresaMes[empId] || {};
    porEmpresaMes[empId][mes] = porEmpresaMes[empId][mes] || [];
    porEmpresaMes[empId][mes].push({
      nombre: residuo,
      imp: idxImp === -1 ? null : normalizeInt_(r[idxImp]),
      docs: docs
    });
  });

  return { sucursales: sucursales, porEmpresaMes: porEmpresaMes };
}

function leerValorizacion_() {
  var sr = getSheetRows_(SHEET_VAL_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxTipo = h.indexOf("Tipo");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var valData = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var tipo = String(r[idxTipo] || "").trim().toLowerCase();

    valData[empId] = valData[empId] || { meses: {}, meta: {}, acumulado: {} };

    MESES.forEach(function (m, i) {
      var col = mesIdx[i];
      if (col === -1) return;
      var val = normalizePercent_(r[col]);
      if (val === null) return;
      if (tipo.indexOf("acumulado") !== -1) valData[empId].acumulado[m] = val;
      else if (tipo.indexOf("real") !== -1) valData[empId].meses[m] = val;
      else if (tipo.indexOf("meta") !== -1) valData[empId].meta[m] = val;
    });
  });

  return valData;
}

// sucursalToEmpId: mapa "nombre de sucursal" -> empresa_id real, construido desde
// Trazabilidad_Docs (la fuente de verdad). Seguimiento_CSE no trae un empresa_id
// útil en su columna A (siempre dice "Copec"), así que el cruce real es por nombre
// de sucursal — y esos nombres ya fueron normalizados en el Sheet para coincidir.
function leerCSE_(sucursalToEmpId) {
  var sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxAccion = h.indexOf("Acción CSE");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var mapAccion = {
    "Correo seguimiento": "correo",
    "Reunión seguimiento": "reunion",
    "Encuesta seguimiento": "encuesta"
  };

  var cseData = {};
  var anualData = {};

  sr.rows.forEach(function (r) {
    var sucNombre = String(r[idxSuc] || "").trim();
    if (!sucNombre) return;

    var empId = sucursalToEmpId[sucNombre];
    if (!empId) return; // sucursal que aún no existe en Trazabilidad_Docs — se ignora

    var accion = String(r[idxAccion] || "").trim();
    if (!accion) return;

    cseData[empId] = cseData[empId] || { correo: {}, reunion: {}, encuesta: {}, fechas: {} };
    anualData[empId] = anualData[empId] || {};
    anualData[empId][accion] = anualData[empId][accion] || {};

    var key = mapAccion[accion];

    MESES.forEach(function (m, i) {
      var col = mesIdx[i];
      if (col === -1) return;
      var v = normalizeSiNo_(r[col]);
      if (v === undefined) return;
      anualData[empId][accion][m] = v;
      if (key) cseData[empId][key][m] = v;
    });
  });

  return { cseData: cseData, anualData: anualData };
}


// ── Construcción del modelo para el visor ──

function construirEmpresas_(traza, val, cse) {
  var empresas = [];

  Object.keys(traza.sucursales).sort().forEach(function (empId) {
    var sucursal = traza.sucursales[empId];

    var mensual = {};
    var mesesDeEstaSucursal = Object.keys(traza.porEmpresaMes[empId] || {});
    mesesDeEstaSucursal.forEach(function (mes) {
      mensual[mes] = {
        residuos: traza.porEmpresaMes[empId][mes],
        pendiente: "",
        obs: ""
      };
    });

    var objetivos = [{ texto: "100% Trazabilidad" }];

    var valInfo = val[empId] || { meses: {}, meta: {} };
    var mesesValOrdenados = Object.keys(valInfo.meses)
      .sort(function (a, b) { return MESES.indexOf(a) - MESES.indexOf(b); });
    var ultimoMesVal = mesesValOrdenados[mesesValOrdenados.length - 1];

    var avanceVal = ultimoMesVal !== undefined ? valInfo.meses[ultimoMesVal] : null;
    var metaVal = (ultimoMesVal !== undefined && valInfo.meta[ultimoMesVal] !== undefined)
      ? valInfo.meta[ultimoMesVal] : null;

    var textoVal = metaVal !== null ? (metaVal + "% Valorización") : "Meta Valorización (sin definir)";
    objetivos.push({
      texto: textoVal,
      avance: avanceVal,
      ok: (metaVal !== null && avanceVal !== null) ? (avanceVal >= metaVal) : null
    });

    var cseInfo = cse.cseData[empId] || { correo: {}, reunion: {}, encuesta: {}, fechas: {} };
    var anualInfo = cse.anualData[empId] || {};

    empresas.push({
      id: empId,
      nombre: EMPRESA_NOMBRE,
      sucursal: sucursal,
      letra: letraFromSucursal_(sucursal),
      color: EMPRESA_COLOR,
      colorBg: EMPRESA_COLOR_L,
      logo: null,
      objetivos: objetivos,
      cse: cseInfo,
      mensual: mensual,
      anual: anualInfo
    });
  });

  return empresas;
}

function calcularMesesActivos_(traza, val, cse) {
  var maxIdx = -1;
  function scan(obj) {
    Object.keys(obj || {}).forEach(function (m) {
      var idx = MESES.indexOf(m);
      if (idx > maxIdx) maxIdx = idx;
    });
  }
  Object.keys(traza.porEmpresaMes).forEach(function (emp) { scan(traza.porEmpresaMes[emp]); });
  Object.keys(val).forEach(function (emp) { scan(val[emp].meses); scan(val[emp].meta); });
  Object.keys(cse.anualData).forEach(function (emp) {
    Object.keys(cse.anualData[emp]).forEach(function (accion) { scan(cse.anualData[emp][accion]); });
  });
  if (maxIdx < 0) return [];
  return MESES.slice(0, maxIdx + 1);
}


// ── Helpers de normalización ──

function normalizarMes_(raw) {
  var m = String(raw || "").trim();
  if (!m) return "";
  for (var i = 0; i < MESES.length; i++) {
    if (MESES[i].toLowerCase() === m.toLowerCase()) return MESES[i];
  }
  return m;
}

function normalizarSucursal_(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeInt_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  var n = Number(raw);
  return isNaN(n) ? null : n;
}

function normalizePercent_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    var pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(pct * 10) / 10;
  }
  var s = String(raw).trim();
  if (s === "") return null;
  s = s.replace("%", "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}

function normalizeSiNo_(raw) {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  var s = String(raw).trim().toUpperCase();
  if (s === "SI" || s === "SÍ") return true;
  if (s === "NO") return false;
  return undefined;
}

function letraFromSucursal_(s) {
  var stop = ["de", "la", "el", "los", "las", "del", "y"];
  var words = String(s || "").split(/\s+/).filter(function (w) {
    return w && stop.indexOf(w.toLowerCase()) === -1;
  });
  var letras = words.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  if (letras.length < 2 && s && s.length >= 2) letras = s.substring(0, 2).toUpperCase();
  return letras || "??";
}


// ── Utilidad para probar desde el editor (Ejecutar → testBuildPayload) ──
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}

// ── Utilidad para probar la lectura de Minutas desde el editor ──
// (Ejecutar → testReadMinutas, luego revisa Ver → Registros de ejecución)
function testReadMinutas() {
  var sheet = encontrarHojaMinuta_();
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 5);
  var rows = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
  Logger.log(JSON.stringify(rows.slice(0, 15), null, 2));
}

// ── Utilidad para probar el guardado de Minutas desde el editor ──
// (Ejecutar → testWriteMinutas, luego revisa Ver → Registros de ejecución)
function testWriteMinutas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fakeData = {
    sessions: [
      {
        title: "Minuta 23/06/2026",
        items: [
          { item: "Ítem de prueba (borrar después)", cumplido: true, comentario: "Comentario de prueba", acuerdos: "Acuerdo de prueba", revisado: true }
        ]
      }
    ]
  };
  writeMinutas_(ss, fakeData);
  Logger.log("Listo — revisa la hoja de Minutas.");
}

// data.filas viene del visor con esta forma:
// [{ empresaId, sucursal, accion: "Correo seguimiento"|"Reunión seguimiento",
//    valores: { Enero: true|false|null, Febrero: ..., ... } }, ...]
//
// Ubica la fila por (Sucursal, Acción CSE) usando los encabezados reales de
// la hoja (no posiciones fijas), así no importa el orden de columnas. Si no
// encuentra la fila, la crea al final. Solo escribe los meses presentes en
// "valores" — no toca el resto de la fila.
function writeCSE_(ss, data) {
  var sheet = ss.getSheetByName('👥 Seguimiento_CSE') || ss.getSheetByName('Seguimiento_CSE');
  if (!sheet) throw new Error('Hoja Seguimiento_CSE no encontrada');

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1) throw new Error('Hoja Seguimiento_CSE está vacía');

  var colA = sheet.getRange(1, 1, lastRow, 1).getValues();
  var headerRow = -1;
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0] || '').trim().toLowerCase() === 'empresa_id') { headerRow = i + 1; break; }
  }
  if (headerRow === -1) throw new Error('No se encontró la fila de encabezado ("empresa_id") en Seguimiento_CSE');

  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var idxEmpresaId = headers.indexOf('empresa_id');
  var idxSucursal = headers.indexOf('Sucursal');
  var idxAccion = headers.indexOf('Acción CSE');
  if (idxSucursal === -1 || idxAccion === -1) {
    throw new Error('Faltan columnas "Sucursal" o "Acción CSE" en Seguimiento_CSE');
  }
  var mesIdx = {};
  MESES.forEach(function (m) { mesIdx[m] = headers.indexOf(m); });

  var startRow = headerRow + 1;
  var numDataRows = Math.max(sheet.getLastRow() - startRow + 1, 0);
  var body = numDataRows > 0 ? sheet.getRange(startRow, 1, numDataRows, lastCol).getValues() : [];

  (data.filas || []).forEach(function (fila) {
    var sucursalNorm = String(fila.sucursal || '').trim().toLowerCase();
    var accionNorm = String(fila.accion || '').trim().toLowerCase();
    var rowIdx = -1;
    for (var i = 0; i < body.length; i++) {
      var suc = String(body[i][idxSucursal] || '').trim().toLowerCase();
      var acc = String(body[i][idxAccion] || '').trim().toLowerCase();
      if (suc === sucursalNorm && acc === accionNorm) { rowIdx = i; break; }
    }

    var targetRow;
    if (rowIdx !== -1) {
      targetRow = startRow + rowIdx;
    } else {
      targetRow = sheet.getLastRow() + 1;
      if (idxEmpresaId !== -1) sheet.getRange(targetRow, idxEmpresaId + 1).setValue(fila.empresaId || '');
      sheet.getRange(targetRow, idxSucursal + 1).setValue(fila.sucursal || '');
      sheet.getRange(targetRow, idxAccion + 1).setValue(fila.accion || '');
    }

    var valores = fila.valores || {};
    MESES.forEach(function (m) {
      var col = mesIdx[m];
      if (col === -1 || !(m in valores)) return;
      var v = valores[m];
      sheet.getRange(targetRow, col + 1).setValue(v === true ? 'SI' : v === false ? 'NO' : '');
    });
  });
}
