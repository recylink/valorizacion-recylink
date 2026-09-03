/**
 * ============================================================
 * RECYLINK · Apps Script del VISOR STANDALONE de ANDO
 * ============================================================
 * IMPORTANTE: este archivo es DISTINTO de Code-Ando.gs. Son 2 proyectos de
 * Apps Script separados, con URLs de despliegue distintas:
 *   - Code-Ando.gs        → usado por valorizacion-recylink.html (visor principal)
 *   - Code-Ando-Visor.gs  → usado por el repo "Visor-de-Objetivos-ANDO"
 *     (GitHub Pages, standalone), vía DATA_SOURCE_URL en su index.html.
 * El usuario pegó el Code.gs real de este segundo proyecto en el chat
 * (2026-09-03) porque no existía copia en este repo — se guarda acá para
 * tener historial, igual que los demás Code-*.gs.
 *
 * Cambios aplicados sobre lo que pegó el usuario (a pedido: "todo lo que
 * hicimos para Vital"):
 *
 *  1) FIX calcularMesesActivos_ (mismo bug ya encontrado y corregido en
 *     Code-Vital.gs/Code-Gespania.gs/Code-Socovesa.gs/Code-Salfa.gs): no
 *     escanear val[emp].meta ni val[emp].acumulado — "Meta %" repite el
 *     mismo valor en los 12 meses del año, y "% Acumulado" es acumulativo
 *     por diseño (una vez que hay actividad en un mes, sigue siendo un
 *     valor válido para todos los meses siguientes) — ambas cosas hacían
 *     que el selector de mes del visor siempre saltara a Diciembre en vez
 *     de al último mes con datos reales. Solo "meses" (% Real) refleja de
 *     verdad "hubo actividad ESTE mes".
 *
 *  2) NUEVO: Seguimiento CSE editable — se agregó writeCSE_() (mismo
 *     patrón ya usado en Code-Vital.gs/Code-Euro.gs: match por
 *     empresa_id+"Acción CSE", crea la fila si no existe / actualiza si ya
 *     existe) y se conectó en doPost para tipo:'cse'. Necesario para que
 *     el Seguimiento CSE clickeable que se agregó en
 *     Visor-de-Objetivos-ANDO/index.html pueda guardar.
 *
 *  3) FIX writeValorizacion (2026-09-03, a pedido del usuario): borraba TODA
 *     fila que coincidiera con el empresa_id, sin mirar "Tipo" — sincronizar
 *     cualquier cosa (ej. solo "% Real" de un mes nuevo) borraba de paso
 *     "% Acumulado" y "Meta %" de la misma sucursal. Mismo tipo de bug de
 *     integridad ya encontrado y corregido en Code-Gespania.gs/
 *     Code-Socovesa.gs/Code-Salfa.gs/Code-Euro.gs (ver CONTEXTO-PROYECTO.md,
 *     "bugs de clave de borrado"). Se corrigió a empresa_id+Tipo (ANDO no
 *     tiene columna Año en esta hoja, así que no hace falta en la clave).
 *     writeTrazabilidad/writeObjetivos NO tenían este problema — ya borraban
 *     por empresa_id+Mes, no por empresa_id solo.
 * ============================================================
 */


// ============================================================
// 1) DOPOST — OTRO DESARROLLO, SIN CAMBIOS (salvo el nuevo tipo:'cse')
// ============================================================

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
    else if (tipo === 'cse') writeCSE_(ss, data); // NUEVO — Seguimiento CSE editable
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

// FIX (2026-09-03, a pedido del usuario): antes borraba TODA fila que
// coincidiera con el empresa_id, sin mirar "Tipo" — sincronizar cualquier
// cosa (ej. solo "% Real" de un mes nuevo) borraba de paso "% Acumulado" y
// "Meta %" de la misma sucursal, aunque no vinieran en data.filas. Mismo
// tipo de bug ya encontrado y corregido en Code-Gespania.gs/
// Code-Socovesa.gs/Code-Salfa.gs/Code-Euro.gs.
//
// FIX 2 (2026-09-03, a pedido del usuario: "integrar el año en el sheets"):
// esta hoja YA tenía el header "Año" (columna D, copiado de la plantilla
// Euro/Gespania/Vital), pero como el cliente nunca lo mandaba, la fila
// escrita [empresa_id,Sucursal,Tipo,Enero..Diciembre] (15 campos) quedaba
// corrida bajo un header de 16 celdas — "Enero" caía bajo el header "Año",
// "Febrero" bajo "Enero", etc. Ahora que EMPRESAS_VAL_CON_ANIO incluye
// 'ando', el cliente manda [empresa_id,Sucursal,Tipo,Año,Enero..Diciembre]
// (16 campos) — se agrega el Año a la clave de borrado (empresa_id+Tipo+Año,
// mismo patrón que Code-Euro.gs) para no pisar años distintos entre sí.
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

