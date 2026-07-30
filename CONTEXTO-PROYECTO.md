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
      y pegar `Code-Abastible.gs` (raíz del repo) completo en su Apps Script real, reemplazando
      el Code.gs actual — agrega soporte para `tipo:'totalResiduos'` y de paso corrige
      `writeObjetivos` (borraba por prefijo de empresa completo en vez de por sucursal+mes,
      con riesgo de perder histórico de objetivos al sincronizar).
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
