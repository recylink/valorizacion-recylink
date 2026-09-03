/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de CONSTRUCTORA VITAL
 * ============================================================
 * Proyecto de Apps Script nuevo — no existía ninguno previo para esta
 * empresa (Sheet: 1vcMZghsL3cpfIlnON4F7vszgwAq1g0LICE4-467WeQ8, sucursal
 * inicial: "Obra Vallenar").
 *
 * El Sheet ya usa la plantilla "moderna" (con columna Año en
 * Trazabilidad_Docs/Valorización/Objetivos/Total Residuos, pestaña
 * "Objetivos 2026" con la lista maestra de objetivos, y pestaña "Minuta")
 * — mismo formato ya usado y corregido en Code-Gespania.gs, así que este
 * archivo parte directamente de esa versión (Año-aware desde el día 1, sin
 * necesidad de "descubrir y corregir" los mismos bugs de nuevo).
 *
 * Este archivo fusiona:
 *  1) doPost/doGet clásico (usado por valorizacion-recylink.html).
 *  2) El visor standalone de Trazabilidad (?visor=1 y/o ?callback=X, con
 *     ?anio=2026 opcional) — mismo motor que Gespania/Socovesa, con
 *     "Objetivos 2026" como lista maestra y FGR comparativo (TODAS_OBRAS_FGR).
 *  3) El visor de Minutas (?minutas=1).
 *
 * Objetivos reales de Vital ("Objetivos 2026"): 100% trazabilidad · Segregar
 * al menos 3 residuos (escombro, cartón y madera) · Valorizar un 2% en peso ·
 * Cumplir normativa vigente sobre declaraciones · Conseguir ecosistema
 * dentro del marco legal.
 * ============================================================
 */