// FIX (2026-09-03): syncMetas() manda una fila "Meta %" POR AÑO (ver
// EMPRESAS_VAL_CON_ANIO en el cliente) — sin el Año en la comparación, la
// 2da fila (ej. 2026) sobreescribiría la de OTRO año (ej. 2025) que ya
// había matcheado con la 1ra, perdiendo esa meta. Mismo fix ya aplicado en
// Code-Euro.gs/Code-Gespania.gs.
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

// FIX (2026-09-03, a pedido del usuario: "integrar el año en el sheets"):
// mismo caso que writeValorizacion — la hoja ya tenía el header "Año"
// (columna D) sin usar, corriendo Residuo/Código LER/etc. una columna. Ahora
// que EMPRESAS_OBJ_CON_ANIO... (ver nota en el cliente) el cliente manda
// [empresa_id,Sucursal,Mes,Año,Residuo,...] — se agrega el Año a la clave de
// borrado (empresa_id+Mes+Año) para no pisar el mismo mes de otro año.
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

// FIX (2026-09-03, a pedido del usuario: "integrar el año en el sheets"):
// el header de esta hoja YA tenía las 7 celdas [empresa_id,Sucursal,Mes,
// Año,Objetivo,"% cumplimiento",Detalle] (copiado de la plantilla Euro/
// Gespania/Vital), pero como el cliente solo mandaba 6 campos sin Año
// [empresa_id,Sucursal,Mes,texto,estado,detalle], todo quedaba corrido una
// columna: el texto del objetivo caía bajo el header "Año", el estado bajo
// "Objetivo" y el detalle bajo "% cumplimiento" (ver leerObjetivosReales_,
// que hasta ahora compensaba leyendo por esos nombres "corridos"). Ahora que
// EMPRESAS_OBJ_CON_ANIO incluye 'ando', el cliente manda
// [empresa_id,Sucursal,Mes,Año,texto,estado,detalle] (7 campos, alineados
// con el header real) — se agrega el Año a la clave de borrado
// (empresa_id+Mes+Año+Objetivo, mismo patrón que Code-Euro.gs) para no
// pisar el mismo objetivo+mes de otro año.
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

function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var numCols = 7;
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

