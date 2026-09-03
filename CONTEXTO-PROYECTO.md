# Contexto del proyecto: valorizacion-recylink.html

Este es un archivo HTML standalone (una sola página, sin build) para Recylink, que
permite hacer seguimiento de valorización de residuos y trazabilidad documental para
6 empresas cliente: **Copec**, **Socovesa**, **Abastible**, **Gespania**, **Salfa** y
**Euro**. Sincroniza bidireccionalmente con Google Sheets vía Apps Script.

## Estructura general
- Un solo archivo HTML con `<style>` y `<script>` embebidos (sin frameworks, JS vanilla).
- Selector de empresa arriba (Copec / Socovesa / Abastible / Gespania / Salfa / Euro) que cambia el contexto global.
- 3 pestañas: **Valorización**, **Trazabilidad**, **Objetivos**.
- Cada empresa carga datos desde un Excel de trazabilidad (subido por el usuario) o
  desde el Google Sheet correspondiente (botón "↓ Cargar desde Sheets").
- **IMPORTANTE**: la app NO funciona abierta directamente como `file://` en el navegador
  por restricciones CORS — debe alojarse en un servidor (ej. GitHub Pages) para que el
  fetch a los Apps Script funcione. El usuario aún no la ha subido a GitHub Pages.

## Configuración de empresas (objeto `EMPRESAS` en el JS)

### Copec
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxnmprhhBj6DRKMxze6DU5H8P9CC62MGm0iQgMnzE8f3bA7laxwktefGewQg5lp2o49/exec`
- Sheet ID: `1yHnsIPhYuqvHHyQwyQvRMMOa905qxXvUWfw2p_W8UGo`
- `trazDocsCompletos: ['transp','disp']` — la trazabilidad 100% solo exige transportista + disposición final
- `trazDocsInfo: ['cert','factura','decl']` — documentos informativos que NO afectan el % de trazabilidad, se muestran en fila separada "Documentos adicionales"
- **Excepciones a trazabilidad**: residuos cuyo nombre contiene "orgán"/"organico", y sucursales que empiezan con "CDL", NO se penalizan por falta de transportista/disposición final
- Metas de valorización 2026 por sucursal, editables en la app (botón "✎ Editar metas"), guardadas en `COPEC_METAS_DEFAULT` + localStorage + sync tipo `valorizacion_metas`
- Objetivos: `[{id:'trazabilidad', tipo:'trazabilidad'}]`
- Formato de visualización de Objetivos: tabla con columnas por mes (Ene, Feb...), filas:
  % Valorización real / % Acumulado / Meta 2026 / 100% trazabilidad / Documentos adicionales

### Socovesa
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbx5mKQ873Ob_3Yd4n1kUI5imxEpXO5UzllhMpYGCoIBFHwBKSI9Moct7p9SYuEL9znM/exec`
- Sheet ID: `12CDpG9dNUIKtT5tsKGx8JgekHE0_RyWfEx-pba6zvPM`
- `trazDocsCompletos: ['cert','transp','disp']`
- Sin excepciones especiales de trazabilidad
- 5 objetivos: 100% trazabilidad, Valorizar al menos un residuo (anual), Declarar SINADER,
  Registrar residuos a valorizar (anual), Registrar retiros Respel (anual)
- Sucursal excluida: "Edificio Eliodoro Yañez" (aparece en trazabilidad pero no en valorización/objetivos)
- Formato de visualización: agrupado por sucursal, tabla "Análisis anual" + tabla mensual con
  columnas Objetivo | Mes | Estado | Detalle (función `renderObjetivos` / `makeTableSection`)

### Abastible
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbzGG_DqA-CcJM8VJ6xq4Rai693desNOMAZO-MeYhdkJWFtZwnPnJ4AVV33q56fuyaMX/exec`
- Sheet ID: `1cu3gSJao4wG-UEK5xG6DEWjy8qZF4kEZ8agOQ2Wo3IU`
- `trazDocsCompletos: ['transp','disp']`
- `trazDocsInfo: ['cert','factura','decl']` — se agregó "factura" recientemente
- Sin excepciones especiales de trazabilidad
- Metas de valorización fijas (no editables desde la app): `ABASTIBLE_METAS = {Planta Concón:15, Planta Talca:30, Planta Lenga:30, Planta Osorno:30, Oficina Central:30}`
- 3 objetivos:
  1. `100% trazabilidad` — transportista + disposición final
  2. `Declarar mensualmente en SINADER` — mismo cálculo que Socovesa (excluye donaciones)
  3. `KPI costo e ingreso (ingresos > 0)` — marca OK si algún residuo tiene
     `Total Costo Neto de Transporte > 0` **O** `Precio por Venta de Residuo > 0` (es un OR, no AND)
- Usa el mismo formato de visualización que Copec (tabla por mes), extendido con 2 filas
  adicionales: "Declarar mensualmente en SINADER" y "KPI costo e ingreso"

### Gespania (agregada 2026-07-24)
- Sheet ID: `1628zcLexOnY5sT4S98vOp8vf8fSnc_RdTgBmG6-nLCk`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbwENVSOcXoQalAD2b-INqsFx0hVehfwXwrVqegY_2zj_B7S2t_dFqlo_qH1JeYqr9ER/exec`
  (desplegado 2026-07-24, corriendo `Code-Gespania.gs`)
- Sucursales: "General Jofre Fontana" y "El Rosal lll" (ojo: en la hoja Contactos aparecen
  con variantes de escritura — "Fonatana" en vez de "Fontana" — no se agregó alias porque
  la hoja de Valorización/Objetivos ya usa la forma "Fontana" consistentemente).
  Esta empresa introduce columnas adicionales que las otras 3 no tienen: `Contactos`,
  `Minuta`, `👥 Seguimiento_CSE`, `Pendientes sucursales`, `Config.Flat` — ninguna de esas
  hojas es leída por el visor HTML (`Code-Gespania.gs` solo lee/escribe las 3 hojas
  estándar + Total Residuos + RESPEL, igual que las demás empresas).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (igual
  que Abastible)
- `generaTotalResiduos` incluye a Gespania (`esCopec || esAbastible || esGespania`) porque
  su Sheet ya trae las pestañas `Total Residuos` y `RESPEL` creadas.
- Metas de valorización: **no** son un objeto hardcodeado como Copec/Abastible — se leen
  siempre desde `metasFromSheets` (fila "Meta %" de ♻️ Valorización, 5% fijo todos los
  meses al momento de agregar la empresa). No son editables desde la app.
- 4 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, fila 3, y hardcodeados en
  `EMPRESAS.gespania.objetivos` con el mismo texto exacto para que el matching por nombre
  con la hoja `🎯 Objetivos` funcione):
  1. `100% trazabilidad` — tipo `trazabilidad`, igual cálculo que las demás empresas
  2. `Declarar mensualmente en sinader` — tipo `sinader`, igual cálculo que Abastible/Socovesa
  3. `Lograr un FGR de 0,2 m3/m2` — tipo `manual`: el % de cumplimiento se ingresa a mano
     en la hoja `🎯 Objetivos` del Sheet, la app solo lo muestra (no hay forma de calcular
     FGR — Factor de Generación de Residuos — desde los datos de Trazabilidad_Docs)
  4. `valorizar un 5% de residuos en kg` — tipo `manual` también, por consistencia con FGR
     (es en la práctica equivalente al % Real vs Meta 2026 que ya se muestra en la misma
     tabla, pero se agregó como fila propia porque así está definida en `Objetivos 2026`)
- Se agregó un tipo de objetivo genérico nuevo, `tipo:'manual'`, en `renderCopecObjetivos()`
  (no existía antes) — renderiza una fila por objetivo buscando `objBySucMes` por nombre
  exacto, igual patrón que las filas SINADER/KPI, pero `calcObjetivos()` nunca calcula un
  estado para estos (no hay `else if(obj.tipo==='manual')` en el switch), así que quedan en
  "--" hasta que alguien llene manualmente `% cumplimiento` en la hoja `🎯 Objetivos`.

### Salfa (agregada 2026-07-24)
- Sheet ID: `1LtRSJ-ZYPYoFmGHUik03OAVYxzg9REPn5NTIGhostGI`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbyp5gnnZjhOIpAdTSGn8Nhs0umE_VXbUVTTQLLpjUVRSn2hKy7wFShNUfx_Q8HSI85O/exec`
  (Code-Salfa.gs, mismo patrón que Code-Gespania.gs)
- Sucursales: "Novatec Pucará" e "Inoval Brisas de san pedro" — OJO: son nombres de los
  **contratistas** que operan cada obra (no "Salfa X"), confirmados por el usuario como
  los mismos que trae el Excel a subir, texto exacto.
- **Bug de onboarding encontrado**: en `♻️ Valorización` las 6 filas de datos precargadas
  a mano tenían la columna `empresa_id` (col. A) completamente vacía, y el `readSheet()`
  del Apps Script filtra `r[0] !== ''`, así que `doGet` devolvía `valorizacion: []` pese a
  que el Sheet se veía con datos. Se le pidió al usuario llenar A6:A11 con cualquier texto
  no vacío (ej. "Salfa") como fix inmediato. Al subir el Excel real, la app va a crear filas
  con `empresa_id` propio por sucursal (vía `sucId()`) y las genéricas quedarán huérfanas
  — mismo patrón de limpieza manual que se hizo con Gespania (ver más abajo).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']`
- `generaTotalResiduos` incluye a Salfa (ya trae las pestañas `Total Residuos` y `RESPEL`
  creadas en el Sheet).
- Metas: igual que Gespania, se leen de `metasFromSheets` (no hay objeto hardcodeado ni
  edición desde la app). Al momento de agregar la empresa estaban en 0% para ambas
  sucursales (sin definir aún).
- 4 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, texto exacto):
  1. `100% trazabilidad` — tipo `trazabilidad`, cálculo estándar
  2. `cumplir declaración SINADER` — tipo `sinader`, mismo cálculo que Abastible/Socovesa/Gespania
  3. `KPI Costo ingreso` — tipo `kpi_costo`, mismo cálculo que Abastible (OK si `Total Costo
     Neto de Transporte > 0` O `Precio por Venta de Residuo > 0`)
  4. `Asegurar una correcta segregación de residuos` — **tipo nuevo `segregacion`**, calculado
     (no manual): OK si en ese mes/sucursal aparece algún residuo que **no** sea
     Escombro/Excavación/Domiciliario (comparación normalizada sin tildes vía `normResiduo()`);
     si todos los residuos del mes son de esas 3 categorías genéricas, da "No" (no se está
     segregando). Detalle lista los residuos "extra" encontrados. Implementado en
     `calcObjetivos()` (rama `obj.tipo==='segregacion'`) y renderizado en
     `renderCopecObjetivos()` igual que la fila SINADER/KPI.

### Euro (agregada 2026-07-24)
- Sheet ID: `1au2aa9n0Sh6kYS5TEq28g1nmS_4O9tZFDNaf3j7CQoY`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxfxqFZkptLnyUL0Q-P6GFid_z7KVMNAByM0SxQ5pVjg2DP-t-sW9k87KtWGV1AvbMO/exec`
  (desplegado 2026-07-24, corriendo `Code-Euro.gs`, público desde el primer intento)
- Sucursales (10, de la hoja `Contactos` — no hardcodeadas en el JS, se derivan del
  Excel/Sheet como en las demás empresas): Oficina Central, Proyecto Departamental, Proyecto
  Amengual, Proyecto Santa Elena, Proyecto Entre Vicuñas, Proyecto Mirador Irarrázaval,
  Proyecto Don Pepe II, Proyecto San Pablo Trotter, Proyecto Alto Irarrázaval, Proyecto
  Zañartu (la hoja Contactos trae 4 filas con "Zañartu" a secas y 1 con "Proyecto Zañartu";
  el usuario confirmó que el nombre correcto es **"Proyecto Zañartu"**, así que las filas sin
  el prefijo en Contactos están mal escritas — no se tocó esa hoja, no la usa el visor).
- **Excepción única: % de valorización por VOLUMEN (m3), no por peso (kg)**. Se agregó
  `esEuro` en `processData()` y una variable `metricaVal = esEuro ? m3 : kg` que reemplaza
  `kg` en la acumulación de `valMatrix[suc][mes].total/val` — todas las demás empresas
  siguen usando kg sin cambios. `Total Residuos` sigue trackeando ambos (kg y m3) como
  siempre, no se tocó.
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']`
- `generaTotalResiduos` incluye a Euro (Sheet ya trae `Total Residuos` y `RESPEL`).
- Metas: igual que Gespania/Salfa, vía `metasFromSheets` (Sheet no traía filas de Meta%
  precargadas al momento de agregar la empresa — `♻️ Valorización` estaba completamente vacía).
- 7 objetivos definidos en la hoja `Objetivos 2026` (8 líneas en el Sheet, pero "5% de
  valorización en volumen" NO se agregó como fila de objetivo propia — ya queda cubierto por
  las filas genéricas % Real/Meta 2026/% Acumulado, ahora en base m3 para esta empresa):
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar
  2. `Valorizar fierro, madera, cartón` — **tipo nuevo `valorizar_especificos`** (anual):
     progreso acumulado = (N° de esos 3 residuos valorizados al menos una vez en el año) / 3.
     Ej. si solo se valorizó Cartón → 33%; si además Madera → 66%; los 3 → 100%. Config del
     objetivo incluye `residuos:['Fierro','Madera','Cartón']` (comparación normalizada sin
     tildes vía `normResiduo()`). Implementado en `calcObjetivos()` dentro del bloque de
     objetivos anuales (agregado a `OBJ_ANUALES`), se renderiza solo porque la tabla "Análisis
     anual" de `renderCopecObjetivos()` ya es genérica para cualquier tipo en `OBJ_ANUALES`.
  3. `FGR igual o menor a 0,2` — tipo `manual`
  4. `Ton CO2 evitadas/M2` — tipo `manual`
  5. `Contactar Nuevos proveedores` — tipo `manual`
  6. `Acompañamiento en terreno, mediante charlas y una auditoría` — tipo `manual`
  7. `Costo/Presupuesto` — tipo `manual`
- Las hojas `Seguimiento_CSE` y `Config.Flat` de este Sheet traen datos de OTRAS empresas
  (ANDO, Copec, Daikin, etc.) — el Sheet se clonó de una plantilla compartida y no se limpió.
  No afecta al visor (no lee esas hojas), es solo cosmético; queda a criterio del usuario
  limpiarlo.

### Ando (agregada 2026-07-27)
- Sheet ID: `1r4TtS9Gtrd83oZse8yABCHRg4V1lxgxoW6a3YCxbpk0`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxDXNb5jL5CsJDEUy71c8fARsoXB3ZzuEBs4Z9zEa7ZQhLBgvuDcWmUNAOa_VIxdTg/exec`
  (desplegado 2026-07-27, corriendo `Code-Ando.gs`).
- Sucursales: solo **ETB** (única fila en `Contactos` y en `♻️ Valorización`).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (igual
  que Copec/Euro/Salfa/Gespania).
- `trazCols` NO incluye `Transportista (nombre)` (Ando no trae esa columna en su Sheet, a
  diferencia de Abastible/Socovesa). La hoja `📊 Trazabilidad_Docs` real de Ando tiene una
  columna extra al final, `Comentario por sucursal`, que no está en `trazCols` — como
  `writeTrazabilidad` borra y reinserta la fila completa en cada sync, cualquier comentario
  manual en esa columna se pierde al sincronizar. No se resolvió (ninguna otra empresa tiene
  este patrón); si el usuario necesita conservarlo habría que agregar lógica especial a
  `writeTrazabilidad` de Ando para no borrar esa columna.
- Metas de valorización: vía `metasFromSheets` (no hardcodeadas) — el Sheet ya trae `Meta %`
  = 5% fijo en todos los meses para ETB, consistente con el objetivo "Valorizar un 5% de
  residuos en peso".
- `generaTotalResiduos` incluye a Ando — el Sheet ya trae las pestañas `Total Residuos`
  (7 columnas: `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel |
  Total KG | Total M3`, `Code-Ando.gs` con `numCols = 7`) y `RESPEL` (ya completa, ~64
  residuos mapeados). Ando **no** usa `Año` ni `Tons. CO2eq. evitadas` — ambas son
  exclusivas de Euro/del grupo original respectivamente (decisión del usuario, 2026-07-27,
  ver sección "Total Residuos + RESPEL" arriba), así que no hace falta agregar esos 2
  headers al Sheet de Ando.
- 5 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, texto exacto):
  1. `100% trazabilidad` — tipo `trazabilidad`, cálculo estándar
  2. `Cumplimiento normativa SINADER` — tipo `sinader`, mismo cálculo que Abastible/Socovesa/etc.
  3. `Generar sensibilización, concientización y cultura ambiental` — tipo `manual` (no hay
     forma de calcular esto desde los datos de trazabilidad, se ingresa a mano en `🎯 Objetivos`)
  4. `Valorizar un 5% de residuos en peso` — tipo `manual`, agregado por consistencia con la
     hoja `Objetivos 2026` aunque en la práctica duplica el % Real/Meta 2026 ya mostrado
     (mismo patrón que Gespania/Euro)
  5. `Incorporar KPI de costo - valorización` — tipo `kpi_costo`, mismo cálculo que
     Abastible/Salfa (OK si `Total Costo Neto de Transporte > 0` O `Precio por Venta de
     Residuo > 0`)
- La hoja `🎯 Objetivos` de Ando ya trae ~150 filas con `100% trazabilidad`/`Documentos
  adicionales` calculados pero con `empresa_id`/`Sucursal`/`Mes` **vacíos** en todas —
  parecen venir de otro sistema (el "Portal de Trazabilidad" general de Recylink, no de este
  visor) y `readSheet()` del Apps Script las descarta (`r[0]!==''`), así que no afectan a la
  app. La hoja `Empresas_Config` también trae filas de otras empresas del portal general
  (Gespania, CTEC, Novatec, Obra Limpia, etc., con `meta_val` distinto al de esta app) —
  igual que `Seguimiento_CSE`/`Config.Flat` de Euro, es una plantilla compartida y no la lee
  el visor HTML.

### PMS (agregada 2026-07-30)
- Sheet ID: `1q1T543MVj9eA4bjbaysIRpr3eGf0fB_J5B1PekGBo6A` (título "PMS" en Drive, creado
  2026-07-30 — clon vacío de la plantilla "Portal de Trazabilidad", igual punto de partida
  que tuvieron Euro/Ando/Salfa/Gespania).
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxebFCdrIRxJVPzE3Rdo5hf_CZT9cpqIbszqQalGRTMa3v2aRedgwFTDfwkpWioXs9_/exec`
  (desplegado 2026-07-30, corriendo `Code-PMS.gs`, verificado con `doGet` — responde
  `{valorizacion:[],trazabilidad:[],objetivos:[],respel:[...]}`, vacío salvo `respel` que ya
  trae la lista completa de residuos del Sheet clonado).
- Sucursales: **sin definir aún** — la hoja `Contactos` del Sheet está vacía; se derivarán
  automáticamente del Excel de trazabilidad que suba el usuario (mismo patrón que Euro/Ando/
  Salfa/Gespania, no hardcodeadas en el JS).
- `trazCols` igual que Ando (sin `Transportista (nombre)`, el Sheet clonado no trae esa
  columna separada — coincide exactamente con el header real de `📊 Trazabilidad_Docs` del
  Sheet de PMS).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (patrón
  estándar, igual que Copec/Abastible/Gespania/Salfa/Euro/Ando).