// ============================================================
// doPost — valorización / metas / trazabilidad / objetivos / total residuos / minutas
// ============================================================
function doPost(e) {
  try {
    // Soporta tanto el POST directo (fetch, JSON en el body) como el método
    // de respaldo del visor de Minutas (formulario oculto, llega como
    // e.parameter.payload).
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
    else if (tipo === 'minutas') writeMinutas_(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Hoja con columna Año (índice 3): borrado selectivo por
// empresa_id+Tipo+Año exacto — sincronizar el año en curso no debe borrar
// años anteriores que compartan el mismo Tipo ("% Real"/"% Acumulado"/
// "Meta %").
function writeValorizacion(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
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

// syncMetas() manda una fila "Meta %" POR AÑO — hay que matchear también
// por Año, no solo por empresa_id+Tipo, para no pisar la meta de un año con
// la de otro.
function writeMetas(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  data.filas.forEach(function(fila) {
    const id = fila[0];
    const anio = fila[3];
    let found = false;
    rows.forEach(function(row, i) {
      if (row[0] === id && row[2] === 'Meta %' && String(row[3]) === String(anio)) {
        sheet.getRange(startRow + i, 1, 1, fila.length).setValues([fila]);
        found = true;
      }
    });
    if (!found) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, fila.length).setValues([fila]);
    }
  });
}

// Hoja con columna Año (índice 3): borrado selectivo por
// empresa_id+Mes+Año exacto (todos los residuos de ese mes+año se
// borran/reinsertan juntos — el cliente siempre manda el set completo de
// residuos de un mes a la vez).
function writeTrazabilidad(ss, data) {
  const sheet = ss.getSheetByName('📊 Trazabilidad_Docs') || ss.getSheetByName('Trazabilidad_Docs');
  if (!sheet) throw new Error('Hoja Trazabilidad_Docs no encontrada');
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

// Hoja con columna Año (índice 3, Objetivo pasa al índice 4): borrado
// selectivo por empresa_id+Mes+Año+Objetivo exacto, para no perder
// histórico de otras sucursales/meses/años/objetivos al sincronizar.
function writeObjetivos(ss, data) {
  const sheet = ss.getSheetByName('🎯 Objetivos') || ss.getSheetByName('Objetivos');
  if (!sheet) throw new Error('Hoja Objetivos no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[3] + '|' + f[4]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2] + '|' + r[3] + '|' + r[4])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// ── Total Residuos + RESPEL ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal" o "Residuo") y devuelve el número de fila (1-indexed).
function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// Borrado selectivo por Sucursal+Año+Mes exacto (columnas A|B|C) — el
// cliente siempre manda el set completo de residuos de esa sucursal+año+mes
// a la vez, pero los demás meses/años quedan intactos.
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow && data.filas && data.filas.length > 0) {
    var cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues(); // Sucursal|Año|Mes
    var keys = new Set(data.filas.map(function (f) { return String(f[0]) + '|' + String(f[1]) + '|' + String(f[2]); }));
    var toDelete = [];
    cols.forEach(function (r, i) {
      var key = String(r[0]) + '|' + String(r[1]) + '|' + String(r[2]);
      if (keys.has(key)) toDelete.push(startRow + i);
    });
    toDelete.reverse().forEach(function (r) { sheet.deleteRow(r); });
  }
  if (data.filas && data.filas.length > 0) {
    var insertRow = sheet.getLastRow() + 1;
    sheet.getRange(insertRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// Lee "Total Residuos" de vuelta para que valorizacion-recylink.html pueda
// calcular un % Acumulado ponderado por kg/m3 reales (ver getAcumReal_ en
// el cliente) en vez de la aproximación cruda que promedia %s sin peso real.
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
  return data.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
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


// ============================================================
// VISOR DE MINUTAS — lectura/escritura de la pestaña "Minuta"
// ============================================================

var SHEET_MINUTA_CANDIDATOS = ['Minuta', 'Minuta ', '📝 Minuta'];

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
 * [{ title, headerRow, dataStartRow, colMap:{item,cumplido,comentario,acuerdos,revisado},
 *    items:[{item, cumplido, comentario, acuerdos, revisado}, ...] }, ...]
 *
 * headerRow/dataStartRow/colMap vienen calculados por el visor a partir de
 * la misma lectura que acaba de mostrar en pantalla — no se busca por texto
 * de título; colMap dice en qué columna va cada campo (en Vital el
 * sub-encabezado es "Tema, Revisado, Detalle, Acuerdos, Resuelto" — el
 * visor lo detecta solo).
 */
function writeMinutas_(ss, data) {
  var sheet = encontrarHojaMinuta_();

  (data.sessions || []).forEach(function (session) {
    if (!session.headerRow) return; // sesión sin referencia de fila, se omite por seguridad
    var dataStartRow = session.dataStartRow || (session.headerRow + 1);
    var colMap = session.colMap || { item:0, cumplido:1, comentario:2, acuerdos:3, revisado:4 };

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
      sheet.getRange(targetRow, colMap.item + 1).setValue(row.item || '');
      if (colMap.cumplido !== undefined && colMap.cumplido !== null) {
        sheet.getRange(targetRow, colMap.cumplido + 1).setValue(!!row.cumplido);
      }
      if (colMap.comentario !== undefined && colMap.comentario !== null) {
        sheet.getRange(targetRow, colMap.comentario + 1).setValue(row.comentario || '');
      }
      if (colMap.acuerdos !== undefined && colMap.acuerdos !== null) {
        sheet.getRange(targetRow, colMap.acuerdos + 1).setValue(row.acuerdos || '');
      }
      if (colMap.revisado !== undefined && colMap.revisado !== null) {
        sheet.getRange(targetRow, colMap.revisado + 1).setValue(!!row.revisado);
      }
    }
  });
}

// El bloque de una sesión termina en la siguiente "fila de título" (columna
// A con contenido y el resto de columnas A:F vacío) o al llegar al final de
// la hoja.
function buscarFinBloqueMinuta_(sheet, fromRow) {
  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(Math.max(sheet.getLastColumn(), 5), 6);
  for (var r = fromRow; r <= lastRow; r++) {
    var vals = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    if (esFilaDeTitulo_(vals)) return r;
  }
  return lastRow + 1;
}
function esFilaDeTitulo_(vals) {
  if (vals[0] === '' || vals[0] === null) return false;
  for (var i = 1; i < vals.length; i++) {
    if (vals[i] !== '' && vals[i] !== null) return false; // false/0 sí cuentan como "con contenido"
  }
  return true;
}

// Devuelve las filas crudas (A:F) de la pestaña Minuta vía JSONP, para que
// el visor las parsee con su propia lógica de sesiones.
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


// ============================================================
// VISOR DE TRAZABILIDAD (?visor=1 y/o ?callback=X, ?anio=2026 opcional)
// ============================================================

var EMPRESA_NOMBRE  = "Constructora Vital";
var EMPRESA_COLOR   = "#0E9384";
var EMPRESA_COLOR_L = "#F0FDF9";

var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];
var SHEET_OBJ_CANDIDATOS   = ['🎯 Objetivos', 'Objetivos'];
var SHEET_OBJMAESTRO_CANDIDATOS = ['Objetivos 2026'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];

var COMENTARIO_HEADERS_CANDIDATOS = ["Comentario por sucursal", "Comentarios", "Comentario"];


function doGetVisor_(e) {
  var payload;
  try {
    var anioParam = e && e.parameter && e.parameter.anio;
    payload = buildPayload_(anioParam);
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

// buildPayload_ recibe (opcionalmente) el año pedido por el visor (?anio=2026)
// y filtra Trazabilidad/Valorización/Objetivos-mensuales a ESE año exacto.
// Las obras (sucursales) del sidebar solo listan las que tienen datos en el
// año elegido; la pestaña FGR (TODAS_OBRAS_FGR) siempre muestra TODAS las
// obras sin importar el año. Las filas "Anual" de Objetivos nunca se
// filtran por año.
function buildPayload_(anioParam) {
  var aniosDisponibles = listarAniosDisponibles_();
  var anioSeleccionado = (anioParam && aniosDisponibles.indexOf(String(anioParam)) !== -1)
    ? String(anioParam)
    : aniosDisponibles[aniosDisponibles.length - 1];

  var traza = leerTrazabilidad_(anioSeleccionado);
  var val   = leerValorizacion_(anioSeleccionado);

  var empIdsValidos = {};
  Object.keys(traza.sucursales).forEach(function (empId) { empIdsValidos[empId] = true; });

  var cse   = leerCSE_(empIdsValidos);
  var objetivosPorEmpresa = leerObjetivos_(anioSeleccionado);
  var objetivosMaestro = leerObjetivosMaestro_();
  var totalResiduosPorEmpresa = leerTotalResiduos_(); // pestaña FGR — historico, no se filtra por año
  var empresas = construirEmpresas_(traza, val, cse, objetivosPorEmpresa, objetivosMaestro, totalResiduosPorEmpresa);
  var mesesActivos = calcularMesesActivos_(traza, val, cse);

  var todasLasObrasFgr = Object.keys(traza.todasLasSucursales).sort().map(function (empId) {
    return {
      id: empId,
      sucursal: traza.todasLasSucursales[empId],
      fgr: construirFgrInfo_(empId, totalResiduosPorEmpresa)
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    EMPRESA_NOMBRE: EMPRESA_NOMBRE,
    EMPRESA_COLOR: EMPRESA_COLOR,
    EMPRESA_COLOR_L: EMPRESA_COLOR_L,
    MESES_ACTIVOS: mesesActivos,
    ANIOS_DISPONIBLES: aniosDisponibles,
    ANIO_SELECCIONADO: anioSeleccionado,
    EMPRESAS: empresas,
    TODAS_OBRAS_FGR: todasLasObrasFgr,
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

// Escanea la columna "Año" de Trazabilidad_Docs/Valorización/Objetivos y
// devuelve la lista de años con datos, ordenada ascendente. Si ninguna fila
// tiene Año todavía, devuelve el año actual como única opción.
function listarAniosDisponibles_() {
  var anios = {};
  function escanear(candidatos) {
    var sr;
    try { sr = getSheetRows_(candidatos); } catch (err) { return; }
    var idxAnio = sr.header.indexOf('Año');
    if (idxAnio === -1) return;
    sr.rows.forEach(function (r) {
      var a = String(r[idxAnio] || '').trim();
      if (a) anios[a] = true;
    });
  }
  escanear(SHEET_TRAZA_CANDIDATOS);
  escanear(SHEET_VAL_CANDIDATOS);
  escanear(SHEET_OBJ_CANDIDATOS);
  var lista = Object.keys(anios).sort();
  return lista.length ? lista : [String(new Date().getFullYear())];
}

// targetAnio: si se pasa, filtra las filas mensuales a ese año exacto (fila
// sin Año se asume del año actual). Las obras (sucursales) se guardan en 2
// mapas: "todasLasSucursales" (sin filtro, para la pestaña FGR) y
// "sucursales" (filtrado por año, para el sidebar/resto del visor).
function leerTrazabilidad_(targetAnio) {
  var sr = getSheetRows_(SHEET_TRAZA_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxAnio = h.indexOf("Año");
  var idxRes = h.indexOf("Residuo");
  var idxImp = h.indexOf("Importaciones");
  var docIdx = DOC_COLS.map(function (c) { return h.lastIndexOf(c); });
  var idxComentario = -1;
  for (var ci = 0; ci < COMENTARIO_HEADERS_CANDIDATOS.length && idxComentario === -1; ci++) {
    idxComentario = h.indexOf(COMENTARIO_HEADERS_CANDIDATOS[ci]);
  }

  var sucursales = {};          // solo obras con datos en targetAnio (sidebar)
  var todasLasSucursales = {};  // TODAS las obras, sin filtro de año (pestaña FGR)
  var porEmpresaMes = {};
  var comentariosPorEmpresaMes = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]);
    var residuo = String(r[idxRes] || "").trim();
    if (!mes || !residuo) return;

    todasLasSucursales[empId] = suc;

    var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
    if (!anioFila) anioFila = String(new Date().getFullYear());
    if (targetAnio && anioFila !== targetAnio) return;

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

    if (idxComentario !== -1) {
      var comentario = String(r[idxComentario] || "").trim();
      if (comentario) {
        comentariosPorEmpresaMes[empId] = comentariosPorEmpresaMes[empId] || {};
        comentariosPorEmpresaMes[empId][mes] = comentariosPorEmpresaMes[empId][mes] || {};
        comentariosPorEmpresaMes[empId][mes][comentario] = true;
      }
    }
  });

  return { sucursales: sucursales, todasLasSucursales: todasLasSucursales, porEmpresaMes: porEmpresaMes, comentarios: comentariosPorEmpresaMes };
}

function leerValorizacion_(targetAnio) {
  var sr = getSheetRows_(SHEET_VAL_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxTipo = h.indexOf("Tipo");
  var idxAnio = h.indexOf("Año");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var valData = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var tipo = String(r[idxTipo] || "").trim().toLowerCase();

    var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
    if (!anioFila) anioFila = String(new Date().getFullYear());
    if (targetAnio && anioFila !== targetAnio) return;

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

// Defensiva: si la pestaña Seguimiento_CSE no está o no tiene el formato
// esperado, devuelve datos vacíos en vez de romper el visor.
function leerCSE_(empIdsValidos) {
  var sr;
  try {
    sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  } catch (err) {
    return { cseData: {}, anualData: {} };
  }
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

    var empId = normalizarSucursal_(sucNombre);
    if (!empIdsValidos[empId]) return;

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

// ── Lectura real de la hoja "🎯 Objetivos" ──
// Devuelve { empId: [ {texto, avance, ok, meta, detalle}, ... ] }
// - Filas "Anual" mandan sobre las filas mensuales para ese texto (ok/avance
//   fijos según "OK"/"No").
// - Filas mensuales (sin fila Anual para ese texto) usan el % de la última
//   fila mensual disponible (más reciente).
// targetAnio: filtra las filas MENSUALES a ese año exacto (fila sin Año se
// asume del año actual). Las filas "Anual" NUNCA se filtran por año.
function leerObjetivos_(targetAnio) {
  var sr;
  try {
    sr = getSheetRows_(SHEET_OBJ_CANDIDATOS);
  } catch (err) {
    return {};
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxAnio = h.indexOf("Año");
  var idxObj = h.indexOf("Objetivo");
  var idxPct = h.indexOf("% cumplimiento");
  var idxDet = h.indexOf("Detalle");

  var objByEmp = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var mes = String(r[idxMes] || "").trim();
    var texto = String(r[idxObj] || "").trim();
    if (!texto) return;

    if (mes.toLowerCase() !== "anual") {
      var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
      if (!anioFila) anioFila = String(new Date().getFullYear());
      if (targetAnio && anioFila !== targetAnio) return;
    }

    var valorRaw = idxPct === -1 ? null : r[idxPct];
    var detalle = idxDet === -1 ? "" : String(r[idxDet] || "").trim();

    objByEmp[empId] = objByEmp[empId] || {};
    var claveTexto = texto.toLowerCase();
    if (!objByEmp[empId][claveTexto]) {
      objByEmp[empId][claveTexto] = { texto: texto, avance: null, ok: null, meta: 100, detalle: "" };
    }
    var entry = objByEmp[empId][claveTexto];

    if (mes.toLowerCase() === "anual") {
      var valorStr = String(valorRaw || "").trim();
      // Se considera cumplido cualquier valor no vacío que no sea
      // explícitamente "No" (la planilla no siempre usa el literal "OK",
      // a veces indica el cumplimiento con un conteo, ej. "2 retiros").
      entry.ok = valorStr !== "" && !/^no$/i.test(valorStr);
      entry.avance = entry.ok ? 100 : 0;
      entry.detalle = detalle || (/^ok$/i.test(valorStr) ? entry.detalle : valorStr);
      entry._anualSeen = true;
    } else if (!entry._anualSeen) {
      var num = parsePctCumplimiento_(valorRaw);
      var idxMesNum = MESES.indexOf(normalizarMes_(mes));
      if (num !== null && (entry._lastMonthIdx === undefined || idxMesNum > entry._lastMonthIdx)) {
        entry.avance = num;
        entry.ok = num >= 100;
        entry.detalle = detalle; // siempre el del mes más reciente, aunque venga vacío
        entry._lastMonthIdx = idxMesNum;
      }
    }
  });

  var result = {};
  Object.keys(objByEmp).forEach(function (empId) {
    result[empId] = Object.keys(objByEmp[empId]).map(function (clave) {
      var o = objByEmp[empId][clave];
      delete o._anualSeen;
      delete o._lastMonthIdx;
      return o;
    });
  });
  return result;
}

// ── Lista maestra de objetivos desde la pestaña "Objetivos 2026" ──
// Esa pestaña trae una sola fila con un texto de objetivo por columna. Se
// usa para que TODOS los objetivos definidos aparezcan en el visor por cada
// obra, aunque esa obra aún no tenga fila de avance cargada en
// "🎯 Objetivos" (en ese caso avance queda en null → el front lo muestra
// como "Sin dato").
function leerObjetivosMaestro_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = null;
  for (var i = 0; i < SHEET_OBJMAESTRO_CANDIDATOS.length; i++) {
    sheet = ss.getSheetByName(SHEET_OBJMAESTRO_CANDIDATOS[i]);
    if (sheet) break;
  }
  if (!sheet) return [];

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];

  var maxScan = Math.min(sheet.getLastRow(), 5);
  for (var r = 1; r <= maxScan; r++) {
    var fila = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    var textos = fila.map(function (v) { return String(v || "").trim(); }).filter(function (v) { return v !== ""; });
    if (textos.length > 0) return textos;
  }
  return [];
}

// ── Pestaña FGR del visor: lectura de la hoja "Total Residuos" para sumar
// el total de m3 registrados por obra y encontrar el mes+año del primer y
// último registro de residuos. El FGR en sí (m3/m2 construidos) NO se
// calcula acá — el visor lo calcula en el navegador, porque los m2
// construidos son un dato manual que hoy no vive en ningún Sheet.
function leerTotalResiduos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) return {};
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) return {};
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < headerRow + 1) return {};

  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h || '').trim(); });
  var idxSuc = headers.indexOf('Sucursal');
  var idxAnio = headers.indexOf('Año');
  var idxMes = headers.indexOf('Mes');
  var idxM3 = headers.indexOf('Total M3');
  if (idxSuc === -1 || idxM3 === -1) return {};

  var data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
  var result = {};
  data.forEach(function (r) {
    var suc = String(r[idxSuc] || '').trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    if (!result[empId]) result[empId] = { totalM3: 0, registros: [] };

    var m3 = parseFloat(r[idxM3]) || 0;
    result[empId].totalM3 += m3;

    var anio = idxAnio === -1 ? '' : String(r[idxAnio] || '').trim();
    var mesNorm = idxMes === -1 ? '' : normalizarMes_(r[idxMes]);
    var idxMesNum = mesNorm ? MESES.indexOf(mesNorm) : -1;
    if (anio && idxMesNum !== -1) {
      result[empId].registros.push({ anio: anio, mes: mesNorm, orden: parseInt(anio, 10) * 100 + (idxMesNum + 1) });
    }
  });
  return result;
}

