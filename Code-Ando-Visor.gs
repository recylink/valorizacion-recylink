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
 * NOTA (encontrada de paso, NO corregida — fuera del alcance pedido):
 * writeValorizacion/writeTrazabilidad/writeObjetivos acá usan el patrón
 * VIEJO de borrado (por empresa_id solo, o empresa_id+Mes) — el mismo tipo
 * de bug de integridad de datos ya encontrado y corregido en varias otras
 * empresas este proyecto (ver CONTEXTO-PROYECTO.md, sección de Gespania/
 * Socovesa/Salfa/Euro: "bugs de clave de borrado"). writeValorizacion en
 * particular borra TODA fila que coincida con el empresa_id, sin mirar
 * "Tipo" — sincronizar cualquier cosa podría borrar "% Real"/"%
 * Acumulado"/"Meta %" juntos. No se tocó porque no fue parte de lo pedido,
 * pero conviene aplicarle el mismo fix si se confirma el problema.
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

// NUEVO — Seguimiento CSE editable. Guarda in-place (por empresa_id +
// "Acción CSE") los valores SI/NO por mes que edita el visor; si la fila
// empresa_id+accion no existe todavía la crea. data.filas viene como
// [{empresaId, sucursal, accion, valores:{Mes:"SI"/"NO"/""}}, ...] — el
// texto de "accion" tiene que coincidir EXACTO con lo que espera
// leerCSE_()/mapAccion más abajo ("Correo seguimiento"/"Reunión
// seguimiento"/"Encuesta seguimiento"). Mismo patrón ya usado en
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
    respel: readRespelSheet_()
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

    var objetivos = [{ texto: "100% Trazabilidad" }];

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


// ── Utilidad para probar desde el editor (Ejecutar → testBuildPayload) ──
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}