- Objetivos: **decisión del usuario 2026-07-30** — se usan tal cual los 2 objetivos genéricos
  que ya trae la pestaña `Objetivos 2026` del Sheet clonado ("100% trazabilidad" y "20%
  Valorización"), sin objetivos específicos propios por ahora. Igual que Copec,
  `EMPRESAS.pms.objetivos` solo tiene `{id:'trazabilidad', tipo:'trazabilidad'}` — el "20%
  Valorización" no es una fila de objetivo separada, queda cubierto por las filas genéricas
  % Real/Meta 2026/% Acumulado que ya se muestran en la tabla (mismo criterio usado con Euro
  para "5% de valorización en volumen").
- Metas de valorización: **meta fija de 20% hardcodeada** (`PMS_META_PCT` + `getPmsMetas()`,
  agregado 2026-07-30) — a diferencia de Gespania/Salfa/Euro/Ando, el Sheet de PMS nunca tuvo
  una fila "Meta %" precargada a mano, así que el patrón `metasFromSheets` (leer lo que ya
  está en el Sheet) no tenía nada que leer y la meta nunca se sincronizaba. `getPmsMetas()`
  genera dinámicamente `{sucursal: 20}` para todas las sucursales actuales (las de PMS no
  están hardcodeadas de antemano), mismo patrón de "meta fija en código" que Abastible pero
  calculado en runtime. Se usa en `autoSync()` (`metasActuales`) y en `renderCopecObjetivos()`
  (`metas`).
- `generaTotalResiduos` incluye a PMS (`esPms` en `processData()`) — el Sheet clonado ya trae
  las pestañas `Total Residuos` (7 columnas, sin `Tons. CO2eq. evitadas` ni `Año` — igual que
  Ando) y `RESPEL` (ya poblada con la lista estándar de residuos, igual que Ando). `Code-PMS.gs`
  usa `numCols = 7` en `writeTotalResiduos`, mismo patrón que `Code-Ando.gs`.
- **Bug de onboarding encontrado y corregido (2026-07-30)**: al agregar PMS solo se actualizó
  la lista de empresas en `processData()` (`generaTotalResiduos`), pero quedaron 2 listas
  hardcodeadas más sin `'pms'`: la de `metasActuales` y la de `filasTotalResiduos` dentro de
  `autoSync()`, y la de `metas` en `renderCopecObjetivos()`. Resultado: "Total Residuos" nunca
  se sincronizaba (el payload quedaba vacío, nunca se mandaba el POST) y la fila "Meta %"
  tampoco. Corregido agregando `'pms'`/`empresaActual==='pms'` a las 3 listas restantes.
- **Excepción de trazabilidad para operaciones de 0 kg (agregada 2026-07-30, solo PMS)**: en
  todas las demás empresas, una operación con `Control de Peso (Kg) === 0` se descarta por
  completo para efectos de trazabilidad (`if (kg === 0) return;` en `processData()`, no
  incrementa `Importaciones` ni cuenta documentos). Para PMS, a pedido del usuario, estas
  operaciones **sí** cuentan como aporte a la trazabilidad (incrementan `Importaciones`), pero
  sin exigir transportista ni disposición final — se implementó igual que la excepción de
  Donaciones ya existente (`donEnG`): cada grupo `trazMap[key]` ahora trackea `impCeroKg`
  (cuántas de sus operaciones fueron de 0 kg), y en `calcObjetivos()` (cálculo de "100%
  trazabilidad") ese conteo se suma al lado del documento exigido en la comparación
  `(r[d]+donEnG+impCeroKg) >= r.imp` para `transp`/`disp` — mismo mecanismo de "sumar al
  numerador" en vez de excluir la fila entera, para no afectar operaciones no-cero del mismo
  residuo/mes/sucursal que sí deben cumplir. Como `emp.trazDocsCompletos` de PMS es
  exactamente `['transp','disp']`, esta excepción cubre el 100% de los documentos exigidos
  para PMS. Gateado con `empresaActual==='pms'` en `calcObjetivos()`, sin efecto en las demás
  empresas (su `impCeroKg` queda siempre en 0).
- **"Producto Circular" agregado a `VALORIZADOS_LIST` (2026-07-30, cambio global, no exclusivo
  de PMS)**: Humus (Vivero Leliantú) aparecía como "No Valorizado" en `Total Residuos` porque
  su `Tipo de Tratamiento` en el Excel de PMS es literalmente "Producto Circular", un valor
  que no estaba en la lista de tratamientos que cuentan como valorización (`isValorizado()`).
  Se agregó tal cual (comparación exacta tras normalizar tildes/mayúsculas, igual que el resto
  de la lista). Como `VALORIZADOS_LIST` no está segmentada por empresa, si otra empresa usa
  esa misma etiqueta también contará como valorizado — consistente con el propósito de la
  lista (no se acotó a PMS a propósito).
- **"Recuperación energética" agregado a `VALORIZADOS_LIST` (2026-07-30, cambio global)**:
  detectado al investigar por qué NPR - Embotelladora Renca (CCU) caía a 65,1%/49,7% de
  valorización en marzo/junio — el residuo "Ril de azúcar liquida" (77.290 kg en marzo,
  178.270 kg en junio, volúmenes grandes que dominan el total mensual por ser ponderado por
  kg) tenía `Tipo de Tratamiento = "Recuperación energética"`, no cubierto por la lista.
  Confirmado por el usuario como un tratamiento valorizable. Se agregó (junto a su variante
  sin tilde, aunque `isValorizado()` ya normaliza tildes/mayúsculas antes de comparar, mismo
  patrón redundante que ya existía para "Reutilizacion"/"Reutilización").

### CCU (agregada 2026-07-30)
- Sheet ID: `1gChzhAy3wiXWAPr17OW4RypGMqY76dYRHLuK2wwvKR8` (título "CCU" en Drive, creado
  2026-07-30 — clon vacío de la plantilla "Portal de Trazabilidad", igual punto de partida
  que PMS/Euro/Ando/Salfa/Gespania). La pestaña `Objetivos 2026` de este Sheet en particular
  no traía el texto genérico de plantilla — tenía pegado por error un borrador de correo sin
  relación, así que no se usó como referencia (a diferencia de PMS, donde sí se reutilizó el
  texto genérico).
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxZIqb5W8o0GWZqWIrG5s1Qg0R54Ij15U7MiT-GzgUmXjaYSCx10nTVu-h5W6mLDvj6/exec`
  (desplegado 2026-07-30, corriendo `Code-CCU.gs`, verificado con `doGet` — responde
  `{valorizacion:[],trazabilidad:[],objetivos:[],respel:[...]}`, vacío salvo `respel`).
- Sucursales: **2 con meta confirmada por el usuario 2026-07-30, texto exacto tal como viene
  en el Excel** — "NPR - Embotelladora Renca" y "CirCCUlar". A diferencia de PMS/Euro/Ando
  (donde las sucursales se derivan del Excel sin hardcodear), aquí sí se hardcodeó la meta por
  sucursal (ver `CCU_METAS` abajo) porque el usuario ya conocía de antemano el nombre exacto y
  la meta. **El Excel real subido trajo una 3ra sucursal, "NPR - Obra Nave 2 Planta Renca"**,
  sin meta definida — no está en `CCU_METAS`, así que por diseño (`metasActuales[suc] !==
  undefined`) simplemente no se le sincroniza fila "Meta %" ni se le muestra meta en Objetivos;
  el resto (trazabilidad, % Real/Acumulado) funciona igual para ella. Pendiente confirmar con
  el usuario si necesita meta propia.
- **"NPR - Obra Nave 2 Planta Renca" agregada a `SUCURSALES_EXCLUIDAS` (2026-07-30)**: el
  usuario confirmó que esa sucursal está cerrada — debe verse en Trazabilidad (histórico) pero
  no en Valorización ni Objetivos, mismo criterio que "Edificio Eliodoro Yañez" de Socovesa.
  Al revisar el mecanismo existente se encontró que estaba **incompleto**: `isSucExcluida()`
  solo se usaba para poblar el selector `f-obj-suc` (Objetivos) — no filtraba nada cuando se
  elegía "Todas", ni tocaba en absoluto la pestaña Valorización (selector `f-suc`, gráfico, ni
  el % global agregado). Es decir, para Socovesa la sucursal excluida seguía siendo
  visible en Valorización y en Objetivos con "Todas" seleccionado — documentado antes como
  "no aparece en valorización/objetivos" pero en realidad solo estaba oculta del dropdown de
  selección individual de Objetivos. Corregido para las 6 empresas de una vez: `renderVal()`
  (lista a mostrar + agregado global de kg/% + contador "Sucursales"), `renderChart()`, y
  `renderCopecObjetivos()` (rama `fS==='all'`) ahora filtran con `isSucExcluida()`; los
  `populateSel('f-suc', ...)` (2 call sites, `processData()`/`loadSheetsData()`) también.
  `f-traz-suc`/trazabilidad se dejó sin tocar a propósito (debe seguir mostrando todo,
  incluidas sucursales cerradas).
- `trazCols` igual que PMS/Ando (sin `Transportista (nombre)`, coincide con el header real del
  Sheet clonado).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (patrón
  estándar).
- Objetivos: **caso nuevo — mismos 3 objetivos para ambas sucursales, pero con meta de
  valorización distinta por sucursal** (no objetivos *distintos* por sucursal; la app no
  soporta eso hoy, solo listas de objetivos uniformes por empresa):
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar.
  2. `Tener KPI Costo - Ingreso` — tipo `kpi_costo`, mismo cálculo que Abastible/Salfa/Ando (OK
     si `Total Costo Neto de Transporte > 0` **O** `Precio por Venta de Residuo > 0`).
  3. `Gestionar Residuos Spot` — **tipo `manual`** (decisión del usuario 2026-07-30: no hay un
     dato identificable en el Excel para calcularlo automáticamente, se ingresa a mano el "%
     cumplimiento" en la hoja `🎯 Objetivos` del Sheet, igual patrón que FGR/CO2/otros
     objetivos manuales de Euro/Gespania/Ando).
- Metas de valorización: **`CCU_METAS` hardcodeado** (nueva constante, junto a
  `ABASTIBLE_METAS`/`COPEC_METAS_DEFAULT`) — `{'NPR - Embotelladora Renca': 96, 'CirCCUlar':
  60}`. Usado directamente (no vía `metasFromSheets` ni una función dinámica como
  `getPmsMetas()`) porque, a diferencia de PMS, las sucursales y sus metas ya se conocían de
  antemano.
- `generaTotalResiduos` incluye a CCU (`esCcu` en `processData()`) — mismo patrón que
  Ando/PMS: el Sheet clonado ya trae las pestañas `Total Residuos` (7 columnas, sin `Tons.
  CO2eq. evitadas` ni `Año`) y `RESPEL`. `Code-CCU.gs` usa `numCols = 7` en
  `writeTotalResiduos`.
- **Lección aplicada de PMS**: se agregó `'ccu'`/`empresaActual==='ccu'` a las 3 listas
  hardcodeadas de empresas en un solo paso (`generaTotalResiduos` en `processData()`,
  `metasActuales`+`filasTotalResiduos` en `autoSync()`, y `metas` en
  `renderCopecObjetivos()`) para no repetir el bug de "Total Residuos nunca sincroniza" que
  pasó al agregar PMS (ver sección de bugs arriba).

### Acciona (agregada 2026-07-31)
- Sheet ID: `1t89jBSO8bQ7XXhh-CYQ2bs9cC-Ph-WVv9kbCCvEBqAk` (título "Acciona" en Drive, creado
  2026-07-31 — clon vacío de la plantilla "Portal de Trazabilidad", igual punto de partida
  que PMS/CCU/Euro/Ando/Salfa/Gespania).
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbz8gVOfQIf77WRLMbhdJ8ZkcI3LbIPzenh91k42npKetDOXax8Dx54V4UZm98KahiiV/exec`
  (desplegado 2026-07-31, corriendo `Code-Acciona.gs`, aún no verificado con `doGet` real —
  ver pendiente abajo).
- Sucursales: **sin definir aún** — la hoja `Contactos` del Sheet está vacía; se derivarán
  automáticamente del Excel de trazabilidad que suba el usuario (mismo patrón que
  Euro/Ando/Salfa/Gespania/PMS/CCU, no hardcodeadas en el JS).
- `trazCols` igual que Ando/PMS/CCU (sin `Transportista (nombre)`, coincide con el header
  real de `📊 Trazabilidad_Docs` del Sheet clonado). Ese header además trae una columna extra
  al final, `Comentario por sucursal`, que no está en `trazCols` — mismo quirk exacto que
  Ando (`writeTrazabilidad` borra y reinserta la fila completa en cada sync, así que un
  comentario manual en esa columna se pierde al sincronizar; no se resolvió, mismo criterio
  que Ando).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (patrón
  estándar).
- La pestaña `Objetivos 2026` del Sheet clonado ya traía 4 objetivos con texto específico de
  Acciona (no el genérico de plantilla) al momento de crear la empresa — se usaron tal cual:
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar.
  2. `Superar el 40% de valorización de residuos (sin considerar escombro, arena y
     excavación)` — **no** se agregó como fila de objetivo propia en `EMPRESAS.acciona.objetivos`
     (decisión del usuario 2026-07-31, mismo criterio usado con Euro/PMS: ya queda cubierto
     por las filas genéricas % Real/% Acumulado/Meta 2026 que muestra la tabla de Objetivos
     para cualquier empresa). Lo que sí cambió es el cálculo del propio %: en `processData()`
     se agregó `esEscombroArena = esAcciona && (residuo==='escombro'||residuo==='arena')`
     (comparación normalizada sin tildes vía `normResiduo()`), sumado a `excluirDeVal` junto
     a la exclusión de Excavación ya existente para todas las empresas. **Solo para Acciona**
     (decisión del usuario 2026-07-31, igual patrón que la exclusión de Respel que es
     exclusiva de Copec) — Escombro/Arena siguen contando normalmente para las demás 8
     empresas. Esta exclusión es solo del %valorización, no de trazabilidad (Escombro/Arena
     sí exigen sus documentos normales, a diferencia de Excavación que también se excluye de
     trazabilidad).
  3. `Segregación de residuos (Madera, pallet, vidrio, fierro, PET, RESPEL, plumavit, PVC,
     Film Stretch)` — reutiliza el tipo `valorizar_especificos` que ya existía para Euro
     ("Valorizar fierro, madera, cartón"), sin cambios de código: es genérico para cualquier
     lista de N residuos (`obj.residuos`), calcula % anual = (residuos de la lista valorizados
     al menos una vez en el año) / N. Config: `residuos:['Madera','Pallet','Vidrio','Fierro',
     'PET','RESPEL','Plumavit','PVC','Film Stretch']` (9 ítems, decisión del usuario
     2026-07-31 sobre cómo calcular este objetivo automáticamente — comparación normalizada
     sin tildes, igual que Euro).
  4. `Apoyar en obtención de puntos para certificación CES en temas de innovación y economía
     circular` — tipo `manual` (confirmado por el usuario 2026-07-31): no hay dato en el
     Excel de trazabilidad que permita calcularlo, se ingresa a mano el "% cumplimiento" en
     la hoja `🎯 Objetivos` del Sheet, mismo patrón que FGR/CO2/otros objetivos manuales de
     Euro/Gespania/Ando/CCU.
- Metas de valorización: **editables por sucursal desde la app** (decisión del usuario
  2026-07-31), mismo patrón que Copec — `getAccionaMetas()`/`saveAccionaMetas()`
  (localStorage key `acciona_metas`) calcadas de `getCopecMetas()`/`saveCopecMetas()`. Se
  agregó un pequeño dispatcher (`getMetasEditablesActuales()`/`saveMetasEditablesActuales()`/
  `metaDefaultEditable()`) para que `openMetasEditor()` y su handler de guardado (antes
  hardcodeados a Copec) sirvan a cualquiera de las 2 empresas con metas editables sin
  duplicar esas ~30 líneas. El botón "✎ Editar metas" y la fila "Meta 2026" en la tabla
  agrupada de Valorización ahora se muestran para `empresaActual==='copec'||'acciona'` en
  vez de solo Copec (3 call sites de visibilidad del botón + 1 de la fila).
  - **Bug encontrado y corregido (2026-07-31)**: al agregar Acciona, `ACCIONA_METAS_DEFAULT`
    se dejó como objeto vacío `{}` (a diferencia de `COPEC_METAS_DEFAULT`, que ya trae valores
    por sucursal conocida) porque las sucursales de Acciona no se conocían de antemano.
    Resultado: tras subir el Excel real, la fila "Meta %" nunca se sincronizaba a la hoja
    `♻️ Valorización` (el usuario reportó "falta la meta de valorización en el excel") — mismo
    mecanismo de `autoSync()` que omite la fila si `metasActuales[suc]` es `undefined` (ver
    bug #8 de la lista general), y como no había ningún default, siempre era `undefined` hasta
    que alguien abriera "Editar metas" a mano. Corregido reemplazando la constante estática por
    `getAccionaMetasDefault()` (función, mismo patrón que `getPmsMetas()`): genera
    dinámicamente `{sucursal: 40}` para todas las `sucursales` actuales (`ACCIONA_META_PCT_DEFAULT
    = 40`, tomado del objetivo "Superar el 40% de valorización..."). `getAccionaMetas()` ahora
    mergea `getAccionaMetasDefault()` (en vez de la constante vacía) + `metasFromSheets` +
    `localStorage`, así que el 40% se sincroniza automáticamente apenas se sube el Excel, sin
    perder la posibilidad de editar el valor por sucursal desde la app (lo guardado en
    localStorage sigue prevaleciendo sobre el default).
- `generaTotalResiduos` incluye a Acciona (`esAcciona` en `processData()`) — el Sheet
  clonado ya trae las pestañas `Total Residuos` (7 columnas, sin `Tons. CO2eq. evitadas` ni
  `Año` — igual que Ando/PMS/CCU) y `RESPEL` (lista estándar). `Code-Acciona.gs` usa
  `numCols = 7` en `writeTotalResiduos`, mismo patrón que `Code-Ando.gs`/`Code-PMS.gs`/
  `Code-CCU.gs`.
- **Lección aplicada de PMS/CCU**: se agregó `'acciona'`/`empresaActual==='acciona'` a las
  3 listas hardcodeadas de empresas en un solo paso (`generaTotalResiduos` en
  `processData()`, `metasActuales`+`filasTotalResiduos` en `autoSync()`, y `metas` en
  `renderCopecObjetivos()`), más el `valMetas` de `renderVal()` (propio de las empresas con
  metas editables), para no repetir el bug de "Total Residuos nunca sincroniza".
- **Excepción de trazabilidad para Madera (agregada 2026-07-31, solo Acciona)**: a pedido
  del usuario, la Madera no exige el documento "Disposición final" para contar como completa
  en "100% trazabilidad" — pero sí sigue exigiendo Transportista (a diferencia de la
  excepción de CDL/Orgánicos, que excluye ambos). Implementado en `calcObjetivos()`
  (rama `obj.tipo==='trazabilidad'`) con una variable nueva `excluirSoloDisp =
  empresaActual==='acciona' && normResiduo(r.residuo)==='madera'` y un set
  `docsExcSoloDisp={disp:1}`, chequeados junto a (pero por separado de) la excepción
  existente `excluirTranspDisp`/`docsExcEspecial` de CDL/Orgánicos, en los 3 lugares que
  recorren `trazSM` (cálculo del %, detalle "✓ residuos completos", y detalle de
  documentos faltantes).

## Apps Script (estructura común a las 3 empresas originales; Gespania, Salfa, Euro y Ando siguen el mismo esquema)
Cada empresa tiene su propio Google Sheet con 3 hojas, headers en fila 5, datos desde fila 6:
- `♻️ Valorización` — columnas: `empresa_id | Sucursal | Tipo | Enero...Diciembre` (Tipo = "% Real" o "Meta %")
- `📊 Trazabilidad_Docs` — columnas: `empresa_id | Sucursal | Mes | Residuo | Transportista(nombre) | Código LER | Importaciones | Cert. tratamiento | Factura | Cert. declaración | Transportista | Disposición final`
- `🎯 Objetivos` — columnas: `empresa_id | Sucursal | Mes | Objetivo | % cumplimiento | Detalle`

Funciones del Apps Script (`doPost`, `doGet`):
- `writeValorizacion` — borra filas por `empresa_id` coincidente, inserta nuevas
- `writeMetas` — actualiza SOLO las filas "Meta %" in situ (no toca "% Real"), para que
  editar metas desde la app no borre los datos reales
- `writeTrazabilidad` — dedup por `empresa_id + Residuo` (columna índice 2)
- `writeObjetivos` — **IMPORTANTE**: para Socovesa se corrigió para borrar solo por
  `empresa_id + mes` (no por prefijo completo), para no perder histórico al cargar Excel
  de meses distintos. Verificar que Copec/Abastible también tengan esta lógica correcta.
- `doGet` — devuelve `{valorizacion, trazabilidad, objetivos}` como arrays de objetos,
  usando los headers de fila 5 como claves.

## Lógica clave del JS (funciones principales)

- `isValorizado(trat)` — determina si un tipo de tratamiento cuenta como valorización.
  Normaliza Unicode (NFD, quita tildes) antes de comparar contra `VALORIZADOS_LIST`.
- `processData()` (regla agregada 2026-07-24, aplica a las 5 empresas): una operación del
  Excel con `Control de Peso (Kg) === 0` NO se considera para efectos de trazabilidad — no
  incrementa `Importaciones` ni los conteos de documentos, así que no entra en el cálculo de
  `100% trazabilidad` ni en "Documentos adicionales" (y de rebote tampoco en KPI costo/ingreso,
  que se calcula desde el mismo grupo). SÍ sigue sumando a `valMatrix` (% valorización) y a
  `Total Residuos`, porque el pedido fue específicamente "para efectos de trazabilidad".
- `calcObjetivos()` — función central que calcula TODOS los objetivos (trazabilidad,
  sinader, kpi_costo, anuales) para todas las sucursales/meses desde `rawRows` (datos del Excel).
  Devuelve array de `{suc, mes, mesKey, obj, estado, detalle, anual, infoOnly}`.
- `estadoCell(estado, detalle)` — helper que renderiza una celda de estado con color
  (verde/amarillo/rojo según objColor) + mini barra de progreso + detalle HTML debajo.
- `objColor(estado)` — verde ≥100%, amarillo ≥60%, rojo <60%; "OK" verde, "No" rojo.
- `getPct(suc, mes)` / `getAcum(suc, mes)` — calculan % de valorización mensual/acumulado
  desde `valMatrix`. Manejan el caso `fromSheets:true` donde el valor ya viene como %
  directo (no como kg/total).
- `renderCopecObjetivos()` — renderiza la tabla de objetivos en formato "columnas por mes"
  (usado por Copec y Abastible). Lee de `calcObjetivos()` si hay Excel cargado, o de
  `sheetsObjetivosData` si los datos vienen del Sheet.
- `renderObjetivos()` / `makeTableSection()` — renderiza formato "filas por objetivo+mes"
  (usado por Socovesa).
- `loadSheetsData(data)` — procesa la respuesta del `doGet` y puebla `valMatrix`, `trazRows`,
  `sucursales`, `mesesDisp`. Tiene protecciones null (`if (!row) return`) porque el Sheet
  puede traer filas vacías o con formato inconsistente.
- `resetData()` — limpia todo el estado visual e interno al cambiar de empresa.

## Bugs resueltos importantes (para no repetirlos)
1. Template literals anidados rompían el parser → todo el JS usa concatenación de strings, no ES6 template literals con backticks anidados.
2. El operador `||` trata `0` como falso — esto causó bugs donde `estado = 0` (0%) se leía
   como string vacío. Se corrigió comparando explícitamente contra `undefined`/`null`/`''`.
3. Porcentajes del Sheet vienen en 3 formatos posibles: decimal 0-1 (`0.05` = 5%), string
   con % (`"5.2%"`), o coma decimal (`"0,00%"`). Hay que detectar el formato antes de convertir.
4. `Object.keys(valMatrix[suc])` fallaba cuando una sucursal solo existía en trazabilidad
   pero no en valorización (ej. Edificio Eliodoro Yañez en Socovesa) → siempre verificar
   `if (!valMatrix[suc]) return` antes de iterar.
5. Sucursales duplicadas en el Sheet por cambios de nombre entre cargas (ej. "Olimpia III"
   → "Parque Olimpia III - Socovesa sur") requieren limpieza manual del Sheet + alias en `SUC_ALIAS`.
6. La app solo funciona sirviéndose por HTTP (no `file://`) por CORS — pendiente subir a GitHub Pages.
7. **Race condition al cambiar de empresa rápido** (encontrado y corregido 2026-07-27, reportado
   por el usuario con Ando: `Error: Unexpected token '<'... no es JSON válido`, y por separado
   sucursales de Copec mezcladas con las de Ando). `loadSheetsData()` capturaba
   `empresaAlCargar = empresaActual` **dentro** de su propio callback (que corre síncronamente
   dentro del `.then()` del fetch), así que la comparación de guarda al final siempre se
   comparaba contra sí misma y nunca bloqueaba nada — si el usuario cambiaba de empresa
   mientras un `fetch` anterior (ej. el auto-load de Copec al abrir la página) seguía en
   vuelo, esa respuesta tardía igual mutaba `sucursales`/`mesesDisp`/`valMatrix`/los
   `<select>` de la empresa que ya no estaba activa. Arreglado capturando
   `empresaAlIniciar = empresaActual` en `loadFromSheets()` **antes** de lanzar el `fetch`, y
   chequeando `empresaActual !== empresaAlIniciar` al inicio de los callbacks `.then()`/`.catch()`
   (no al final de `loadSheetsData()`) — si la empresa activa cambió, la respuesta tardía se
   descarta por completo, sin tocar ningún estado global.
8. **`writeValorizacion` borraba la fila "Meta %" al subir un Excel** (encontrado 2026-07-27,
   con Ando/Terminal Bus: la Meta % de 5% quedó vacía tras subir el Excel). Causa: `autoSync()`
   siempre reenvía las 3 filas (% Real/% Acumulado/Meta %) por sucursal, pero si `metasFromSheets`
   todavía no se cargó (ej. se sube el Excel antes de que "Cargar desde Sheets" —disparado al
   seleccionar la empresa— termine de resolver), `metasActuales[suc]` es `undefined` y se
   reenviaba una `Meta %` vacía. Como `writeValorizacion` en el Apps Script borraba TODAS las
   filas que compartieran `empresa_id` (sin filtrar por `Tipo`), el reenvío de solo 2 filas
   (% Real/% Acumulado) igual borraba la Meta % existente y la dejaba vacía. Arreglado en 2
   partes: (a) `autoSync()` ahora omite la fila `Meta %` por completo cuando `metasActuales[suc]`
   es `undefined`, en vez de mandarla vacía; (b) `writeValorizacion` (los 6 `.gs`) ahora borra por
   `empresa_id+Tipo` (mismo patrón que `writeTrazabilidad`/`writeObjetivos`), no solo por
   `empresa_id`, así que omitir una fila realmente la deja intacta en el Sheet en vez de
   borrarla. **Pendiente:** redesplegar el `.gs` actualizado en las 6 empresas — los que ya
   estaban en producción (Copec/Abastible/Socovesa/Gespania/Salfa/Euro/Ando) siguen con la
   versión vieja y vulnerable hasta que se repegue el código. Mientras tanto, si a alguna
   sucursal se le borró la Meta %, hay que volver a escribirla a mano en el Sheet.

## Total Residuos + RESPEL (Copec y Abastible desde 2026-07-24)
El Sheet de Copec tiene 2 hojas adicionales a las 3 comunes, exclusivas de Copec:
- `Total Residuos` — headers: `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas`
  (Copec/Abastible/Gespania/Salfa/Euro) — Euro además tiene una columna `Año` extra en la
  posición B (`Sucursal | Año | Mes | ...`), exclusiva de esa empresa (ver más abajo). Una
  fila por combinación única Sucursal+Mes+Residuo+Valorizado/No Valorizado+Respel/No Respel
  (un mismo residuo puede generar 2 filas en un mes si tuvo operaciones valorizadas y no valorizadas).
  Se llena automáticamente desde el Excel de trazabilidad (`processData()` en el JS), igual que
  ♻️ Valorización y 📊 Trazabilidad_Docs — no se llena a mano.

**Tons. CO2eq. evitadas** (agregada 2026-07-27): última columna, no se calcula — viene
directamente del Excel de trazabilidad en la columna `Tons. CO2eq. evitadas` (ya expresada en
toneladas por el sistema origen — el nombre de columna real del Excel no coincidía con lo que
leía el código, `Ton CO2 eq evitadas`, corregido el 2026-07-27 tras confirmarlo con el usuario).
`processData()` la suma por `trKey` igual que kg/m3 (mismo agrupamiento por
Sucursal+Mes+Residuo+Valorizado+Respel). Aplica a Copec, Abastible, Gespania, Salfa y Euro —
**no** a Ando (agregada después, ver sección "Ando" más abajo), `writeTotalResiduos` de esas 5
sigue con `numCols = 8`.

**Año** (agregada 2026-07-27, **exclusiva de Euro** — decisión tomada el mismo día tras
confirmar con el usuario que no aplica a las demás empresas): columna 2 (B) solo en el Sheet
de Euro, calculada en `autoSync()` como `r.mes.slice(0,4)` (el `mes` interno sigue siendo
`"YYYY-MM"`, solo se toma la parte del año) y solo cuando `empresaActual==='euro'` (variable
`generaAnioTR` en `autoSync()`). Motivada porque el Sheet de Euro ya traía esta columna
agregada a mano en su pestaña `Total Residuos` pero quedaba siempre vacía. `Code-Euro.gs` es
el único de los 5/6 `.gs` con `numCols = 9`; los demás (Copec/Abastible/Gespania/Salfa) quedan
en `numCols = 8` (con CO2eq, sin Año) y Ando en `numCols = 7` (sin ninguna de las 2).
- `RESPEL` — headers: `Residuo | RESPEL` (TRUE/FALSE), ~55 residuos mapeados. Fuente de verdad para
  clasificar qué residuos son Respel. Se lee vía `doGet` y se cachea en `respelSet` (JS). Si `respelSet`
  está vacío (Sheet aún no cargado), `isRespel()` cae a un fallback por nombre (substring "respel").

**Abastible también genera "Total Residuos"** (agregado 2026-07-24): el JS usa la variable
`generaTotalResiduos = esCopec || esAbastible` para decidir si arma `totalResiduosRows` y sincroniza
la hoja `Total Residuos`. Abastible NO tiene hoja `RESPEL` propia — `isRespel()` usa el fallback por
nombre (substring "respel"), que ya clasifica correctamente porque Abastible tiene un residuo llamado
literalmente "RESPEL" en sus datos. El Sheet de Abastible necesita la pestaña `Total Residuos` creada
manualmente (mismos headers que Copec) y su Apps Script necesita el parche en
`Code-Abastible-patch.gs` (raíz del repo) para soportar `tipo:'totalResiduos'` en `doPost`.

**Cálculo de %Real/%Acumulado**: para Copec excluye SIEMPRE los residuos Respel (decisión tomada
2026-07-22): `processData()` construye `valMatrix` sumando kg solo de filas no-Respel (variable
`excluirDeVal = esCopec && respel`), así que `getPct`/`getAcum` ya excluyen Respel sin cambios propios.
**Para Abastible NO se excluye Respel del %** (decisión tomada 2026-07-24 al extender "Total Residuos"
a Abastible) — el % sigue incluyendo todos los residuos, solo cambia que ahora también se puebla la
hoja "Total Residuos" con la clasificación Valorizado/Respel por fila.
`autoSync()` también escribe una fila `% Acumulado` en ♻️ Valorización (antes solo se escribía `% Real`
y `Meta %`; la fila `% Acumulado` ya existía vacía en el Sheet pero nada la llenaba).

**Excavación excluida del % de valorización en TODAS las empresas** (decisión tomada 2026-07-24):
en `processData()`, `excluirDeVal` ahora también es `true` cuando `normResiduo(residuo) === 'excavacion'`
(comparación normalizada, sin tildes), sin importar la empresa — a diferencia de la exclusión de Respel
que es solo para Copec. Las operaciones de Excavación no suman ni al total ni al valorizado de
`valMatrix`, así que no afectan `% Real`/`% Acumulado` de ninguna sucursal. Sigue sumando normalmente
a `Total Residuos` (no se tocó esa parte).

**Excavación excluida también de trazabilidad en TODAS las empresas** (corregido 2026-07-28):
la exclusión de 2026-07-24 de arriba solo tocaba `valMatrix` (% valorización) — `trazMap` (la
estructura que alimenta `trazRows`, y por lo tanto "100% trazabilidad"/"Documentos adicionales"/
SINADER/KPI costo en `calcObjetivos()`) seguía contando las operaciones de Excavación como
cualquier otra. Se agregó `if (esExcavacion) return;` justo después del filtro por Estado
finalizado en `processData()` (antes del filtro de `kg === 0`), reutilizando la misma variable
`esExcavacion` ya calculada para el % de valorización. Sigue sumando normalmente a
`Total Residuos` (ese bloque corre antes de este `return` y no se tocó).

**Apps Script pendiente de agregar manualmente** (no hay acceso de edición directa al proyecto
de Apps Script desde aquí — vive en Google, no en este repo). El Code.gs real de Copec tiene
DOS doGet fusionados: `doGetClasico_` (el que consume `valorizacion-recylink.html`, sin query
params) y `doGetVisor_` (otro desarrollo distinto, activado por `?callback=`/`?visor=1` — no tocar).
Falta agregar en `doGetClasico_`/`doPost`:
1. `doGetClasico_` debe agregar `respel: readRespelSheet_()` al objeto `result` que devuelve
   (hoy solo devuelve `{valorizacion, trazabilidad, objetivos}`).
2. `doPost` debe agregar el caso `tipo === 'totalResiduos'` → `writeTotalResiduos(ss, data)`.
3. Ni "Total Residuos" ni "RESPEL" tienen las filas decorativas de título que sí tienen las 3
   hojas principales (headers en fila 5) — el header está en una fila distinta, por eso las
   funciones nuevas ubican el header buscando "Sucursal"/"Residuo" en columna A en vez de asumir
   fila fija.
- Código completo y listo para copiar/pegar (Code.gs fusionado con estos 3 cambios ya
  integrados) en `Code.gs` en la raíz del repo.

## Panel de salud multi-empresa + análisis estadístico (agregado 2026-08-20)
Nueva funcionalidad grande, probada en vivo contra las 10 empresas reales y funcionando: un
panel lateral (drawer) que muestra la salud de **todas** las sucursales de **todas** las
empresas a la vez, sin necesidad de subir ningún Excel, más una ventana de análisis estadístico.

**Decisiones de diseño (confirmadas por el usuario)**:
- Carga las 10 empresas automáticamente al abrir la app (una vez, cacheado en memoria), con
  botón "↻ Actualizar" para refrescar a demanda — punto medio entre "recargar siempre" (más
  lento, 10 peticiones cada vez) y "solo empresas visitadas" (más liviano pero incompleto).
- Ranking a nivel de **empresa** (promedio de sus sucursales) con toggle Peor→Mejor/Mejor→Peor,
  y dentro de cada empresa (expandible) sus sucursales en el mismo orden.
- Ventana de análisis: distribución de sucursales por estado (Acción/Atención/OK, conteo y %) +
  gráfico de torta con esos mismos 3 estados (agregado a pedido del usuario) + gráfico de barras
  comparando la salud promedio entre empresas (ambos con Chart.js, ya usado en el gráfico de
  Valorización — `statsPieChartInst` y `statsChartInst`, cada uno con su propio `<canvas>`).

**Implementación** (`valorizacion-recylink.html`, sin cambios de Apps Script):
- Todas las funciones de cálculo son **standalone** — reciben el payload crudo del `doGet` de
  cada empresa como parámetro y no tocan ningún estado global de la empresa activa
  (`valMatrix`/`sucursales`/`rawRows`/`metasFromSheets`/`acumFromSheets`/etc.), para poder
  calcular las 10 en paralelo sin pisar lo que el usuario está viendo en pantalla:
  - `parseObjetivosRows_(objetivosRows)` — mismo parseo que ya usaba `renderCopecObjetivos()`
    en modo Sheets, **extraído y refactorizado** para reusarlo en ambos lugares (evita duplicar
    la lógica en 2 sitios que se desincronicen con el tiempo).
  - `parseValorizacionRows_(valorizacionRows)` — extrae sucursales, `Meta %` y `% Acumulado`
    por sucursal desde las filas crudas de la hoja Valorización.
  - `resolveMetaEmpresa_(companyId, sucursalesList, metaFromSheet)` — mismo orden de prioridad
    que ya usa cada empresa (fija en código > Sheet > localStorage), parametrizado por empresa
    en vez de depender de `empresaActual`.
  - `isSucExcluidaFija_(suc)` — mismo `SUCURSALES_EXCLUIDAS`, pero sin las "sucursales
    cerradas" por localStorage de la empresa activa (esa es una preferencia de UI del
    navegador de quien está viendo, no un dato del Sheet — limitación conocida y aceptada).
  - `calcSaludEmpresa_(companyId, data)` — combina todo lo anterior + `scoreObjSalud_` (ya
    existente) para devolver `[{suc, pct, estado}, ...]` de una empresa, mismo criterio exacto
    que el "% global" de la empresa activa.
  - `cargarSaludTodas()` — `Promise.all` sobre `Object.keys(EMPRESAS)`, cada una con su propio
    `fetch(scriptUrl, {mode:'cors'})`; guarda resultados en `saludPorEmpresa` (o `'error'` si
    falla esa empresa puntual, sin tumbar las demás) y llama `renderSaludPanel()`.
- UI nueva: botón flotante `🏥` (fixed, borde izquierdo) abre un drawer (`position:fixed`,
  `translateX` para animar entrada/salida) con la lista de empresas expandibles + modal de
  estadísticas (overlay centrado). CSS agregado al final del `<style>` existente, HTML agregado
  como hermano de `.app` (no dentro, para que el `position:fixed` no herede el `max-width`
  centrado del layout principal).
- `renderCopecObjetivos()` se refactorizó para llamar a `parseObjetivosRows_()` en vez de tener
  la lógica de parseo duplicada inline.

**"Fijar" panel agregado (mismo día, a pedido del usuario)**: por defecto, abrir el panel muestra
un overlay oscuro que tapa el resto de la pantalla — no se puede ver el ranking y el contenido
principal a la vez. Botón "📌" nuevo en el header del drawer: al fijar, el panel queda abierto
permanentemente **al lado** del contenido (sin overlay — `.app` se corre a la derecha via la
clase `.app-con-salud`, `margin:0 0 0 336px`), y la preferencia se guarda en
`localStorage.salud_pinned` para que persista entre recargas (`abrirSaludDrawer()` se llama en
`DOMContentLoaded` si estaba fijado). Cerrar con "×" siempre desfija (no solo cierra) — modelo
mental simple: fijado = panel lateral no bloqueante, sin fijar = drawer/modal que tapa hasta
cerrarlo. `irASaludDestino()` (navegación) ya no cierra el panel si está fijado, para que se
pueda seguir navegando entre empresas/sucursales sin perderlo de vista. Probado en vivo:
fijar mantiene el contenido interactivo (cambio de pestaña funcionó con el panel abierto),
persiste tras recargar, y "×" desfija correctamente.

**Navegación agregada (mismo día)**: click en una sucursal del panel navega directo a la
pestaña Objetivos de esa empresa con esa sucursal ya seleccionada en el filtro (`f-obj-suc`);
un ícono `↗` junto al nombre de cada empresa navega a sus Objetivos en general ("Todas" las
sucursales). Nueva función `irASaludDestino(companyId, sucursal)`: replica el mismo mecanismo
que ya usa el selector de empresa (`empresaActual = id`, `resetData()`, activar pill/tab), y
encadena `.then()` sobre `loadFromSheets()` para fijar el filtro de sucursal una vez que
terminó de cargar — para esto `loadFromSheets()` ahora hace `return fetch(...)` (antes no
retornaba la promesa, nadie la necesitaba encadenar desde afuera). Probado en vivo: clic en
"Novatec Pucará" (Salfa) llevó correctamente a Salfa/Objetivos con esa sucursal seleccionada;
clic en el ↗ de Gespania llevó a Gespania/Objetivos con "Todas".

**Bug real encontrado y corregido durante la prueba en vivo (2026-08-20)**: Salfa mostraba
`NaN%` — la sucursal "Novatec Pucará" tiene `Meta % = 0` (nunca configurada) y `% Acumulado = 0`,
así que `acum/meta*100` = `0/0*100` = `NaN`, que se propaga a través de la suma del promedio y
contaminaba el % de salud de **toda la empresa**, no solo esa sucursal. Corregido agregando
`meta > 0` a la condición en **ambos** lugares donde se hace este cálculo (`calcSaludEmpresa_`
del panel multi-empresa, y el `pctGlobal` de la empresa activa en `renderCopecObjetivos()` —
mismo bug potencial ahí, aunque no se había manifestado todavía). Encontrado probando contra
datos reales de las 10 empresas vía Claude en Chrome, no solo revisando el código.

**Sucursales cerradas excluidas del panel de salud (2026-08-21)**: `calcSaludEmpresa_()` solo
excluía sucursales de la lista fija `SUCURSALES_EXCLUIDAS`, ignorando las "🏢 Sucursales
cerradas" que el usuario marca a mano por empresa (feature existente, guardada en
`localStorage['sucursales_excluidas']`, gestionada por `getSucursalesExcluidasUI()`/
`setSucursalesExcluidasUI()`). Corregido: `getSucursalesExcluidasUI(companyId)` ahora acepta
un `companyId` opcional (antes solo leía `empresaActual`, que no sirve al calcular las 10
empresas en paralelo desde el panel); y la función de exclusión (renombrada
`isSucExcluidaParaSalud_(companyId, suc)`) chequea ambas listas — la fija y la de cerradas de
esa empresa. Así una sucursal cerrada desde el botón de una empresa deja de contar en el
promedio de salud de esa empresa en el panel multi-empresa.

**Gráfico de barras del análisis estadístico no mostraba todos los nombres de empresa
(2026-08-21)**: el contenedor `.chart-wrap` tiene alto fijo (300px) y Chart.js le hace
`autoSkip` a las etiquetas del eje de categorías cuando no entran todas en ese alto — con 10
empresas se salteaba varias. Corregido: el gráfico de barras ahora vive en un contenedor propio
con scroll (`max-height:340px;overflow-y:auto`) y un alto interno que crece con la cantidad de
empresas (`Math.max(300, n*34)` px), más `maintainAspectRatio:false` y
`scales.y.ticks.autoSkip:false` para forzar que se dibujen todas las etiquetas.

**N° de sucursales por empresa en el panel de salud (2026-08-21)**: `renderSaludPanel()` ahora
muestra la cantidad de sucursales junto al nombre de cada empresa en la cabecera de su fila,
p.ej. "Euro (9 suc.)". Es simplemente `f.sucs.length` (el arreglo ya calculado por
`calcSaludEmpresa_`, después de aplicar la exclusión de sucursales cerradas/fijas); no se
muestra el "(0 suc.)" cuando no hay datos, ya que ese caso ya se distingue con la etiqueta
"Sin datos"/"Error" del promedio.

## 3 estados de salud: Acción/Atención/OK (agregado 2026-08-20)
Se agregaron etiquetas de texto al indicador de "% global"/salud de la sucursal, con umbrales
nuevos (antes eran 100/60 con solo color, sin etiqueta):
- **0-49%** → **"Acción"**, rojo.
- **50-74%** → **"Atención"**, amarillo.
- **75-100%** → **"OK"**, verde.

Se muestra como `"OK · 82%"` (etiqueta + porcentaje) junto al nombre de la sucursal, en vez de
solo el número. Los umbrales de color (`colorGlobal`) se movieron de 100/60 a 75/50 para que
coincidan exactamente con los 3 rangos.

## % de valorización vs. meta vuelve a contar para la salud (ajuste 2026-08-20)
Al rehacer el "% global" como promedio de `emp.objetivos`, se perdió sin querer el aporte del
% de valorización vs. meta para las empresas que **no** tienen una fila de objetivo explícita
para eso (la mayoría — solo Gespania/Ando tenían una, y se acaban de quitar de la UI). El
usuario aclaró que ese aporte debe seguir contando igual que antes del rediseño, para todas las
empresas, independiente de si hay una fila visible o no (mismo criterio "implícito" que ya
usaban Acciona/Euro, donde tampoco hay una fila de objetivo para esto).

- Se agregó `Math.min(100, acum/meta*100)` como **una unidad más** del arreglo `objScoresAll`
  (después de calcular los objetivos explícitos), solo cuando la sucursal tiene `meta` definida
  — si no, no aporta ni resta unidades del promedio. Mismo criterio para las 10 empresas.
- Con esto, quitar "valorizar un 5% de residuos en kg/peso" de la UI de Gespania/Ando **no**
  quita su aporte a la salud — el aporte real ahora viene directo de `meta`/`acum` (que ya se
  calculaban en el header de todas formas para las badges "Meta val."/"X% acum."), no de la fila
  de objetivo que se eliminó.

## Objetivos duplicados eliminados del visor (agregado 2026-08-20)
A pedido del usuario, se quitaron por completo de `EMPRESAS.gespania.objetivos` y
`EMPRESAS.ando.objetivos` las entradas **"valorizar un 5% de residuos en kg"** (Gespania) y
**"Valorizar un 5% de residuos en peso"** (Ando) — ya estaban documentadas desde que se agregaron
como duplicados en la práctica del % Real/Meta 2026 que ya muestra la tabla genérica de
Valorización, y ahora se quitaron del array en vez de solo dejarlas documentadas como redundantes.
Al no estar en `emp.objetivos`, desaparecen de toda la UI (tabla mensual, "Análisis anual", y del
promedio de "% global"/salud de la sucursal, que itera `emp.objetivos` completo) — no requiere
ningún otro cambio de código.

## Más objetivos convertidos a anuales (agregado 2026-08-20)
Mismo criterio que los anteriores (Contactar Nuevos proveedores / CES / FGR Socovesa):

- **Gespania — "Lograr un FGR de 0,2 m3/m2"**: `manual` → `manual_anual` (reutiliza el tipo,
  sin código nuevo).
- **CCU — "Gestionar Residuos Spot"**: `manual` → `manual_anual` (idem).
- **Ando — "Generar sensibilización, concientización y cultura ambiental"**: `manual` →
  `manual_anual`.
- **Salfa — "Asegurar una correcta segregación de residuos"**: caso distinto — este objetivo
  **sí tenía cálculo real** (`tipo:'segregacion'`, evaluado mes a mes: OK si ese mes aparece
  algún residuo que no sea Escombro/Excavación/Domiciliario). Se creó un tipo nuevo
  `segregacion_anual` (agregado a `OBJ_ANUALES`) con la misma lógica pero evaluada sobre
  **todo el año** (`rowsSuc` en vez de `trazSM` del mes) — OK si en cualquier mes del año
  apareció un residuo no genérico, detalle lista esos residuos. Se eliminó la rama mensual
  `tipo==='segregacion'` (quedó sin uso, ningún objetivo la referencia ya).

## Objetivo FGR de Socovesa pasó a ser anual (agregado 2026-08-20)
Mismo tratamiento que "Contactar Nuevos proveedores" (Euro) y CES (Acciona): el objetivo `fgr`
de Socovesa ("Obtener el FGR al finalizar cada proyecto") cambió de `tipo:'manual'` a
`tipo:'manual_anual'` — se reutiliza el tipo ya existente, sin código nuevo. Se ingresa como fila
"Anual" en 🎯 Objetivos y se muestra en "Análisis anual" en vez de la tabla mensual. No hay
conflicto con el `id:'fgr'` de Euro (que sí tiene cálculo automático) porque esa rama especial
está acotada a `empresaActual==='euro'` además de por `tipo`.

## Respel excluido de SINADER en TODAS las empresas (agregado 2026-08-20)
La exclusión de Respel de la exigencia de declaración SINADER (agregada 2026-08-04) estaba
acotada solo a Abastible (`empresaActual==='abastible' && isRespel(...)`). A pedido del usuario,
se sacó esa restricción — ahora aplica a las 5 empresas con objetivo `sinader` (Socovesa,
Abastible, Salfa, Gespania, Ando) por igual. `isRespel()` sigue funcionando igual para todas: usa
la hoja RESPEL si la empresa la tiene, y si no, cae al fallback por nombre (substring "respel").

## "% global" (salud de la sucursal) rehecho: promedio de TODOS los objetivos (2026-08-20)
El usuario cuestionó la fórmula anterior del "% global" que se muestra junto a cada sucursal en
la pestaña Objetivos: `(trazabilidad acumulada + cumplimiento de valorización) / 2` — solo 2
componentes fijos, ignorando el resto de los objetivos de la empresa (SINADER, KPI costo,
segregación, FGR, respel, manuales, etc.). Se reemplazó por un promedio real de **todos** los
objetivos definidos para esa empresa.

**Decisiones de diseño (confirmadas por el usuario)**:
- Cada **objetivo cuenta como 1 unidad** en el promedio final, sin importar si es mensual o
  anual — un objetivo mensual promedia primero sus meses con dato (ignora meses sin ningún
  registro, no los cuenta como 0) y ese promedio entra como un solo valor, para no pesar más que
  un objetivo anual solo por tener más meses con datos.
- Un objetivo **sin ningún dato en todo el año** (ni un mes, ni la fila anual) cuenta **0%**.
- Objetivos **informativos sin meta numérica** (ej. "Ton CO2 evitadas/M2", que nunca asigna
  `estado`, solo `detalle`) cuentan **100% si tienen algún valor calculado, 0% si no** — mismo
  criterio "existe dato = cumplido" que los objetivos sin dato.
- Aplica igual a las **10 empresas** (mismo código compartido, sin excepciones por empresa).

**Implementación**: nueva función `scoreObjSalud_(estado, detalle)` (convierte cualquier
`estado` a un número 0-100: `OK`→100, `No`→0, texto con "retiro" —ej. respel: "2 retiros"— →100
porque es texto de éxito no un %, número/porcentaje →tal cual con tope 100, sin estado pero con
detalle →100, sin nada →0) y el bloque de `pctGlobal` en `renderCopecObjetivos()` ahora itera
`emp.objetivos` completo (anuales vía `objAnualBySuc`, mensuales vía `objBySucMes` promediando
por mes) en vez de buscar solo la fila `"100% trazabilidad"` y la meta de valorización.
**Bug evitado en el diseño**: el objetivo `respel` de Socovesa nunca usa `"OK"`, usa un texto
como `"2 retiros"` cuando se cumple — sin el chequeo especial de la palabra "retiro",
`scoreObjSalud_` habría intentado leer "2" como 2% (`parseFloat` toma el número inicial de un
string), mostrando un cumplido real como casi-fallido.
- `meta`/`acum`/`colorAcum` (las badges "Meta val.: X%" y "Y% acum." del header, aparte del %
  global) no se tocaron — siguen mostrando lo mismo que antes, solo cambió el número/barra
  principal de "salud".

## "Apoyar en obtención de puntos para certificación CES..." pasó a ser anual (agregado 2026-08-20)
Mismo tratamiento que "Contactar Nuevos proveedores" (Euro): el objetivo `ces` de Acciona
cambió de `tipo:'manual'` a `tipo:'manual_anual'` (ya agregado a `OBJ_ANUALES` desde el cambio
anterior, sin código nuevo — se reutiliza directamente). Ahora se ingresa como fila "Anual" en
🎯 Objetivos y se muestra en la tabla "Análisis anual" en vez de la mensual.

## Code-Acciona.gs del repo desactualizado respecto al real (sincronizado 2026-08-20)
El usuario pegó el contenido de su Apps Script real de Acciona para confirmar el cambio de
volumen, y resultó tener funciones que no estaban en este repo: soporte JSONP (`?callback=`,
necesario porque el visor real de Acciona carga los datos con `<script src="...">` en vez de
`fetch()`) y manejo completo de una pestaña `Minuta` (`readMinutaRows_`/`writeMinutas`,
`?minutas=1` en `doGet`, `tipo:'minutas'` en `doPost`) — ninguna de las 2 documentada antes en
este archivo.

**Importante — regresión evitada**: esa versión real **no tenía** el fix de `writeObjetivos` del
2026-08-14 (borrar por `empresa_id+mes+Objetivo`, no solo `empresa_id+mes`) — el archivo del que
partió el JSONP/Minutas parece ser una copia previa a ese fix. Al sincronizar el repo con la
versión real, se **reaplicó** el fix de `writeObjetivos` sobre la base JSONP/Minutas (no se pisó).
**Pendiente del usuario**: pegar este `Code-Acciona.gs` combinado en el Apps Script real y
redesplegar, para que el fix de `writeObjetivos` quede vigente ahí también.

## Acciona mide % de valorización por volumen (m3), no peso (agregado 2026-08-19)
Mismo mecanismo que ya existía para Euro (única excepción hasta ahora): en `processData()`,
`metricaVal` reemplaza `kg` por `m3` en la acumulación de `valMatrix[suc][mes].total/val`. Se
cambió `var metricaVal = esEuro ? m3 : kg;` a `var metricaVal = (esEuro || esAcciona) ? m3 : kg;`
— una sola línea, reutilizando la variable `esAcciona` que ya existía en `processData()` (usada
para la exclusión de Escombro/Arena). Las demás empresas siguen midiendo por kg sin cambios.
`Total Residuos` sigue trackeando ambos (kg y m3) igual que siempre, no se tocó — el cambio es
solo en el % de valorización mostrado en la pestaña Valorización y usado por `getPct`/`getAcum`.

## "Contactar Nuevos proveedores" pasó a ser objetivo anual (agregado 2026-08-19)
El usuario ya venía ingresando este objetivo (`tipo:'manual'`, definido para renderizarse en la
tabla mensual) como una fila **"Anual"** en 🎯 Objetivos — no calzaba con ningún mes de la tabla
mensual ni con la tabla "Análisis anual" (que solo itera objetivos cuyo `tipo` está en
`OBJ_ANUALES`), así que no se veía en ningún lado pese a tener datos reales cargados.

- Se agregó un tipo nuevo **`manual_anual`** (genérico, sin cálculo — puramente para que un
  objetivo de ingreso manual se renderice en "Análisis anual" en vez de la tabla mensual) y se
  agregó a `OBJ_ANUALES`. `proveedores` (Euro) ahora usa este tipo.
- El push de resultados anuales en `calcObjetivos()` ahora tiene un gate `if(estado)` (antes
  incondicional) — necesario porque `manual_anual` nunca asigna `estado` (no hay cálculo, se lee
  tal cual desde el Sheet), y sin el gate se mandaría un estado vacío en cada sincronización,
  borrando el valor ya ingresado a mano (mismo problema ya corregido antes para los manuales
  mensuales). Los demás tipos anuales existentes (`valorizar_residuo`, `reg_valorizar`, `respel`,
  `valorizar_especificos`, `acompanamiento_anual`) siempre asignan un estado no vacío, así que
  este gate no les cambia el comportamiento.
- **Aviso al usuario sobre mayúsculas**: escribió "Ok" (no "OK") en la columna `% cumplimiento` —
  el sistema compara ese valor exacto (`estado==='OK'`) para pintarlo verde y contarlo como
  cumplido en el resumen de la sucursal; con "Ok" se sigue mostrando (cae al color por defecto),
  pero no cuenta como "cumplido" en el conteo agregado. Se le recomendó usar "OK" en mayúsculas
  para los próximos objetivos manuales tipo OK/No.

## "Ton CO2 evitadas/M2" ahora también se muestra en el visor (agregado 2026-08-19)
Cambio de decisión del usuario: originalmente "Ton CO2 evitadas/M2" quedaba solo escrito en
`%avance`, sin tocar el visor. Ahora también se muestra ahí, pero puramente informativo (sin
barra de cumplimiento ni color, ya que no tiene meta) — mismo patrón visual que "Documentos
adicionales" de Copec/Abastible (`estado:''` + `detalle` con el texto, `infoOnly:true`).
Implementado en `calcObjetivos()`: nueva rama `obj.tipo==='manual' && empresaActual==='euro' &&
obj.id==='co2'` que arma el `detalle` desde `fgrCo2EuroCalc` (mismo dato ya calculado para FGR),
con un `results.push` aparte del gate normal `if(estado)` (que de por sí no dispararía, ya que
esta rama nunca asigna `estado`) — mismo mecanismo que usa Copec para su fila extra de
"Documentos adicionales". El valor se formatea con `toSigFigs(valor, 5)` (5 cifras
significativas, agregado el mismo día a pedido del usuario).

## "Acompañamiento en terreno" pasó a ser objetivo anual (agregado 2026-08-19)
A pedido del usuario: este objetivo (antes calculado mes a mes, tipo `manual`) pasó a ser
**anual** — se agregó un tipo nuevo `acompanamiento_anual` (distinto de `manual`, ya que
`manual` es compartido por otros objetivos no relacionados que no deben volverse anuales), se
agregó a `OBJ_ANUALES`, y se le agregó su propia rama en el bloque de objetivos anuales de
`calcObjetivos()` (junto a `valorizar_residuo`/`reg_valorizar`/`respel`/`valorizar_especificos`):
`estado='OK'` si hubo al menos una "Visita a terreno" (SI) en el año (respetando el `anio` que
se le pase a `calcObjetivos()`, igual que los demás objetivos anuales), `detalle` = lista de los
meses exactos en que se realizó la visita (ej. "Mayo, Julio"). Se renderiza solo en la tabla
"Análisis anual" existente (genérica para cualquier tipo en `OBJ_ANUALES`, sin cambios de UI).

- Se sacó la rama mensual que se le había agregado antes (`tipo==='manual' &&
  obj.id==='acompanamiento'`) y el push manual correspondiente en `autoSync()` — al ser ahora
  parte de `OBJ_ANUALES`, `calcObjetivos()` ya lo incluye como resultado anual, y el
  `filasObj = calcObjetivos().map(...)` que ya existía en `autoSync()` lo sincroniza solo
  (mismo mecanismo que respel/valorizar_residuo, sin código extra).

## FGR/Acompañamiento no se veían en el visor recién subido el Excel (corregido 2026-08-19)
Bug encontrado al probar: el cálculo de FGR/CO2ev/m2 y Acompañamiento en terreno se agregó
primero solo en `autoSync()` (lo que sí sincroniza bien hacia el Sheet), pero **no** en
`calcObjetivos()` — la función que calcula qué se muestra en pantalla justo después de subir un
Excel (antes de volver a leer desde Sheets). Como el `switch` de tipos de objetivo en
`calcObjetivos()` no tenía ninguna rama para `tipo:'manual'`, el visor seguía mostrando "--" para
FGR/Acompañamiento inmediatamente después de subir el Excel, aunque el Sheet ya tuviera el valor
correcto (síntoma reportado por el usuario: "se ve en el Excel pero no en el visor").

- Se agregaron 2 ramas nuevas en `calcObjetivos()` (rama mensual, identificadas por
  `obj.tipo==='manual' && empresaActual==='euro' && obj.id==='fgr'/'acompanamiento'`, ya que
  `tipo:'manual'` es compartido por varios objetivos no relacionados en distintas empresas — se
  distingue por `id` además de `tipo`), reusando exactamente la misma fórmula que `autoSync()`.
- `fgrCo2EuroCalc = calcFgrCo2Euro()` ahora se calcula **una sola vez** antes del loop de
  sucursales de `calcObjetivos()` (no una vez por cada combinación suc×mes×objetivo), para no
  recalcular innecesariamente.
- **Limitación conocida**: el loop mensual de `calcObjetivos()` solo evalúa objetivos para
  combinaciones Sucursal+Mes que tengan al menos una fila en el Excel ese mes (`rowsSM.length`).
  Si una obra tiene % Avance/Visita a terreno cargado para un mes sin ninguna operación de
  trazabilidad ese mes, FGR/Acompañamiento no se mostrarían para ese mes en el render "recién
  subido" (sí se sincronizarían igual a través de `autoSync()`/`% de avance`/🎯 Objetivos, y se
  verían correctamente al usar "Cargar desde Sheets" después). No reportado como problema real
  todavía, se deja documentado por si aparece.

