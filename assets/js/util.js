/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — util.js
   Utilidades generales: formato, fechas, ids, validación, zip
   ============================================================ */
(function (global) {
  'use strict';

  const Util = {};

  /* ---------- ids ---------- */
  Util.uid = function (pref) {
    return (pref || 'id') + '_' + Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  };

  /* ---------- números ---------- */
  Util.n = function (v, def) {
    if (v === null || v === undefined || v === '') return def === undefined ? 0 : def;
    if (typeof v === 'number') return isFinite(v) ? v : (def === undefined ? 0 : def);
    const s = String(v).replace(/[^0-9.\-]/g, '');
    const x = parseFloat(s);
    return isFinite(x) ? x : (def === undefined ? 0 : def);
  };

  Util.round2 = function (v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  };

  Util.pct = function (v, dec) {
    const d = dec === undefined ? 1 : dec;
    if (!isFinite(v)) return '—';
    return (v * 100).toFixed(d) + '%';
  };

  Util.signo = function (v) {
    return v > 0 ? '+' : (v < 0 ? '' : '');
  };

  /* Moneda: USD (Ecuador). Se puede cambiar por proyecto. */
  Util.moneda = function (v, proyecto) {
    const sym = (proyecto && proyecto.moneda) || 'USD';
    const n = Number(v) || 0;
    const neg = n < 0;
    const abs = Math.abs(n);
    let txt;
    try {
      txt = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
    } catch (e) {
      txt = abs.toFixed(2);
    }
    return (neg ? '-$' : '$') + txt;
  };

  Util.monedaCorto = function (v, proyecto) {
    const sym = (proyecto && proyecto.moneda) || 'USD';
    const n = Number(v) || 0;
    const abs = Math.abs(n);
    let txt;
    if (abs >= 1000000) txt = (abs / 1000000).toFixed(1) + ' M';
    else if (abs >= 1000) txt = (abs / 1000).toFixed(1) + ' k';
    else txt = abs.toFixed(0);
    return (n < 0 ? '-' : '') + sym + ' ' + txt;
  };

  Util.pctNum = function (v) {
    return (Number(v) || 0) * 100;
  };

  /* ---------- fechas ---------- */
  Util.hoy = function () {
    const d = new Date();
    return Util.isoFecha(d);
  };

  Util.isoFecha = function (d) {
    const p = (x) => String(x).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  Util.mesActual = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  Util.meses = function (cantidad, desde) {
    const base = desde ? desde.split('-') : Util.mesActual().split('-');
    let y = parseInt(base[0], 10), m = parseInt(base[1], 10);
    const out = [];
    for (let i = 0; i < cantidad; i++) {
      out.push(y + '-' + String(m).padStart(2, '0'));
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  };

  Util.mesLargo = function (yyyyMM) {
    if (!yyyyMM) return '';
    const partes = yyyyMM.split('-');
    const nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const idx = parseInt(partes[1], 10) - 1;
    return (nombres[idx] || '') + ' de ' + partes[0];
  };

  Util.mesCorto = function (yyyyMM) {
    if (!yyyyMM) return '';
    const partes = yyyyMM.split('-');
    const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return nombres[parseInt(partes[1], 10) - 1] + ' ' + partes[0].slice(2);
  };

  Util.fechaLarga = function (iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  };

  Util.mesDeFecha = function (iso) {
    if (!iso) return '';
    return String(iso).slice(0, 7);
  };

  /* ---------- texto ---------- */
  Util.esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  Util.slug = function (s) {
    return String(s || 'proyecto')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'proyecto';
  };

  Util.cap = function (s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  Util.iniciales = function (nombre) {
    const p = String(nombre || '').trim().split(/\s+/);
    if (!p[0]) return '?';
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  };

  /* ---------- arrays / objetos ---------- */
  Util.sum = function (arr, fn) {
    let t = 0;
    for (let i = 0; i < arr.length; i++) t += Number(fn ? fn(arr[i], i) : arr[i]) || 0;
    return t;
  };

  Util.groupBy = function (arr, fn) {
    const out = {};
    arr.forEach((x, i) => {
      const k = fn(x, i);
      (out[k] = out[k] || []).push(x);
    });
    return out;
  };

  Util.ordenaDesc = function (arr, fn) {
    return arr.slice().sort((a, b) => (fn(b) - fn(a)));
  };

  Util.clona = function (o) {
    return JSON.parse(JSON.stringify(o));
  };

  Util.merge = function (base, extra) {
    const out = {};
    Object.keys(base || {}).forEach(k => out[k] = base[k]);
    Object.keys(extra || {}).forEach(k => out[k] = extra[k]);
    return out;
  };

  /* ---------- descargas ---------- */
  Util.descargar = function (contenido, nombre, mime) {
    const blob = contenido instanceof Blob ? contenido
      : new Blob([contenido], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  };

  /* ============================================================
     ZIP mínimo (método store / sin compresión) + CRC32
     Se usa para generar archivos .docx reales sin librerías.
     ============================================================ */
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) out.push(192 | (c >> 6), 128 | (c & 63));
      else out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
    }
    return new Uint8Array(out);
  }

  Util.zip = function (archivos) {
    // archivos: [{nombre:'word/document.xml', datos:'...' | Uint8Array}]
    const enc = new TextEncoder();
    const partes = [];
    const centrales = [];
    let offset = 0;

    archivos.forEach(function (f) {
      const data = (typeof f.datos === 'string') ? enc.encode(f.datos) : f.datos;
      const nombreBytes = enc.encode(f.nombre);
      const crc = crc32(data);

      const lh = new Uint8Array(30 + nombreBytes.length);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);        // versión
      dv.setUint16(6, 0x0800, true);    // flags (UTF-8)
      dv.setUint16(8, 0, true);         // método store
      dv.setUint16(10, 0, true);        // hora
      dv.setUint16(12, 0x21, true);     // fecha (1980-01-01)
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, nombreBytes.length, true);
      dv.setUint16(28, 0, true);
      lh.set(nombreBytes, 30);

      partes.push(lh, data);

      const ch = new Uint8Array(46 + nombreBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x21, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nombreBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nombreBytes, 46);
      centrales.push(ch);

      offset += lh.length + data.length;
    });

    const centralSize = centrales.reduce((a, b) => a + b.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, archivos.length, true);
    ev.setUint16(10, archivos.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const total = offset + centralSize + 22;
    const out = new Uint8Array(total);
    let p = 0;
    partes.forEach(b => { out.set(b, p); p += b.length; });
    centrales.forEach(b => { out.set(b, p); p += b.length; });
    out.set(eocd, p);
    return out;
  };

  global.Util = Util;
})(window);