// Arma el objeto "fgr" ({totalM3, primerRegistro, ultimoRegistro}) de una
// obra a partir de lo que devolvió leerTotalResiduos_(). Compartido entre
// construirEmpresas_() (una obra a la vez) y buildPayload_() (para armar
// TODAS_OBRAS_FGR, sin filtro de año).
function construirFgrInfo_(empId, totalResiduosPorEmpresa) {
  var trInfo = (totalResiduosPorEmpresa || {})[empId] || { totalM3: 0, registros: [] };
  var registrosOrdenados = trInfo.registros.slice().sort(function (a, b) { return a.orden - b.orden; });
  var primerReg = registrosOrdenados[0] || null;
  var ultimoReg = registrosOrdenados[registrosOrdenados.length - 1] || null;
  return {
    totalM3: Math.round(trInfo.totalM3 * 100) / 100,
    primerRegistro: primerReg ? (primerReg.mes + ' ' + primerReg.anio) : null,
    ultimoRegistro: ultimoReg ? (ultimoReg.mes + ' ' + ultimoReg.anio) : null
  };
}


// ── Construcción del modelo para el visor ──

function construirEmpresas_(traza, val, cse, objetivosPorEmpresa, objetivosMaestro, totalResiduosPorEmpresa) {
  var empresas = [];

  Object.keys(traza.sucursales).sort().forEach(function (empId) {
    var sucursal = traza.sucursales[empId];

    var mensual = {};
    var mesesDeEstaSucursal = Object.keys(traza.porEmpresaMes[empId] || {});
    var comentariosEmp = traza.comentarios[empId] || {};
    mesesDeEstaSucursal.forEach(function (mes) {
      var comentariosMes = comentariosEmp[mes] || {};
      mensual[mes] = {
        residuos: traza.porEmpresaMes[empId][mes],
        pendiente: "",
        obs: Object.keys(comentariosMes).join(" · ")
      };
    });

    // % Valorización acumulada vs. Meta % (hoja ♻️ Valorización) — se
    // calcula ANTES de armar la lista de objetivos porque "Valorizar un 2%
    // en peso" (texto de "Objetivos 2026") debe mostrar ESTE mismo número,
    // no una fila de "🎯 Objetivos" que nunca existe (ese objetivo se mide
    // vía Meta %/% Acumulado, no vía una fila de Objetivos con ese texto
    // exacto — mismo criterio que Gespania).
    var valInfo = val[empId] || { meses: {}, meta: {}, acumulado: {} };
    var mesesValOrdenados = Object.keys(valInfo.meses)
      .sort(function (a, b) { return MESES.indexOf(a) - MESES.indexOf(b); });
    var ultimoMesVal = mesesValOrdenados[mesesValOrdenados.length - 1];

    var mesesAcumOrdenados = Object.keys(valInfo.acumulado || {})
      .sort(function (a, b) { return MESES.indexOf(a) - MESES.indexOf(b); });
    var ultimoMesAcum = mesesAcumOrdenados[mesesAcumOrdenados.length - 1];

    var avanceVal = ultimoMesAcum !== undefined
      ? valInfo.acumulado[ultimoMesAcum]
      : (ultimoMesVal !== undefined ? valInfo.meses[ultimoMesVal] : null);

    var metaVal = (ultimoMesVal !== undefined && valInfo.meta[ultimoMesVal] !== undefined)
      ? valInfo.meta[ultimoMesVal] : null;

    // Cualquier texto de "Objetivos 2026" con forma "valorizar (un) N% ..."
    // se trata como el objetivo de % de valorización global (ej. Vital:
    // "Valorizar un 2% en peso"). Deliberadamente NO matchea textos tipo
    // "Valorizar fierro, madera, cartón" (sin número de %) — esos son
    // objetivos de residuos específicos, no de % global.
    var esObjetivoValorizacionPct_ = function (texto) {
      return /valorizar\s+(un\s+)?\d+%/i.test(texto);
    };

    var objetivos = [{ texto: "100% Trazabilidad" }]; // el front-end la recalcula en vivo
    var yaSeMostroValorizacionPct = false;

    var objRealesPorClave = {};
    (objetivosPorEmpresa[empId] || []).forEach(function (o) {
      objRealesPorClave[o.texto.toLowerCase()] = o;
    });

    (objetivosMaestro || []).forEach(function (textoMaestro) {
      if (/trazabilidad/i.test(textoMaestro)) return; // ya está cubierta arriba
      if (esObjetivoValorizacionPct_(textoMaestro)) {
        // El front-end (renderObjetivos()) muestra "avance + '%'" tal cual y
        // asume meta=100 para el resto de los objetivos (FGR, SINADER,
        // trazabilidad, segregación — donde avance YA es un % de
        // cumplimiento 0-100). Para no mostrar el % de valorización crudo
        // (ej. "0.7%" cuando la meta es 2%, que se leería como que falta un
        // montón en vez de que ya se logró un 35% de la meta), se convierte
        // acá mismo a la misma escala: avance = % de la meta ya alcanzado
        // (0-100, tope 100), meta = 100.
        var pctDeMeta = (metaVal !== null && metaVal > 0 && avanceVal !== null)
          ? Math.min(100, Math.round((avanceVal / metaVal) * 100))
          : null;
        objetivos.push({
          texto: textoMaestro,
          avance: pctDeMeta,
          ok: (metaVal !== null && avanceVal !== null) ? (avanceVal >= metaVal) : null,
          meta: 100,
          detalle: (metaVal !== null && avanceVal !== null)
            ? (avanceVal + '% acumulado de ' + metaVal + '% meta')
            : ""
        });
        yaSeMostroValorizacionPct = true;
        return;
      }
      var real = objRealesPorClave[textoMaestro.toLowerCase()];
      if (real) {
        objetivos.push({
          texto: textoMaestro,
          avance: real.avance,
          ok: real.ok,
          meta: real.meta,
          detalle: real.detalle
        });
      } else {
        objetivos.push({ texto: textoMaestro, avance: null, ok: null, meta: 100, detalle: "" });
      }
    });

    // Si "Objetivos 2026" no tiene datos (hoja vacía o no encontrada), al
    // menos se agregan los objetivos reales que sí existan para esta obra
    // en "🎯 Objetivos" y que no se hayan agregado ya arriba.
    if (!objetivosMaestro || objetivosMaestro.length === 0) {
      (objetivosPorEmpresa[empId] || []).forEach(function (o) {
        if (/trazabilidad/i.test(o.texto)) return;
        objetivos.push(o);
      });
    }

    // Tarjeta "X% Valorización" aparte: solo si "Objetivos 2026" no traía ya
    // un texto de % de valorización (Vital sí lo trae — "Valorizar un 2% en
    // peso" — así que esto no se duplica).
    if (!yaSeMostroValorizacionPct) {
      var textoVal = metaVal !== null ? (metaVal + "% Valorización") : "Meta Valorización (sin definir)";
      objetivos.push({
        texto: textoVal,
        avance: avanceVal,
        ok: (metaVal !== null && avanceVal !== null) ? (avanceVal >= metaVal) : null
      });
    }

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
      anual: anualInfo,
      fgr: construirFgrInfo_(empId, totalResiduosPorEmpresa)
    });
  });

  return empresas;
}