## Objetivo "Acompañamiento en terreno" automatizado en Euro (agregado 2026-08-19)
Mismo día que el fix de FGR/CO2ev/m2: el usuario ya tenía una hoja `👥 Seguimiento_CSE` con
estructura propia (header en la fila donde columna A dice `empresa_id`, sin fila fija —
el usuario mencionó fila 3, pero se ubica dinámicamente con `buscarFilaEncabezado_`, igual que
Total Residuos/RESPEL — más robusto si se inserta una fila arriba a futuro): una fila por
Sucursal + `Acción CSE` (`Correo seguimiento` / `Reunión seguimiento` / `Visita a terreno`), con
SI/NO por mes (headers de mes en Title Case: "Abril", "Mayo"... — sin columna Año, a diferencia
de `% de avance`). Regla del usuario: si "Visita a terreno" es SI ese mes, el objetivo
**"Acompañamiento en terreno, mediante charlas y una auditoría"** (antes `tipo:'manual'`) se está
cumpliendo.

- `Code-Euro.gs`: nueva `readCseSheet_()`, expuesta como `cse` en `doGet`.
- `valorizacion-recylink.html`: nuevo global `euroCse` (`{suc: {mesKey: {correo, reunion,
  visita}}}`), poblado en `loadSheetsData()` desde `data.cse`. **Sin columna Año en esta hoja** —
  se asume `new Date().getFullYear()` (mismo criterio ya usado en el resto del sistema para
  hojas sin esa columna; limitación conocida si algún día hay datos de más de un año en esta
  hoja).
