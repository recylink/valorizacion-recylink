/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de SALFA — VERSIÓN FUSIONADA
 * ============================================================
 * Este archivo reemplaza por completo el Code.gs anterior. Todo lo que ya
 * había queda 100% intacto (doPost, doGet clásico, Total Residuos, RESPEL).
 *
 * LO QUE SE AGREGA:
 *
 *  1) EL VISOR STANDALONE "Visor-de-Objetivos-SALFA" (repo aparte, GitHub
 *     Pages) — mismo mecanismo que "Visor-de-Objetivos-Abastible"
 *     (ver Code-Abastible.gs, buildLegacyPayload_/doGet): ese visor NO usa
 *     fetch() sino un <script src="...exec?callback=NOMBRE"> (JSONP), SIN
 *     ningún otro parámetro. Por eso doGet() de más abajo activa el payload
 *     del visor con solo detectar `callback` en la URL (no hace falta
 *     `?visor=1` — se deja como alias por si se quiere ser explícito, pero
 *     el visor real de Salfa llama sin él, igual que Abastible).
 *     - Sin `callback` ni `minutas=1`: doGet responde EXACTAMENTE igual
 *       que antes (doGetClasico_, usado por el visor principal
 *       valorizacion-recylink).
 *     - Incluye "Costo-Ingreso" leyendo la pestaña "Costo e Ingreso" y
 *       agregándola a cada sucursal (emp.costoIngreso). También incluye
 *       writeCostoIngreso, que el doPost original ya llamaba pero no
 *       existía en el script previo.
 *
 *  2) EL VISOR DE MINUTAS (integrado al mismo backend):
 *     - Se activa SOLO si la request trae ?minutas=1.
 *     - Lee/escribe la pestaña "Minuta" ubicando cada sesión por su fila
 *       real (no por texto de título) y detectando el orden de columnas
 *       leyendo el sub-encabezado ("Tema, Revisado, Detalle, Acuerdos,
 *       Resuelto" en este caso) — mismo motor que COPEC/PMS/Abastible.
 * ============================================================
 */

function doPost(e) {
  try {
    // Soporta tanto el POST directo (fetch, JSON en el body) como el método
    // de respaldo del visor de Minutas (formulario oculto, llega como
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
    else if (tipo === 'costoIngreso') writeCostoIngreso(ss, data);
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
// lo que eliminaba el histórico de objetivos de TODAS las sucursales/meses de Salfa
// al sincronizar. Ahora borra solo las filas cuyo empresa_id+mes coincide exactamente
// con lo que se está reinsertando.
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

// ── Total Residuos + RESPEL (lo que ya había) ──

function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// FIX (2026-09-01): antes hacía sheet.getRange(...).clearContent() sobre
// TODA la hoja de datos y solo reinsertaba lo que mandaba el cliente en esta
// sincronización — como el cliente solo envía las filas del Excel recién
// subido (no las de meses anteriores), un Excel de un solo mes borraba el
// histórico completo de Total Residuos (mismo bug ya encontrado y corregido
// en Code-Gespania.gs y Code-Euro.gs). Ahora reemplaza SOLO las filas cuya
// Sucursal+Año+Mes coincide con lo que trae el Excel — el resto de
// sucursales/años/meses no tocados por esta carga queda intacto.
//
// FIX 2 (2026-09-01): se agregó la columna Año (col. B, entre Sucursal y
// Mes) para que este borrado selectivo no confunda, por ejemplo, "Obra A |
// Enero" de 2025 con "Obra A | Enero" de 2026 (mismo mes, distinto año) —
// mismo criterio que Euro/Gespania/Socovesa.
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();

  if (data.filas && data.filas.length > 0) {
    var keys = new Set(data.filas.map(function (f) { return String(f[0]) + '|' + String(f[1]) + '|' + String(f[2]); }));
    if (lastRow >= startRow) {
      var cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
      var toDelete = [];
      cols.forEach(function (r, i) {
        var key = String(r[0]) + '|' + String(r[1]) + '|' + String(r[2]);
        if (keys.has(key)) toDelete.push(startRow + i);
      });
      toDelete.reverse().forEach(function (r) { sheet.deleteRow(r); });
    }
    var insertRow = sheet.getLastRow() + 1;
    sheet.getRange(insertRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
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

// ── Costo e Ingreso por residuo ──
// Esta función faltaba en el script original (doPost ya la llamaba pero no
// existía). Headers: Sucursal | Año | Mes | Residuo | Total KG | Costo Total |
// Ingreso Total | Neto (Ingreso - Costo).
//
// FIX (2026-09-01): mismo bug que writeTotalResiduos — reemplazaba TODA la
// hoja con solo lo que manda el cliente en esta sincronización (el Excel
// recién subido), borrando el histórico de meses anteriores. Ahora
// reemplaza solo las filas cuya Sucursal+Año+Mes coincide con lo que trae el
// Excel.
//
// FIX 2 (2026-09-01): se agregó la columna Año (col. B, entre Sucursal y
// Mes, mismo lugar que en Total Residuos) para no confundir el mismo mes de
// distintos años.
function writeCostoIngreso(ss, data) {
  var sheet = ss.getSheetByName('Costo e Ingreso');
  if (!sheet) throw new Error('Hoja "Costo e Ingreso" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Costo e Ingreso');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();

  if (data.filas && data.filas.length > 0) {
    var keys = new Set(data.filas.map(function (f) { return String(f[0]) + '|' + String(f[1]) + '|' + String(f[2]); }));
    if (lastRow >= startRow) {
      var cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
      var toDelete = [];
      cols.forEach(function (r, i) {
        var key = String(r[0]) + '|' + String(r[1]) + '|' + String(r[2]);
        if (keys.has(key)) toDelete.push(startRow + i);
      });
      toDelete.reverse().forEach(function (r) { sheet.deleteRow(r); });
    }
    var insertRow = sheet.getLastRow() + 1;
    sheet.getRange(insertRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// Lee "Costo e Ingreso" agrupado por sucursal (empresa_id) → mes → residuos[],
// con totales agregados por mes. Usada solo por el visor standalone
// (buildPayload_); writeCostoIngreso / la pestaña en sí no cambian en nada.
//
// NOTA (2026-09-01): la hoja ahora tiene columna Año (col. B), pero esta
// función sigue agrupando solo por nombre de mes (sin año) — igual
// limitación que ya tiene el resto del visor standalone (leerTrazabilidad_/
// leerValorizacion_/MESES_ACTIVOS tampoco distinguen año). Si en el futuro
// se necesita que el visor standalone muestre varios años, hay que revisar
// esas funciones también, no solo esta.
function leerCostoIngreso_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Costo e Ingreso');
  if (!sheet) return {};
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) return {};
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return {};
  var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 8).getValues();

  var result = {}; // empId -> mes -> { residuos:[...], totales:{...} }
  rows.forEach(function (r) {
    var suc = String(r[0] || '').trim();
    // r[1] = Año (no se usa aquí, ver nota arriba)
    var mes = normalizarMes_(r[2]);
    var residuo = String(r[3] || '').trim();
    if (!suc || !mes) return;
    var empId = normalizarSucursal_(suc);
    var totalKg = Number(r[4]) || 0;
    var costoTotal = Number(r[5]) || 0;
    var ingresoTotal = Number(r[6]) || 0;
    var neto = (r[7] !== '' && r[7] !== null && r[7] !== undefined) ? Number(r[7]) : (ingresoTotal - costoTotal);

    result[empId] = result[empId] || {};
    if (!result[empId][mes]) {
      result[empId][mes] = { residuos: [], totales: { totalKg: 0, costoTotal: 0, ingresoTotal: 0, neto: 0 } };
    }
    result[empId][mes].residuos.push({ residuo: residuo, totalKg: totalKg, costoTotal: costoTotal, ingresoTotal: ingresoTotal, neto: neto });
    result[empId][mes].totales.totalKg += totalKg;
    result[empId][mes].totales.costoTotal += costoTotal;
    result[empId][mes].totales.ingresoTotal += ingresoTotal;
    result[empId][mes].totales.neto += neto;
  });
  return result;
}



// ============================================================
// VISOR DE MINUTAS — lectura/escritura de la pestaña "Minuta"
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
 * [{ title, headerRow, dataStartRow, colMap:{item,cumplido,comentario,acuerdos,revisado},
 *    items:[{item, cumplido, comentario, acuerdos, revisado}, ...] }, ...]
 *
 * headerRow/dataStartRow/colMap vienen calculados por el visor a partir de la
 * misma lectura que acaba de mostrar en pantalla — no se busca por texto de
 * título y colMap dice en qué columna va cada campo (en Salfa el sub-encabezado
 * es "Tema, Revisado, Detalle, Acuerdos, Resuelto" — el visor lo detecta solo).
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
      sheet.getRange(targetRow, colMap.cumplido + 1).setValue(!!row.cumplido);
      sheet.getRange(targetRow, colMap.comentario + 1).setValue(row.comentario || '');
      sheet.getRange(targetRow, colMap.acuerdos + 1).setValue(row.acuerdos || '');
      sheet.getRange(targetRow, colMap.revisado + 1).setValue(!!row.revisado);
    }
  });
}

// El bloque de una sesión termina en la siguiente "fila de título" (columna A
// con contenido y el resto de columnas A:F vacío) o al llegar al final de la hoja.
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
// VISOR STANDALONE "Visor-de-Objetivos-SALFA" (mismo mecanismo que
// "Visor-de-Objetivos-Abastible": JSONP con ?callback=X, sin parámetros
// adicionales — ver el doGet() al final de este archivo)
// ============================================================

var EMPRESA_NOMBRE  = "Salfa";
var EMPRESA_COLOR   = "#D92D20";    // rojo — cámbialo si tienen otro color de marca
var EMPRESA_COLOR_L = "#FEF3F2";

var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];