// OJO (2026-09-03, FIX 2): no escanear val[emp].meta NI val[emp].acumulado
// acá. "meta" repite el mismo valor en los 12 meses del año sin importar
// actividad real. "% Acumulado" es ACUMULATIVO por diseño (getAcum() en el
// cliente): una vez que hay actividad en un mes, el acumulado se sincroniza
// para TODOS los meses siguientes (el valor "se arrastra" — no vuelve a
// null aunque ese mes puntual no tenga nada nuevo), porque autoSync()
// recorre los 12 meses del año llamando getAcum() para cada uno. Solo
// "meses" (% Real, via getPct — null si NO hay valMatrix para ese mes
// exacto) refleja de verdad "hubo actividad ESTE mes".
function calcularMesesActivos_(traza, val, cse) {
  var maxIdx = -1;
  function scan(obj) {
    Object.keys(obj || {}).forEach(function (m) {
      var idx = MESES.indexOf(m);
      if (idx > maxIdx) maxIdx = idx;
    });
  }
  Object.keys(traza.porEmpresaMes).forEach(function (emp) { scan(traza.porEmpresaMes[emp]); });
  Object.keys(val).forEach(function (emp) { scan(val[emp].meses); });
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

// Para la columna "% cumplimiento" de la hoja "🎯 Objetivos": si la celda
// está formateada como porcentaje en Sheets, getValues() la entrega como
// fracción numérica (ej: 1 = 100%, 0.667 = 66.7%), NO como texto "100,00%".
// Si en cambio llega como texto (celda sin formato %), se parsea con la
// misma lógica que normalizePercent_.
function parsePctCumplimiento_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    var pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(pct * 10) / 10;
  }
  var s = String(raw).trim().replace("%", "").replace(",", ".");
  if (s === "") return null;
  var n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}