- En `autoSync()` (mismo bloque `if (empresaActual === 'euro')` que arma FGR/CO2): por cada
  Sucursal+Mes con dato de "Visita a terreno" (SI u NO explícito), agrega una fila a `filasObj`
  para el objetivo `acompanamiento` con `% cumplimiento` = 100% (SI) o 0% (NO). Si no hay dato ese
  mes, no manda nada — no pisa lo que ya haya en 🎯 Objetivos (reutiliza el `writeObjetivos` ya
  corregido por empresa_id+mes+Objetivo).
- **No requiere crear ninguna hoja nueva** — `👥 Seguimiento_CSE` ya existía en el Sheet de Euro
  (se ve en la sección "Bugs..." más arriba, listada entre las hojas con datos de otras empresas
  por venir de plantilla clonada — esta automatización sí la usa activamente ahora).
- **Pendiente del usuario**: pegar el `Code-Euro.gs` actualizado (mismo archivo que ya incluye el
  fix de FGR/CO2ev/m2) y redesplegar.

## Cálculo automático de FGR y CO2ev/m2 en Euro (agregado 2026-08-19)
**Nombre real de la pestaña: `%avance`** (sin espacios) — el usuario la describió como "% de
avance" en la conversación, pero el nombre literal de la hoja es distinto. Bug encontrado 2026-08-19
al probar: `readAvanceSheet_()`/`writeAvance()` buscaban `ss.getSheetByName('% de avance')` y no
encontraban la hoja (devolvían `{m2Totales:{}, filas:[]}` en silencio, sin error — confirmado
inspeccionando `euroAvance`/`calcFgrCo2Euro()` vía consola del navegador, ambos vacíos). Corregido
buscando `ss.getSheetByName('%avance') || ss.getSheetByName('% de avance')` en ambas funciones,
mismo patrón de fallback por nombre que ya usan las demás hojas de este archivo. El resto de esta
sección usa "`% de avance`" como referencia narrativa, pero el nombre real de la pestaña en el
Sheet es `%avance`.

El usuario creó una hoja nueva `% de avance` en el Sheet de Euro para ingresar a mano el % de
avance de construcción de cada obra (acumulado, ej. 28% → 36% → 56%). Combinado con el m2 total
de cada obra (que también conoce), puede derivar m2 construidos, y con eso calcular FGR (m3
generados / m2 construidos) y Ton CO2 evitadas/m2 — cálculo que hacía a mano. Se automatizó
completo.

**Formato de la hoja `% de avance`** (distinto a las 3 hojas estándar, sin filas decorativas):
- Fila 1: `Sucursal` | nombre de cada obra, una por columna (ej. "Proyecto Departamental").
- Fila 2: `m2 totales` | el m2 total de esa obra, alineado con la fila 1.
- Fila 3: vacía.
- Fila 4: headers `empresa_id | Sucursal | Tipo | Año | MAYO | JUNIO | ... | DICIEMBRE` (el rango
  de meses del header puede no empezar en Enero — se lee dinámicamente, no se asume fijo).
- Fila 5+: 3 filas por obra — `% Avance` (ingreso manual, se deja intacto), `FGR` y `CO2ev/m2`
  (antes vacías, ahora las llena el visor automáticamente en cada sincronización).

**Decisiones de cálculo (confirmadas por el usuario 2026-08-19)**:
- FGR y CO2ev/m2 se calculan con m3/CO2 **acumulados desde el inicio de la obra** hasta ese mes
  (no solo el mes puntual) — consistente con que el % Avance también es acumulado.
- **Excavación se excluye** del m3/CO2 usado (mismo criterio que ya excluye Excavación del %
  de valorización en todas las empresas). Para el m3, esto ya viene gratis: `valMatrix` de Euro
  ya excluye Excavación (`excluirDeVal`), así que `calcFgrCo2Euro()` solo filtra Excavación
  manualmente para el CO2 (que viene de `totalResiduosRows`, que sí incluye Excavación).
- El objetivo **"FGR igual o menor a 0,2"** (antes `tipo:'manual'`, ingreso a mano en 🎯
  Objetivos) ahora se auto-completa: `% cumplimiento = min(100, 0,2/FGR × 100)` — proporcional,
  no binario (si el FGR es el doble de la meta, marca 50%, no 0%).
- El objetivo **"Ton CO2 evitadas/M2"** queda solo informativo — no tiene meta definida, no se
  toca en 🎯 Objetivos, solo se escribe el valor calculado en `% de avance`.

**Implementación**:
- `valorizacion-recylink.html`: nuevo global `euroAvance` (`m2Totales` + `pctPorSucMes`),
  poblado en `loadSheetsData()` desde `data.avance` (nuevo campo del `doGet`). Nueva función
  `calcFgrCo2Euro()` que devuelve `{suc: {mesKey: {fgr, co2m2}}}`. En `autoSync()`, para Euro:
  construye `filasAvance` (payload `{tipo:'avance', filas:[...]}`, un objeto por fila con
  `valores` indexado por **nombre de mes** en vez de por posición — evita que el cliente tenga
  que adivinar el rango exacto de columnas del header) y agrega filas extra a `filasObj` para el
  % cumplimiento del objetivo FGR (reutiliza el `writeObjetivos` ya corregido por
  empresa_id+mes+Objetivo, así que solo actualiza esa fila sin tocar las demás).
- `Code-Euro.gs`: `readAvanceSheet_()` (lee filas 1-2 para `m2Totales`, filas 4+ para los datos)
  expuesto como `avance` en `doGet`. `writeAvance()` (nuevo caso en `doPost`) actualiza in-place
  las filas `FGR`/`CO2ev/m2` por `Sucursal+Tipo+Año`, escribiendo cada mes por nombre de columna
  (busca el header en la hoja real) — nunca toca las filas `% Avance`, el cliente nunca envía ese
  tipo.
- **Pendiente del usuario**: pegar el `Code-Euro.gs` actualizado en el Apps Script real y
  redesplegar (nueva versión, misma URL) para que el cálculo se sincronice de verdad.

## writeObjetivos borraba filas manuales de otros objetivos (corregido 2026-08-14)
Encontrado al agregar el objetivo FGR de Socovesa: `writeObjetivos` borraba las filas existentes
que coincidieran en `empresa_id+Mes`, sin considerar cuál era el `Objetivo` de esa fila. Como los
objetivos `tipo:'manual'` (FGR, CO2, CES, Residuos Spot, etc.) nunca se recalculan ni se re-envían
en `autoSync()` (`calcObjetivos()` nunca les asigna un `estado`, así que no entran en `filasObj`),
sincronizar CUALQUIER otro objetivo (trazabilidad, sinader, kpi_costo...) para la misma
Sucursal+Mes borraba de paso la fila manual ya ingresada a mano en el Sheet, sin que nada la
reemplazara — quedaba perdida hasta que alguien la escribiera de nuevo.

- **Fix**: la clave de borrado ahora es `empresa_id+Mes+Objetivo` (agregando el texto exacto del
  objetivo a la comparación), en vez de solo `empresa_id+Mes`. Así solo se borra la fila que
  realmente se está reemplazando por la sincronización, sin arrastrar las demás filas de esa
  misma sucursal+mes.
- Aplicado en los 5 `.gs` de este repo con objetivos manuales: `Code-Euro.gs`,
  `Code-Gespania.gs`, `Code-Ando.gs`, `Code-Acciona.gs`, `Code-CCU.gs`. **Euro es distinto**: por
  la columna `Año` extra (columna D), el texto del Objetivo queda en el índice 4 del arreglo
  (`f[4]`), no en el 3 como las demás — la función lee 5 columnas y compara
  `empresa_id+Mes+Objetivo` usando ese índice corrido.
- **Socovesa** (fuera del repo): se le pasó al usuario la función `writeObjetivos` corregida para
  pegar directamente en su Apps Script real (mismo patrón que las demás, sin columna Año).
- No se tocó Copec/Abastible/PMS/Salfa — hoy no tienen ningún objetivo `tipo:'manual'`, así que
  el bug no tiene efecto observable ahí (decisión de alcance del usuario: aplicar solo donde ya
  hay objetivos manuales).

## Objetivo FGR agregado a Socovesa (agregado 2026-08-14)
A pedido del usuario: Socovesa no tenía ningún objetivo de FGR configurado (a diferencia de
Euro/Gespania/Acciona, que ya usaban el patrón `tipo:'manual'` para esto). Se agregó
`{id:'fgr', nombre:'Obtener el FGR al finalizar cada proyecto', tipo:'manual'}` a
`EMPRESAS.socovesa.objetivos`, mismo patrón exacto que el resto de objetivos `manual`: no se
calcula desde el Excel (no hay forma de derivar el FGR — Factor de Generación de Residuos — de
los datos de trazabilidad), el usuario ingresa el "% cumplimiento" a mano en la hoja
`🎯 Objetivos` del Sheet de Socovesa (fila con `Objetivo` = ese texto exacto) cuando el dato esté
disponible (al finalizar cada obra). Hasta que se llene, se muestra "--" en el visor, igual que
los demás objetivos manuales.

## SINADER no exige declaración para residuos de 0 kg (agregado 2026-08-14)
Encontrado al investigar un reporte del usuario con Socovesa. La exclusión de "0 kg no cuenta
para efectos de trazabilidad" (agregada 2026-07-24, ver más abajo) solo se aplicó a `trazMap`
(la agrupación que alimenta trazabilidad/KPI costo), pero el cálculo del objetivo `sinader` en
`calcObjetivos()` usa un array separado (`rowsSM`, filas crudas del Excel filtradas por
Sucursal+Mes desde `rowsFin`) que nunca tenía esta exclusión — así que una operación de 0 kg sí
exigía declaración SINADER, inconsistente con el resto del sistema.

- Se agregó `if((parseFloat(r['Control de Peso (Kg)'])||0) === 0) return false;` como primer
  filtro en `rowsSinDon` (rama `obj.tipo==='sinader'` de `calcObjetivos()`), junto a las
  exclusiones ya existentes (Donaciones, Respel de Abastible, Oficina Central de Abastible).
- **Decisión del usuario 2026-08-14**: aplica a las 4 empresas con objetivo `sinader` (Socovesa,
  Abastible, Gespania, Ando), no solo a Socovesa — mismo criterio de "0 kg no cuenta" ya usado
  de forma transversal para trazabilidad.
- El texto de detalle de residuos excluidos (antes "excluida(s) por donación/Respel") ahora dice
  "excluida(s) por donación/Respel/0 kg" para reflejar el nuevo motivo de exclusión.

## Costo e Ingreso por residuo (agregado 2026-08-07)
Nueva hoja de sincronización, mismo patrón que "Total Residuos": una pestaña adicional en el
Sheet, `Costo e Ingreso`, con una fila por Sucursal+Mes+Residuo mostrando el costo de
transporte y el ingreso por venta acumulados. Pedido explícito del usuario para poder hacer
seguimiento del KPI costo-ingreso (objetivo `tipo:'kpi_costo'`) desde el propio Sheet, no solo
desde el resumen agregado que ya mostraba la tarjeta de Objetivos.

- **Solo para empresas con el objetivo `kpi_costo`** — hoy Abastible, Salfa, Ando y CCU. A
  diferencia de `generaTotalResiduos` (lista de nombres de empresa hardcodeada, que ya causó el
  bug de PMS de "se olvidó agregar la empresa nueva a la lista"), `generaCostoIngreso` en
  `processData()` se deriva de `(emp.objetivos||[]).some(o => o.tipo==='kpi_costo')` — si en el
  futuro se agrega este objetivo a otra empresa, la hoja se sincroniza automáticamente sin
  tocar código.
- Reutiliza `trazMap` (la misma agrupación Sucursal+Mes+Residuo que ya alimenta trazabilidad/
  SINADER/KPI costo en `calcObjetivos()`), agregando 2 acumuladores nuevos al grupo:
  `ingresoTotal` (suma de `Precio por Venta de Residuo`, antes solo se contaba `tieneIngreso`
  como cantidad de operaciones con ingreso > 0, sin sumar el monto) y `kgTotal` (suma de
  `Control de Peso (Kg)`, para poder calcular $/kg si se quiere). Como `trazMap` solo acumula
  filas que pasan los mismos filtros que el KPI (estado finalizado, excluye Excavación, excluye
  0 kg salvo PMS), los totales de esta hoja calzan exactamente con el "Costo neto" que ya
  muestra el detalle de la tarjeta "KPI costo e ingreso".
- **`costoTotal` ahora suma 2 columnas del Excel** (agregado 2026-08-07, a pedido del usuario):
  `Total Costo Neto de Transporte` **+** `Costo de Tratamiento` (nombre exacto de columna
  confirmado por el usuario). Antes solo sumaba la de transporte. Este cambio afecta por igual
  a la hoja "Costo e Ingreso" y al "Costo neto" mostrado en el detalle de la tarjeta "KPI costo
  e ingreso" (comparten el mismo acumulador `g.costoTotal` de `trazMap`), así que ambos
  lugares quedan consistentes sin tocar 2 veces la misma lógica.
- `costoIngresoRows` (nuevo estado global, junto a `totalResiduosRows`) se construye en
  `processData()` solo si `generaCostoIngreso`, y se envía en `autoSync()` como
  `filasCostoIngreso` (payload `{tipo:'costoIngreso', filas:[...]}`), después de `totalResiduos`
  en la cadena de `sendPayload`. Columnas: `Sucursal | Mes | Residuo | Total KG | Costo Total |
  Ingreso Total | Neto (Ingreso - Costo)`.
- Apps Script: nueva función `writeCostoIngreso(ss, data)` en `Code-Abastible.gs`,
  `Code-Salfa.gs`, `Code-Ando.gs` y `Code-CCU.gs` (los 4 `.gs` de empresas con `kpi_costo`),
  copiada del mismo patrón que `writeTotalResiduos` (reemplazo total de las filas de datos,
  ubica el header buscando "Sucursal" en columna A con `buscarFilaEncabezado_`, sin borrado
  selectivo por `empresa_id` porque esta hoja no tiene esa columna). Nuevo caso
  `tipo === 'costoIngreso'` agregado a `doPost` de los 4 archivos. No se lee de vuelta en
  `doGet` (igual que "Total Residuos": es una hoja de solo-sincronización, para revisión manual
  en el Sheet, no la consume el visor HTML).