// Dump genérico de "👥 Seguimiento_CSE" para la app principal (doGetClasico_),
// mismo formato que readCseSheet_() en Code-Euro.gs — filas como objetos
// {empresa_id, Sucursal, "Acción CSE", Enero...Diciembre}. Agregado
// 2026-09-03, a pedido del usuario: para que calcObjetivos() en la app
// principal pueda auto-completar "Generar sensibilización..." a partir de la
// acción "Charlas" (mismo mecanismo ya usado en Euro con "Visita a terreno").
function readCseSheetClasico_() {
  var sr;
  try {
    sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  } catch (err) {
    return [];
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  return sr.rows.filter(function (r) { return idxSuc !== -1 && String(r[idxSuc] || "").trim() !== ""; }).map(function (r) {
    var obj = {};
    h.forEach(function (hh, i) { if (hh) obj[hh] = r[i]; });
    return obj;
  });
}

// NUEVO — Seguimiento CSE editable. Guarda in-place (por empresa_id +
// "Acción CSE") los valores SI/NO por mes que edita el visor; si la fila
// empresa_id+accion no existe todavía la crea. data.filas viene como
// [{empresaId, sucursal, accion, valores:{Mes:"SI"/"NO"/""}}, ...] — el
// texto de "accion" tiene que coincidir EXACTO con lo que espera
// leerCSE_()/mapAccion más abajo ("Correo seguimiento"/"Reunión
// seguimiento"/"Charlas"). Mismo patrón ya usado en
// Code-Vital.gs/Code-Euro.gs.
function writeCSE_(ss, data) {
  var sheet = ss.getSheetByName('👥 Seguimiento_CSE') || ss.getSheetByName('Seguimiento_CSE');
  if (!sheet) throw new Error('Hoja "Seguimiento_CSE" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'empresa_id');
  if (!headerRow) throw new Error('No se encontró la fila de encabezado ("empresa_id") en Seguimiento_CSE');
  var startRow = headerRow + 1;
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

  var idx = {};
  headers.forEach(function (h, i) { if (h) idx[String(h).trim()] = i + 1; });
  var colEmpresa = idx['empresa_id'];
  var colAccion = idx['Acción CSE'] || idx['Accion CSE'];
  var colSucursal = idx['Sucursal'];
  if (!colEmpresa || !colAccion) throw new Error('Encabezados "empresa_id"/"Acción CSE" no encontrados en Seguimiento_CSE');

  var colByMes = {};
  headers.forEach(function (h, i) {
    var norm = String(h || '').trim();
    var col = i + 1;
    if (norm && col !== colEmpresa && col !== colAccion && col !== colSucursal) colByMes[norm.toUpperCase()] = col;
  });

  var lastRow = sheet.getLastRow();
  var existentes = lastRow >= startRow
    ? sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues()
    : [];

  (data.filas || []).forEach(function (fila) {
    var targetRow = null;
    for (var i = 0; i < existentes.length; i++) {
      var r = existentes[i];
      if (String(r[colEmpresa - 1]).trim() === fila.empresaId && String(r[colAccion - 1]).trim() === fila.accion) {
        targetRow = startRow + i;
        break;
      }
    }
    if (!targetRow) {
      targetRow = sheet.getLastRow() + 1;
      sheet.getRange(targetRow, colEmpresa).setValue(fila.empresaId);
      sheet.getRange(targetRow, colAccion).setValue(fila.accion);
      if (colSucursal) sheet.getRange(targetRow, colSucursal).setValue(fila.sucursal);
    }
    Object.keys(fila.valores || {}).forEach(function (mesNombre) {
      var col = colByMes[mesNombre.toUpperCase()];
      if (!col) return;
      sheet.getRange(targetRow, col).setValue(fila.valores[mesNombre]);
    });
  });
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

// ── OTRO DESARROLLO, RENOMBRADO (comportamiento intacto) + respel ──
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
    cse: readCseSheetClasico_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── VISOR DE TRAZABILIDAD ──

var EMPRESA_NOMBRE  = "ANDO";
var EMPRESA_COLOR   = "#175CD3";
var EMPRESA_COLOR_L = "#EFF8FF";

var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];

// Algunas empresas tienen una columna de comentario libre por sucursal en
// Trazabilidad_Docs; el nombre exacto varía, así que probamos varios.
var COMENTARIO_HEADERS_CANDIDATOS = ["Comentario por sucursal", "Comentarios", "Comentario"];


function doGetVisor_(e) {
  var payload;
  try {
    payload = buildPayload_();

    // Filtro por sucursal (para links externos): ?suc=<id_de_sucursal>
    var sucFiltro = e && e.parameter && e.parameter.suc;
    if (sucFiltro) {
      payload.EMPRESAS = payload.EMPRESAS.filter(function (em) { return em.id === sucFiltro; });
      var valFiltrado = {};
      if (payload.VAL_DATA[sucFiltro]) valFiltrado[sucFiltro] = payload.VAL_DATA[sucFiltro];
      payload.VAL_DATA = valFiltrado;
    }
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
  var objetivosReales = leerObjetivosReales_();
  var empresas = construirEmpresas_(traza, val, cse, objetivosReales);
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

function leerCSE_(empIdsValidos) {
  var sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxAccion = h.indexOf("Acción CSE");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var mapAccion = {
    "Correo seguimiento": "correo",
    "Reunión seguimiento": "reunion",
    "Charlas": "encuesta",
    "Encuesta seguimiento": "encuesta" // texto viejo, por si quedó alguna fila así en el Sheet
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

// Los 4 objetivos reales de Ando son trazabilidad/sinader/sensibilizacion/
// kpi_costo (ver EMPRESAS.ando.objetivos en valorizacion-recylink.html) — el
// texto tiene que coincidir EXACTO con lo que escribe calcObjetivos() en la
// hoja "🎯 Objetivos" (confirmado con curl 2026-09-03). NO incluyen
// Valorización, así que (mismo criterio ya aplicado en Salfa) no se agrega
// una tarjeta sintética de "% Valorización" en objetivos — ese dato sigue
// disponible aparte en VAL_DATA/renderValorizacion().
var ANDO_OBJETIVOS_TEXTOS = [
  "100% trazabilidad",
  "Cumplimiento normativa SINADER",
  "Generar sensibilización, concientización y cultura ambiental",
  "Incorporar KPI de costo - valorización"
];

function construirEmpresas_(traza, val, cse, objetivosReales) {
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

    var propios = (objetivosReales && objetivosReales[empId]) || {};
    var objetivos = ANDO_OBJETIVOS_TEXTOS.map(function (texto) {
      var d = propios[texto];
      return d
        ? { texto: texto, avance: d.avance, ok: d.ok, detalle: d.detalle }
        : { texto: texto, avance: null, ok: null, detalle: "" };
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

// FIX (2026-09-03, ver nota al inicio del archivo): no escanear
// val[emp].meta ni val[emp].acumulado — ambas quedan pobladas para meses
// sin actividad real (meta se repite en los 12 meses; acumulado se
// arrastra hacia adelante), lo que hacía que el mes por defecto del visor
// siempre saltara a Diciembre. Solo "meses" (% Real) refleja actividad real.
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

// Lee la hoja real "🎯 Objetivos" (empresa_id | Sucursal | Mes | Año |
// Objetivo | % cumplimiento | Detalle) y devuelve, por sucursal, el
// objetivo más reciente de cada texto distinto (agregado 2026-09-03, a
// pedido del usuario: "no se hace seguimiento de los 4 objetivos que se
// muestran en la hoja objetivos 2026").
//
// FIX (2026-09-03, a pedido del usuario: "integrar el año en el sheets"):
// hasta ahora el cliente nunca mandaba la columna Año (aunque el header ya
// la tenía, copiada de la plantilla Euro/Gespania/Vital), así que todo
// quedaba corrido una columna — el texto caía bajo "Año", el estado bajo
// "Objetivo", el detalle bajo "% cumplimiento" — y esta función leía por
// esos nombres "corridos" para compensar. Ahora que EMPRESAS_OBJ_CON_ANIO
// incluye 'ando' en el cliente, las filas nuevas vienen alineadas con el
// header real — se vuelve a leer por los nombres correctos. OJO: filas
// viejas (sincronizadas antes de este fix) van a seguir corridas hasta que
// se vuelvan a sincronizar — conviene resincronizar todos los meses del año
// una vez desplegado este cambio para limpiar el historial.
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
  var idxTexto = h.indexOf("Objetivo");
  var idxEstado = h.indexOf("% cumplimiento");
  var idxDet = h.indexOf("Detalle");

  var result = {}; // empId -> texto -> { mesIdx, avance, ok, detalle }

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    var texto = String(r[idxTexto] || "").trim();
    if (!suc || !texto) return;
    if (/documentos adicionales/i.test(texto)) return; // fila informativa, no es uno de los 4 objetivos reales

    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]); // "Anual" no matchea ningún mes y queda tal cual (mesIdx -1)
    var mesIdx = MESES.indexOf(mes);
    var rawEstado = idxEstado === -1 ? "" : r[idxEstado];
    var detalle = idxDet === -1 ? "" : String(r[idxDet] || "").trim();
    var s = String(rawEstado === null || rawEstado === undefined ? "" : rawEstado).trim();

    var avance = null, ok = null;
    if (/^(s[ií]|ok)$/i.test(s)) { avance = 100; ok = true; }
    else if (/^no$/i.test(s)) { avance = 0; ok = false; }
    else {
      var n = normalizePercent_(rawEstado);
      if (n !== null) { avance = n; ok = n >= 100; }
    }

    result[empId] = result[empId] || {};
    var prev = result[empId][texto];
    if (!prev || mesIdx > prev.mesIdx) {
      result[empId][texto] = { mesIdx: mesIdx, avance: avance, ok: ok, detalle: detalle };
    }
  });

  return result;
}


// ============================================================
// VISOR DE MINUTAS — lectura/escritura de la pestaña "Minuta" (agregado
// 2026-09-03, a pedido del usuario). Mismo mecanismo genérico ya usado en
// Code-Vital.gs/Code-Gespania.gs/Code-Salfa.gs: el visor detecta solo los
// bloques de sesión (fila de título en columna A, resto de A:F vacío) y
// manda de vuelta headerRow/dataStartRow/colMap junto con los items — el
// backend no necesita saber la estructura interna de cada minuta.
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


// ── Utilidad para probar desde el editor (Ejecutar → testBuildPayload) ──
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}