// ============================================================
// DOGET FUSIONADO — despacha según el parámetro de la URL
// ============================================================

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.minutas === '1') return doGetMinutas_(e);

  const quiereVisor = params.callback || params.visor === '1';
  if (quiereVisor) return doGetVisor_(e);

  // Sin esos parámetros: usado por valorizacion-recylink.html.
  return doGetClasico_(e);
}

// ── Usado por valorizacion-recylink.html ──
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
    totalResiduos: readTotalResiduosSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── Utilidades para probar desde el editor ──

// Ejecutar → testBuildPayload, luego revisa Ver → Registros de ejecución
function testBuildPayload() {
  var payload = buildPayload_(null);
  Logger.log(JSON.stringify(payload, null, 2).slice(0, 4000));
}

// Ejecutar → testReadMinutas, luego revisa Ver → Registros de ejecución
function testReadMinutas() {
  var sheet = encontrarHojaMinuta_();
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 5);
  var rows = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
  Logger.log(JSON.stringify(rows.slice(0, 40), null, 2));
}

// Ejecutar → testWriteMinutas, luego revisa Ver → Registros de ejecución.
// NOTA: ajusta headerRow/dataStartRow/colMap a una sesión real de la
// pestaña Minuta (usa testReadMinutas() para ver los números de fila) antes
// de correrlo. En Vital el sub-encabezado es "Tema, Revisado, Detalle,
// Acuerdos, Resuelto" (5 columnas).
function testWriteMinutas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fakeData = {
    sessions: [
      {
        title: "Prueba",
        headerRow: 1,
        dataStartRow: 3,
        colMap: { item:0, revisado:1, comentario:2, acuerdos:3, cumplido:4 }, // orden de Vital: Tema,Revisado,Detalle,Acuerdos,Resuelto
        items: [
          { item: "Ítem de prueba (borrar después)", cumplido: true, comentario: "Comentario de prueba", acuerdos: "Acuerdo de prueba", revisado: true }
        ]
      }
    ]
  };
  writeMinutas_(ss, fakeData);
  Logger.log("Listo — revisa la hoja de Minutas.");
}