- **Pendiente manual del usuario (los 4 Sheets)**: crear la pestaña `Costo e Ingreso` en los
  Sheets de Abastible, Salfa, Ando y CCU, con headers exactos `Sucursal | Mes | Residuo | Total
  KG | Costo Total | Ingreso Total | Neto (Ingreso - Costo)` (en cualquier fila, igual que "Total
  Residuos" — no hace falta que sea la fila 5), y pegar el `.gs` actualizado correspondiente en
  el Apps Script real de cada una de las 4 empresas.

## Selector de Año en el visor de Objetivos (agregado 2026-07-27)
Antes de este cambio, `mesesDisp` mezclaba `"YYYY-MM"` de todos los años presentes en el Excel
cargado sin distinguirlos, así que si un Excel tenía datos de 2 años, el % Acumulado (`getAcum()`)
y los objetivos anuales de "Análisis anual" (`calcObjetivos()`, bloque `OBJ_ANUALES`) sumaban ambos
años juntos — bug notado en el Sheet de Euro, donde `Total Residuos` mostraba meses (Julio,
Agosto...) sin año que los distinguiera.

- Nuevo `<select id="f-obj-anio">` en la pestaña Objetivos (junto a `f-obj-suc`/`f-obj-mes`), sin
  opción "Todos" — siempre hay un año concreto seleccionado (el más reciente por defecto).
- `refreshObjMesOptions()` (nueva función, junto a `populateSel`) repuebla `f-obj-mes` con solo los
  meses del año activo cada vez que cambia `f-obj-anio`, para que los 2 selects nunca queden
  contradictorios (año elegido vs. mes de otro año).
- `calcObjetivos(anio)` ahora acepta un año opcional: si viene, filtra `rowsFin` (y por lo tanto los
  objetivos anuales `valorizar_residuo/reg_valorizar/respel/valorizar_especificos`) a solo ese año.
  El bloque mensual no necesitó cambios porque ya itera por `mes` exacto y el renderer filtra las
  columnas a mostrar.
- `getAcum(suc, upTo, anio)` ahora acepta un tercer parámetro opcional: si viene, acota la suma
  acumulada a los meses de ese año (y no usa el atajo `acumFromSheets`, que no está acotado por
  año). Sin `anio`, el comportamiento es idéntico al de antes — los demás call sites (`renderVal`,
  `renderChart`, payloads de sync) no se tocaron a propósito, el pedido era solo para el visor de
  Objetivos.
- `renderCopecObjetivos()` (el único renderer de Objetivos realmente usado, para las 6 empresas —
  `renderObjetivos()` y `renderObjetivosFromSheets()` son código muerto, nunca se llaman) usa
  `mesesAnio = mesesDisp.filter(m => m.slice(0,4)===fA)` en vez de `mesesDisp` para las columnas de
  la tabla mensual, el acumulado del encabezado y el % global (trazabilidad+valorización) por
  sucursal.
- **Limitación conocida** (parcialmente resuelta para Euro el 2026-07-28, ver sección siguiente):
  en el modo "Cargar desde Sheets" (sin Excel cargado), las hojas `♻️ Valorización`/`🎯 Objetivos`
  de Copec/Abastible/Socovesa/Gespania/Salfa/Ando no guardan el año — el código reconstruye
  `mesKey` asumiendo siempre `new Date().getFullYear()`. Ahí el selector de Año solo mostrará una
  opción (el año actual), sin regresión respecto al comportamiento previo. Arreglarlo de fondo
  para esas 6 empresas requeriría el mismo cambio que se hizo para Euro (agregar columna Año +
  tocar `doGet`/`writeObjetivos`/`writeValorizacion`) — no se hizo, fuera de alcance salvo que se
  pida explícitamente.

## Año en Valorización y Objetivos de Euro (agregado 2026-07-28)
El usuario agregó a mano una columna `Año` en `🎯 Objetivos` (columna D, entre Mes y Objetivo) y
trató de meter el año en el encabezado de `♻️ Valorización` escribiendo algo como "Julio - 2024"
en las celdas de mes. Esto último **rompió la lectura**: Google Sheets convirtió ese texto en una
fecha real, y el Apps Script devuelve esas celdas como objetos Date estringificados
(`"Mon Jul 01 2024 03:00:00 GMT-0400 (hora estándar de Chile)"`), que no calzan con ningún nombre
de mes (`Enero`..`Diciembre`) que busca el código — toda la lectura de `% Real`/`% Acumulado`/
`Meta %` de Euro quedaba en null. No había datos reales todavía bajo esos encabezados, así que no
se perdió información al plantear el fix.

**Diseño adoptado (igual patrón que Objetivos/Total Residuos): columna Año + una fila por año**,
en vez de un encabezado con un mes-año distinto por columna:
- `♻️ Valorización` de Euro debe quedar: `empresa_id | Sucursal | Tipo | Año | Enero | Febrero |
  ... | Diciembre` (16 columnas). Por cada sucursal y cada año con datos, 3 filas (% Real/
  % Acumulado/Meta %) con solo esos 12 meses — no un encabezado gigante de 34 columnas.
- **Pendiente manual del usuario en el Sheet**: en la pestaña `♻️ Valorización`, seleccionar la
  fila de encabezados (fila 5) y las celdas de mes, Formato > Número > **Texto sin formato**, y
  volver a escribir solo `Enero`, `Febrero`, ... `Diciembre` (12 columnas, sin año) — borrando las
  ~34 columnas de fecha generadas por error. Luego insertar una columna `Año` nueva entre `Tipo` y
  `Enero`.
- `autoSync()` en el JS: para Euro (`esEuroVal`), en vez de una fila por Tipo cubriendo todo
  `mesesDisp`, genera `aniosDisp = Array.from(new Set(mesesDisp.map(m=>m.slice(0,4))))` y por cada
  año una fila `[id,suc,'% Real',anio,...12 meses]` (y lo mismo para `% Acumulado`/`Meta %`). Las
  otras 6 empresas no cambian.
- **% Acumulado en Valorización SÍ arrastra años anteriores** (decisión tomada 2026-07-28, a
  pedido explícito del usuario — distinto del selector de Año del visor de Objetivos, que
  intencionalmente NO arrastra). Por eso la fila `% Acumulado` de `autoSync()` llama
  `getAcum(suc,mKey)` **sin** el 3er argumento `anio` (a diferencia de `% Real`, que sí usa
  `mKey` con año — pero `% Real` no es acumulativo, cada mes es independiente). El parámetro
  `anio` de `getAcum()` (agregado 2026-07-27) sigue existiendo y se sigue usando tal cual en
  `renderCopecObjetivos()` para el selector de Año — solo se dejó de usar en este único call
  site de `autoSync()`.
- **Bug encontrado y corregido en `getAcum()`** (2026-07-28): con el modo "Cargar desde Sheets",
  cuando se pasaba `anio` (selector de Año en Objetivos), la función ignoraba por completo
  `acumFromSheets` (el valor real ya calculado y guardado en el Sheet) y siempre recalculaba un
  promedio simple de `% Real` mensual — mucho menos preciso, y con Euro (que no es kg-weighted
  en su origen) daba números muy distintos (ej. Proyecto Departamental Junio 2026: Sheet decía
  5,3%, la app mostraba 1,4% = promedio de Ene-Jun sin peso). Se corrigió sacando la condición
  `!anio` del `if` — como `acumFromSheets[suc][upTo]` ya está indexado por mesKey `"YYYY-MM"`
  (año incluido en la key), es siempre correcto usarlo si existe, se haya pasado `anio` o no. El
  recálculo manual sigue como fallback solo para cuando no hay valor de Sheets (datos recién
  subidos desde Excel).
- `filasObj` en `autoSync()`: para Euro, inserta `r.mesKey.slice(0,4)` (o `''` para las filas
  anuales) como 4to elemento, calzando con la columna Año que el usuario ya agregó en D. No
  requiere cambios en `Code-Euro.gs` (`writeObjetivos` es agnóstico al largo de la fila).
- Lectura (`loadSheetsData()` y el fallback `sheetsObjetivosData` de `renderCopecObjetivos()`):
  ahora usan `row['Año'] || new Date().getFullYear()` en vez de asumir siempre el año actual — este
  cambio es general (no exclusivo de Euro), así que si en el futuro se agrega la columna Año a
  otra empresa, la lectura ya la va a aprovechar automáticamente sin tocar código de nuevo.
- **Año también en `📊 Trazabilidad_Docs` de Euro** (agregado 2026-07-28), columna D (entre Mes
  y Residuo — desplaza Residuo/Cod. LER/etc. una posición a la derecha). A diferencia de
  Valorización/Objetivos, esto NO se maneja a través de `emp.trazCols` (que también gobierna la
  tabla que se ve en la pestaña Trazabilidad de la app) — se hizo aparte en `autoSync()`
  (variable `esEuroTraz`) para no agregar esa columna a la tabla visible, mismo criterio que las
  otras 2 hojas: Año es solo para sincronización. `writeTrazabilidad` en `Code-Euro.gs` no
  necesitó cambios: sigue borrando por `empresa_id+Mes` (índices 0 y 2 de la fila), y esos 2
  índices no se movieron al insertar Año en el índice 3. La lectura (`loadSheetsData()`, bloque
  de trazabilidad) también usa `row['Año'] || new Date().getFullYear()` ahora, mismo patrón
  general que Valorización/Objetivos.

- [ ] **PMS**: cargar el Excel de trazabilidad real para derivar sucursales; llenar manualmente
      la pestaña `Contactos` del Sheet si se quiere (no la usa el visor, solo referencia).
- [ ] **PMS**: probar carga de Excel end-to-end ahora que el Apps Script ya está desplegado y
      verificado con `doGet` — es la primera vez que se prueba con datos reales.
- [ ] **Euro**: arreglar el encabezado de `♻️ Valorización` en el Sheet real — hoy tiene ~34
      columnas de fecha mal generadas (ver sección "Año en Valorización y Objetivos de Euro").
      Formatear como texto sin formato, dejar solo `Enero`..`Diciembre` (12 columnas), e insertar
      una columna `Año` nueva entre `Tipo` y `Enero`. Sin este arreglo manual en el Sheet, el
      código nuevo (que ya espera esa columna) no tiene dónde leer/escribir el año.
- [ ] **Urgente**: redesplegar el `.gs` actualizado (fix de `writeValorizacion` borrando la
      Meta % — ver bug #8 arriba) en Copec, Abastible, Gespania, Salfa, Euro y Ando — los 6
      archivos que vive en este repo. Hasta entonces, cualquier Excel que se suba antes de que
      termine de cargar "Cargar desde Sheets" puede seguir borrando la Meta % guardada.
      (Socovesa no tiene `.gs` en este repo — su Apps Script se mantiene aparte, no se tocó.)
- [ ] Ando: volver a escribir "5%" a mano en la fila `Meta %` de `Terminal Bus` en
      `♻️ Valorización` — se borró el 2026-07-27 por el bug #8 al subir el Excel real.
- [ ] Agregar manualmente el header `Tons. CO2eq. evitadas` (columna H) en la pestaña
      `Total Residuos` de los 5 Sheets ya existentes (Copec, Abastible, Gespania, Salfa, Euro) —
      hoy solo tienen 7 columnas de header; el JS/Apps Script ya escriben 8 pero sin el header
      la columna quedará sin nombre hasta agregarlo a mano.
- [ ] Agregar al Apps Script de Copec el soporte para `tipo:'totalResiduos'` en `doPost` y el
      campo `respel` en `doGet` (ver sección "Total Residuos + RESPEL" arriba) — sin esto, el
      JS ya calcula todo pero la sincronización a esas 2 hojas fallará silenciosamente (`no-cors`
      no reporta error de HTTP).
- [ ] Ando: probar carga de Excel end-to-end ahora que el Apps Script ya está desplegado, y confirmar
      que "Cumplimiento normativa SINADER"/"Incorporar KPI de costo - valorización" calzan
      con los datos reales (son los primeros objetivos de Ando con esos nombres exactos, y el
      cálculo `sinader`/`kpi_costo` se reutilizó de Abastible/Salfa sin poder verificarlo
      contra datos reales de Ando todavía).
- [ ] Abastible: crear la pestaña `Total Residuos` en su Google Sheet (headers:
      `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas`)
      — sigue pendiente. **El resto de este punto ya está hecho** (ver nota 2026-08-04 abajo):
      el usuario ya pegó `Code-Abastible.gs` actualizado en su Apps Script real, que agrega
      soporte para `tipo:'totalResiduos'` y corrige `writeObjetivos` (borraba por prefijo de
      empresa completo en vez de por sucursal+mes, con riesgo de perder histórico de objetivos
      al sincronizar).
- [x] Abastible (2026-08-04): el usuario agregó la hoja `Respel` al Sheet real (formato
      Residuo→RESPEL TRUE/FALSE, igual que Copec/Euro), `Code-Abastible.gs` se actualizó con
      `readRespelSheet_()` (expone `respel` en `doGet`) y el usuario ya pegó ese `.gs`
      actualizado en el Apps Script real de Abastible — el visor ahora debería clasificar por
      la hoja en vez de por el fallback de nombre. **Pendiente de verificar en el visor real**
      (no solo local) que Baterías de plomo, Tubos Fluorescentes y Residuos contaminados con
      HC/pintura ya salgan excluidos de SINADER (antes del deploy solo se excluía el residuo
      literal "RESPEL" por el fallback en `isRespel()`).
- [ ] **Visor-de-Objetivos-Abastible** (repo aparte `recylink/Visor-de-Objetivos-Abastible`,
      GitHub Pages en `recylink.github.io/Visor-de-Objetivos-Abastible/`) — dashboard standalone
      para Abastible, subido una sola vez el 2026-07-27 y nunca conectado de verdad a datos
      reales. Root cause (2026-08-04): carga datos con JSONP (`<script src="...exec?callback=X">`,
      `cargarDatos()` línea ~2218 de su `index.html`), pero el `doGet` de `Code-Abastible.gs`
      ignoraba el parámetro `callback` y devolvía JSON crudo — el navegador lo interpreta como
      un bloque `{ ... }` con errores de sintaxis (las claves son strings, no labels válidos),
      dispara `scriptTag.onerror` → "No se pudo contactar la fuente de datos". Además, aunque
      se resolviera el JSONP, el payload que esa página espera (`{EMPRESAS, VAL_DATA,
      MESES_ACTIVOS}`, donde cada "EMPRESA" es en realidad una SUCURSAL) es un contrato
      totalmente distinto al `{valorizacion, trazabilidad, objetivos, respel}` que devuelve
      `doGet` para el visor multi-empresa.
      **Arreglado en `Code-Abastible.gs`:** se agregó `buildLegacyPayload_()` (arma
      `EMPRESAS`/`VAL_DATA`/`MESES_ACTIVOS` a partir de las mismas 3 hojas que ya lee `doGet`,
      reutilizando el mismo parseo tolerante de `%` que usa `valorizacion-recylink.html` —
      ver `parsePct_`) y `doGet` ahora detecta `e.parameter.callback`: si viene, responde
      `callback({...})` con `MimeType.JAVASCRIPT` en vez de JSON plano (el comportamiento sin
      `callback`, que usa el visor multi-empresa, no cambió). Contrato completo del payload
      legacy (`EMPRESAS[i].mensual/anual/cse/objetivos`, `VAL_DATA[id].meses/acumulado/meta`)
      documentado a mano leyendo `index.html` de ese repo — sin eso, campos como
      `emp.anual`/`emp.cse.encuesta` faltantes hacen crashear el render (acceso sin optional
      chaining). Probado localmente con datos mock en Node (parseo de "57.6%" vs `0.3` vs `1`,
      y que un `0` legítimo en `docs` no se pierda — bug real que apareció y se corrigió con
      `pickField_()` en vez de encadenar `a||b`, que descartaba un 0 real).
      **Pendiente:** el usuario debe pegar el `Code-Abastible.gs` actualizado en el Apps Script
      real de Abastible (mismo paso pendiente que el punto anterior) y luego falta verificar
      en vivo que `recylink.github.io/Visor-de-Objetivos-Abastible/` cargue datos reales.
- [x] Abastible (2026-08-04): a los residuos Respel no se les debe exigir declaración
      SINADER — se agregó la exclusión en `calcObjetivos()` (rama `obj.tipo==='sinader'`,
      `valorizacion-recylink.html`), reutilizando `isRespel()` igual que la exclusión ya
      existente de Donaciones, pero acotada a `empresaActual==='abastible'` (no se tocó el
      cálculo de Socovesa/Gespania/Ando que comparten el mismo tipo `sinader`).
      **También (mismo día):** tampoco se le exige declaración SINADER a la sucursal
      "Oficina Central" de Abastible — misma rama `sinader`, `rowsSinDon` queda vacío para
      esa sucursal (`empresaActual==='abastible' && suc==='Oficina Central'`), lo que hace
      que `total===0` y el objetivo se muestre como 100%/sin pendientes (mismo comportamiento
      que cuando no hay filas que exigir, no es un caso especial nuevo de la fórmula).
- [ ] Subir la app a GitHub Pages (usuario tiene `licarayen-bit.github.io`)
- [ ] Verificar que el Apps Script de Copec tenga la misma corrección de `writeObjetivos`
      que Socovesa (borrar por `empresa_id+mes`, no por prefijo completo) — Abastible ya
      queda corregido en `Code-Abastible.gs` (ver punto arriba)
- [ ] Confirmar que el Sheet de Abastible tenga la columna "Factura" en headers de
      `📊 Trazabilidad_Docs` (fila 5), agregada recientemente en el código
- [ ] Validar visualmente el formato unificado de Objetivos en las 3 empresas tras los
      últimos cambios en `renderCopecObjetivos`
- [ ] Gespania: verificar que las pestañas `Total Residuos` (headers: `Sucursal | Mes | Residuo
      | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas`) y `RESPEL` (headers:
      `Residuo | RESPEL`) del Sheet ya tengan esos headers exactos — no se pudieron inspeccionar
      visualmente por una falla intermitente de la extensión de navegador durante el análisis
- [ ] Gespania: probar "Cargar desde Sheets" end-to-end una vez desplegado el Apps Script, y
      confirmar que el objetivo `Lograr un FGR de 0,2 m3/m2` (tipo manual) se pueda editar
      directamente en la hoja `🎯 Objetivos` del Sheet (columna `% cumplimiento`, fila con
      Objetivo = ese texto exacto)
- [ ] Euro: probar "Cargar desde Sheets"/carga de Excel end-to-end una vez desplegado, y
      confirmar que el % de valorización por volumen (m3) se vea razonable — es la primera
      empresa con esa base de cálculo, vale la pena una revisión visual extra
- [ ] Euro: si el usuario quiere, limpiar las hojas `Seguimiento_CSE` y `Config.Flat` del
      Sheet, que traen datos de otras empresas (ANDO, Copec, Daikin) por venir de una
      plantilla clonada — no bloquea nada, el visor no las usa
- [ ] **CCU**: cargar el Excel de trazabilidad real y confirmar que los nombres de sucursal
      calzan exactamente con `CCU_METAS` ("NPR - Embotelladora Renca", "CirCCUlar") — si el
      Excel trae una variante de escritura, la meta no se va a mostrar para esa sucursal.
- [ ] **CCU**: llenar a mano el "% cumplimiento" de "Gestionar Residuos Spot" en la hoja
      `🎯 Objetivos` del Sheet (tipo `manual`, no se calcula desde el Excel).
- [ ] **CCU**: revisar/limpiar la pestaña "Objetivos 2026" del Sheet, que quedó con un borrador
      de correo pegado por error (no lo usa el visor, es solo cosmético).
- [x] **Acciona**: el despliegue del Apps Script quedó restringido al crearlo (`doGet`
      devolvía `403 Acceso denegado`) — corregido 2026-07-31 cambiando "Quién tiene acceso" a
      "Cualquier usuario" en Implementar > Gestionar implementaciones. Verificado con `curl`:
      ahora responde `302` (redirect público normal) y el JSON esperado
      `{valorizacion:[],trazabilidad:[],objetivos:[],respel:[...]}`.
- [ ] **Acciona**: cargar el Excel de trazabilidad real para derivar las sucursales — la meta
      de 40% ahora se sincroniza automáticamente para todas (ver `getAccionaMetasDefault()`
      arriba); usar "✎ Editar metas" solo si alguna sucursal necesita un % distinto.
- [ ] **Acciona**: llenar a mano el "% cumplimiento" de "Apoyar en obtención de puntos para
      certificación CES..." en la hoja `🎯 Objetivos` del Sheet (tipo `manual`, no se calcula
      desde el Excel).
- [ ] **Acciona**: probar carga de Excel end-to-end una vez desplegado el Apps Script, y
      confirmar que el objetivo de segregación (9 residuos: Madera/Pallet/Vidrio/Fierro/PET/
      RESPEL/Plumavit/PVC/Film Stretch) y la exclusión de Escombro/Arena del %valorización
      se vean razonables con datos reales — son cálculos nuevos, sin verificar contra el
      Excel real de Acciona todavía.

## Edicion de objetivos manuales desde el visor (agregado 2026-08-21)
A pedido del usuario: poder editar el % cumplimiento/Estado y Detalle de un objetivo manual
directamente desde la tabla de Objetivos, en vez de tener que entrar a la hoja `🎯 Objetivos`
del Sheet y escribirlo a mano. El cambio se sincroniza al Sheet al instante.

- **Que objetivos son editables**: `esObjetivoManualEditable(o)` — todos los `manual_anual`
  (FGR de Gespania/Socovesa, Residuos Spot de CCU, sensibilizacion de Ando, CES de Acciona,
  Contactar Nuevos proveedores de Euro), mas `costo` de Euro (`manual`, "Costo/Presupuesto").
  Excluye a proposito `fgr`/`co2` de Euro: son tipo `manual` pero `calcObjetivos()` los
  autocalcula desde "% de avance" — editarlos a mano se pisaria en el proximo calculo/sync.
- **UI**: la celda de un objetivo editable (en la tabla "Analisis anual" o, para Euro
  "Costo/Presupuesto", en la tabla mensual) es clickeable (`celdaObjetivoManual()`, clase
  `.obj-cell-editable`, listener delegado en `#obj-grid`) y abre el modal "Editar objetivo
  manual" con el Estado/Detalle actuales precargados. "Guardar" sincroniza; "Vaciar" limpia
  los campos antes de guardar (para borrar el valor); "Cancelar" cierra sin tocar nada.
- **Sync al Sheet**: mismo payload que usa el sync automatico al subir un Excel
  (`{tipo:'objetivos', filas:[[...]]}`, `fetch(..., {mode:'no-cors'})`), una sola fila. Euro
  lleva 7 columnas (`id, sucursal, mes, año, objetivo, estado, detalle` — año vacio si es la
  fila "Anual"); el resto de empresas lleva 6 (`id, sucursal, mes, objetivo, estado, detalle`).
  `writeObjetivos()` en el Apps Script ya reemplaza solo la fila con esa combinacion exacta de
  empresa_id+mes+Objetivo (fix previo del 2026-08-14), asi que no duplica ni borra otras filas.
- **Persistencia en sesion**: `manualEditsCache` (companyId -> `{anual:{}, mensual:{}}`,
  mismas claves que `objAnualBySuc`/`objBySucMes`) se mergea encima del resultado de
  `calcObjetivos()`/Sheets en cada `renderCopecObjetivos()`. Es necesario porque, si hay un
  Excel cargado en la sesion, `calcObjetivos()` nunca genera fila para un objetivo manual —
  sin este cache la edicion desaparecería del visor al re-renderizar aunque ya haya quedado
  bien guardada en el Sheet. Al recargar la pagina, se vuelve a leer desde el Sheet
  directamente (ya con el valor sincronizado), asi que no hace falta persistir en localStorage.
- Verificado en vivo (interceptando `fetch` para no escribir de prueba en las Sheets reales de
  Euro/Acciona): formato de fila correcto en ambos casos (7 y 6 columnas), el visor se
  actualiza al instante tras guardar, y "Vaciar" limpia los campos correctamente.

**Bug reportado por el usuario, corregido (2026-08-21)**: al editar un objetivo manual, el
cambio se veía al instante en la tabla de Objetivos pero NO en el panel de salud (izquierda).
Causa: el panel de salud (`saludPorEmpresa`) carga los datos de las 10 empresas una sola vez
al iniciar la app (`cargarSaludTodas()`) y solo se recalcula si el usuario aprieta el boton
"&#8635; Actualizar" a mano — `guardarObjetivoManual()` nunca tocaba ese estado. Corregido en
2 partes:
1. `guardarObjetivoManual()` ahora, despues de que el POST de sync realmente termina (no antes
   — para no leer el Sheet a mitad de la escritura), refresca SOLO la empresa editada (no las
   10): un GET fresco + `calcSaludEmpresa_()` + `renderSaludPanel()`. Solo lo hace si esa
   empresa ya estaba cargada en el panel (evita una llamada de red si el usuario nunca abrio
   el panel de salud).
2. `calcSaludEmpresa_()` tambien mergea `manualEditsCache[companyId]` encima de
   `objInfo.objAnualBySuc`/`objBySucMes` (mismo patron que ya se usa en
   `renderCopecObjetivos()`), como red de seguridad para cualquier otro refresco (ej. el boton
   "Actualizar" manual sobre otra empresa) mientras la escritura al Sheet este en curso.
Verificado en vivo: el % de salud de una sucursal de Euro paso de 25% a 75% automaticamente
al marcar "Contactar Nuevos proveedores" como OK, sin apretar "Actualizar".

## Objetivos "dormidos" por sucursal (agregado 2026-08-21)
A pedido del usuario: opción para activar/desactivar (dormir) el seguimiento de un objetivo
específico en una sucursal puntual (ej. una sucursal que no genera cierto tipo de residuo y
por lo tanto nunca va a cumplir ese objetivo, sin que eso la perjudique en su % de salud).

- **Guardado**: `localStorage['objetivos_dormidos']`, por empresa: `{empresaId: {sucursal:
  [nombreObjetivo, ...]}}`. Funciones `getObjetivosDormidosUI(companyId)`,
  `setObjetivosDormidosUI(map)`, `isObjetivoDormido(companyId, suc, objNombre)` — mismo patrón
  que `sucursales_excluidas`/`isSucExcluidaParaSalud_`.
- **UI**: nuevo botón "😴 Objetivos por sucursal" en la pestaña Objetivos (al lado de
  "Sucursales cerradas" y "Editar metas"), visible si la empresa tiene sucursales y al menos
  un objetivo definido. Abre una tabla sucursal × objetivo con un checkbox por celda (marcado
  = dormido); "Guardar" persiste y vuelve a renderizar.
- **Efecto en la tabla de Objetivos**: la celda de ese objetivo para esa sucursal muestra
  "😴 Dormido" en vez de calcular/mostrar un estado — aplicado en las 6 filas posibles
  (objetivos anuales, 100% trazabilidad, SINADER, KPI costo, y los manuales de Euro).
- **Efecto en la salud ("% global")**: un objetivo dormido para una sucursal se excluye por
  completo de su promedio — no cuenta como 0%, es como si no existiera para esa sucursal en
  particular. Mismo filtro aplicado en `renderCopecObjetivos()` (empresa activa) y en
  `calcSaludEmpresa_()` (panel de salud multi-empresa), para que ambos vistas coincidan.
  Verificado con datos ficticios: promedio de 2 objetivos (uno OK=100, otro No=0) pasa de 50%
  a 100% al dormir el que estaba en 0%.

**2 bugs reportados por el usuario en Euro, corregidos (2026-08-21)**:
1. No aparecía la opción de dormir la "meta de valorización" (el % acumulado vs. la meta de
   la sucursal, ej. el 5% de Euro) porque esa fila NO es un objetivo real de `emp.objetivos`
   — es un calculo aparte (`% Valorización real` / `% Acumulado` / `Meta 2026`) que solo se
   sumaba como una unidad mas al promedio de salud. Se agregó una entrada "virtual"
   `META_VAL_OBJ_NOMBRE = '% Valorización vs. meta'` que aparece como columna extra en el
   editor de "Objetivos por sucursal" (no tiene fila propia en la tabla); al dormirla, esa
   sucursal deja de sumar el % valorización vs. meta a su promedio de salud, y el encabezado
   de la sucursal le agrega un 😴 junto a "Meta val.: X%" para que quede claro que esta
   dormida. Aplicado en ambos puntos donde se sumaba (`renderCopecObjetivos()` y
   `calcSaludEmpresa_()`).
2. Los nombres largos de objetivo (ej. en Euro: "Acompañamiento en terreno, mediante charlas
   y una auditoría") no se leían completos en la tabla del editor "Objetivos por sucursal".
   Causa: el CSS global `thead th{...white-space:nowrap}` (pensado para los encabezados de
   la tabla principal de Objetivos) se aplicaba tambien a esta tabla nueva y, combinado con el
   `max-width:150px` de sus columnas, hacia que el texto no hiciera salto de linea y se
   dibujara superpuesto sobre las columnas vecinas en vez de envolverse. Corregido forzando
   `white-space:normal;word-break:break-word` en los `<th>` de esta tabla especifica.

## Code-Socovesa.gs sincronizado con el real + bug de columna Año (2026-08-28)
El usuario pegó su Code.gs real de Socovesa (versión "fusionada": doPost/doGet clásicos +
visor nuevo `?visor=1` + visor de Minutas `?minutas=1`, con varios FIX numerados en el propio
archivo). No existía `Code-Socovesa.gs` en el repo — el `Code.gs` genérico que sí había es en
realidad el de **Copec** (`EMPRESA_NOMBRE = "COPEC"`). Se creó `Code-Socovesa.gs` con el
contenido real tal cual.

**Bug real encontrado al revisar ese script** (no reportado por el usuario, encontrado leyendo
el código): los comentarios "FIX 3" y "FIX 5" de ese archivo dejan claro que las hojas
`♻️ Valorización` y `🎯 Objetivos` de Socovesa **ahora tienen una columna Año agregada** (mismo
esquema que Euro: Objetivos pasa a 7 columnas con Objetivo en el índice 4 en vez de 3;
Valorización pasa a incluir Año en el índice 3). Pero en `valorizacion-recylink.html` el único
lugar que armaba filas con esa columna Año era código que chequeaba literalmente
`empresaActual === 'euro'` — Socovesa nunca estaba incluida. Efecto real: cualquier sync de
Objetivos o Valorización para Socovesa (sea el automático al subir un Excel, o mi editor nuevo
de "objetivo manual") mandaba una fila con una columna menos de la que el Sheet real espera,
lo que corre todo el resto de columnas un lugar — el texto del objetivo cae en la columna Año,
el estado cae en la columna Objetivo, etc. Nunca se manifestó como error visible porque
`writeObjetivos`/`writeValorizacion` no validan el largo de la fila, solo escriben lo que
llega con `setValues()`.

Corregido generalizando el flag a una tabla `EMPRESAS_OBJ_CON_ANIO`/`EMPRESAS_VAL_CON_ANIO =
{euro:1, socovesa:1}` (en vez de hardcodear `'euro'` cada vez) y usándola en los 3 lugares que
arman filas posicionales: `autoSync()` (`filasObj`, `filasVal`) y `guardarObjetivoManual()`.
La lectura (`parseObjetivosRows_`, `loadSheetsData`) nunca tuvo este problema porque ya lee por
nombre de columna (`row['Año']`, `row['Objetivo']`, etc.), no por posición — es agnóstica al
orden/cantidad de columnas del Sheet real.

De paso, el mismo Code-Socovesa.gs agrega `writeTotalResiduos` (hoja "Total Residuos", mismo
formato que Euro: Sucursal|Año|Mes|Residuo|...|Tons. CO2eq. evitadas) — pero el cliente nunca
generaba esas filas para Socovesa (`generaTotalResiduos` en `processData()` y la condición de
`filasTotalResiduos` en `autoSync()` no la incluían). Se agregó `socovesa` a ambas, con
`generaAnioTR`/`generaCO2TR` en `true` (mismo formato que Euro), para que esa hoja empiece a
poblarse al subir el Excel.

**Pendiente, NO corregido (fuera de alcance de este cambio, requiere decisión del usuario)**:
Socovesa tampoco tiene soporte de "Meta de valorización" en el visor — ni en `autoSync()`
(`metasActuales`) ni en `renderCopecObjetivos()` (`metas`) está incluida en la lista de
empresas que leen `metasFromSheets`, así que aunque alguien complete una fila "Meta %" a mano
en el Sheet, el visor nunca la usa (no se ve la fila "Meta 2026", no colorea %Real vs Meta, y
"% Valorización vs. meta" nunca aporta a su salud). No se tocó porque no está claro si Socovesa
efectivamente usa una meta de % valorización (su objetivo principal es FGR por proyecto, no un
% global) — antes de agregarla habría que confirmar con el usuario.

- [ ] **Socovesa**: si corresponde, agregar `'socovesa'` a las listas de `metasActuales`
      (`autoSync()`) y `metas` (`renderCopecObjetivos()`) para habilitar meta de valorización
      editable/sincronizada, igual que Gespania/Salfa/Euro/Ando.

## Bug real en producción: columna Año de Trazabilidad_Docs corrida en Socovesa (2026-08-28)
El usuario reportó dos síntomas aparentemente separados: "no se cargan los años en la columna
Año en 📊 Trazabilidad_Docs" y "no se cargan los objetivos en el visor". Investigado leyendo el
doGet real de Socovesa (`curl` directo al Apps Script, sin pasar por el navegador) — **mismo
tipo de bug que el de Valorización/Objetivos corregido antes, pero esta vez en
Trazabilidad_Docs**, con un efecto en cascada mucho peor:

- La hoja real ya tenía una columna **Año** agregada en Trazabilidad_Docs (entre Mes y
  Residuo), igual que Valorización/Objetivos — pero a diferencia de esas dos, el visor nunca
  se actualizó para mandarla en el sync de Socovesa (`esEuroTraz` solo cubría `'euro'`).
  Resultado real, confirmado con datos en vivo: la columna Año se llenaba con el **nombre del
  residuo** (`"Cartón"`, `"Vidrio"`, etc.) y todo lo demás se corría un lugar — Residuo recibía
  el nombre del transportista, Transportista recibía el conteo de LER, etc. El último campo
  (Disposición final) se quedaba sin destino y nunca se escribía.
- Esa corrupción se propagaba en cadena al leer los datos de vuelta: `mesKey` se armaba como
  `Año + '-' + mes` → con Año corrupto, `mesesDisp` terminaba con entradas como `"Cartón-01"`,
  `"Vidrio-07"` en vez de `"2026-01"`. El selector de Año del visor de Objetivos quedaba con
  opciones tipo `"Cart"`, `"Vidr"` (los primeros 4 caracteres de esos mesKey corruptos) en vez
  de `"2026"`, y por default se seleccionaba la última opción alfabética (`"Vidr"`) — que no
  matcheaba ningún mes real, así que la tabla mensual de Objetivos quedaba vacía/con headers
  "undefined". Esto explica el segundo síntoma reportado ("no se cargan los objetivos"): no es
  que los objetivos no existan (el Análisis Anual, que no depende del filtro de mes/año, sí
  mostraba datos reales) — es que el filtro de Año quedaba en un valor basura que no matcheaba
  nada, dejando vacía la tabla mensual.
- **Corregido**: nueva rama `esSocovesaTraz` en el armado de `filasTraz` (`autoSync()`), con el
  orden de columnas real confirmado directamente desde el doGet (no es el mismo orden que usa
  Euro — Socovesa no tiene "Transportista (nombre)" ni "Factura" como columnas separadas):
  `Sucursal, Mes, Año, Residuo, Transportista, Código LER, Importaciones, Cert. tratamiento,
  Cert. declaración, Disposición final`.
- De paso se encontró (y corrigió) un segundo bug menor de lectura: `r.disp` (Disposición
  final) nunca hacía match porque el código solo probaba `row['Disp. final']` y
  `row['Disposicion final']` (sin tilde) — el header real es `"Disposición final"` (con í y ó).
  Se agregó esa variante a los fallbacks.
- **No hace falta tocar Code-Socovesa.gs**: `writeTrazabilidad` borra por empresa_id+mes exacto
  sin importar cuántas columnas trae la fila, así que el fix es 100% del lado del cliente.
- **Los datos históricos ya corrompidos NO se autocorrigen solos** — quedan así hasta que se
  vuelva a sincronizar ese mes puntual (re-subir el Excel de esos meses sobreescribe/borra esas
  filas por empresa_id+mes exacto e inserta las correctas). Recomendado avisarle al usuario que
  re-suba los Excel de los meses ya sincronizados para Socovesa.

## Carga de varios Excel a la vez (agregado 2026-08-28)
A pedido del usuario: el input "↑ Cargar Excel" ahora acepta seleccionar varios archivos de
una vez (atributo `multiple`). El listener de `change` lee todos con `FileReader` en paralelo
(`Promise.all`), junta las filas de todos en un solo arreglo (`[].concat.apply([], ...)`) y
llama a `processData()` una sola vez con el total combinado — se procesan exactamente como si
fuera un único Excel consolidado, mismo criterio que ya usa el resto del sistema (todo el
sistema opera sobre `rawRows` completo, sin distinguir de qué archivo vino cada fila). Antes,
cargar un segundo Excel pisaba (`rawRows = rows`) los datos del primero en vez de sumarlos.
Si falla la lectura de alguno de los archivos, se corta con un toast de error indicando cuál.
No se pudo reverificar visualmente en el navegador (entorno de automatización inestable en el
momento del cambio) — la sintaxis quedó validada con `node --check` y la lógica reutiliza
exactamente el mismo camino que ya procesaba un solo archivo.

## Pestaña FGR en el visor de trazabilidad de Socovesa (agregado 2026-08-28)
A pedido del usuario, se agregó una pestaña "FGR" al **otro** visor de Socovesa — el
"visor legado de Trazabilidad" (`index.html`, repo separado
`https://github.com/recylink/socovesa-trazabilidad`, publicado en
`https://recylink.github.io/socovesa-trazabilidad/`), NO a `valorizacion-recylink.html`. Ese
repo se clonó localmente en `C:\Users\PC\Desktop\socovesa-trazabilidad` para poder editarlo —
no existía una copia local antes. Consume el mismo Apps Script que `EMPRESAS.socovesa` (mismo
`DATA_SOURCE_URL`), pero vía `?visor=1&callback=X` (JSONP) en vez de la request simple que usa
`valorizacion-recylink.html`.

Columnas pedidas: obra, fecha del primer y último registro de residuos, total m3, m2
construidos y FGR. Fuentes de cada dato:
- **Obra**: `emp.sucursal` (ya disponible).
- **Total m3 + primer/último registro**: **NUEVO**, requirió tocar el backend
  (`Code-Socovesa.gs`, en este repo) — se agregó `leerTotalResiduos_()`, que lee la hoja
  "Total Residuos" (recién habilitada para Socovesa el mismo día, ver sección más arriba) y
  suma el Total M3 por obra + arma el mes/año más antiguo y más reciente con registro. Se
  expone en el payload de `?visor=1` como `emp.fgr = {totalM3, primerRegistro, ultimoRegistro}`.
  Solo tiene granularidad de mes (no día exacto) porque esa es la granularidad de "Total
  Residuos" — no hay fecha exacta de transacción guardada en ningún Sheet server-side (el
  Excel original con fechas puntuales nunca se sube ni se guarda ahí, solo se procesa
  transitoriamente en el navegador al sincronizar).
- **M2 construidos**: no existe ninguna hoja fuente para este dato hoy. Se implementó como
  campo **editable directamente en la pestaña FGR**, guardado en `localStorage` del navegador
  (`FGR_M2_STORE`, clave `socovesa_fgr_m2_construidos`, por obra) — mismo patrón que ya usa
  este visor para las descripciones de "Pendientes" (`PENDIENTES_STORE`, aunque esa ni siquiera
  usa localStorage) y la config de Minutas. Es decir: es un dato manual, por navegador, NO
  compartido entre computadores ni sincronizado a ningún Sheet. Si más adelante se necesita que
  sea compartido/persistente de verdad, habría que agregarle una hoja propia + soporte de
  lectura/escritura en el Apps Script (mismo patrón que "% de avance" de Euro).
- **FGR**: calculado en el navegador, `totalM3 / m2Construidos`, redondeado a 3 decimales.
  `—` si falta cualquiera de los dos datos.

**Pendiente de acción del usuario**: el `Code-Socovesa.gs` actualizado con `leerTotalResiduos_()`
está en el repo pero el Apps Script real desplegado NO se actualiza solo — hay que copiar el
contenido de `Code-Socovesa.gs` al editor de Apps Script de Socovesa y volver a "Implementar"
(nueva versión) para que Total M3 y las fechas de registro dejen de mostrarse vacías en la
pestaña FGR. Mientras tanto la pestaña se ve igual pero con esos 2 campos en "—" (sin error,
degradación controlada).

Probado en vivo sirviendo el repo localmente (`python -m http.server`) contra el Apps Script
real: la pestaña aparece, el input+botón de m2 construidos guarda y persiste tras recargar, y
el cálculo de FGR (simulando un `emp.fgr` de prueba) da el resultado esperado.

## Selector de Año en el visor de trazabilidad de Socovesa (agregado 2026-08-28)
El usuario notó que "el visor asume que toda la información corresponde al 2026, cuando es de
varios años". Causa real (mismo repo separado `socovesa-trazabilidad`, no
`valorizacion-recylink.html`): las 3 funciones que arman el payload del visor
(`leerTrazabilidad_`, `leerValorizacion_`, `leerObjetivos_` en `Code-Socovesa.gs`) nunca leían
la columna **Año** — indexaban todo por nombre de mes nada más, así que filas del mismo mes de
años distintos (ej. "Enero 2023" y "Enero 2024") se mezclaban/pisaban en el mismo balde. Además
el frontend tenía "2026" hardcodeado en ~15 lugares (títulos, exportaciones, selector de mes).

