# Atmósfera Financiera del Hogar

Aplicación web (PWA) en español para administrar la economía de un hogar: plan de egresos e ingresos,
reparto equilibrado por porcentajes, control de quién canceló cada cuota, estadísticas, agente
consultor y exportación de documentos (Excel, Word, PDF, CSV, JSON).

Funciona **sin conexión** una vez abierta y guarda todo en el navegador (localStorage).

---

## Cómo iniciar

| Opción | Qué hacer |
|---|---|
| Recomendada | Doble clic en **`inicia-app.bat`** (levanta un servidor local en `http://localhost:8000` y abre la app). |
| Sin Python | Doble clic en **`abrir-directo.bat`** (abre `index.html` directo). |
| Manual | `python -m http.server 8000` dentro de esta carpeta y abrí `http://localhost:8000`. |

> Con servidor local funcionan también la **instalación como app** (botón 📲) y el **service worker**
> (modo sin conexión). Abriendo el archivo directo todo funciona salvo esas dos funciones de PWA.

---

## Menú

| Sección | Qué hace |
|---|---|
| **Panel de control** | KPI del mes, alertas, balance por persona, gráfico de categorías. |
| **Plan mensual** | Egresos e ingresos del período, alta/edición/borrado, plantillas frecuentes, cuadro resumen. |
| **Pagos** | Cuota de cada miembro, registrar/abrir pagos, «Cancelar todo», pago por persona. |
| **Movimientos** | Libro de ingresos/egresos con filtros; se puede sincronizar desde el plan. |
| **Personas y %** | Miembros, ingresos, estrategia de reparto (proporcional / equitativo / necesidad), % manual. |
| **Análisis estadístico** | Descriptiva, histogramas, Pareto, tendencia mensual, exportar Excel estadístico. |
| **Agente financiero** | Chat con lenguaje natural: «¿cuánto gasto este mes?», «¿qué debo hacer?», «genera un informe». |
| **Reportes y documentos** | Descarga Excel (8 hojas), Word, PDF, TXT, CSV y **paquete completo a una carpeta**. |
| **Mis proyectos** | Un proyecto por hogar/cliente: crear, duplicar, exportar JSON, importar, eliminar. |
| **Ajustes y catálogos** | Moneda, mes activo, categorías, métodos de pago, restaurar demo, borrar todo. |

---

## Usuarios y permisos

Al abrir la app pide usuario y clave (la sesión dura hasta cerrar el navegador):

| Usuario | Clave | Rol |
|---|---|---|
| `superadmin` | `Atm2026#Super` | Todo: usuarios, ajustes globales, borrado total |
| `admin` | `Atm2026#Admin` | Editar proyectos, egresos, pagos y reportes |
| `demo` | `demo2026` | **Sólo lectura**: ve la demo, no modifica ni borra nada |

Se crean, editan y borran en **Ajustes → 👥 Usuarios y permisos** (sólo el superadmin).
Las credenciales viajan con la copia de la nube, así que valen también en el celular.

---

## Nube — Google Drive

La app se sincroniza con **tu propio Google Drive** mediante un servicio de Google Apps Script
(archivo `atmosfera-datos.json` dentro de la carpeta *Atmósfera Financiera*).

1. En **Ajustes → ☁ Nube** pegá la URL del servicio (la que termina en `/exec`) y tu clave secreta.
2. *🔌 Probar conexión* → *⬆ Subir a la nube*. Desde el celular: *⬇ Descargar de la nube*.
3. Con **Sincronizar automáticamente** marcado, cada guardado se sube solo a los ~8 segundos.

Todos los dispositivos ven los mismos proyectos. La descarga **reemplaza** lo local, así que
subí antes si querés conservar cambios.

---

## Reparto de porcentajes (el corazón del sistema)

- **Proporcional a ingresos**: cada quien asume el mismo esfuerzo relativo
  (ej.: $1180 y $760 → 60,82% / 39,18%).
- **Equitativo**: 50/50 (o iguales entre los que participen).
- **Necesidad**: usa los porcentajes que cargues a mano.
- Cada egreso puede forzar su propio reparto manual; si la suma no da 100%, se normaliza al guardar.
- Los montos se convierten en centavos para que la suma sea **exacta** (sin diferencia por redondeo).

---

## Estructura

```
ATMOSFERA APP/
├── index.html                 Shell de la SPA (sin build ni dependencias)
├── inicia-app.bat             Servidor local + abre el navegador
├── abrir-directo.bat          Abre index.html directo
├── manifest.webmanifest       PWA (nombre, iconos, colores)
├── sw.js                      Service worker (caché offline)
├── iconos/                    icon-192, icon-512, maskable, apple-touch, favicon
└── assets/
    ├── css/app.css            Estilos completos (tema navy + naranja)
    ├── js/
    │   ├── util.js            Utilidades, moneda, fechas, ZIP propio (CRC32)
    │   ├── engine.js          Motor: distribución, cuotas, pagos, balance, alertas, score
    │   ├── stats.js           Estadística descriptiva y series
    │   ├── store.js           Persistencia, CRUD de proyectos, datos de ejemplo
    │   ├── agent.js           Diagnóstico, recomendaciones, informe, consultas
    │   ├── docs.js            Excel / Word / PDF / CSV / paquete
    │   ├── app-core.js        Estado, router, eventos, PWA
    │   ├── vistas-*.js        Render de cada pantalla
    │   └── app-modales.js     Modales y acciones de edición
    └── lib/                   xlsx, jspdf y chart.js vendorizados (offline)
```

Los datos de ejemplo provienen de los libros originales `Finanzas .xlsx` y
`PLAN ECONOMICO MENSUAL.xlsx` (proyecto «Hogar de Miguel y Katherin», MIGUEL $1180 · KATHERIN $760).

---

## Notas

- **Nada sale del equipo**: no hay servidor, ni cuentas, ni envío de datos. Cada proyecto vive en el
  navegador donde se creó; para moverlo usá *Mis proyectos → ⬇ JSON*.
- El botón **📦 Paquete completo** genera Excel + Word + PDF + TXT + CSV en una carpeta
  (Chrome/Edge usan la carpeta elegida; en otros navegadores se descargan uno por uno).
- Cambiar de navegador o limpiar los datos borra el trabajo: exportá el JSON antes.
- Moneda por defecto USD (Ecuador); se cambia en *Ajustes*.