var COMENTARIO_HEADERS_CANDIDATOS = ["Comentario por sucursal", "Comentarios", "Comentario"];


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

  var empIdsValidos = {};
  Object.keys(traza.sucursales).forEach(function (empId) { empIdsValidos[empId] = true; });

  var cse   = leerCSE_(empIdsValidos);
  var costoIngreso = leerCostoIngreso_();
  var objetivosReales = leerObjetivosReales_();
  var empresas = construirEmpresas_(traza, val, cse);
  empresas.forEach(function (e) {
    e.costoIngreso = costoIngreso[e.id] || {};
    var propios = objetivosReales[e.id] || {};
    Object.keys(propios).forEach(function (texto) {
      e.objetivos.push({ texto: texto, avance: propios[texto].avance, ok: propios[texto].ok, detalle: propios[texto].detalle });
    });
  });
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

// Lee la hoja real "🎯 Objetivos" (empresa_id | Sucursal | Mes | Objetivo |
// % cumplimiento | Detalle) y devuelve, por sucursal, el objetivo más
// reciente de cada texto distinto — excluyendo "Trazabilidad" y
// "Valorización", que ya tienen su propia tarjeta calculada aparte en el
// visor. La columna "% cumplimiento" puede traer un % ("30,00%"), un Sí/No,
// o texto libre (ej. "Cert. tratamiento: 2/2 | Factura: 0/2") — se maneja
// cada caso.
function leerObjetivosReales_() {
  var sr;
  try {
    sr = getSheetRows_(['🎯 Objetivos', 'Objetivos']);
  } catch (err) {
    return {};
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxObj = h.indexOf("Objetivo");
  var idxPct = h.indexOf("% cumplimiento");
  var idxDet = h.indexOf("Detalle");

  var result = {}; // empId -> texto -> { mesIdx, avance, ok, detalle }

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    var texto = String(r[idxObj] || "").trim();
    if (!suc || !texto) return;
    // "Trazabilidad"/"Valorización" ya tienen tarjeta propia (ver
    // construirEmpresas_). "Documentos adicionales" NO es uno de los 4
    // objetivos reales de Salfa (ver EMPRESAS.salfa.objetivos en
    // valorizacion-recylink.html: trazabilidad, sinader, kpi_costo,
    // segregacion) — es una fila que calcObjetivos() sincroniza a la hoja
    // pero que no corresponde a un objetivo definido para esta empresa, así
    // que se excluye del visor standalone (2026-09-01, a pedido del usuario).
    if (/trazabilidad/i.test(texto) || /valorizaci/i.test(texto) || /documentos/i.test(texto)) return;

    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]);
    var mesIdx = MESES.indexOf(mes);
    var rawPct = idxPct === -1 ? "" : r[idxPct];
    var detalle = idxDet === -1 ? "" : String(r[idxDet] || "").trim();
    var s = String(rawPct === null || rawPct === undefined ? "" : rawPct).trim();

    // "segregacion_anual" (calcObjetivos() en valorizacion-recylink.html)
    // escribe literalmente "OK"/"No" en esta columna (no "Sí"/"No" como el
    // resto de los tipos anuales tipo Sí/No) — sin este caso, "OK" no
    // matcheaba ni Sí/No ni un número, y como Detalle ya traía el residuo
    // (ej. "Madera"), quedaba como avance/ok null ("sin dato") aunque el
    // objetivo SÍ estaba cumplido.
    var avance = null, ok = null;
    if (/^(s[ií]|ok)$/i.test(s)) { avance = 100; ok = true; }
    else if (/^no$/i.test(s)) { avance = 0; ok = false; }
    else {
      var n = normalizePercent_(rawPct);
      if (n !== null) { avance = n; ok = n >= 100; }
      else if (s && !detalle) { detalle = s; } // texto libre en la columna % cumplimiento
    }

    result[empId] = result[empId] || {};
    var prev = result[empId][texto];
    if (!prev || mesIdx > prev.mesIdx) {
      result[empId][texto] = { mesIdx: mesIdx, avance: avance, ok: ok, detalle: detalle };
    }
  });

  return result;
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
  var idxComentario = -1;
  for (var ci = 0; ci < COMENTARIO_HEADERS_CANDIDATOS.length && idxComentario === -1; ci++) {
    idxComentario = h.indexOf(COMENTARIO_HEADERS_CANDIDATOS[ci]);
  }

  var sucursales = {};
  var porEmpresaMes = {};
  var comentariosPorEmpresaMes = {};

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

    if (idxComentario !== -1) {
      var comentario = String(r[idxComentario] || "").trim();
      if (comentario) {
        comentariosPorEmpresaMes[empId] = comentariosPorEmpresaMes[empId] || {};
        comentariosPorEmpresaMes[empId][mes] = comentariosPorEmpresaMes[empId][mes] || {};
        comentariosPorEmpresaMes[empId][mes][comentario] = true;
      }
    }
  });

  return { sucursales: sucursales, porEmpresaMes: porEmpresaMes, comentarios: comentariosPorEmpresaMes };
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