Se le preguntó al usuario qué enfoque prefería (selector de año completo vs. mostrar solo el
año más reciente) — eligió el selector completo. Implementado como:

- **Backend (`Code-Socovesa.gs`)**: nueva `listarAniosDisponibles_()` que escanea la columna
  Año de Trazabilidad_Docs/Valorización/Objetivos y devuelve la lista ordenada de años con
  datos. `buildPayload_(anioParam)` ahora recibe el año pedido (`?anio=2023` en la URL),
  valida que exista en `listarAniosDisponibles_()` (si no, usa el más reciente), y se lo pasa a
  `leerTrazabilidad_`/`leerValorizacion_`/`leerObjetivos_` — las 3 ahora filtran sus filas
  MENSUALES a ese año exacto (fila sin Año = se asume del año actual, mismo criterio que
  `valorizacion-recylink.html`). Las sucursales/obras se siguen listando TODAS sin importar el
  año elegido (si no, una obra sin datos en el año seleccionado desaparecería del sidebar). Las
  filas "Anual" de Objetivos NO se filtran por año — son year-agnostic por diseño en todo el
  sistema (reflejan el "estado actual", se sincronizan sin Año). El total m3/fechas de la
  pestaña FGR (`leerTotalResiduos_`) tampoco se filtran — son históricos acumulados a
  propósito. El payload ahora incluye `ANIOS_DISPONIBLES` y `ANIO_SELECCIONADO`.
- **Frontend (`index.html`)**: nuevo selector de Año en la topbar (`#selAnio`, junto al de
  mes). Cambiar de año llama a `setAnio()`, que dispara un **refetch completo**
  (`cargarDatos()` con `&anio=X` en la URL) en vez de filtrar en el navegador — no se puede
  filtrar client-side porque el payload que llega ya viene con un solo año mezclado por balde
  de mes; hay que pedirle al backend que rearme todo para ese año. `cargarDatos()` guarda
  `payload.ANIOS_DISPONIBLES`/`ANIO_SELECCIONADO` en globals y repuebla el selector. Se
  reemplazaron los ~13 "2026" hardcodeados relevantes (títulos de tarjetas, nombres de archivo
  exportado, títulos de informes impresos) por `${anioSeleccionado}` — se dejaron sin tocar las
  2 menciones a la pestaña del Sheet literalmente llamada "Objetivos 2026" (nombre propio, no
  una fecha) y el comentario de ejemplo de formato de fecha de PMS.
- **No cubierto a propósito**: Seguimiento_CSE (`leerCSE_`) no tiene columna Año en el Sheet y
  no se tocó — si más adelante se necesita, habría que agregarle esa columna igual que a las
  otras 3 hojas.

**Pendiente de acción del usuario (de nuevo)**: como con el fix de FGR, el `Code-Socovesa.gs`
actualizado está en el repo pero el Apps Script real todavía tiene la versión SIN el selector
de año desplegada (confirmado con `curl` en vivo: el payload actual no trae
`ANIOS_DISPONIBLES`/`ANIO_SELECCIONADO` todavía). Hay que volver a copiar `Code-Socovesa.gs` al
editor de Apps Script y reimplementar para que el selector de año funcione de verdad — mientras
tanto el selector se ve pero queda vacío (degradación controlada, sin error, verificado en
vivo).

Verificado en vivo (sirviendo el repo localmente): con el backend viejo la página carga sin
errores y el selector queda vacío como se espera; simulando un payload con años, el selector se
puebla y queda seleccionado el correcto, y `cargarDatos()` arma la URL con `&anio=X`
correctamente al cambiar de año.

## Pestaña FGR: de por-obra a tabla comparativa entre todas las obras (2026-08-28)
El usuario pidió que la pestaña FGR (repo `socovesa-trazabilidad`, ver secciones anteriores)
dejara de mostrar solo la obra seleccionada y en su lugar fuera una tabla comparativa con todas
las obras a la vez. `renderFGR()` ya no recibe `emp` — ahora itera sobre `EMPRESAS` completo y
arma una fila por obra (Obra, Primer/Último registro, Total M3, M2 construidos editable, FGR),
con la fila de la obra actualmente seleccionada (`empActual`) resaltada en celeste para no
perder el contexto de navegación. El input+botón de m2 construidos por fila sigue funcionando
igual (localStorage, por obra) — al guardar, `renderMain()` re-renderiza la tabla completa así
que el cambio se ve al instante en su fila.

Los KPI de arriba también pasaron a ser agregados entre todas las obras en vez de por-obra:
Total M3 (suma de todas), Obras con FGR calculado (X/N), FGR promedio (entre las que ya tienen
m2 cargado) y Mejor FGR (menor valor = menos m3 por m2 construido).

Probado en vivo contra el Apps Script real (ya con el backend de FGR desplegado): las 53 obras
aparecen en la tabla con sus datos reales de m3 y fechas; al cargar m2 en 2 obras de prueba, el
KPI "Obras con FGR calculado" pasó de 0/53 a 2/53 y "FGR promedio"/"Mejor FGR" se calcularon
correctamente.

## FGR pasa a botón global (junto a Minutas) + sidebar filtrado por año (2026-08-28)
Dos pedidos del usuario sobre el mismo repo (`socovesa-trazabilidad`):

1. **FGR como botón global**: como la pestaña FGR ya es una comparativa entre TODAS las obras
   (no depende de cuál esté seleccionada), dejó de tener sentido como una vtab dentro de cada
   obra — se sacó de ahí. Ahora es un botón "📐 FGR" en la topbar, al lado de "📝 Minutas",
   mismo mecanismo (`vistaGlobal="fgr"`, `fgrToggleVista()`/`irAFGR()`/`fgrUpdateAccessBtn()`,
   calcados de sus equivalentes `mn*` de Minutas). A diferencia de Minutas, el sidebar NO se
   reemplaza al entrar a FGR — se deja el listado normal de obras, para poder seguir
   navegando/seleccionando una desde ahí (`setEmp()` ya vuelve solo a `vistaGlobal="empresa"`
   al hacer clic en una obra). `renderMain()` gana un nuevo early-return para
   `vistaGlobal==="fgr"` (`renderFGRGlobal()`, que solo pone un encabezado simple + el mismo
   `renderFGR()` de antes) — mismo patrón que ya existía para `"minutas"`. Los 4 lugares que
   llamaban `mnUpdateAccessBtn()` (incluido `setEmp()`) ahora también llaman
   `fgrUpdateAccessBtn()`, para que ambos botones se mantengan sincronizados sin importar por
   cuál vista se navegue.
2. **Sidebar filtrado por año**: antes `leerTrazabilidad_()` listaba una obra en `sucursales`
   ANTES de aplicar el filtro de año (decisión explícita de la vez anterior, para que ninguna
   obra "desapareciera" del sidebar al cambiar de año). El usuario pidió lo contrario: que el
   costado izquierdo solo muestre las obras que sí tienen registros de residuos en el año
   seleccionado. Se movió `sucursales[empId] = suc;` a DESPUÉS del filtro de año — ahora una
   obra sin ningún registro de Trazabilidad_Docs en el año elegido no aparece en el sidebar ni
   en la tabla comparativa de FGR (que itera `EMPRESAS`, poblado desde `traza.sucursales`).

Probado en vivo: el botón FGR aparece junto a Minutas, activa `vistaGlobal="fgr"` y muestra la
tabla comparativa con el sidebar de obras intacto; alternar FGR↔Minutas↔obra funciona limpio
(un solo botón queda "primary" a la vez); hacer clic en una obra del sidebar vuelve
correctamente a su vista normal. El filtro de sidebar por año se verificó con datos simulados
(mismo algoritmo que quedó en `Code-Socovesa.gs`) — el backend real todavía no tiene este
cambio desplegado.

**Pendiente de acción del usuario (otra vez)**: hay que volver a copiar `Code-Socovesa.gs` al
editor de Apps Script y reimplementar para que el sidebar/FGR reales empiecen a excluir las
obras sin datos del año seleccionado.

## FGR debe mostrar TODAS las obras sin importar el año del sidebar (2026-08-28)
El usuario aclaró: el sidebar sí debe filtrarse por año (fix anterior), pero la pestaña FGR
debe seguir mostrando TODAS las obras sin importar qué año esté seleccionado — tiene sentido,
ya que el FGR usa el histórico completo de "Total Residuos" (`leerTotalResiduos_()`, que nunca
se filtró por año) y no un recorte anual.

El problema: `renderFGR()` leía de `EMPRESAS`, que es exactamente el arreglo que el fix anterior
dejó filtrado por año (para el sidebar). Al filtrar el sidebar, sin querer también se filtraba
la tabla comparativa de FGR.

Solución — separar ambas fuentes en el backend:
- `leerTrazabilidad_()` ahora devuelve DOS mapas de sucursales: `sucursales` (filtrado por año,
  sigue alimentando `EMPRESAS`/sidebar, sin cambios) y `todasLasSucursales` (TODAS las obras,
  construido ANTES de aplicar el filtro de año, o sea el comportamiento que tenía el sidebar
  originalmente).
- Nuevo helper `construirFgrInfo_(empId, totalResiduosPorEmpresa)` — se sacó la lógica de armar
  `{totalM3, primerRegistro, ultimoRegistro}` que antes vivía inline dentro de
  `construirEmpresas_()`, para poder reusarla en dos lugares sin duplicar código.
- `buildPayload_()` arma un array nuevo e independiente, `TODAS_OBRAS_FGR` (a partir de
  `traza.todasLasSucursales`, sin filtro de año), con `{id, sucursal, fgr}` por obra — se manda
  en el payload junto a `EMPRESAS` (que sigue filtrado).
- Frontend: nuevo global `TODAS_OBRAS_FGR`, poblado en `cargarDatos()` igual que
  `ANIOS_DISPONIBLES`. `renderFGR()` ahora itera `TODAS_OBRAS_FGR` en vez de `EMPRESAS` — el
  resto de la función no cambió (solo usaba `.id`/`.sucursal`, presentes en ambos formatos).

Probado en vivo: contra el backend real (ya con el fix de sidebar-por-año desplegado, `EMPRESAS`
trae 12 obras para el año actual), simulando `TODAS_OBRAS_FGR` con 53 obras la tabla de FGR las
muestra las 53 mientras el sidebar se mantiene en 12 — confirma que quedaron desacopladas
correctamente.

**Pendiente de acción del usuario (otra vez más)**: falta volver a copiar `Code-Socovesa.gs` al
editor de Apps Script y reimplementar para que `TODAS_OBRAS_FGR` llegue de verdad en el payload
— mientras tanto la tabla de FGR queda vacía (degradación controlada, sin error).

## Visor de Objetivos: "Todas" solo muestra sucursales con datos en el año elegido (2026-08-28)
Mismo pedido que se hizo para el visor de Socovesa (`socovesa-trazabilidad`), ahora aplicado a
`valorizacion-recylink.html`: el selector "Sucursal" del visor de Objetivos (`f-obj-suc`) y la
opción "Todas" ya no deben listar/mostrar TODAS las sucursales de siempre — solo las que
efectivamente tienen datos (valorización o trazabilidad) en el año elegido en `f-obj-anio`.

- Nueva `sucursalesConDatosEnAnio(anio)`: revisa `valMatrix[suc]` (¿algún mesKey empieza con
  ese año?) y `trazRows` (¿algún registro de ese suc es de ese año?); sin año, devuelve todas
  (comportamiento de siempre). Colocada junto a `isSucExcluida`.
- Los 2 lugares que arman el filtro inicial de sucursal (`processData()` para Excel recién
  subido, `loadFromSheets()`→`loadSheetsData()` para datos ya sincronizados) ahora calculan
  primero el año por defecto (el más reciente) y populan `f-obj-suc` ya filtrado a ese año, en
  vez de listar todas y filtrar después.
- Nueva `refreshObjSucOptions()` (mismo patrón que ya existía `refreshObjMesOptions()` para el
  mes): repuebla `f-obj-suc` cada vez que cambia `f-obj-anio`, reseteando a "Todas" — igual
  criterio que ya usaba el selector de mes al cambiar de año.
- `renderCopecObjetivos()`: cuando el filtro de sucursal está en "Todas" (`fS==='all'`),
  `sucsToShow` ahora es `sucursalesConDatosEnAnio(fA)` en vez de la lista completa de
  sucursales — así la vista en sí (no solo el dropdown) deja de mostrar tarjetas de sucursales
  sin ningún dato ese año.
- **Limitación conocida, documentada en el código**: si una sucursal SOLO tiene fila en la hoja
  `🎯 Objetivos` (sin nada en Valorización/Trazabilidad_Docs), no hay forma genérica de saber a
  qué año pertenece esa fila para todas las empresas (solo Euro/Socovesa tienen columna Año en
  esa hoja) — ese caso extremo queda igual excluido salvo que la sucursal tenga datos en otra
  hoja para ese año. No se intentó resolver por ser un caso raro y agregar mucha complejidad
  específica por empresa para poco beneficio.

Probado en vivo con Euro (3 años disponibles: 2024/2025/2026): con 2026 seleccionado aparecen
las 9 sucursales de siempre; al cambiar a 2024, tanto el dropdown como la vista renderizada
quedan con una sola sucursal ("Proyecto Departamental", la única con datos ese año); al volver
a 2026, las 9 reaparecen.

## Code-Gespania.gs: misma lógica de años/FGR/Minutas que Socovesa (2026-08-28)
A pedido del usuario ("quiero que gespania funcione con la misma lógica de años que socovesa").
Gespania tiene, además de `EMPRESAS.gespania.scriptUrl` (usado por `valorizacion-recylink.html`,
sin cambios), un **"visor de Trazabilidad" propio** — un dashboard separado (fuera de este repo)
que consume la misma Apps Script vía `?visor=1`/`?callback=X`, igual patrón que Socovesa. El
usuario pegó el Code.gs real que tenía desplegado para ese visor (sin Minutas, sin lectura real
de Objetivos, sin selector de año — la versión "de antes" de lo que Socovesa ya tenía).

Se reescribió `Code-Gespania.gs` completo, portando desde `Code-Socovesa.gs` lo que faltaba:
- **Objetivos reales**: `construirEmpresas_()` ahora arma la lista desde "Objetivos 2026" (lista
  maestra) + `🎯 Objetivos` (avance real por obra), en vez de 2 objetivos hardcodeados.
- **Selector de año**: `buildPayload_(anioParam)` lee `?anio=` y filtra Trazabilidad/
  Valorización/Objetivos-mensuales a ese año; el sidebar (`EMPRESAS`) solo lista obras con datos
  en ese año; las filas "Anual" de Objetivos nunca se filtran.
- **TODAS_OBRAS_FGR**: tabla comparativa de FGR (Total M3 acumulado + primer/último registro,
  leído de "Total Residuos") que muestra TODAS las obras sin importar el año elegido — tiene
  sentido para Gespania porque también tiene un objetivo FGR ("Lograr un FGR de 0,2 m3/m2").
- **Visor de Minutas** (`?minutas=1`): mismo motor genérico (`writeMinutas_`/`doGetMinutas_`,
  ubica cada sesión por fila real, colMap lo arma el cliente). Gespania NO tenía esto desplegado.

**Cuidado al fusionar**: el Code.gs real que pegó el usuario traía versiones MÁS VIEJAS de
`writeValorizacion`/`writeObjetivos` (borraban por solo `empresa_id`, sin mirar Tipo/Objetivo —
el mismo bug corregido el 2026-08-14/2026-08-27 en las demás empresas). Se mantuvieron las
versiones ya corregidas que traía el `Code-Gespania.gs` del repo, NO las del Code.gs pegado —
usar esas últimas hubiera sido una regresión real (mismo cuidado que ya se tuvo con Acciona).

**Diferencias reales confirmadas contra el Sheet de Gespania** (revisado visualmente, pestaña
por pestaña, ya que Gespania NO es idéntica a Socovesa):
- `🎯 Objetivos`, `♻️ Valorización` y `📊 Trazabilidad_Docs` de Gespania **NO tienen columna
  Año** (a diferencia de Socovesa). Todo el mecanismo de año quedó portado igual, pero
  `listarAniosDisponibles_()` va a devolver un único año (el actual) hasta que — si corresponde
  — se agregue esa columna con datos de más de un año real. No rompe nada, simplemente el
  selector de año queda con una sola opción por ahora.
- `Total Residuos` de Gespania tiene 7 columnas (Sucursal|Mes|Residuo|Valorizado/No
  Valorizado|Respel no respel|Total KG|Total M3), sin Año ni "Tons. CO2eq. evitadas" — se ajustó
  `numCols=7` en `writeTotalResiduos` (el Code.gs pegado por el usuario también traía 7; el
  `Code-Gespania.gs` viejo del repo tenía `numCols=8`, no coincidía con el Sheet real).
- `Minuta` de Gespania tiene sub-encabezado de solo 3 columnas ("Tema, Check List, Detalle"), no
  5 como Socovesa ("Tema, Revisado, Detalle, Acuerdos, Resuelto"). `writeMinutas_` no depende del
  orden/cantidad de columnas (lo recibe del cliente vía `colMap`), pero se le agregó una guarda
  (`if (colMap.acuerdos !== undefined...)`) para no romper si el cliente manda un colMap sin esas
  2 claves — la versión de Socovesa asumía que siempre venían las 5.

**Pendiente / no verificable desde acá**: este cambio es un archivo de Apps Script — no toma
efecto hasta que el usuario lo pegue en el editor de Apps Script del proyecto de Gespania y cree
una nueva versión de la implementación (`Implementar > Gestionar implementaciones`). No se pudo
probar en vivo contra el Sheet real (a diferencia de los cambios en `valorizacion-recylink.html`,
que se sirven directos); se recomienda correr `testBuildPayload()` y `testReadMinutas()` desde el
editor después de pegarlo, para confirmar que no hay un nombre de columna que no calce.

**Actualización (2026-08-31)**: el usuario ya desplegó el `Code-Gespania.gs` de arriba (el backend
real de `?visor=1` ya devuelve `ANIOS_DISPONIBLES`/`TODAS_OBRAS_FGR`/objetivos reales — confirmado
con `curl`/`fetch` directo contra la URL real). También pidió actualizar el frontend separado —
repo `recylink/Visor-de-Objetivos-Gespania` (GitHub Pages, `https://recylink.github.io/
Visor-de-Objetivos-Gespania/`), clonado en `Desktop/Visor-de-Objetivos-Gespania` — para que se vea
igual que `recylink/socovesa-trazabilidad` (clonado en `Desktop/socovesa-trazabilidad`). Se
reemplazó su `index.html` completo por el `index.html` actual de Socovesa, re-parametrizado:
`EMPRESA_NOMBRE`/`EMPRESA_COLOR`/`EMPRESA_COLOR_L`, `DATA_SOURCE_URL` (scriptUrl real de
Gespania), `FGR_M2_LS_KEY`, `MN_SHEET_ID` (planilla de Gespania), `MN_LS_SCRIPT`/`MN_LS_DATA`
(namespacing de localStorage). Los arreglos `DOC_COLS`/`DOCS_RES`/`DOCS_TRAZO*` ya eran idénticos
entre ambas empresas, no requirieron cambio. Commit `043fc16` en ese repo, subido a `main`
(GitHub Pages se actualiza solo).

**Bug real encontrado en la Sheet de Gespania al probar contra el backend real (no es un bug de
código, es un problema de datos)**: la hoja `📊 Trazabilidad_Docs` tiene la columna "Año" agregada
como **encabezado suelto** en la fila 5, sin haber insertado una columna real que empuje los datos
— o sea, la fila de encabezados dice `..., Mes, Año, Residuo, Código LER, ...` pero las filas de
datos siguen teniendo `..., Mes, [Residuo real], [Código LER real], ...` una posición más a la
izquierda. Resultado confirmado con `curl` contra el doGet real: la columna "Año" devuelve nombres
de residuo (ej. "Escombro") y la columna "Residuo" queda vacía — todo lo que sigue a la derecha
también corrido. Esto afecta tanto al visor nuevo (selector de año muestra residuos en vez de
años) como potencialmente a `valorizacion-recylink.html` cuando lee Gespania desde Sheets (no
subiendo Excel fresco), porque ese lector también es por nombre de columna. **La hoja
`🎯 Objetivos` SÍ está bien alineada** (verificado con filas reales — Objetivo/% cumplimiento/
Detalle calzan). Sin verificar del todo `♻️ Valorización` (hay indicios de una columna extra sin
nombre al final, con valores que deberían estar en un mes real). **Esto requiere que alguien
corrija la hoja `📊 Trazabilidad_Docs` directamente en Google Sheets** (insertar una columna real
en la posición de "Año", con Insertar columna — no solo escribir el texto "Año" en una celda del
encabezado) — no se intentó arreglar automáticamente por ser una edición directa de datos en vivo
de un Sheet ajeno.

**Actualización (2026-08-31)**: el usuario corrigió el encabezado de las 3 hojas (confirmado
visualmente: `Trazabilidad_Docs`, `♻️ Valorización` y `🎯 Objetivos` ahora tienen "Año" como
columna propia, en el mismo orden que Euro para Trazabilidad_Docs — Sucursal, Mes, Año, Residuo,
Código LER, Importaciones, Cert. tratamiento, Factura, Cert. declaración, Transportista,
Disposición final) y borró a mano todas las filas de datos viejas (decisión propia, para volver a
subir el Excel sobre una base limpia — no fue una pérdida accidental).

Con la estructura ya confirmada, se agregó Gespania a la sincronización con Año en
`valorizacion-recylink.html`:
- `EMPRESAS_OBJ_CON_ANIO` y `EMPRESAS_VAL_CON_ANIO`: se agregó `gespania:1` (mismo formato de fila
  que Euro/Socovesa para Objetivos y Valorización).
- Trazabilidad_Docs: se agregó `esGespaniaTraz` en `autoSync()`, compartiendo la MISMA rama que
  Euro (`esEuroTraz || esGespaniaTraz`) — no la de Socovesa, que tiene un orden de columnas
  distinto (sin "Factura", con "Transportista" pegado al Residuo). Gespania calza exacto con el
  orden de Euro.
- La lectura (`loadSheetsData`, `parseObjetivosRows_`, etc.) no necesitó ningún cambio: ya lee por
  nombre de columna (`row['Año']`) de forma genérica para cualquier empresa.

Verificado con la función real `autoSync()` (interceptando `fetch`, sin escribir de prueba al
Sheet real): la fila de Trazabilidad y las 3 filas de Valorización (% Real/% Acumulado/Meta %)
salen con el Año en la posición correcta, calzando con el layout confirmado visualmente en el
Sheet real. Falta que el usuario vuelva a subir el Excel de Gespania para repoblar las 3 hojas
(las borró a propósito) — recién ahí el selector de año del visor nuevo (`Visor-de-Objetivos-
Gespania`) y el filtro de año de `valorizacion-recylink.html` van a tener años reales para elegir.

**Actualización (2026-08-31, tarde)**: el usuario ya subió el Excel y confirmó que el Año se
cargó bien (verificado con `curl` contra el doGet real: Trazabilidad/Valorización/Objetivos con
años reales 2018-2026, sin corrimiento). Encontró un problema nuevo: la fila "Meta %" (5% para
Gespania) desapareció al limpiar la hoja antes de resubir, y Gespania nunca tuvo botón "Editar
metas" en el visor (dependía 100% de que alguien escribiera esa fila a mano en el Sheet). A
pedido del usuario, se agregó el mismo mecanismo que ya usan Copec/Acciona:

- `GESPANIA_META_PCT_DEFAULT = 5`, `getGespaniaMetas()`/`saveGespaniaMetas()` (localStorage
  `gespania_metas`, mismo patrón `Object.assign({}, default, metasFromSheets, stored||{})` que
  Acciona) y se sumó `'gespania'` a `getMetasEditablesActuales()`/`saveMetasEditablesActuales()`/
  `metaDefaultEditable()` y a las 3 condiciones que muestran el botón "✎ Editar metas".
- `metasActuales` (en `autoSync()`) y `metas` (en `renderCopecObjetivos()`) ahora usan
  `getGespaniaMetas()` en vez de leer `metasFromSheets` a secas — así el % Valorización vs. meta
  y la fila "Meta 2026" quedan consistentes con lo que se vea/edite en el botón.
