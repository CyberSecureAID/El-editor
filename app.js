/* =========================================================================
   HERI PDF — lógica de la aplicación
   100% JavaScript vanilla. Sin frameworks, sin build step.
   El catálogo de tipografías vive en fonts.js (window.HERI_FONTS) y se
   consume aquí para poblar el <select> del toolbar y la galería del sidebar.
   ========================================================================= */
(() => {
  'use strict';

  /* ----------------------------------------------------------------------
     ESTADO GLOBAL
     ---------------------------------------------------------------------- */
  const pagesEl      = document.getElementById('pages');
  const statusText   = document.getElementById('statusText');
  const pageSizeSel  = document.getElementById('pageSizeSelect');

  let currentPage  = null;   // <div class="page"> con el foco actual
  let savedRange   = null;   // última selección dentro de una página
  let pageCounter  = 0;
  let docPageSize  = 'a4';   // 'a4' | 'carta'

  /* ----------------------------------------------------------------------
     UTILIDADES DE SELECCIÓN
     Los controles (inputs de color, selects) roban el foco del área
     editable. Guardamos el Range activo constantemente para poder
     restaurarlo justo antes de aplicar un formato.
     ---------------------------------------------------------------------- */
  function pageContains(node) {
    return currentPage && node && currentPage.contains(node);
  }

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (pageContains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  });

  function restoreSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function setStatus(msg) {
    statusText.textContent = msg;
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => (statusText.textContent = 'Listo'), 2200);
  }

  /* ----------------------------------------------------------------------
     GESTIÓN DE PÁGINAS
     ---------------------------------------------------------------------- */
  function pageLabel(el) {
    return 'Página ' + (Array.from(pagesEl.children).indexOf(el) + 1);
  }

  function refreshPageLabels() {
    Array.from(pagesEl.children).forEach((p) => {
      p.setAttribute('data-page-label', pageLabel(p));
    });
  }

  function applyPageSizeClass(page) {
    page.classList.remove('page-a4', 'page-carta');
    page.classList.add(docPageSize === 'carta' ? 'page-carta' : 'page-a4');
  }

  function createPage(innerHTML) {
    pageCounter += 1;
    const page = document.createElement('div');
    page.className = 'page tex-none';
    page.contentEditable = 'true';
    page.spellcheck = true;
    page.dataset.pageId = 'p' + pageCounter;
    applyPageSizeClass(page);
    page.innerHTML = innerHTML || '<p><br></p>';
    pagesEl.appendChild(page);
    refreshPageLabels();
    watchOverflow(page);
    return page;
  }

  function focusPage(page) {
    currentPage = page;
    Array.from(pagesEl.children).forEach((p) => p.style.outline = '');
    page.style.outline = '2px solid rgba(192,138,69,.55)';
    page.focus();
    syncControlsFromPage(page);
  }

  pagesEl.addEventListener('focusin', (e) => {
    const page = e.target.closest('.page');
    if (page) focusPage(page);
  });
  pagesEl.addEventListener('mousedown', (e) => {
    const page = e.target.closest('.page');
    if (page) currentPage = page;
  });

  function watchOverflow(page) {
    const check = () => {
      if (page.scrollHeight > page.clientHeight + 2) page.classList.add('overflow');
      else page.classList.remove('overflow');
    };
    page.addEventListener('input', check);
    new ResizeObserver(check).observe(page);
  }

  function syncControlsFromPage(page) {
    const bg = getComputedStyle(page).backgroundColor;
    if (bg && bg.startsWith('rgb')) {
      document.getElementById('pageBgColor').value = rgbToHex(bg);
    }
    document.querySelectorAll('.tex-swatch').forEach((s) => s.classList.remove('selected'));
    const texClass = Array.from(page.classList).find((c) => c.startsWith('tex-'));
    if (texClass) {
      const sw = document.querySelector('.tex-swatch[data-tex="' + texClass.replace('tex-', '') + '"]');
      if (sw) sw.classList.add('selected');
    }
  }

  function rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m) return '#ffffff';
    return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
  }

  document.getElementById('btnNewPage').addEventListener('click', () => {
    const p = createPage();
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusPage(p);
    setStatus('Hoja agregada');
  });

  document.getElementById('btnDeletePage').addEventListener('click', () => {
    if (pagesEl.children.length <= 1) {
      setStatus('Debe quedar al menos una hoja');
      return;
    }
    const target = currentPage || pagesEl.lastElementChild;
    if (confirm('¿Eliminar esta hoja? Esta acción no se puede deshacer.')) {
      target.remove();
      refreshPageLabels();
      currentPage = pagesEl.lastElementChild;
      focusPage(currentPage);
      setStatus('Hoja eliminada');
    }
  });

  pageSizeSel.addEventListener('change', () => {
    docPageSize = pageSizeSel.value;
    Array.from(pagesEl.children).forEach(applyPageSizeClass);
    setStatus('Tamaño de página actualizado');
  });

  document.getElementById('pageBgColor').addEventListener('change', (e) => {
    if (!currentPage) return;
    currentPage.style.backgroundColor = e.target.value;
    setStatus('Fondo actualizado');
  });

  /* ----------------------------------------------------------------------
     TEXTURAS
     ---------------------------------------------------------------------- */
  document.getElementById('textureGrid').addEventListener('click', (e) => {
    const sw = e.target.closest('.tex-swatch');
    if (!sw || !currentPage) return;
    Array.from(currentPage.classList)
      .filter((c) => c.startsWith('tex-'))
      .forEach((c) => currentPage.classList.remove(c));
    currentPage.classList.add('tex-' + sw.dataset.tex);
    document.querySelectorAll('.tex-swatch').forEach((s) => s.classList.remove('selected'));
    sw.classList.add('selected');
    setStatus('Textura aplicada');
  });

  /* ----------------------------------------------------------------------
     COMANDOS DE FORMATO BÁSICOS (execCommand — estándar y bien soportado
     para negrita, cursiva, listas, alineación, deshacer, etc.)
     ---------------------------------------------------------------------- */
  document.querySelectorAll('.tbtn[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      restoreSelection();
      currentPage && currentPage.focus();
      document.execCommand(btn.dataset.cmd, false, null);
      updateActiveStates();
    });
  });

  document.querySelectorAll('.tbtn[data-cmd-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      restoreSelection();
      currentPage && currentPage.focus();
      document.execCommand('formatBlock', false, btn.dataset.cmdBlock);
    });
  });

  function updateActiveStates() {
    ['bold', 'italic', 'underline', 'strikeThrough'].forEach((cmd) => {
      const btn = document.querySelector('.tbtn[data-cmd="' + cmd + '"]');
      if (!btn) return;
      let active = false;
      try { active = document.queryCommandState(cmd); } catch (e) { /* noop */ }
      btn.classList.toggle('active', active);
    });
  }
  document.addEventListener('selectionchange', updateActiveStates);

  /* ----------------------------------------------------------------------
     ESTILOS EN LÍNEA PERSONALIZADOS (fuente, tamaño, color, resaltado)
     No usamos execCommand('fontSize'/'fontName') porque su comportamiento
     es inconsistente entre navegadores; envolvemos la selección en un
     <span> con estilo inline, lo que da control total ("editar todo").
     ---------------------------------------------------------------------- */
  function wrapSelectionWithStyle(styles) {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      setStatus('Selecciona texto primero');
      return;
    }
    const span = document.createElement('span');
    Object.assign(span.style, styles);
    try {
      range.surroundContents(span);
    } catch (err) {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRange = newRange.cloneRange();
  }

  /* ---- Población del <select> de tipografías a partir de fonts.js ---- */
  const FONTS = window.HERI_FONTS || [];
  const FONT_CATEGORIES = window.HERI_FONT_CATEGORIES || {};
  const fontFamilySel = document.getElementById('fontFamily');

  function populateFontSelect() {
    const groups = {};
    FONTS.forEach((f) => {
      (groups[f.category] = groups[f.category] || []).push(f);
    });
    fontFamilySel.innerHTML = '';
    Object.keys(groups).forEach((cat) => {
      const og = document.createElement('optgroup');
      og.label = FONT_CATEGORIES[cat] || cat;
      groups[cat].forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.css;
        opt.textContent = f.name;
        if (f.name === 'Lora') opt.selected = true;
        og.appendChild(opt);
      });
      fontFamilySel.appendChild(og);
    });
  }
  populateFontSelect();

  document.getElementById('fontFamily').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ fontFamily: e.target.value });
    setStatus('Tipografía aplicada');
  });

  document.getElementById('fontSize').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ fontSize: e.target.value + 'pt' });
    setStatus('Tamaño aplicado');
  });

  document.getElementById('lineHeight').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ lineHeight: e.target.value });
    setStatus('Interlineado aplicado');
  });

  document.getElementById('letterSpacing').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ letterSpacing: e.target.value });
    setStatus('Espaciado aplicado');
  });

  /* ---- Galería de fuentes en el sidebar (panel "Fuentes") ---- */
  const fontGallery = document.getElementById('fontGallery');
  function renderFontGallery(filter) {
    const q = (filter || '').toLowerCase().trim();
    fontGallery.innerHTML = '';
    FONTS.filter((f) => !q || f.name.toLowerCase().includes(q)).forEach((f) => {
      const card = document.createElement('button');
      card.className = 'font-card';
      card.innerHTML =
        '<div class="f-preview" style="font-family:' + f.css + ';">Aa Bb — HERI PDF</div>' +
        '<div class="f-name">' + f.name + '</div>';
      card.addEventListener('click', () => {
        wrapSelectionWithStyle({ fontFamily: f.css });
        fontFamilySel.value = f.css;
        setStatus('Tipografía "' + f.name + '" aplicada');
      });
      fontGallery.appendChild(card);
    });
  }
  renderFontGallery('');
  document.getElementById('fontSearch').addEventListener('input', (e) => renderFontGallery(e.target.value));

  document.getElementById('textColor').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ color: e.target.value });
    setStatus('Color aplicado');
  });

  document.getElementById('highlightColor').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ backgroundColor: e.target.value });
    setStatus('Resaltado aplicado');
  });

  document.getElementById('btnClearHighlight').addEventListener('click', () => {
    wrapSelectionWithStyle({ backgroundColor: 'transparent' });
  });

  /* ----------------------------------------------------------------------
     EFECTOS TIPOGRÁFICOS — catálogo ampliado (32 efectos), panel emergente
     ---------------------------------------------------------------------- */
  const EFFECTS = [
    { id: 'none', label: 'Normal' },
    { id: 'tornasol', label: 'Tornasol' },
    { id: 'dorado', label: 'Dorado' },
    { id: 'plata', label: 'Plata' },
    { id: 'fuego', label: 'Fuego' },
    { id: 'neon', label: 'Neón' },
    { id: 'arcoiris', label: 'Arcoíris' },
    { id: '3d', label: '3D' },
    { id: 'cromo', label: 'Cromo' },
    { id: 'hielo', label: 'Hielo' },
    { id: 'sangre', label: 'Sangre' },
    { id: 'esmeralda', label: 'Esmeralda' },
    { id: 'veneno', label: 'Veneno' },
    { id: 'laser', label: 'Láser' },
    { id: 'glitch', label: 'Glitch' },
    { id: 'madera', label: 'Madera' },
    { id: 'cobre', label: 'Cobre' },
    { id: 'oceano', label: 'Océano' },
    { id: 'atardecer', label: 'Atardecer' },
    { id: 'medianoche', label: 'Medianoche' },
    { id: 'pastel', label: 'Pastel' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'purpura', label: 'Púrpura real' },
    { id: 'bronce', label: 'Bronce' },
    { id: 'titanio', label: 'Titanio' },
    { id: 'sombralarga', label: 'Sombra larga' },
    { id: 'contorno', label: 'Contorno' },
    { id: 'relieve', label: 'Relieve' },
    { id: 'marmol', label: 'Mármol' },
    { id: 'glowsuave', label: 'Glow suave' },
    { id: 'menta', label: 'Menta' },
    { id: 'rubi', label: 'Rubí' },
    { id: 'zafiro', label: 'Zafiro' },
  ];

  const fxGrid = document.getElementById('fxGrid');
  EFFECTS.forEach((fx) => {
    const btn = document.createElement('button');
    btn.className = 'fxbtn' + (fx.id !== 'none' ? ' fx-' + fx.id : '');
    if (fx.id === 'neon') btn.style.background = '#0c1024';
    btn.dataset.fx = fx.id;
    btn.textContent = fx.label;
    fxGrid.appendChild(btn);
  });

  function applyEffect(name) {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      setStatus('Selecciona el texto al que aplicar el efecto');
      return;
    }
    const span = document.createElement('span');
    span.className = 'fx fx-' + name;
    try {
      range.surroundContents(span);
    } catch (err) {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    sel.removeAllRanges();
    setStatus('Efecto "' + name + '" aplicado');
  }

  fxGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.fxbtn');
    if (!btn) return;
    applyEffect(btn.dataset.fx);
  });

  /* ---- Panel desplegable de efectos ---- */
  const fxTrigger = document.getElementById('fxTrigger');
  const fxPopover = document.getElementById('fxPopover');
  function closeAllPopovers(except) {
    document.querySelectorAll('.fx-popover.show, .tool-popover.show').forEach((p) => {
      if (p !== except) p.classList.remove('show');
    });
    document.querySelectorAll('.fx-trigger.open').forEach((b) => {
      if (b !== except) b.classList.remove('open');
    });
  }
  fxTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !fxPopover.classList.contains('show');
    closeAllPopovers();
    fxPopover.classList.toggle('show', willOpen);
    fxTrigger.classList.toggle('open', willOpen);
  });
  document.addEventListener('click', (e) => {
    if (!fxPopover.contains(e.target) && e.target !== fxTrigger) {
      fxPopover.classList.remove('show');
      fxTrigger.classList.remove('open');
    }
  });

  /* ----------------------------------------------------------------------
     INSERTAR IMÁGENES (redimensionables mediante resize nativo del div)
     ---------------------------------------------------------------------- */
  const imageInput = document.getElementById('imageInput');
  document.getElementById('btnInsertImage').addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(insertImageFile);
    imageInput.value = '';
  });

  function insertImageFile(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      restoreSelection();
      const sel = window.getSelection();
      const wrap = document.createElement('div');
      wrap.className = 'img-wrap';
      wrap.contentEditable = 'false';
      const img = document.createElement('img');
      img.src = ev.target.result;
      img.draggable = false;
      wrap.appendChild(img);

      let inserted = false;
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (pageContains(range.commonAncestorContainer)) {
          range.collapse(false);
          range.insertNode(wrap);
          range.setStartAfter(wrap);
          range.setEndAfter(wrap);
          sel.removeAllRanges();
          sel.addRange(range);
          inserted = true;
        }
      }
      if (!inserted && currentPage) currentPage.appendChild(wrap);
      setStatus('Imagen insertada — arrastra la esquina para redimensionar');
    };
    reader.readAsDataURL(file);
  }

  // Arrastrar y soltar imágenes directamente sobre una página
  pagesEl.addEventListener('dragover', (e) => e.preventDefault());
  pagesEl.addEventListener('drop', (e) => {
    const page = e.target.closest('.page');
    if (!page) return;
    e.preventDefault();
    currentPage = page;
    Array.from(e.dataTransfer.files).forEach(insertImageFile);
  });

  /* ----------------------------------------------------------------------
     ELEMENTOS RÁPIDOS
     ---------------------------------------------------------------------- */
  function insertHtmlAtCursor(html) {
    restoreSelection();
    currentPage && currentPage.focus();
    document.execCommand('insertHTML', false, html);
  }

  document.getElementById('elDivider').addEventListener('click', () => insertHtmlAtCursor('<hr class="tpl-divider">'));
  document.getElementById('elDate').addEventListener('click', () => {
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    insertHtmlAtCursor('<p>' + fecha + '</p>');
  });
  document.getElementById('elSignature').addEventListener('click', () =>
    insertHtmlAtCursor('<div class="tpl-signature-line">Firma</div>')
  );
  document.getElementById('elQuote').addEventListener('click', () =>
    insertHtmlAtCursor('<blockquote>Escribe aquí una cita destacada…</blockquote>')
  );
  /* ---- Elementos que un PDF normal no tiene ---- */
  document.getElementById('elShapeRect').addEventListener('click', () =>
    insertHtmlAtCursor('<span class="shape-el shape-rect" contenteditable="false"></span>')
  );
  document.getElementById('elShapeCircle').addEventListener('click', () =>
    insertHtmlAtCursor('<span class="shape-el shape-circle" contenteditable="false"></span>')
  );
  document.getElementById('elShapeLine').addEventListener('click', () =>
    insertHtmlAtCursor('<span class="shape-el shape-line" contenteditable="false"></span>')
  );
  function insertStamp(text) {
    insertHtmlAtCursor('<span class="stamp-el" contenteditable="false">' + (text || 'APROBADO') + '</span>');
  }
  document.getElementById('elStamp').addEventListener('click', () => insertStamp('APROBADO'));
  function insertQR(text) {
    const data = text || 'https://';
    const box = document.createElement('div');
    try {
      /* eslint-disable no-undef */
      new QRCode(box, { text: data, width: 110, height: 110 });
      insertHtmlAtCursor('<span class="qr-wrap" contenteditable="false">' + box.innerHTML + '</span>');
      setStatus('Código QR insertado');
    } catch (err) {
      setStatus('No se pudo generar el QR (sin conexión)');
    }
  }
  document.getElementById('elQR').addEventListener('click', () => {
    const text = prompt('Texto o URL para el código QR:', 'https://');
    if (text) insertQR(text);
  });
  document.getElementById('elChecklist').addEventListener('click', () =>
    insertHtmlAtCursor('<p>☐ Elemento uno</p><p>☐ Elemento dos</p><p>☐ Elemento tres</p>')
  );
  document.getElementById('elCallout').addEventListener('click', () =>
    insertHtmlAtCursor('<div style="background:#f4ece0;border-left:4px solid #c08a45;padding:12px 16px;margin:10px 0;border-radius:4px;">Texto destacado o nota importante.</div>')
  );
  function buildTOC() {
    const items = [];
    Array.from(pagesEl.querySelectorAll('.page')).forEach((page, pIdx) => {
      page.querySelectorAll('.tpl-section, .tpl-title').forEach((el) => {
        items.push({ text: el.textContent.trim(), page: pIdx + 1 });
      });
    });
    if (!items.length) return '<p class="tpl-title">Tabla de contenidos</p><p>No se encontraron secciones (usa títulos de plantilla).</p>';
    const rows = items.map((it) =>
      '<p style="display:flex;justify-content:space-between;border-bottom:1px dotted #ccc;padding:4px 0;"><span>' +
      it.text + '</span><span>Pág. ' + it.page + '</span></p>'
    ).join('');
    return '<p class="tpl-title">Tabla de contenidos</p>' + rows;
  }
  document.getElementById('elTOC').addEventListener('click', () => {
    const p = createPage(buildTOC());
    focusPage(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus('Índice generado');
  });

  /* ---- Tabla e columnas desde el toolbar ---- */
  function buildTableHTML(rows, cols) {
    let html = '<table class="tpl-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    return html;
  }
  document.getElementById('btnInsertTable').addEventListener('click', () => {
    const rows = parseInt(prompt('Número de filas:', '3'), 10) || 3;
    const cols = parseInt(prompt('Número de columnas:', '3'), 10) || 3;
    insertHtmlAtCursor(buildTableHTML(rows, cols));
    setStatus('Tabla insertada');
  });
  document.getElementById('btnToggleColumns').addEventListener('click', () => {
    if (!currentPage) return;
    currentPage.classList.toggle('text-columns');
    setStatus(currentPage.classList.contains('text-columns') ? 'Columnas activadas' : 'Columnas desactivadas');
  });

  document.getElementById('elPagebreak').addEventListener('click', () => {
    const p = createPage();
    focusPage(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ----------------------------------------------------------------------
     PANEL "HERRAMIENTAS" — acciones a nivel de página/documento
     ---------------------------------------------------------------------- */
  document.getElementById('toolWatermark').addEventListener('click', () => {
    if (!currentPage) return;
    const text = prompt('Texto de la marca de agua:', 'CONFIDENCIAL');
    if (!text) return;
    let wm = currentPage.querySelector('.page-watermark');
    if (!wm) {
      wm = document.createElement('div');
      wm.className = 'page-watermark';
      wm.contentEditable = 'false';
      currentPage.insertBefore(wm, currentPage.firstChild);
    }
    wm.innerHTML = '<span>' + text + '</span>';
    setStatus('Marca de agua aplicada');
  });

  document.getElementById('toolPageNumbers').addEventListener('click', () => {
    const pages = Array.from(pagesEl.querySelectorAll('.page'));
    const already = pages.length && pages[0].querySelector('.page-footer.auto-pagenum');
    pages.forEach((page, i) => {
      let ft = page.querySelector('.page-footer.auto-pagenum');
      if (already) {
        if (ft) ft.remove();
      } else {
        if (!ft) {
          ft = document.createElement('div');
          ft.className = 'page-footer auto-pagenum';
          ft.contentEditable = 'false';
          page.appendChild(ft);
        }
        ft.innerHTML = '<span></span><span>Página ' + (i + 1) + ' de ' + pages.length + '</span>';
      }
    });
    setStatus(already ? 'Numeración quitada' : 'Numeración de páginas aplicada');
  });

  document.getElementById('toolHeaderFooter').addEventListener('click', () => {
    if (!currentPage) return;
    const headerText = prompt('Texto de encabezado (vacío para omitir):', '');
    const footerText = prompt('Texto de pie de página (vacío para omitir):', '');
    if (headerText) {
      let hd = currentPage.querySelector('.page-header');
      if (!hd) {
        hd = document.createElement('div');
        hd.className = 'page-header';
        hd.contentEditable = 'false';
        currentPage.insertBefore(hd, currentPage.firstChild);
      }
      hd.textContent = headerText;
    }
    if (footerText) {
      let ft = currentPage.querySelector('.page-footer:not(.auto-pagenum)');
      if (!ft) {
        ft = document.createElement('div');
        ft.className = 'page-footer';
        ft.contentEditable = 'false';
        currentPage.appendChild(ft);
      }
      ft.innerHTML = '<span>' + footerText + '</span><span></span>';
    }
    setStatus('Encabezado/pie aplicado');
  });

  document.getElementById('toolTOC').addEventListener('click', () => document.getElementById('elTOC').click());
  document.getElementById('toolQR').addEventListener('click', () => document.getElementById('elQR').click());
  document.getElementById('toolStamp').addEventListener('click', () => {
    const text = prompt('Texto del sello:', 'APROBADO');
    if (text) insertStamp(text);
  });
  document.getElementById('toolTable').addEventListener('click', () => document.getElementById('btnInsertTable').click());
  document.getElementById('toolColumns').addEventListener('click', () => document.getElementById('btnToggleColumns').click());

  /* ----------------------------------------------------------------------
     PESTAÑAS DEL SIDEBAR
     ---------------------------------------------------------------------- */
  document.querySelectorAll('.sidebar-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-tabs button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.sidebar-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  /* ----------------------------------------------------------------------
     PLANTILLAS
     ---------------------------------------------------------------------- */
  const TEMPLATES = {
    blank: () => '<p><br></p>',

    carta: () => `
      <p style="text-align:right;color:#666;">Toronto, ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="tpl-title" style="font-size:20px;">Nombre del remitente</p>
      <p class="tpl-subtitle">Cargo · Empresa</p>
      <p>Estimado/a [Nombre del destinatario]:</p>
      <p>Le escribo con relación a… (desarrolle aquí el motivo de la carta, con claridad y en un tono profesional).</p>
      <p>Quedo atento/a a sus comentarios y a su disposición para cualquier aclaración adicional.</p>
      <p>Atentamente,</p>
      <div class="tpl-signature-line">Nombre y firma</div>`,

    cv: () => `
      <p class="tpl-title">Nombre Apellido</p>
      <p class="tpl-subtitle">Desarrollador de Software · correo@ejemplo.com · +1 000 000 0000</p>
      <p class="tpl-section">Perfil</p>
      <p>Breve resumen profesional: años de experiencia, especialidad y objetivo.</p>
      <p class="tpl-section">Experiencia</p>
      <p><span class="tpl-label">Puesto — Empresa</span> · 2023–presente</p>
      <p>Descripción de logros y responsabilidades principales.</p>
      <p class="tpl-section">Educación</p>
      <p><span class="tpl-label">Título — Institución</span> · Año</p>
      <p class="tpl-section">Habilidades</p>
      <p>JavaScript · HTML/CSS · Solidity · Gestión de proyectos</p>`,

    factura: () => `
      <p class="tpl-title" style="font-size:22px;">Factura</p>
      <p class="tpl-subtitle">N.º 0001 · ${new Date().toLocaleDateString('es-ES')}</p>
      <p><span class="tpl-label">Cliente:</span> Nombre del cliente</p>
      <table class="tpl-table">
        <thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td>Servicio de desarrollo web</td><td>1</td><td>$0.00</td><td>$0.00</td></tr>
          <tr><td>Integración de chatbot</td><td>1</td><td>$0.00</td><td>$0.00</td></tr>
        </tbody>
        <tfoot><tr><td colspan="3">Total</td><td>$0.00</td></tr></tfoot>
      </table>`,

    poster: () => `
      <div style="text-align:center;padding-top:60px;">
        <p style="font-family:'Bebas Neue',sans-serif;font-size:64px;margin:0;"><span class="fx fx-tornasol">GRAN EVENTO</span></p>
        <p class="tpl-subtitle" style="font-size:16px;">Subtítulo del afiche · fecha · lugar</p>
        <hr class="tpl-divider" style="width:60%;margin:24px auto;">
        <p style="font-size:15px;max-width:80%;margin:0 auto;">Describe aquí los detalles del evento, invitados o llamada a la acción.</p>
      </div>`,

    certificado: () => `
      <div style="text-align:center;padding-top:50px;">
        <p style="font-family:'Cinzel',serif;font-size:14px;letter-spacing:.15em;text-transform:uppercase;color:#8a6633;">Certificado de reconocimiento</p>
        <p style="font-family:'Playfair Display',serif;font-size:30px;margin:18px 0;"><span class="fx fx-dorado">Nombre del participante</span></p>
        <p style="max-width:70%;margin:0 auto;color:#444;">Por su destacada participación y compromiso demostrado.</p>
        <p style="margin-top:60px;">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div style="display:flex;justify-content:center;gap:80px;margin-top:30px;">
          <div class="tpl-signature-line">Firma 1</div>
          <div class="tpl-signature-line">Firma 2</div>
        </div>
      </div>`,

    tarjeta: () => `
      <div style="max-width:340px;margin:40px auto;padding:26px;border:1px solid #ddd;border-radius:8px;">
        <p style="font-family:'Playfair Display',serif;font-size:22px;margin:0;"><span class="fx fx-dorado">Nombre Apellido</span></p>
        <p class="tpl-subtitle" style="margin:4px 0 14px;">Cargo profesional</p>
        <p style="font-size:12.5px;color:#555;margin:0;">correo@ejemplo.com</p>
        <p style="font-size:12.5px;color:#555;margin:0;">+1 000 000 0000</p>
        <p style="font-size:12.5px;color:#555;margin:0;">www.sitio.com</p>
      </div>`,

    boletin: () => `
      <p style="font-family:'Bebas Neue',sans-serif;font-size:38px;text-align:center;margin:0;">BOLETÍN MENSUAL</p>
      <p class="tpl-subtitle" style="text-align:center;">Edición N.º 01 · ${new Date().toLocaleDateString('es-ES')}</p>
      <hr class="tpl-divider">
      <div class="text-columns">
        <p class="tpl-section">Tema principal</p>
        <p>Escribe aquí la nota destacada de esta edición, con los datos y contexto más relevantes.</p>
        <p class="tpl-section">Novedades</p>
        <p>Una breve sección con actualizaciones, anuncios o próximos eventos.</p>
      </div>`,

    informe: () => `
      <p style="text-align:center;color:#8a6633;font-family:var(--font-mono, monospace);letter-spacing:.15em;text-transform:uppercase;font-size:11px;">Informe ejecutivo</p>
      <p class="tpl-title" style="text-align:center;font-size:30px;">Título del informe</p>
      <p class="tpl-subtitle" style="text-align:center;">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="tpl-section">1. Resumen ejecutivo</p>
      <p>Síntesis del contenido, objetivos y principales hallazgos del informe.</p>
      <p class="tpl-section">2. Desarrollo</p>
      <p>Detalle de los puntos analizados, con datos de respaldo cuando corresponda.</p>
      <p class="tpl-section">3. Conclusiones</p>
      <p>Cierre con recomendaciones o próximos pasos.</p>`,

    propuesta: () => `
      <p class="tpl-title" style="font-size:24px;">Propuesta comercial</p>
      <p class="tpl-subtitle">Preparado para [Cliente] · ${new Date().toLocaleDateString('es-ES')}</p>
      <p class="tpl-section">Alcance del proyecto</p>
      <p>Describe aquí el alcance, objetivos y entregables acordados.</p>
      <p class="tpl-section">Inversión</p>
      <table class="tpl-table">
        <thead><tr><th>Servicio</th><th>Detalle</th><th>Precio</th></tr></thead>
        <tbody>
          <tr><td>Desarrollo</td><td>Alcance completo</td><td>$0.00</td></tr>
          <tr><td>Mantenimiento</td><td>Mensual</td><td>$0.00</td></tr>
        </tbody>
      </table>
      <p class="tpl-section">Condiciones</p>
      <p>Plazos de entrega, forma de pago y vigencia de la propuesta.</p>`,

    menu: () => `
      <p style="text-align:center;font-family:'Cinzel',serif;font-size:26px;letter-spacing:.08em;"><span class="fx fx-dorado">MENÚ</span></p>
      <hr class="tpl-divider" style="width:40%;margin:14px auto;">
      <p class="tpl-section" style="text-align:center;border:none;">Entradas</p>
      <p style="display:flex;justify-content:space-between;"><span>Plato de entrada</span><span>$0.00</span></p>
      <p style="display:flex;justify-content:space-between;"><span>Plato de entrada</span><span>$0.00</span></p>
      <p class="tpl-section" style="text-align:center;border:none;">Platos fuertes</p>
      <p style="display:flex;justify-content:space-between;"><span>Plato principal</span><span>$0.00</span></p>
      <p style="display:flex;justify-content:space-between;"><span>Plato principal</span><span>$0.00</span></p>
      <p class="tpl-section" style="text-align:center;border:none;">Postres</p>
      <p style="display:flex;justify-content:space-between;"><span>Postre</span><span>$0.00</span></p>`,

    agenda: () => `
      <p class="tpl-title" style="font-size:22px;">Agenda de reunión</p>
      <p class="tpl-subtitle">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} · Hora · Lugar/Enlace</p>
      <p class="tpl-section">Objetivos</p>
      <p>Qué se busca lograr en esta reunión.</p>
      <p class="tpl-section">Temas a tratar</p>
      <table class="tpl-table">
        <thead><tr><th>#</th><th>Tema</th><th>Responsable</th><th>Tiempo</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Tema uno</td><td>—</td><td>10 min</td></tr>
          <tr><td>2</td><td>Tema dos</td><td>—</td><td>10 min</td></tr>
        </tbody>
      </table>
      <p class="tpl-section">Próximos pasos</p>
      <p>Acciones y responsables acordados al cierre.</p>`,
  };

  document.querySelectorAll('.tpl-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const html = TEMPLATES[btn.dataset.tpl] ? TEMPLATES[btn.dataset.tpl]() : '<p><br></p>';
      const p = createPage(html);
      focusPage(p);
      p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('Plantilla insertada');
    });
  });

  /* ----------------------------------------------------------------------
     ZOOM
     ---------------------------------------------------------------------- */
  const zoomRange = document.getElementById('zoomRange');
  const zoomValue = document.getElementById('zoomValue');
  zoomRange.addEventListener('input', () => {
    const v = zoomRange.value;
    pagesEl.style.transform = 'scale(' + (v / 100) + ')';
    zoomValue.textContent = v + '%';
  });
  zoomRange.dispatchEvent(new Event('input'));

  /* ----------------------------------------------------------------------
     EXPORTACIÓN A PDF (alta calidad: html2canvas + jsPDF)
     ---------------------------------------------------------------------- */
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');

  function toggleLoading(show, text) {
    loadingOverlay.classList.toggle('show', show);
    if (text) loadingText.textContent = text;
  }

  async function exportPDF() {
    const pages = Array.from(pagesEl.querySelectorAll('.page'));
    if (!pages.length) return;

    if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      alert('No se pudieron cargar las librerías de exportación (html2canvas / jsPDF). Verifica tu conexión a internet.');
      return;
    }

    toggleLoading(true, 'Preparando documento…');
    const prevOutline = currentPage ? currentPage.style.outline : '';
    pages.forEach((p) => (p.style.outline = 'none'));

    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const { jsPDF } = window.jspdf;
      const format = docPageSize === 'carta' ? 'letter' : 'a4';
      const dims = docPageSize === 'carta' ? { w: 216, h: 279 } : { w: 210, h: 297 };
      const doc = new jsPDF({ unit: 'mm', format, orientation: 'portrait' });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        loadingText.textContent = 'Renderizando página ' + (i + 1) + ' de ' + pages.length + '…';
        page.classList.add('exporting');

        const canvas = await window.html2canvas(page, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: page.scrollWidth,
          windowHeight: page.scrollHeight,
        });

        page.classList.remove('exporting');
        const imgData = canvas.toDataURL('image/png', 1.0);
        if (i > 0) doc.addPage(format, 'portrait');
        doc.addImage(imgData, 'PNG', 0, 0, dims.w, dims.h, undefined, 'FAST');
      }

      loadingText.textContent = 'Guardando archivo…';
      const rawName = (document.getElementById('docTitle').value || 'documento').trim();
      const filename = (rawName.replace(/\s+/g, '_').replace(/[^\w\-]/g, '') || 'documento') + '.pdf';
      doc.save(filename);
      setStatus('PDF exportado');
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el PDF. Revisa la consola del navegador para más detalles.');
    } finally {
      pages.forEach((p) => p.classList.remove('exporting'));
      if (currentPage) currentPage.style.outline = prevOutline;
      toggleLoading(false);
    }
  }

  document.getElementById('btnExport').addEventListener('click', exportPDF);

  /* ----------------------------------------------------------------------
     ATAJOS DE TECLADO
     ---------------------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 's') { e.preventDefault(); exportPDF(); }
  });

  /* ----------------------------------------------------------------------
     INICIALIZACIÓN
     ---------------------------------------------------------------------- */
  const firstPage = createPage(
    '<p class="tpl-title">Nuevo documento</p>' +
    '<p class="tpl-subtitle">Empieza a escribir, o elige una plantilla en el panel izquierdo</p>' +
    '<p>Selecciona cualquier texto para cambiar su fuente, color o aplicar un efecto como ' +
    '<span class="fx fx-tornasol">tornasol</span>, <span class="fx fx-dorado">dorado</span> o <span class="fx fx-3d">3D</span>.</p>'
  );
  focusPage(firstPage);
})();