// Defensiva: la pestaña Seguimiento_CSE no existía en el doGet original —
// si no está en el Sheet, devuelve datos vacíos en vez de romper el visor.
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


// ── Construcción del modelo para el visor ──

function construirEmpresas_(traza, val, cse) {
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

    // Los 4 objetivos reales de Salfa son trazabilidad/sinader/kpi_costo/
    // segregacion (ver EMPRESAS.salfa.objetivos en valorizacion-recylink.html)
    // — NO incluyen Valorización, así que a diferencia de otros backends
    // (Abastible, Gespania) no se agrega una tarjeta sintética de
    // "% Valorización" aquí (2026-09-01, a pedido del usuario: esa tarjeta
    // aparecía sin corresponder a ninguno de sus objetivos reales). El % de
    // Valorización real sigue disponible en la pestaña "♻️ Valorización" del
    // visor (lee VAL_DATA directo), solo no se duplica como "objetivo".
    var objetivos = [{ texto: "100% Trazabilidad" }];

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

// OJO (2026-09-03): no escanear val[emp].meta acá — la fila "Meta %" puede
// traer valores en meses sin actividad real todavía (mismo bug encontrado
// en Code-Vital.gs/Code-Gespania.gs/Code-Socovesa.gs, donde syncMetas()
// repite la meta en los 12 meses del año sin importar la actividad real).
// Solo "meses" (% Real) y "acumulado" (% Acumulado) reflejan actividad real.
function calcularMesesActivos_(traza, val, cse) {
  var maxIdx = -1;
  function scan(obj) {
    Object.keys(obj || {}).forEach(function (m) {
      var idx = MESES.indexOf(m);
      if (idx > maxIdx) maxIdx = idx;
    });
  }
  Object.keys(traza.porEmpresaMes).forEach(function (emp) { scan(traza.porEmpresaMes[emp]); });
  Object.keys(val).forEach(function (emp) { scan(val[emp].meses); scan(val[emp].acumulado); });
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


// ============================================================
// DOGET FUSIONADO — despacha según el parámetro de la URL
// ============================================================

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.minutas === '1') return doGetMinutas_(e);

  // El visor standalone "Visor-de-Objetivos-SALFA" es EL MISMO archivo que
  // "Visor-de-Objetivos-Abastible" (solo cambian nombre/color/URL) — llama
  // con un <script src="...exec?callback=X"> SIN "visor=1" (ver
  // Code-Abastible.gs, doGet). Por eso cualquier request con "callback"
  // activa el payload del visor, no solo "?visor=1" (que se deja como
  // alias explícito por si algún consumidor futuro lo usa).
  if (params.visor === '1' || params.callback) return doGetVisor_(e);

  // Sin ninguno de esos parámetros: comportamiento EXACTO al que ya había
  // (usado por el visor principal valorizacion-recylink).
  return doGetClasico_(e);
}

// ── LO QUE YA HABÍA, RENOMBRADO (comportamiento intacto) ──
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
    respel: readRespelSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── Utilidades para probar desde el editor ──

// Ejecutar → testBuildPayload, luego revisa Ver → Registros de ejecución
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
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
// NOTA: ajusta headerRow/dataStartRow/colMap a una sesión real de la pestaña
// Minuta (usa testReadMinutas() para ver los números de fila y el orden real
// de columnas) antes de correrlo.
function testWriteMinutas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fakeData = {
    sessions: [
      {
        title: "Prueba",
        headerRow: 1,
        dataStartRow: 3,
        colMap: { item:0, cumplido:4, comentario:2, acuerdos:3, revisado:1 }, // orden de Salfa: Tema,Revisado,Detalle,Acuerdos,Resuelto
        items: [
          { item: "Ítem de prueba (borrar después)", cumplido: true, comentario: "Comentario de prueba", acuerdos: "Acuerdo de prueba", revisado: true }
        ]
      }
    ]
  };
  writeMinutas_(ss, fakeData);
  Logger.log("Listo — revisa la hoja de Minutas.");
}