- **Bug encontrado y corregido de paso**: `syncMetas()` (la función que sincroniza "Editar
  metas" al Sheet) todavía mandaba el formato viejo sin columna Año — iba a repetir el mismo bug
  de corrimiento que se acababa de arreglar, esta vez vía el botón de metas. Se corrigió para
  mandar una fila "Meta %" POR AÑO cuando `EMPRESAS_VAL_CON_ANIO[empresaActual]` (Gespania hoy),
  con Año en el índice 3 — mismo criterio que ya usa `autoSync()`. Del lado del Apps Script,
  `writeMetas()` en `Code-Gespania.gs` hacía upsert buscando solo por `empresa_id+Tipo`, lo que
  hubiera hecho que las ~9 filas (una por año) se pisaran entre sí contra la primera que
  calzara; se corrigió para hacer match también por Año (`empresa_id+Tipo+Año`).

Verificado en vivo (interceptando `fetch`, sin escribir al Sheet real): el editor muestra las 10
sucursales con 5% por defecto; al guardar, se generan correctamente 90 filas (10 sucursales × 9
años 2018-2026) con el Año en la posición correcta; y la tabla de Objetivos ya muestra
"Meta val.: 5%" comparado contra el % acumulado real.

## Panel de salud: selector de Año (agregado 2026-08-31)
A pedido del usuario ("que en el panel de salud solo se evalúen los clientes del año
seleccionado"). Motivado por el mismo trabajo de año multi-año de Gespania/Socovesa/Euro: antes
`calcSaludEmpresa_()` promediaba los objetivos mensuales de TODOS los años mezclados (para
Gespania, 2018-2026 juntos), diluyendo el % de salud con historia vieja en vez de reflejar el
año que interesa.

- Nuevo `<select id="f-salud-anio">` en el encabezado del panel (arriba del toggle
  Peor/Mejor), poblado con la unión de valores reales de la columna "Año" encontrados en
  cualquiera de las 10 empresas (`refreshSaludAnioOptions_()`) + el año actual como piso —
  empresas sin columna Año simplemente no aportan opciones extra (siguen cayendo bajo el año
  actual por el fallback ya existente en `parseObjetivosRows_`/`parseValorizacionRows_`).
- `calcSaludEmpresa_(companyId, data, anio)` ahora recibe el año y filtra el componente de
  "objetivos mensuales" del promedio (`objBySucMes`) a ese año exacto — el resto (objetivos
  anuales, % valorización vs. meta vía `ultimoAcum_`) sigue sin filtrarse por año a propósito,
  mismo criterio que ya se documentó para el % Acumulado ("debe arrastrar años anteriores").
- `saludDataPorEmpresa` cachea el payload crudo (doGet) de cada empresa por separado de
  `saludPorEmpresa` (los puntajes ya calculados), para que cambiar el año **recalcule sin
  volver a pedirle datos a las 10 empresas** (`recalcularSaludTodas_()`, disparado por el
  `change` del selector). `cargarSaludTodas()` y el auto-refresh de `guardarObjetivoManual()`
  ahora también alimentan este cache y usan `saludAnio` al calcular.

Verificado en vivo con datos reales: el selector trae los 9 años de Gespania (2018-2026); al
cambiar de 2026 a 2019 sin recargar, "El Rosal lll" pasa de 28.5% a 3.5% y "General Jofre -
Fontana" de 43.4% a 15.5% — confirma que el filtro por año efectivamente cambia el cálculo.

**Bug reportado por el usuario, corregido el mismo día**: "en Gespania me aparecen 10
sucursales cuando quiero que sean solo 2". El selector de Año ya filtraba el PUNTAJE, pero no
la LISTA de sucursales — `calcSaludEmpresa_` seguía listando las 10 sucursales de siempre. Causa
real: `autoSync()` sincroniza una fila "% Real"/"% Acumulado"/"Meta %" por CADA año de
`aniosDisp` para TODAS las sucursales (aunque esa sucursal no tenga ningún dato ese año — los
meses quedan vacíos, y "Meta %" ni siquiera depende de tener datos reales). Filtrar solo por
"¿existe una fila de Valorización con ese Año?" contaba las 10 igual. Se corrigió agregando el
mismo criterio que ya usa `sucursalesConDatosEnAnio()` del visor principal: solo cuenta una fila
`Tipo==='% Real'` si además tiene **al menos un mes con valor no vacío** (`anioDeFila_()` nuevo,
compartido). Trazabilidad no necesitó este ajuste — esas filas solo se crean cuando hubo una
operación real, nunca como placeholder vacío. Verificado en vivo: Gespania año 2026 pasó de 10 a
2 sucursales ("El Rosal lll", "General Jofre - Fontana" — las únicas con actividad real ese año);
Copec/Euro/Salfa sin cambios (24/9/2 sucursales respectivamente).

## Columna Año en "Total Residuos" de Gespania (agregado 2026-08-31)
El usuario preguntó por qué la pestaña FGR del visor separado (`Visor-de-Objetivos-Gespania`)
no mostraba primer/último registro — `leerTotalResiduos_()` (portado de Socovesa) necesita la
columna "Año" de la hoja "Total Residuos" para poder ordenar cronológicamente, y Gespania no la
tenía. A diferencia de las otras 3 hojas (donde Año va entre Mes y Objetivo/Residuo), en
**Total Residuos el Año va en la columna B, justo después de Sucursal** (mismo lugar que ya
usan Euro/Socovesa) — se lo señalé al usuario antes de que lo agregara, para no repetir un
corrimiento.

Una vez agregada la columna:
- `generaAnioTR` en `autoSync()` ahora incluye `'gespania'` (antes solo euro/socovesa).
- `writeTotalResiduos()` en `Code-Gespania.gs`: `numCols` pasó de 7 a 9. Detalle encontrado de
  paso: Gespania YA mandaba el valor de CO2 como 8va columna desde antes (`generaCO2TR` ya la
  incluía), aunque esa columna no tuviera encabezado visible en el Sheet — con Año agregado, la
  fila completa queda `Sucursal|Año|Mes|Residuo|Valorizado/No Valorizado|Respel no
  respel|Total KG|Total M3|Tons. CO2eq. evitadas` (9 columnas).
- `leerTotalResiduos_()` no necesitó cambios — ya lee por nombre de columna (`headers.indexOf`),
  agnóstico al orden.

Verificado con la función real `autoSync()` (interceptando `fetch`): la fila sale
`["Nuncio Ossa", "2026", "Marzo", "Escombro", "No Valorizado", "No respel", 1000, 5, 0.5]` — Año
en la posición correcta (índice 1, columna B).

## "valorizar un 5% de residuos en kg" usa el % Acumulado real (2026-08-31)
Seguimiento del hallazgo anterior: en vez de borrar el texto duplicado de "Objetivos 2026", el
usuario pidió que ESE objetivo muestre el cálculo real (% Acumulado vs. Meta %), en vez de
quedar en null. Se modificó `construirEmpresas_()` en `Code-Gespania.gs`:

- El cálculo de `avanceVal`/`metaVal` (que antes vivía después del armado de `objetivos`, solo
  para la tarjeta sintética del final) se movió ANTES del loop sobre `objetivosMaestro`.
- Nuevo `esObjetivoValorizacionPct_(texto)` — regex `/valorizar.*residuos/i` — detecta
  genéricamente un texto de "Objetivos 2026" con forma "valorizar ... residuos ..." (hoy es
  literal "valorizar un 5% de residuos en kg", pero no se hardcodeó el texto completo por si
  cambia la redacción). Cuando el loop encuentra un texto así, en vez de buscar (y no
  encontrar) una fila en `objetivosPorEmpresa`, le asigna `avance`/`ok`/`meta` directamente
  desde `avanceVal`/`metaVal`.
- La tarjeta sintética "X% Valorización" al final (que existía porque Socovesa no tiene un
  texto de % de valorización en su propio "Objetivos 2026") ahora solo se agrega si NINGÚN
  texto de la lista maestra ya cubrió ese rol (`yaSeMostroValorizacionPct`) — para Gespania,
  que sí lo trae, deja de duplicarse.

Verificado extrayendo la función real y corriéndola con datos de prueba (Node, sin Apps
Script): con acumulado=0.7% y meta=5%, el objetivo "valorizar un 5% de residuos en kg" da
`{avance:0.7, meta:5, ok:false}` en vez de `{avance:null, meta:100, ok:null}`, y la tarjeta
"X% Valorización" ya no aparece duplicada en la lista.

**Corrección el mismo día**: el usuario notó que 0,7/5 = 0,14 (14%) no se veía reflejado. Causa:
el front-end (`renderObjetivos()` en el `index.html` del visor) muestra `avance + "%"` tal cual
como texto, y asume `meta=100` para todos los demás objetivos (FGR, SINADER, trazabilidad, donde
`avance` YA es un % de cumplimiento 0-100). Mandar `avance:0.7, meta:5` (los números crudos) no
sigue esa convención — el texto mostraba literalmente "0.7%" en vez del 14% de avance hacia la
meta. Se corrigió `esObjetivoValorizacionPct_` para convertir a la misma escala que usa el resto
del sistema: `avance = Math.min(100, Math.round(acumulado/meta*100))`, `meta:100` fijo — mismo
criterio que ya usa `valorizacion-recylink.html` para "% Valorización vs. meta"
(`Math.min(100, acum/meta*100)`). El `detalle` ahora dice explícitamente "X% acumulado de Y%
meta" para no perder los números crudos. Verificado: con acumulado=0.7%/meta=5% da
`{avance:14, meta:100, ok:false}`.

## Subir el Excel de un solo mes ya no borra los meses anteriores (agregado 2026-08-31)
El usuario preguntó si subir el Excel del mes nuevo (en vez del acumulado completo) borraba la
información existente. Investigando: **para Trazabilidad_Docs y Objetivos, no** (cada fila es
por mes, un Excel parcial nunca toca meses que no trae). **Para Valorización sí había un riesgo
real**: `processData()` (se dispara al subir un Excel) reiniciaba `valMatrix` y
`acumFromSheets` por completo en cada carga — así que si el Excel nuevo no traía TODOS los
meses ya sincronizados, la fila "% Real"/"% Acumulado" de ese año (una sola fila con los 12
meses adentro) se reescribía completa, dejando en blanco los meses que el Excel nuevo no traía
— no se "borraban" como filas sueltas, pero la información se perdía igual.

El usuario pidió poder subir solo el mes nuevo, así que se corrigió `processData()`:
- En vez de reiniciar `valMatrix` a `{}`, ahora preserva las entradas que ya estaban cargadas
  desde Sheets (`fromSheets:true`, las pone `loadSheetsData()`) — el resto sí se reinicia
  normal.
- `acumFromSheets` ya no se reinicia en absoluto (`getAcum()` ya prioriza este valor por sobre
  el recálculo desde `valMatrix`, así que no hace falta tocarlo).
- Al acumular kg/m3 reales del Excel para un mes que estaba heredado como `fromSheets:true`, se
  limpia primero (`if (!valMatrix[suc][mes] || valMatrix[suc][mes].fromSheets)`) para no sumar
  kilos crudos sobre un placeholder que en realidad guardaba un % ya calculado.

**Requisito para que funcione**: hay que usar "Cargar desde Sheets" ANTES de subir el Excel del
mes nuevo, en la misma sesión — así `valMatrix`/`acumFromSheets` ya tienen los meses anteriores
cargados para que `processData()` los preserve. Si se sube el Excel sin cargar desde Sheets
primero, el comportamiento es el de siempre (sin meses previos que preservar).

Verificado en vivo: con Enero=2%/Febrero=3% ya cargados desde Sheets (simulado) y un Excel que
solo trae Marzo (Escombro reciclado, 1000kg), tras `processData()` Enero/Febrero quedan
intactos (`fromSheets:true`) y Marzo se calcula fresco (100%); la fila sincronizada por
`autoSync()` sale completa: `["% Real", "2026", "2%", "3%", "100%", "", ...]`.

## Gespania: bugs críticos de clave de borrado (destruían datos entre años) — 2026-08-31
Investigando cómo calcular un % Acumulado ponderado por kg real (ver sección siguiente), se
encontraron 3 bugs de integridad de datos en `Code-Gespania.gs`, en el patrón "borrar filas que
matchean la clave, luego insertar las nuevas" que usa cada `write*`. Cuando se agregó la
columna Año a las hojas, algunas claves de borrado NO se actualizaron para incluirla —
resultado: sincronizar UN año podía borrar filas de OTRO año que compartían el resto de la
clave.

- `writeValorizacion`: clave era `id+Tipo` (2 campos) → ahora `id+Tipo+Año` (lee 4 columnas).
- `writeTrazabilidad`: clave era `id+Mes` → ahora `id+Mes+Año` (lee 4 columnas).
- `writeObjetivos`: clave era `id+Mes+Año` (el 3er campo del nuevo layout con Año es Año, no
  Objetivo) → ahora `id+Mes+Año+Objetivo` (lee 5 columnas). Este era el más grave: dos
  objetivos del mismo mes y año pero distinto texto se pisaban entre sí, y encima cualquier fila
  de OTRO año con el mismo mes+objetivo se borraba sin querer.

**Nota pendiente, no corregida todavía**: `Code-Euro.gs`'s `writeObjetivos` usa la clave
`id+Mes+Objetivo` (bien indexada, a diferencia del bug de Gespania) pero tampoco incluye Año —
o sea que Euro probablemente tiene el mismo riesgo de colisión entre años para Objetivos. No se
tocó porque no fue pedido, pero conviene aplicar el mismo fix si se confirma el problema.

## Gespania: Total Residuos ya no se borra completo al sincronizar — 2026-08-31
`writeTotalResiduos` hacía `clearContent()` de todo el rango de datos y reinsertaba todo desde
cero en cada sync — cualquier sync parcial (solo el mes nuevo) borraba TODOS los meses/años
anteriores de esa hoja. Se cambió a borrado selectivo por clave `Sucursal+Año+Mes` (igual
patrón que las otras hojas), preservando lo que no matchea.

También se agregó `readTotalResiduosSheet_()` (mismo patrón que `readRespelSheet_()`: busca la
fila de encabezado con "Sucursal" y mapea cada fila por nombre de columna) y se conectó al
`doGetClasico_()` como `totalResiduos: readTotalResiduosSheet_()` — antes esta hoja era de solo
escritura, ahora el visor puede leerla de vuelta.

**Importante**: estos cambios son solo en el código de `Code-Gespania.gs`. Para que tomen
efecto en la URL en vivo hay que volver a pegar el archivo completo en el editor de Apps Script
de Gespania y crear una nueva versión de despliegue (Implementar → Administrar
implementaciones → Editar → Nueva versión).

## % Acumulado ponderado por kg/m3 real (Total Residuos) — 2026-08-31
Problema detectado en vivo: `getAcum()` mezclaba, en un solo promedio ponderado, meses ya
sincronizados desde Sheets (que solo tienen el % final, representado como "100 unidades" de
peso fijo por mes) con el mes recién subido desde Excel (que sí tiene kg reales). Con
Enero=80%/Febrero=75% (acumulado real ~77.5%) y una carga chica de Marzo (500kg, 10%
valorizado), el cálculo daba **29.29%** en vez de un valor realista cercano a 77% — porque los
meses viejos perdían su magnitud real de kg al colapsarse a "100 unidades" cada uno, mientras
Marzo (aunque chico) entraba con su peso real y dominaba la mezcla.

Como `Total Residuos` sí guarda kg/m3 reales por mes (y ahora ya no se borra en sync parciales,
ver arriba, y ahora se puede leer de vuelta vía `doGet`), se puede calcular un acumulado
correctamente ponderado a partir de ahí:

- Nuevo global cliente `totalResiduosDesdeSheets` (poblado en `loadSheetsData()` desde
  `data.totalResiduos`, sin resetear en `processData()` — mismo criterio que
  `acumFromSheets`).
- Nueva función `kgRealPorMesSuc_(suc)`: combina `totalResiduosRows` (sesión, Excel recién
  subido, ya en formato `mesKey` "YYYY-MM") con `totalResiduosDesdeSheets` (persistido, formato
  crudo de la hoja con "Mes" en texto español + "Año" separado — se convierte a `mesKey` vía
  `MESES_ES`) en un mapa `{mesKey: {total, val}}`. Si un mes está en ambas fuentes gana la
  sesión actual (recálculo fresco). Usa kg o m3 según la métrica de la empresa (`esEuro ||
  esAcciona` → m3, el resto → kg — mismo criterio que `metricaVal` en `processData()`).
- Nueva función `getAcumReal_(suc, upTo, anio)`: suma `total`/`val` de todos los meses ≤ `upTo`
  (filtrando por año si corresponde) y devuelve `val/total*100`, o `null` si no hay datos.
- `getAcum()` ahora prioriza: (1) valor exacto cacheado en `acumFromSheets`, (2)
  `getAcumReal_()` si hay datos de Total Residuos, (3) el fallback crudo anterior (solo para
  empresas/meses sin ninguna de las dos fuentes).

Esto también corrige de paso el mismo problema de precisión para Euro (que ya sincroniza Total
Residuos con Año desde antes), no solo Gespania.

## Socovesa: no perder sucursales/meses históricos al subir solo el mes nuevo — 2026-08-31
El resguardo agregado antes (preservar `fromSheets:true` en `valMatrix`/`acumFromSheets` al
subir un Excel, ver sección "Subir solo el Excel del mes nuevo") **dependía de que el usuario
usara "Cargar desde Sheets" A MANO justo antes de subir el Excel** — si no lo hacía (el flujo
normal: solo se sube el Excel), `valMatrix` arrancaba vacío en `processData()` y CUALQUIER
sucursal que no viniera en ese Excel nuevo (no solo los meses) desaparecía de `sucursales`,
perdiéndose de la UI y de la siguiente sincronización (la fila "% Real" de esa sucursal deja de
reenviarse).

Se corrige automatizando ese paso: se agrega `precargarDesdeSheetsSilencioso_()` (mismo fetch
que `loadFromSheets()`, pero sin tocar el dot/mensaje de sync ni mostrar toasts, y sin lanzar
error si el Sheet está vacío o no hay `scriptUrl`) y se llama SIEMPRE antes de `processData()`
en el listener de `file-input`. Aplica a cualquier empresa, no solo Socovesa — es el mismo
mecanismo que ya existía, ahora automático en vez de manual.

Verificado en vivo: con "Obra A"/"Obra B" ya sincronizadas (Enero, `fromSheets:true`) y un Excel
nuevo que solo trae Marzo de "Obra A", tras `processData()` "Obra B" sigue en `sucursales` y su
Enero queda intacto (`{2026-01:{val:70,fromSheets:true}}`); "Obra A" queda con Enero preservado
+ Marzo recalculado desde cero.

## Socovesa: bugs de clave de borrado por año en Trazabilidad_Docs y Objetivos — 2026-08-31
Mismo patrón de bug ya encontrado y corregido en `Code-Gespania.gs` (ver sección de más
arriba), encontrado ahora en `Code-Socovesa.gs`:

- `writeTrazabilidad`: la clave de borrado era `empresa_id+mes` (2 columnas), sin el Año que sí
  tiene la hoja (columna D) — sincronizar CUALQUIER mes borraba las filas de ESE MISMO mes de
  TODOS los años anteriores. Se corrigió a `empresa_id+mes+año` (lee 4 columnas).
- `writeObjetivos`: ya tenía un fix previo (FIX 5, 2026-08-28) que cambió la clave de
  `empresa_id+mes+año` a `empresa_id+mes+Objetivo` para no borrar TODOS los objetivos de un
  mes al resincronizar uno solo — pero esa clave dejó de incluir el Año, reintroduciendo el
  mismo problema para el caso "mismo objetivo, mismo mes, distinto año". Se corrigió a
  `empresa_id+mes+año+Objetivo` (los 4 juntos, lee 5 columnas) para no repetir ninguno de los
  dos bugs.

`writeValorizacion` en Socovesa ya estaba bien (clave `empresa_id+Tipo+año`, sin bug).

**Nota pendiente, no corregida**: `Code-Euro.gs`'s `writeObjetivos` tiene el mismo problema que
tenía Socovesa antes de este fix (clave `empresa_id+mes+Objetivo`, sin Año) — no se tocó porque
no fue pedido, pero conviene aplicar el mismo fix si se confirma el problema ahí también.

**Importante**: estos cambios son solo en `Code-Socovesa.gs`. Para que tomen efecto en la URL
en vivo hay que volver a pegar el archivo completo en el editor de Apps Script de Socovesa y
crear una nueva versión de despliegue.

## Euro: mismos bugs de clave sin Año, corregidos en las 4 funciones que los tenían — 2026-08-31
A pedido del usuario ("apliques estos mismos cambios para Euro"), se revisó `Code-Euro.gs`
completo buscando el mismo patrón de bug ya corregido en Gespania y Socovesa (clave de
borrado/match que no incluye el Año, pese a que la hoja sí lo tiene). Se encontraron y
corrigieron 4 casos (más que en Socovesa — Euro no tenía ninguno de los 4 bien):

- `writeValorizacion`: clave era `empresa_id+Tipo` (2 campos) → ahora `empresa_id+Tipo+Año`
  (lee 4 columnas). Sincronizar "% Real" de un año borraba de paso "% Real"/"% Acumulado"/
  "Meta %" de TODOS los años anteriores con el mismo Tipo.
- `writeMetas`: matcheaba solo por `empresa_id+Tipo==='Meta %'`, sin Año — como `syncMetas()`
  manda una fila de Meta % POR AÑO para esta empresa, al procesar la 2da fila (ej. 2026) se
  sobreescribía la fila que ya había matcheado con la 1ra (ej. 2025), perdiendo esa meta. Se
  agregó comparación por Año también.
- `writeTrazabilidad`: clave era `empresa_id+Mes` → ahora `empresa_id+Mes+Año` (lee 4
  columnas). Mismo problema que Gespania/Socovesa: sincronizar un mes borraba ese mismo mes de
  todos los años anteriores.
- `writeObjetivos`: ya tenía un fix previo (2026-08-14) que cambió la clave de
  `empresa_id+mes+Año` a `empresa_id+mes+Objetivo` (para no borrar TODOS los objetivos de un
  mes al resincronizar uno), pero esa clave dejó de incluir el Año — mismo objetivo, mismo mes,
  distinto año, se borraba igual. Se corrigió a `empresa_id+mes+año+Objetivo` (los 4 juntos).

`writeTotalResiduos` en Euro ya estaba bien (arreglado el 2026-08-26, antes de esta sesión —
borrado selectivo por Sucursal+Año+Mes) y `readTotalResiduosSheet_()`/`doGet` ya exponían Total
Residuos de vuelta, así que Euro ya se beneficia del cálculo de % Acumulado ponderado por kg/m3
real (`getAcumReal_`, ver sección de Socovesa más arriba) sin cambios adicionales — Euro usa m3
en vez de kg como métrica (`esEuro || esAcciona` en `kgRealPorMesSuc_`).

**Importante**: estos cambios son solo en `Code-Euro.gs`. Para que tomen efecto en la URL en
vivo hay que volver a pegarlo en el editor de Apps Script de Euro y crear una nueva versión de
despliegue.

## Salfa: estandarizar el visor standalone "Visor-de-Objetivos-SALFA" — 2026-09-01
El usuario pidió estandarizar `https://github.com/recylink/Visor-de-Objetivos-SALFA` (repo
aparte, GitHub Pages) usando una versión fusionada de `Code.gs` que pegó directamente en el
chat (agrega el visor standalone + Minutas al `Code-Salfa.gs` existente, sin tocar
doPost/doGet clásico/Total Residuos/RESPEL). Pidió explícitamente que quedara parecido al
"visor de Abastible".

**Hallazgo clave**: `Visor-de-Objetivos-SALFA/index.html` (clonado para inspeccionar) resultó
ser BYTE-IDÉNTICO a `Visor-de-Objetivos-Abastible/index.html` salvo `EMPRESA_NOMBRE` y
`DATA_SOURCE_URL` — es decir, ya es "el mismo visor que Abastible", nada que tocar ahí. Ese
frontend pide los datos con `<script src="...exec?callback=X">` (JSONP) **sin ningún otro
parámetro** — ni `?visor=1` ni nada — y espera de vuelta `callback({EMPRESAS, VAL_DATA,
MESES_ACTIVOS})`. Confirmado comparando con `Code-Abastible.gs` (`buildLegacyPayload_` +
`doGet`, que activa ese payload con solo detectar `callback` en la URL, sin `visor=1`).

El script fusionado que pegó el usuario, en cambio, solo activaba su payload del visor
(`doGetVisor_`/`buildPayload_`) con `?visor=1` explícito — con un `callback` suelto (que es
justo lo que manda el visor real de Salfa) caía al `doGetClasico_`, que no devuelve JSONP y
rompería el visor (el navegador intentaría ejecutar JSON plano como script).

**Fix aplicado en `Code-Salfa.gs`** (reemplaza por completo el archivo): se mantiene toda la
lógica del script pegado (doPost, writeCostoIngreso, Minutas, `buildPayload_`/
`construirEmpresas_` — más rico que el de Abastible: lee CSE, Costo-Ingreso y una hoja
"🎯 Objetivos" real, no solo Valorización/Trazabilidad), pero se corrige el dispatcher final:

```js
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.minutas === '1') return doGetMinutas_(e);
  // callback SIN visor=1 (mecanismo real del visor, igual que Abastible) TAMBIÉN activa el payload
  if (params.visor === '1' || params.callback) return doGetVisor_(e);
  return doGetClasico_(e);
}
```

`?visor=1` se deja como alias explícito (no molesta), pero el camino real que usa el visor
desplegado es el `callback` suelto — igual que Abastible.

Verificado con un harness Node (mocks de `SpreadsheetApp`/`ContentService`, sin tocar Sheets
reales): `doGet({parameter:{callback:'cb123'}})` devuelve `cb123({EMPRESAS:[...], VAL_DATA:
{...}, MESES_ACTIVOS:[...]})` con el shape correcto; `doGet({parameter:{}})` (sin parámetros,
usado por el visor principal) sigue devolviendo el dump clásico sin cambios.

**Importante**: hay que pegar este `Code-Salfa.gs` completo en el editor de Apps Script del
Sheet de Salfa (`1LtRSJ-ZYPYoFmGHUik03OAVYxzg9REPn5NTIGhostGI`) y crear una nueva versión de
despliegue para que el visor standalone funcione. No hace falta tocar
`Visor-de-Objetivos-SALFA/index.html` — ya está bien tal como está.

## Salfa: Total Residuos y Costo e Ingreso se borraban completos al subir un mes suelto — 2026-09-01
El usuario preguntó si Salfa tiene el mismo resguardo que Euro/Socovesa/Gespania para no
perder histórico al subir solo el Excel del mes nuevo. Revisando las 5 hojas que sincroniza
Salfa:

- **Valorización, Trazabilidad_Docs, Objetivos: ya estaban seguras** — el fix genérico del
  cliente (`precargarDesdeSheetsSilencioso_`, ver sección "Socovesa: no perder sucursales/meses
  históricos") preserva `valMatrix`/`mesesDisp` con todo el histórico, y las claves de borrado
  de `Code-Salfa.gs` (`empresa_id+Tipo` / `empresa_id+Mes`) solo tocan lo que el cliente
  reenvía completo en cada sync — sin bug.
- **Total Residuos y Costo e Ingreso: SÍ se borraban completos.** `writeTotalResiduos` y
  `writeCostoIngreso` hacían `clearContent()` sobre TODA la hoja de datos y solo reinsertaban
  lo que el cliente manda en esa sincronización — pero el cliente arma `totalResiduosRows`/
  `costoIngresoRows` únicamente a partir del Excel recién subido (nunca los mezcla con lo
  histórico, a diferencia de `valMatrix`), así que un Excel de un solo mes efectivamente
  borraba TODOS los meses anteriores de esas 2 hojas. Corregido a borrado selectivo por
  Sucursal+Mes (Salfa no tiene columna Año en estas hojas, así que no hace falta Año en la
  clave) — mismo patrón ya aplicado en `writeTotalResiduos` de Gespania/Euro.

**Nota pendiente, no corregida**: `Code-Abastible.gs`, `Code-Ando.gs` y `Code-CCU.gs` tienen
exactamente el mismo patrón de borrado completo en `writeTotalResiduos`/`writeCostoIngreso` —
no se tocaron porque no fue pedido, pero probablemente tengan el mismo problema si alguna de
esas 3 empresas sube el Excel de un solo mes.

**Importante**: hay que volver a pegar `Code-Salfa.gs` en el editor de Apps Script de Salfa y
crear una nueva versión de despliegue para que el fix tome efecto.

## Salfa: columna Año en Total Residuos y Costo e Ingreso (evitar colisión entre años) — 2026-09-01
El usuario hizo notar que el fix anterior (borrado selectivo por Sucursal+Mes) no alcanza si
Salfa tiene datos de más de un año: "Obra A | Enero" de 2025 y "Obra A | Enero" de 2026 son
indistinguibles sin año, y sincronizar uno borraría/reemplazaría el otro. Confirmado: Salfa sí
tiene (o tendrá) datos de varios años.

Se agregó la columna **Año** (columna B, entre Sucursal y Mes, mismo lugar que en
Euro/Gespania/Socovesa) en las hojas **"Total Residuos"** y **"Costo e Ingreso"** — el usuario
la agregó manualmente en el Sheet (incluyendo backfill del año en las filas históricas
existentes) antes de tocar el código.

Cambios de código, una vez agregada la columna:
- **Cliente** (`valorizacion-recylink.html`): `generaAnioTR` ahora incluye `'salfa'` (ya
  generaba CO2, faltaba el Año). Nuevo flag `generaAnioCI = empresaActual === 'salfa'` para
  Costo e Ingreso (hoja que hasta ahora no tenía ningún concepto de Año en ninguna empresa) —
  agrega el año en la misma posición (columna B) que Total Residuos.
- **`Code-Salfa.gs`**: `writeTotalResiduos` y `writeCostoIngreso` ahora leen 3 columnas
  (Sucursal|Año|Mes) y comparan por los 3 juntos, mismo patrón que Euro/Gespania. También se
  corrigió `leerCostoIngreso_()` (usada por el visor standalone `buildPayload_`), que leía por
  índice fijo y había quedado desalineada (leyendo "Año" donde antes leía "Mes") — ahora lee 8
  columnas en vez de 7 y salta el Año. **Nota**: esa función sigue agrupando solo por nombre de
  mes sin distinguir año (misma limitación que ya tiene todo el visor standalone —
  leerTrazabilidad_/leerValorizacion_/MESES_ACTIVOS tampoco distinguen año); si en el futuro se
  necesita que ese visor separado muestre varios años, hay que revisar esas funciones también.

Verificado con harness de Node (mock de `SpreadsheetApp` en memoria, sin tocar Sheets reales):
sincronizar "Obra A | 2026 | Marzo" con filas preexistentes de "Obra A | 2025 | Marzo" y
"Obra A | 2026 | Enero" preserva ambas intactas y solo agrega la fila nueva — sin colisión
entre años. También se confirmó en el cliente que `autoSync()` arma las filas con Año en la
posición correcta: `["Obra A","2026","Marzo","Escombro","Valorizado","No respel",500,10,2]`
(Total Residuos) y `["Obra A","2026","Marzo","Escombro",500,1000,1500,500]` (Costo e Ingreso).

**Importante**: esto reemplaza el fix anterior (Sucursal+Mes) — hay que volver a pegar el
`Code-Salfa.gs` actualizado en el editor de Apps Script y crear una nueva versión de
despliegue.

## Salfa: el visor standalone mostraba objetivos que no son de Salfa — 2026-09-01
El usuario probó el visor nuevo (con datos reales en vivo) e indicó que los objetivos reales de
Salfa son solo 4: "KPI Costo ingreso", "100% trazabilidad", "Asegurar una correcta segregación
de residuos" y "cumplir declaración SINADER" — coincide exactamente con
`EMPRESAS.salfa.objetivos` en `valorizacion-recylink.html` (trazabilidad/sinader/kpi_costo/
segregacion). Pero el visor mostraba 6: esos 4 más "0% Valorización" y "Documentos
adicionales".

- **"Documentos adicionales"**: es una fila que queda en la hoja "🎯 Objetivos" (la sincroniza
  `calcObjetivos()` del visor principal) pero no corresponde a ninguno de los 4 objetivos
  configurados para Salfa. Se agregó a la exclusión de `leerObjetivosReales_()` en
  `Code-Salfa.gs` (mismo criterio que ya excluía "trazabilidad"/"valorizaci[ón]").
- **"% Valorización"**: `construirEmpresas_()` armaba esta tarjeta de forma incondicional para
  CUALQUIER sucursal con datos en la hoja Valorización — pero Salfa no tiene Valorización entre
  sus objetivos reales (a diferencia de Abastible/Gespania, que sí la tienen configurada). Se
  quitó ese bloque completo del backend de Salfa. El % de Valorización real sigue visible en la
  pestaña "♻️ Valorización" del visor (lee `VAL_DATA` directo) — solo se dejó de duplicar como
  tarjeta de "objetivo".

Verificado con harness de Node (mock de hojas Trazabilidad/Valorización/Objetivos): con las
mismas 4 filas reales + "Documentos adicionales" en la hoja, `buildPayload_()` ahora devuelve
exactamente `["100% Trazabilidad", "cumplir declaración SINADER", "KPI Costo ingreso",
"Asegurar una correcta segregación de residuos"]`.

**Importante**: hay que volver a pegar `Code-Salfa.gs` en el editor de Apps Script de Salfa y
crear una nueva versión de despliegue para que tome efecto.

## Visor-de-Objetivos-SALFA: quedaba un objetivo de Valorización que no corresponde — 2026-09-01
Después de corregir el backend (sección anterior), el usuario reportó ver igual un objetivo
"0% de valorización". La causa NO estaba en `Code-Salfa.gs` (que ya no manda Valorización en
`emp.objetivos`, verificado con curl directo al endpoint en vivo) sino en el propio
**frontend** `Visor-de-Objetivos-SALFA/index.html` (repo aparte): al copiarlo de
`Seguimiento-Abastible`, ese template trae **hardcodeada** una tarjeta de "X% Valorización" en
3 lugares — `renderObjetivos()` (pestaña 🎯 Objetivos), `contarObjetivosCumplidos_()` (badge
"X/4" de esa pestaña) e `imprimirInformeCompleto()` (tabla de objetivos del PDF exportado) —
independiente de lo que mande el backend, porque Abastible sí tiene Valorización como objetivo
real y Salfa no. De paso, por el mismo motivo, "Asegurar una correcta segregación de residuos"
(que SÍ es uno de los 4 objetivos reales de Salfa) nunca se mostraba, porque no había ningún
render genérico para objetivos fuera de los 3 hardcodeados (trazabilidad/SINADER/KPI costo).

Corregido en los 3 lugares (ver commit en `Visor-de-Objetivos-SALFA`): se quita la tarjeta de
Valorización y se agrega un render genérico que recorre el resto de `emp.objetivos` (excluyendo
trazabilidad/SINADER/KPI costo/valorización, que ya se muestran aparte) — esto hace que
"segregación" aparezca automáticamente, y que cualquier objetivo nuevo que se agregue a Salfa
en el futuro también se muestre sin tocar código. Verificado en local contra el backend real:
badge "0/4" correcto, tarjeta de segregación visible, PDF sin mención de Valorización.

**Nota**: este mismo problema (tarjetas hardcodeadas para el set de objetivos de Abastible) es
probablemente compartido por CUALQUIER otro visor clonado de `Seguimiento-Abastible` cuya
empresa no tenga Valorización entre sus objetivos reales.

## Salfa: "Asegurar segregación" quedaba en "sin dato" aunque estaba cumplido — 2026-09-01
Tras el fix anterior (mostrar la tarjeta de segregación), el usuario notó que aparecía como
"—" (sin dato) con Detalle "Madera", pero debería figurar como cumplido — Madera es
precisamente la evidencia de que la segregación se hizo bien.

Causa: `calcObjetivos()` (`valorizacion-recylink.html`, tipo `segregacion_anual`) escribe
literalmente el string **"OK"** en la columna "% cumplimiento" cuando el objetivo se cumple (no
"Sí" como el resto de los tipos anuales binarios) — ver línea `estado=otrosResAnual.length>0?
'OK':'No'`. `leerObjetivosReales_()` en `Code-Salfa.gs` solo reconocía `/^s[ií]$/i` y `/^no$/i`;
"OK" no matcheaba ninguno de los 2, tampoco un número, y como la columna Detalle ya traía el
residuo, tampoco entraba en el fallback de "texto libre" — resultado: avance/ok quedaban en
`null` ("sin dato") pese a que el objetivo SÍ estaba cumplido.

Fix: el regex ahora reconoce también "OK" (`/^(s[ií]|ok)$/i`). Verificado con harness de Node:
una fila con `% cumplimiento="OK"` y `Detalle="Madera"` ahora devuelve `avance:100, ok:true`.

**Importante**: hay que volver a pegar `Code-Salfa.gs` en el editor de Apps Script de Salfa y
crear una nueva versión de despliegue.

## Nueva empresa: Constructora Vital — 2026-09-03
Onboarding completo de una empresa nueva (Sheet
`1vcMZghsL3cpfIlnON4F7vszgwAq1g0LICE4-467WeQ8`, sucursal inicial "Obra Vallenar"), sin Apps
Script previo. El Sheet se armó desde una plantilla "moderna" (distinta a como se hicieron
Euro/Salfa/Gespania originalmente): ya trae de fábrica la columna Año en Trazabilidad_Docs/
Valorización/Objetivos/Total Residuos, más pestañas "Objetivos 2026" (lista maestra de textos
de objetivo) y "Minuta" — mismo formato que ya tenía Gespania después de sus fixes, así que
`Code-Vital.gs` se armó directamente a partir de `Code-Gespania.gs` (Año-aware desde el día 1,
sin arrastrar los bugs que hubo que descubrir y corregir ahí).

Se leyó el Sheet completo vía Google Drive (`download_file_content` como .xlsx + `openpyxl`,
no solo el resumen de `read_file_content`) para ver los nombres exactos de pestañas y headers
sin adivinar.

**Objetivos reales de Vital** (pestaña "Objetivos 2026"): 100% trazabilidad · Segregar al menos
3 residuos (escombro, cartón y madera) · Valorizar un 2% en peso · Cumplir normativa vigente
sobre declaraciones · Conseguir ecosistema dentro del marco legal.

- "Valorizar un 2% en peso" NO se agregó como objetivo aparte en `EMPRESAS.vital.objetivos` —
  se mide vía la hoja ♻️ Valorización (Meta %/% Real/% Acumulado), igual que el resto de las
  empresas; el backend lo muestra como tarjeta en el visor standalone reconociendo el patrón
  "valorizar (un) N%" en el texto maestro (`esObjetivoValorizacionPct_`).
- "Cumplir normativa vigente sobre declaraciones" → `tipo:'sinader'` (confirmado con el
  usuario).
- "Conseguir ecosistema dentro del marco legal" → `tipo:'manual_anual'` (se ingresa a mano en
  la fila "Anual" de 🎯 Objetivos, como el resto de los objetivos cualitativos de otras
  empresas).
- **"Segregar al menos 3 residuos (escombro, cartón y madera)"**: no había ningún tipo
  existente que calzara (confirmado con el usuario: x/3 por presencia del residuo, no por
  valorización). Se agregó un tipo nuevo **`segregar_especificos`** en
  `valorizacion-recylink.html` (`calcObjetivos()`), calcado de `valorizar_especificos` pero
  chequeando que el residuo simplemente APAREZCA en Trazabilidad (`rowsSuc.some(r =>
  normResiduo(r['Residuo'])===keyReq)`) en vez de exigir `isValorizado(...)`. Probado en vivo:
  con Escombro+Cartón registrados (falta Madera) da 66,7% y detalle "✓ Escombro, Cartón · Falta:
  Madera".

**Cliente** (`valorizacion-recylink.html`): se agregó `EMPRESAS.vital` (mismo `trazCols` que
Euro/Salfa, sin Costo e Ingreso ni CSE-hardcodeado) y se registró `vital` en:
`EMPRESAS_OBJ_CON_ANIO`, `EMPRESAS_VAL_CON_ANIO`, `esVitalTraz` (comparte la rama de
Trazabilidad_Docs de Euro/Gespania — mismo orden de columnas confirmado leyendo el Sheet real),
`generaTotalResiduos`/`generaAnioTR`/`generaCO2TR`, y el grupo `metasFromSheets` (junto a
Salfa/Euro/Ando — Vital no tiene un editor de metas propio, se edita directo en el Sheet).

**Backend** (`Code-Vital.gs`, archivo nuevo): doPost/doGet clásico (usado por
valorizacion-recylink.html) + visor standalone (`?visor=1`/`?callback=X`, con `?anio=` opcional
y FGR comparativo) + Minutas (`?minutas=1`) — los 3 fusionados desde el inicio, sin necesidad
de agregarlos después. Verificado con harness de Node (mock de `SpreadsheetApp`): `doGet` sin
parámetros devuelve el dump clásico completo (incluye `totalResiduos`); `?visor=1` arma
`EMPRESAS`/`VAL_DATA`/`ANIOS_DISPONIBLES` correctamente, con la tarjeta de "Valorizar un 2% en
peso" mostrando el % real acumulado vs. la meta.

**Pendiente, requiere acción del usuario**:
1. **Desplegar `Code-Vital.gs`**: pegarlo en el editor de Apps Script del Sheet de Vital →
   Implementar → Nueva implementación → tipo "Aplicación web" → copiar la URL del deployment.
2. **Pegar esa URL** en `EMPRESAS.vital.scriptUrl` de `valorizacion-recylink.html` (hoy tiene el
   placeholder `'PENDIENTE_DEPLOYMENT_URL'`).
3. **Typo en "Objetivos 2026"**: la celda dice "Conseguir ecosostema dentro del marco legal"
   (con typo) — el código usa "ecosistema" (sin typo) en `EMPRESAS.vital.objetivos`. Como el
   visor standalone matchea el texto real de 🎯 Objetivos contra el texto de "Objetivos 2026"
   de forma exacta (case-insensitive), esta diferencia hace que esa tarjeta específica quede
   siempre en "sin dato" en el visor standalone (el objetivo igual se calcula y sincroniza bien
   en el visor principal, solo el standalone no lo empareja). Corregir el typo en el Sheet para
   que coincida.
4. **Limpiar "Config_Flat"**: sigue teniendo las filas de ejemplo de otras empresas (Gespania,
   ANDO, CTEC, Novatec, Obra Limpia) — el usuario confirmó que son restos de la plantilla y
   quiere dejar solo la fila de Vital/Obra Vallenar. Ningún `Code-*.gs` lee esta pestaña (es
   solo referencia humana), así que no bloquea nada funcionalmente, pero conviene limpiarla.

## Visores standalone: el selector de mes siempre saltaba a Diciembre — 2026-09-03
El usuario notó que el visor de Vital mostraba Diciembre por defecto en vez del último mes con
datos reales. Causa: `calcularMesesActivos_()` (backend) escaneaba `val[emp].meta` (la fila
"Meta %" de ♻️ Valorización) junto con `meses`/`acumulado` para determinar el último mes
"activo" — pero `syncMetas()` (cliente) escribe la meta repetida en los 12 meses del año
(Enero..Diciembre) sin importar si hay actividad real esos meses, así que `MESES_ACTIVOS`
siempre terminaba llegando hasta Diciembre. El frontend (`mesActual =
MESES_ACTIVOS[MESES_ACTIVOS.length-1]`) ya elegía correctamente "el último mes de
MESES_ACTIVOS" — el bug estaba en qué metía el backend en esa lista, no en cómo se elegía.

Se quitó `scan(val[emp].meta)` de `calcularMesesActivos_()` — mismo bug encontrado y corregido
en **Code-Vital.gs, Code-Gespania.gs, Code-Socovesa.gs y Code-Salfa.gs** (los 4 tenían el mismo
código copiado). Verificado con harness de Node en Vital: con Meta % puesta en los 12 meses
pero datos reales solo hasta Agosto, `MESES_ACTIVOS` ahora corta en `["Enero", ..., "Agosto"]`
en vez de llegar a Diciembre.

**Importante**: hay que volver a pegar cada `Code-*.gs` en su respectivo editor de Apps Script
y crear una nueva versión de despliegue para que el fix tome efecto en cada visor.

### FIX 2 (mismo día): también había que sacar "% Acumulado" del escaneo
El usuario redesplegó Vital y seguía mostrando Diciembre. Se pidió el payload en vivo por curl
y se vio la causa real: `VAL_DATA.obra_vallenar.acumulado` tenía valores para Junio, Julio,
Agosto... hasta Diciembre (todos en 0%), aunque `meses` (% Real) solo tenía Junio y Julio.

"% Acumulado" es acumulativo por diseño (`getAcum()` en el cliente): `autoSync()` recorre los
12 meses del año y llama `getAcum(suc, mKey)` para cada uno — una vez que hay actividad en
algún mes, el acumulado sigue siendo un valor válido (no null) para todos los meses
posteriores aunque esos meses puntuales no tengan nada nuevo (el acumulado "se arrastra"). Por
eso incluir `acumulado` en el escaneo tenía el mismo efecto que incluir `meta`.

Se sacó `scan(val[emp].acumulado)` de los 4 archivos, dejando el escaneo de Valorización SOLO
en `val[emp].meses` (% Real vía `getPct()`, que es null si no hay `valMatrix` para ESE mes
exacto — es la única fila que refleja de verdad "hubo actividad este mes"). Verificado con
harness de Node replicando el patrón real (Meta%/Acumulado rellenos hasta diciembre, % Real
solo en Junio/Julio): `MESES_ACTIVOS` ahora corta correctamente en `["Enero", ..., "Julio"]`.

## Vital: Seguimiento CSE editable desde el visor — 2026-09-03
El usuario notó que a diferencia de otros proyectos (seguimiento-Euro), no podía editar el
Seguimiento CSE (Correo/Reunión/Encuesta) directamente desde el visor de Vital — quedaba
solo-lectura porque se copió de Gespania, que tampoco lo tiene editable.

Se portó el patrón ya probado de `seguimiento-Euro` (`dotCSEEditable`/`cseOnToggle`/
`cseSaveAll`, con autoguardado a los 1,5s de inactividad), con un ajuste importante: en Vital
`emp.cse[key][mes]` es **boolean** (`leerCSE_()` ya normaliza "SI"/"NO" a true/false antes de
mandarlo al front), a diferencia de Euro donde es el string crudo "SI"/"NO"/"N/A" — así que el
ciclo de click quedó `vacío(undefined) → SI(true) → NO(false) → vacío` sobre boolean/undefined
en vez de sobre 3 strings, y al guardar se convierte explícitamente a texto "SI"/"NO"/"" antes
de mandarlo al backend (si se manda un boolean crudo, Sheets lo guarda como TRUE/FALSE, que
`normalizeSiNo_()` no reconoce al releer — quedaría "sin dato" para siempre).

De paso se agregó la fila de "Encuesta" (el backend ya la soportaba vía `mapAccion` en
`leerCSE_()`, solo faltaba en la tabla — Gespania la había sacado a propósito, pero no hay
motivo para que Vital la tenga oculta también).

**Backend** (`Code-Vital.gs`): se agregó `writeCSE_()` (portado de `Code-Euro.gs`, mismo
criterio de match por empresa_id+Acción — crea la fila si no existe, la actualiza si ya
existe) y se conectó `doPost` para el tipo `'cse'`. Ojo con el nombre exacto de la columna:
Vital usa **"Acción CSE"** (no "Acción" como Euro) — `writeCSE_` busca ambos por si acaso.

Verificado con harness de Node: `writeCSE_` crea la fila en el primer guardado y la actualiza
(sin duplicar) en el segundo. La lógica del cliente se verificó por revisión de código (no se
pudo probar en vivo en el navegador por inestabilidad de la herramienta esa sesión) — está
calcada 1:1 del patrón de Euro, que ya funciona en producción, con los ajustes de boolean
documentados arriba.

**Importante**: hay que volver a pegar `Code-Vital.gs` en el editor de Apps Script y crear una
nueva versión de despliegue para que el guardado funcione (el visor ya está publicado con la
parte de lectura/edición, pero el guardado va a fallar con un toast de error hasta que se
redespliegue el backend).

## Vital: la tarjeta de "Valorizar un 2% en peso" no mostraba Real/Acumulado/Meta — 2026-09-03
El usuario notó que faltaba el comparativo de la meta (2%) contra el acumulado. Causa: el
backend (`construirEmpresas_()` en `Code-Vital.gs`) normaliza este objetivo a `avance`/`meta`
en escala 0-100 ("% de la meta ya alcanzado", para que la barra de progreso funcione igual que
el resto de los objetivos) — eso hacía que la tarjeta mostrara "100%" en vez de los números
reales ("35% acumulado vs. 2% meta"), con el detalle real solo como texto chico.

Fix (solo en el repo `Visor-de-Objetivos-Vital`, sin tocar el backend): se agregó un caso
especial en `estadoObjetivosVisibles()` (pantalla) y en la tabla de Objetivos de
`imprimirInformeCompleto()` (PDF exportado) que detecta el patrón `/valorizar\s+(un\s+)?\d+%/i`
y recalcula en vivo con el mismo `VAL_DATA`/`getMetaMes` que ya usa `renderValorizacion()` —
mostrando `avance` = % Acumulado real, `metaNum` = Meta real, y un detalle explícito
"Real [mes]: X% · Acumulado a [mes]: Y% · Meta: Z%". Verificado con harness de Node.

De paso, en el mismo hilo se hizo el Seguimiento CSE editable (ver sección anterior) — ambos
cambios fueron sobre el visor standalone de Vital, no sobre el visor principal
(`valorizacion-recylink.html`).

## Vital: botón "Editar metas" en el visor principal — 2026-09-03
El usuario pidió el mismo botón "Editar metas" que ya tienen Copec/Acciona/Gespania en
`valorizacion-recylink.html` (edita la meta de valorización desde un modal en la app, en vez de
solo editando la fila "Meta %" directo en el Sheet). Se agregó siguiendo exactamente el patrón
de Gespania: `VITAL_META_PCT_DEFAULT = 2` (el objetivo real de Vital), `getVitalMetasDefault()`/
`getVitalMetas()`/`saveVitalMetas()` (localStorage `vital_metas`, mezclado con
`metasFromSheets` como base), conectado en `getMetasEditablesActuales()`/
`saveMetasEditablesActuales()`/`metaDefaultEditable()` y los 3 lugares que controlan la
visibilidad del botón `btn-editar-metas`. Se sacó `vital` del grupo `metasFromSheets` en
`metasActuales`/`metas` (autoSync/renderCopecObjetivos) para que apunte a `getVitalMetas()` en
su lugar — mismo tratamiento que Gespania recibió en su momento.

**Nota**: no se pudo verificar en vivo en el navegador por inestabilidad persistente de la
herramienta esta sesión (varios intentos fallidos) — el cambio se verificó por sintaxis
(`node --check`) y revisión estática, calcado 1:1 del patrón ya probado de Gespania.

## ANDO: mismas mejoras de Vital portadas al visor standalone — 2026-09-03
El usuario pidió aplicarle a `Visor-de-Objetivos-ANDO` "todo lo que hicimos para Vital".

**Hallazgo antes de tocar nada**: el `DATA_SOURCE_URL` del visor de ANDO
(`AKfycbzSF9enqWrvtcQFVqWr2Xr3A5lHcJ18NF3l5gZmZr0TyVZbWfs4MfxXthYofxJeiNo`) es una Apps Script
**completamente distinta** a `Code-Ando.gs` (el que usa `valorizacion-recylink.html`,
`AKfycbxDXNb5jL5CsJDEUy71c8fARsoXB3ZzuEBs4Z9zEa7ZQhLBgvuDcWmUNAOa_VIxdTg`) — dos proyectos de
Apps Script separados para la misma empresa. Confirmado con `curl`: la URL del visor no
devolvía JSON válido (una página HTML de error/verificación), y no había copia de su código en
este repo. Se le pidió el código al usuario y se guardó como **`Code-Ando-Visor.gs`** (nuevo
archivo, para no confundirlo con `Code-Ando.gs`).

Cambios aplicados (mismo alcance que Vital):
- **`calcularMesesActivos_` (Code-Ando-Visor.gs)**: mismo bug de "salta a Diciembre" ya
  encontrado en Vital/Gespania/Socovesa/Salfa — se sacó el escaneo de `meta`/`acumulado`,
  queda solo `meses` (% Real).
- **Seguimiento CSE editable**: se agregó `writeCSE_()` en `Code-Ando-Visor.gs` (mismo patrón
  que Vital/Euro) y `dotCSEEditable`/`cseOnToggle`/`cseSaveAll` en
  `Visor-de-Objetivos-ANDO/index.html` — con una diferencia: este archivo no tiene Minutas (sin
  `mnShowToast`), así que el feedback de guardado reusa el banner
  `mostrarEstadoCarga_`/`ocultarEstadoCarga_` que ya existía para el estado de carga inicial.
  Se agregó también la fila de "Encuesta" (el backend ya la soportaba, faltaba en la tabla).
- **Comparativo Real/Acumulado/Meta**: revisado, pero la tarjeta de "Valorización" de este
  visor ya es distinta a la de Vital (es un agregado de TODA la empresa — "X de Y sucursales
  cumplen su meta" — no una tarjeta por sucursal con avance normalizado a 0-100 que esconda los
  números reales) — no se encontró el mismo problema, así que no se tocó.

**Nota encontrada de paso, NO corregida (fuera de lo pedido)**: `writeValorizacion` en
`Code-Ando-Visor.gs` usa el patrón viejo de borrado (por empresa_id solo, sin mirar "Tipo") —
mismo tipo de bug de integridad ya corregido en Gespania/Socovesa/Salfa/Euro. Se documenta en
un comentario en el archivo; no se tocó porque no fue parte de lo pedido.

Verificado con harness de Node: `writeCSE_` crea/actualiza sin duplicar, `calcularMesesActivos_`
corta en el mes correcto en vez de Diciembre. El navegador siguió sin conectar (varios
intentos), así que el frontend no se pudo probar visualmente esta vez — el cambio es una copia
directa del patrón ya probado en Vital, con la única adaptación real (reusar
`mostrarEstadoCarga_` en vez de `mnShowToast`) revisada por lectura de código.

**Importante**: hay que pegar `Code-Ando-Visor.gs` en el editor de Apps Script del proyecto
correcto (el que sirve `DATA_SOURCE_URL` en `Visor-de-Objetivos-ANDO/index.html`, NO el mismo
proyecto que `Code-Ando.gs`) y crear una nueva versión de despliegue.

## Cómo verificar sintaxis JS del archivo
El HTML es un solo archivo con `<script>...</script>` embebido. Para validar sintaxis:
```bash
python3 -c "
import re
content = open('valorizacion-recylink.html').read()
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
open('/tmp/s.js','w').write(scripts[0])
"
node --check /tmp/s.js
```
(o usar `acorn` si `node --check` no está disponible en tu entorno)
