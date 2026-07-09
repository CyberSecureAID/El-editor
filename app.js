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
  const pageOrientSel = document.getElementById('pageOrientationSelect');

  let currentPage  = null;   // <div class="page"> con el foco actual
  let savedRange   = null;   // última selección dentro de una página
  let pageCounter  = 0;
  let docPageSize  = 'a4';        // 'a4' | 'carta'
  let docOrientation = 'portrait'; // 'portrait' | 'landscape'

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
     SISTEMA GENÉRICO DE POPOVERS (efectos, colores, herramientas)
     Un botón "trigger" despliega un panel; un solo panel abierto a la vez;
     clic afuera cierra todos.
     ---------------------------------------------------------------------- */
  const popoverRegistry = [];

  function closeAllPopovers(exceptPopover) {
    popoverRegistry.forEach(({ trigger, popover }) => {
      if (popover === exceptPopover) return;
      popover.classList.remove('show');
      trigger.classList.remove('open');
    });
  }

  function registerPopover(trigger, popover) {
    popoverRegistry.push({ trigger, popover });
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !popover.classList.contains('show');
      closeAllPopovers();
      popover.classList.toggle('show', willOpen);
      trigger.classList.toggle('open', willOpen);
    });
  }

  document.addEventListener('click', (e) => {
    popoverRegistry.forEach(({ trigger, popover }) => {
      if (!popover.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
        popover.classList.remove('show');
        trigger.classList.remove('open');
      }
    });
  });

  const titleEditWrap = document.getElementById('titleEditWrap');
  const docTitleInput = document.getElementById('docTitle');
  if (titleEditWrap && docTitleInput) {
    titleEditWrap.addEventListener('click', () => {
      docTitleInput.focus();
      docTitleInput.select();
    });
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
    page.classList.remove('page-a4', 'page-carta', 'page-landscape');
    page.classList.add(docPageSize === 'carta' ? 'page-carta' : 'page-a4');
    if (docOrientation === 'landscape') page.classList.add('page-landscape');
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
      document.getElementById('pageBgColorInput').value = rgbToHex(bg);
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

  pageOrientSel.addEventListener('change', () => {
    docOrientation = pageOrientSel.value;
    Array.from(pagesEl.children).forEach(applyPageSizeClass);
    setStatus(docOrientation === 'landscape' ? 'Orientación horizontal' : 'Orientación vertical');
  });

  const pageBgTrigger = document.getElementById('pageBgTrigger');
  const pageBgPopover = document.getElementById('pageBgPopover');
  const pageBgColorInput = document.getElementById('pageBgColorInput');
  registerPopover(pageBgTrigger, pageBgPopover);

  document.getElementById('pageBgApply').addEventListener('click', () => {
    if (!currentPage) { setStatus('Selecciona una hoja primero'); return; }
    // El color sólido y las texturas son excluyentes: se limpia cualquier
    // clase de textura para que el color inline no quede "atrapado" debajo
    // de una textura elegida más tarde (ese cruce era el bug que hacía
    // que algunas texturas oscuras no se vieran).
    Array.from(currentPage.classList)
      .filter((c) => c.startsWith('tex-'))
      .forEach((c) => currentPage.classList.remove(c));
    currentPage.classList.add('tex-none');
    currentPage.style.backgroundColor = pageBgColorInput.value;
    document.querySelectorAll('.tex-swatch').forEach((s) => s.classList.remove('selected'));
    const noneSwatch = document.querySelector('.tex-swatch[data-tex="none"]');
    if (noneSwatch) noneSwatch.classList.add('selected');
    setStatus('Fondo actualizado');
    closeAllPopovers();
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
    // Bug corregido: un color de fondo aplicado antes dejaba un estilo
    // inline (currentPage.style.backgroundColor) que tiene más prioridad
    // que cualquier clase CSS, así que las texturas con color de fondo
    // propio (estrellas, cuero, negro sólido, elegante oscuro...) se
    // quedaban tapadas por ese color y parecía que "no pasaba nada".
    currentPage.style.backgroundColor = '';
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
    // Si el texto seleccionado ya tenía spans anidados con la misma
    // propiedad fijada (p. ej. un color de texto puesto antes), esos
    // estilos internos ganan por estar más cerca del texto y el nuevo
    // color no se veía aplicado "a todo". Se limpia esa propiedad en
    // los descendientes para que el valor del span nuevo sí se note.
    const styledDescendants = span.querySelectorAll('[style]');
    Object.keys(styles).forEach((prop) => {
      styledDescendants.forEach((el) => {
        if (el.style[prop]) el.style[prop] = '';
      });
    });
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
        opt.style.fontFamily = f.css;
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

  const textColorTrigger = document.getElementById('textColorTrigger');
  const textColorPopover = document.getElementById('textColorPopover');
  const textColorInput = document.getElementById('textColorInput');
  const textColorSwatch = document.getElementById('textColorSwatch');
  registerPopover(textColorTrigger, textColorPopover);

  document.getElementById('textColorApply').addEventListener('click', () => {
    wrapSelectionWithStyle({ color: textColorInput.value });
    textColorSwatch.style.background = textColorInput.value;
    setStatus('Color aplicado');
    closeAllPopovers();
  });

  const highlightTrigger = document.getElementById('highlightTrigger');
  const highlightPopover = document.getElementById('highlightPopover');
  const highlightColorInput = document.getElementById('highlightColorInput');
  const highlightColorSwatch = document.getElementById('highlightColorSwatch');
  registerPopover(highlightTrigger, highlightPopover);

  document.getElementById('highlightApply').addEventListener('click', () => {
    wrapSelectionWithStyle({ backgroundColor: highlightColorInput.value });
    highlightColorSwatch.style.background = highlightColorInput.value;
    setStatus('Resaltado aplicado');
    closeAllPopovers();
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
  registerPopover(fxTrigger, fxPopover);

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

  /* ---- Nota al pie ---- */
  document.getElementById('elFootnote').addEventListener('click', () =>
    insertHtmlAtCursor('<p style="font-size:10.5px;color:#777;border-top:1px solid #ddd;padding-top:6px;margin-top:20px;">Nota: escribe aquí una aclaración o referencia.</p>')
  );

  /* ---- Bloque de código ---- */
  document.getElementById('elCodeBlock').addEventListener('click', () =>
    insertHtmlAtCursor(
      '<pre style="background:#1e2027;color:#e9e6df;font-family:\'JetBrains Mono\',monospace;font-size:12px;' +
      'line-height:1.5;padding:14px 16px;border-radius:6px;overflow-x:auto;margin:10px 0;white-space:pre-wrap;">' +
      'código de ejemplo();</pre>'
    )
  );

  /* ---- Sello redondo (SVG con texto curvo) ---- */
  function buildRoundSealSVG(text) {
    const id = 'sealPath' + Date.now();
    const upper = (text || 'DOCUMENTO VERIFICADO').toUpperCase();
    return (
      '<svg viewBox="0 0 140 140" width="110" height="110" style="display:block;">' +
      '<defs><path id="' + id + '" d="M 20,70 A 50,50 0 1,1 120,70" fill="none"/></defs>' +
      '<circle cx="70" cy="70" r="62" fill="none" stroke="#b8272c" stroke-width="3"/>' +
      '<circle cx="70" cy="70" r="50" fill="none" stroke="#b8272c" stroke-width="1.4"/>' +
      '<text font-family="JetBrains Mono, monospace" font-size="10.5" fill="#b8272c" letter-spacing="2">' +
      '<textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + upper + '</textPath>' +
      '</text>' +
      '<text x="70" y="76" text-anchor="middle" font-family="Playfair Display, serif" font-weight="700" font-size="17" fill="#b8272c" transform="rotate(-6 70 70)">★</text>' +
      '</svg>'
    );
  }
  document.getElementById('elSeal').addEventListener('click', () => {
    const text = prompt('Texto alrededor del sello:', 'DOCUMENTO VERIFICADO');
    if (text === null) return;
    insertHtmlAtCursor('<span class="seal-el" contenteditable="false">' + buildRoundSealSVG(text) + '</span>');
    setStatus('Sello redondo insertado');
  });

  /* ---- Nota adhesiva ---- */
  document.getElementById('elSticky').addEventListener('click', () =>
    insertHtmlAtCursor(
      '<div class="sticky-el" contenteditable="true">Escribe aquí tu nota…</div>'
    )
  );

  /* ---- Recuadro de advertencia ---- */
  document.getElementById('elWarning').addEventListener('click', () =>
    insertHtmlAtCursor(
      '<div style="background:#fdecea;border-left:4px solid #c0392b;padding:12px 16px;margin:10px 0;border-radius:4px;color:#7a231a;">' +
      '⚠ <strong>Atención:</strong> escribe aquí una advertencia o condición importante.</div>'
    )
  );

  /* ---- Barra de progreso ---- */
  document.getElementById('elProgress').addEventListener('click', () => {
    let pct = parseInt(prompt('Porcentaje de avance (0–100):', '75'), 10);
    if (isNaN(pct)) return;
    pct = Math.max(0, Math.min(100, pct));
    insertHtmlAtCursor(
      '<div contenteditable="false" style="margin:14px 0;">' +
        '<div style="background:#e8e4da;border-radius:20px;height:16px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#e3ae6c,#c08a45);"></div>' +
        '</div>' +
        '<p style="font-size:11px;color:#777;margin:4px 0 0;">' + pct + '% completado</p>' +
      '</div>'
    );
  });

  /* ---- Separador con icono ---- */
  document.getElementById('elIconDivider').addEventListener('click', () =>
    insertHtmlAtCursor(
      '<p style="text-align:center;color:#c08a45;letter-spacing:.3em;margin:18px 0;">— ✦ —</p>'
    )
  );

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
  document.getElementById('toolStamp').addEventListener('click', () => {
    const text = prompt('Texto del sello:', 'APROBADO');
    if (text) insertStamp(text);
  });
  document.getElementById('toolTable').addEventListener('click', () => document.getElementById('btnInsertTable').click());
  document.getElementById('toolColumns').addEventListener('click', () => document.getElementById('btnToggleColumns').click());

  /* ---- Duplicar página actual ---- */
  document.getElementById('toolDuplicatePage').addEventListener('click', () => {
    if (!currentPage) return;
    const copy = createPage(currentPage.innerHTML);
    // createPage lo agrega al final de la lista; lo reubicamos justo después del original
    pagesEl.insertBefore(copy, currentPage.nextSibling);
    refreshPageLabels();
    focusPage(copy);
    copy.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus('Página duplicada');
  });

  /* ---- Mover página arriba / abajo ---- */
  document.getElementById('toolMoveUp').addEventListener('click', () => {
    if (!currentPage) return;
    const prev = currentPage.previousElementSibling;
    if (!prev) { setStatus('Ya es la primera página'); return; }
    pagesEl.insertBefore(currentPage, prev);
    refreshPageLabels();
    currentPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus('Página movida hacia arriba');
  });
  document.getElementById('toolMoveDown').addEventListener('click', () => {
    if (!currentPage) return;
    const next = currentPage.nextElementSibling;
    if (!next) { setStatus('Ya es la última página'); return; }
    pagesEl.insertBefore(next, currentPage);
    refreshPageLabels();
    currentPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus('Página movida hacia abajo');
  });

  /* ---- Contar palabras ---- */
  document.getElementById('toolWordCount').addEventListener('click', () => {
    const pages = Array.from(pagesEl.querySelectorAll('.page'));
    const pageWords = currentPage ? (currentPage.textContent.trim().match(/\S+/g) || []).length : 0;
    const totalWords = pages.reduce((sum, p) => sum + (p.textContent.trim().match(/\S+/g) || []).length, 0);
    alert('Palabras en esta página: ' + pageWords + '\nPalabras en todo el documento: ' + totalWords);
  });

  /* ---- Buscar y reemplazar (solo texto, respeta el formato existente) ---- */
  document.getElementById('toolFindReplace').addEventListener('click', () => {
    if (!currentPage) return;
    const find = prompt('Buscar en la página actual:', '');
    if (!find) return;
    const replace = prompt('Reemplazar con:', '');
    if (replace === null) return;
    const walker = document.createTreeWalker(currentPage, NodeFilter.SHOW_TEXT, null);
    let count = 0;
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.nodeValue.indexOf(find) !== -1) {
        const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = node.nodeValue.match(re);
        if (matches) count += matches.length;
        node.nodeValue = node.nodeValue.replace(re, replace);
      }
    });
    setStatus(count ? count + ' coincidencia(s) reemplazada(s)' : 'No se encontraron coincidencias');
  });

  /* ---- Imprimir / vista previa ---- */
  document.getElementById('toolPrint').addEventListener('click', () => window.print());

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

  document.querySelectorAll('.tpl-card[data-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const html = TEMPLATES[btn.dataset.tpl] ? TEMPLATES[btn.dataset.tpl]() : '<p><br></p>';
      const p = createPage(html);
      focusPage(p);
      p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('Plantilla insertada');
    });
  });

  /* ----------------------------------------------------------------------
     MODAL: CONTRATAR DESARROLLADOR
     ---------------------------------------------------------------------- */
  const hireDevModal = document.getElementById('hireDevModal');
  document.getElementById('btnHireDev').addEventListener('click', () => hireDevModal.classList.add('show'));
  document.getElementById('hireDevClose').addEventListener('click', () => hireDevModal.classList.remove('show'));
  hireDevModal.addEventListener('click', (e) => {
    if (e.target === hireDevModal) hireDevModal.classList.remove('show');
  });

  /* ----------------------------------------------------------------------
     CONVERTIR IMÁGENES A PDF
     Flujo: cargar imágenes → ordenar → elegir ajuste (cubrir/ajustar) y,
     en modo "cubrir", desplazar el recorte con sliders X/Y → generar una
     hoja nueva a sangre completa por cada imagen, en el orden elegido.
     ---------------------------------------------------------------------- */
  const img2pdfModal   = document.getElementById('img2pdfModal');
  const img2pdfInput   = document.getElementById('img2pdfInput');
  const img2pdfList    = document.getElementById('img2pdfList');
  const img2pdfCount   = document.getElementById('img2pdfCount');
  const img2pdfGenBtn  = document.getElementById('img2pdfGenerate');
  let img2pdfItems = []; // { id, dataUrl, fit, posX, posY, brightness, contrast }
  let img2pdfCounter = 0;

  function openImg2pdfModal() {
    img2pdfModal.classList.add('show');
  }
  function closeImg2pdfModal() {
    img2pdfModal.classList.remove('show');
  }
  document.getElementById('tplImg2Pdf').addEventListener('click', openImg2pdfModal);
  document.getElementById('img2pdfClose').addEventListener('click', closeImg2pdfModal);
  img2pdfModal.addEventListener('click', (e) => {
    if (e.target === img2pdfModal) closeImg2pdfModal();
  });
  document.getElementById('img2pdfUploadBtn').addEventListener('click', () => img2pdfInput.click());

  img2pdfInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        img2pdfCounter += 1;
        img2pdfItems.push({
          id: 'img' + img2pdfCounter,
          dataUrl: ev.target.result,
          fit: 'cover',
          posX: 50,
          posY: 50,
          brightness: 100, // % — sube el blanco
          contrast: 100,   // % — sube la profundidad del negro
        });
        renderImg2pdfList();
      };
      reader.readAsDataURL(file);
    });
    img2pdfInput.value = '';
  });

  function itemFilterCss(item) {
    return 'brightness(' + item.brightness + '%) contrast(' + item.contrast + '%)';
  }

  function renderImg2pdfList() {
    img2pdfList.innerHTML = '';
    img2pdfItems.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'img2pdf-item';
      row.innerHTML =
        '<div class="i-thumb" style="background-image:url(' + item.dataUrl + ');filter:' + itemFilterCss(item) + ';"></div>' +
        '<div class="i-controls">' +
          '<label>Ajuste en la hoja</label>' +
          '<select class="i-fit">' +
            '<option value="cover"' + (item.fit === 'cover' ? ' selected' : '') + '>Pantalla completa (recortar bordes)</option>' +
            '<option value="contain"' + (item.fit === 'contain' ? ' selected' : '') + '>Ajustar sin recortar</option>' +
          '</select>' +
          (item.fit === 'cover'
            ? '<label>Recorte horizontal</label><input type="range" class="i-posx" min="0" max="100" value="' + item.posX + '">' +
              '<label>Recorte vertical</label><input type="range" class="i-posy" min="0" max="100" value="' + item.posY + '">'
            : '') +
          '<hr class="i-adjust-divider">' +
          '<label>Brillo (blancos) <span class="i-brightness-val">' + item.brightness + '%</span></label>' +
          '<input type="range" class="i-brightness" min="60" max="180" value="' + item.brightness + '">' +
          '<label>Contraste (negros) <span class="i-contrast-val">' + item.contrast + '%</span></label>' +
          '<input type="range" class="i-contrast" min="60" max="200" value="' + item.contrast + '">' +
        '</div>' +
        '<div class="i-actions">' +
          '<button class="i-up" title="Subir">▲</button>' +
          '<button class="i-down" title="Bajar">▼</button>' +
          '<button class="i-reset" title="Restablecer brillo/contraste">↺</button>' +
          '<button class="i-remove" title="Quitar">✕</button>' +
        '</div>';

      const thumb = row.querySelector('.i-thumb');

      row.querySelector('.i-fit').addEventListener('change', (e) => {
        item.fit = e.target.value;
        renderImg2pdfList();
      });
      const posxEl = row.querySelector('.i-posx');
      const posyEl = row.querySelector('.i-posy');
      if (posxEl) posxEl.addEventListener('input', (e) => (item.posX = +e.target.value));
      if (posyEl) posyEl.addEventListener('input', (e) => (item.posY = +e.target.value));

      row.querySelector('.i-brightness').addEventListener('input', (e) => {
        item.brightness = +e.target.value;
        row.querySelector('.i-brightness-val').textContent = item.brightness + '%';
        thumb.style.filter = itemFilterCss(item);
      });
      row.querySelector('.i-contrast').addEventListener('input', (e) => {
        item.contrast = +e.target.value;
        row.querySelector('.i-contrast-val').textContent = item.contrast + '%';
        thumb.style.filter = itemFilterCss(item);
      });
      row.querySelector('.i-reset').addEventListener('click', () => {
        item.brightness = 100;
        item.contrast = 100;
        renderImg2pdfList();
      });

      row.querySelector('.i-up').addEventListener('click', () => {
        if (idx === 0) return;
        [img2pdfItems[idx - 1], img2pdfItems[idx]] = [img2pdfItems[idx], img2pdfItems[idx - 1]];
        renderImg2pdfList();
      });
      row.querySelector('.i-down').addEventListener('click', () => {
        if (idx === img2pdfItems.length - 1) return;
        [img2pdfItems[idx + 1], img2pdfItems[idx]] = [img2pdfItems[idx], img2pdfItems[idx + 1]];
        renderImg2pdfList();
      });
      row.querySelector('.i-remove').addEventListener('click', () => {
        img2pdfItems.splice(idx, 1);
        renderImg2pdfList();
      });

      img2pdfList.appendChild(row);
    });
    img2pdfCount.textContent = img2pdfItems.length + (img2pdfItems.length === 1 ? ' imagen' : ' imágenes');
    img2pdfGenBtn.disabled = img2pdfItems.length === 0;
  }
  renderImg2pdfList();

  /* ----------------------------------------------------------------------
     MOTOR DE EDICIÓN DIRECTA DE IMAGEN SOBRE LA HOJA
     Cada hoja "page-image-full" contiene un <img class="img-crop-img">
     posicionado y escalado con left/top/width/height en px (no con
     background-image), para poder arrastrarlo y escalarlo a mano con el
     mouse en cualquier momento — no solo al crear la hoja. El brillo y
     contraste se aplican como filtro CSS en vivo (no se "hornean" en los
     píxeles), así siguen siendo editables después de generar la página.
     ---------------------------------------------------------------------- */
  function computeCoverLayout(containerW, containerH, naturalW, naturalH, posX, posY) {
    const scale = Math.max(containerW / naturalW, containerH / naturalH);
    const w = naturalW * scale;
    const h = naturalH * scale;
    const overflowX = w - containerW;
    const overflowY = h - containerH;
    return { w, h, l: -overflowX * (posX / 100), t: -overflowY * (posY / 100) };
  }
  function computeContainLayout(containerW, containerH, naturalW, naturalH) {
    const scale = Math.min(containerW / naturalW, containerH / naturalH);
    const w = naturalW * scale;
    const h = naturalH * scale;
    return { w, h, l: (containerW - w) / 2, t: (containerH - h) / 2 };
  }

  // Vincula una hoja "page-image-full" con su motor de arrastre/escalado.
  // initial: { fit, posX, posY, brightness, contrast }
  function setupImageEditor(bg, imgEl, initial) {
    const state = {
      fit: initial.fit || 'cover',
      brightness: initial.brightness || 100,
      contrast: initial.contrast || 100,
      naturalW: 0, naturalH: 0,
      w: 0, h: 0, l: 0, t: 0,
    };
    bg._imgState = state;

    function applyFilter() {
      imgEl.style.filter = 'brightness(' + state.brightness + '%) contrast(' + state.contrast + '%)';
    }
    function applyPosition() {
      imgEl.style.width = state.w + 'px';
      imgEl.style.height = state.h + 'px';
      imgEl.style.left = state.l + 'px';
      imgEl.style.top = state.t + 'px';
    }
    function containerSize() {
      return { w: bg.offsetWidth, h: bg.offsetHeight };
    }
    function fitCover(posX, posY) {
      const c = containerSize();
      const l = computeCoverLayout(c.w, c.h, state.naturalW, state.naturalH, posX != null ? posX : 50, posY != null ? posY : 50);
      state.w = l.w; state.h = l.h; state.l = l.l; state.t = l.t;
      state.fit = 'cover';
      bg.style.backgroundColor = '';
      applyPosition();
    }
    function fitContain() {
      const c = containerSize();
      const l = computeContainLayout(c.w, c.h, state.naturalW, state.naturalH);
      state.w = l.w; state.h = l.h; state.l = l.l; state.t = l.t;
      state.fit = 'contain';
      bg.style.backgroundColor = '#fff';
      applyPosition();
    }
    function initLayout() {
      state.naturalW = imgEl.naturalWidth || 1;
      state.naturalH = imgEl.naturalHeight || 1;
      if (state.fit === 'contain') fitContain();
      else fitCover(initial.posX, initial.posY);
      applyFilter();
    }
    if (imgEl.complete && imgEl.naturalWidth) initLayout();
    else imgEl.addEventListener('load', initLayout, { once: true });

    // ---- arrastrar (reposicionar) / esquina (escalar) ----
    let dragMode = null; // 'pan' | 'scale'
    let startX = 0, startY = 0, start = null;

    function zoomFactor() {
      const zEl = document.getElementById('zoomRange');
      const v = zEl ? parseFloat(zEl.value) : 100;
      return (v || 100) / 100;
    }

    imgEl.addEventListener('mousedown', (e) => {
      if (!bg.classList.contains('editing')) return;
      e.preventDefault();
      e.stopPropagation();
      dragMode = 'pan';
      startX = e.clientX; startY = e.clientY;
      start = { l: state.l, t: state.t };
    });

    const handle = bg.querySelector('.img-edit-handle');
    if (handle) {
      handle.addEventListener('mousedown', (e) => {
        if (!bg.classList.contains('editing')) return;
        e.preventDefault();
        e.stopPropagation();
        dragMode = 'scale';
        startX = e.clientX; startY = e.clientY;
        start = { w: state.w, h: state.h };
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (!dragMode) return;
      const z = zoomFactor();
      const dx = (e.clientX - startX) / z;
      const dy = (e.clientY - startY) / z;
      if (dragMode === 'pan') {
        state.l = start.l + dx;
        state.t = start.t + dy;
        applyPosition();
      } else if (dragMode === 'scale') {
        const aspect = state.naturalW / state.naturalH;
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy * aspect;
        const minSize = 40;
        const newW = Math.max(minSize, start.w + delta);
        state.w = newW;
        state.h = newW / aspect;
        applyPosition();
      }
    });
    document.addEventListener('mouseup', () => {
      dragMode = null;
    });

    bg._editor = {
      setBrightness(v) { state.brightness = v; applyFilter(); },
      setContrast(v) { state.contrast = v; applyFilter(); },
      fitCover() { fitCover(50, 50); },
      fitContain() { fitContain(); },
      reset() {
        state.brightness = 100; state.contrast = 100;
        applyFilter();
        fitCover(50, 50);
      },
      getState() { return state; },
    };
  }

  img2pdfGenBtn.addEventListener('click', () => {
    if (!img2pdfItems.length) return;
    img2pdfItems.forEach((item) => {
      const page = createPage(
        '<div class="img-full-bg" contenteditable="false">' +
          '<img class="img-crop-img" src="' + item.dataUrl + '" draggable="false" alt="">' +
          '<div class="img-edit-handle" title="Arrastra para escalar la imagen"></div>' +
        '</div>'
      );
      page.classList.add('page-image-full');
      const bg = page.querySelector('.img-full-bg');
      const imgEl = bg.querySelector('.img-crop-img');
      setupImageEditor(bg, imgEl, {
        fit: item.fit, posX: item.posX, posY: item.posY,
        brightness: item.brightness, contrast: item.contrast,
      });
    });
    const lastPage = pagesEl.lastElementChild;
    focusPage(lastPage);
    lastPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus(img2pdfItems.length + ' página(s) generadas — usa "Editar imagen" en la barra de herramientas para reajustarlas');
    img2pdfItems = [];
    renderImg2pdfList();
    closeImg2pdfModal();
  });

  /* ---- Botón de toolbar "Editar imagen": reajusta la imagen de una hoja
     ya generada (encuadre + brillo/contraste) sin borrar la hoja ---- */
  const imgEditTrigger     = document.getElementById('imgEditTrigger');
  const imgEditPopover     = document.getElementById('imgEditPopover');
  const imgEditBrightness  = document.getElementById('imgEditBrightness');
  const imgEditContrast    = document.getElementById('imgEditContrast');
  const imgEditBrightVal   = document.getElementById('imgEditBrightVal');
  const imgEditContrastVal = document.getElementById('imgEditContrastVal');
  let editingImagePage = null;

  function closeImageEditor() {
    if (editingImagePage) {
      const bg = editingImagePage.querySelector('.img-full-bg');
      if (bg) bg.classList.remove('editing');
    }
    editingImagePage = null;
    imgEditPopover.classList.remove('show');
    imgEditTrigger.classList.remove('open');
  }

  function openImageEditor(page) {
    closeAllPopovers();
    editingImagePage = page;
    const bg = page.querySelector('.img-full-bg');
    bg.classList.add('editing');
    const st = bg._imgState;
    if (st) {
      imgEditBrightness.value = st.brightness;
      imgEditContrast.value = st.contrast;
      imgEditBrightVal.textContent = st.brightness + '%';
      imgEditContrastVal.textContent = st.contrast + '%';
    }
    imgEditPopover.classList.add('show');
    imgEditTrigger.classList.add('open');
  }

  imgEditTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (editingImagePage) { closeImageEditor(); return; }
    const page = currentPage && currentPage.classList.contains('page-image-full') ? currentPage : null;
    if (!page) { setStatus('Selecciona primero una hoja de imagen (creada con "Convertir imágenes a PDF")'); return; }
    openImageEditor(page);
  });

  imgEditBrightness.addEventListener('input', (e) => {
    if (!editingImagePage) return;
    const v = +e.target.value;
    imgEditBrightVal.textContent = v + '%';
    const bg = editingImagePage.querySelector('.img-full-bg');
    if (bg._editor) bg._editor.setBrightness(v);
  });
  imgEditContrast.addEventListener('input', (e) => {
    if (!editingImagePage) return;
    const v = +e.target.value;
    imgEditContrastVal.textContent = v + '%';
    const bg = editingImagePage.querySelector('.img-full-bg');
    if (bg._editor) bg._editor.setContrast(v);
  });
  document.getElementById('imgEditFitCover').addEventListener('click', () => {
    if (!editingImagePage) return;
    editingImagePage.querySelector('.img-full-bg')._editor.fitCover();
    setStatus('Imagen ajustada a pantalla completa');
  });
  document.getElementById('imgEditFitContain').addEventListener('click', () => {
    if (!editingImagePage) return;
    editingImagePage.querySelector('.img-full-bg')._editor.fitContain();
    setStatus('Imagen ajustada sin recortar');
  });
  document.getElementById('imgEditReset').addEventListener('click', () => {
    if (!editingImagePage) return;
    const bg = editingImagePage.querySelector('.img-full-bg');
    bg._editor.reset();
    imgEditBrightness.value = 100; imgEditContrast.value = 100;
    imgEditBrightVal.textContent = '100%'; imgEditContrastVal.textContent = '100%';
  });

  document.addEventListener('click', (e) => {
    if (!editingImagePage) return;
    if (imgEditPopover.contains(e.target) || e.target === imgEditTrigger || imgEditTrigger.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.img-full-bg.editing')) return;
    closeImageEditor();
  });

  /* ----------------------------------------------------------------------
     BOTÓN "BORRAR" (junto a "Editar imagen"): abre una galería con una
     miniatura de cada página del documento, numeradas en el mismo orden
     en que aparecen (página 1, 2, 3…, aunque el documento tenga cientos
     de hojas — la galería tiene scroll propio). Al tocar "Borrar" en una
     tarjeta se pide confirmación indicando el número exacto de esa
     página antes de eliminarla.
     ---------------------------------------------------------------------- */
  const pageManagerModal = document.getElementById('pageManagerModal');
  const pageManagerGrid = document.getElementById('pageManagerGrid');
  const pageManagerCount = document.getElementById('pageManagerCount');
  const btnDeletePagesManager = document.getElementById('btnDeletePagesManager');
  const pageDeleteConfirmModal = document.getElementById('pageDeleteConfirmModal');
  const pageDeleteConfirmText = document.getElementById('pageDeleteConfirmText');
  const pageDeleteConfirmAccept = document.getElementById('pageDeleteConfirmAccept');
  const pageDeleteConfirmCancel = document.getElementById('pageDeleteConfirmCancel');

  const PM_THUMB_WIDTH = 168; // ancho fijo (px) de cada miniatura en la galería

  function buildPageManagerThumb(page) {
    const w = page.offsetWidth || page.getBoundingClientRect().width || 1;
    const h = page.offsetHeight || page.getBoundingClientRect().height || 1;
    const scale = PM_THUMB_WIDTH / w;
    const thumbH = Math.round(h * scale);

    const frame = document.createElement('div');
    frame.className = 'pm-thumb-frame';
    frame.style.height = thumbH + 'px';

    const inner = page.cloneNode(true);
    inner.removeAttribute('contenteditable');
    inner.removeAttribute('data-page-id');
    inner.className = page.className; // conserva tamaño/textura/orientación
    inner.classList.add('pm-thumb-inner');
    inner.style.width = w + 'px';
    inner.style.height = h + 'px';
    inner.style.transform = 'scale(' + scale + ')';
    inner.style.transformOrigin = 'top left';
    inner.style.outline = 'none';
    inner.style.pointerEvents = 'none';

    frame.appendChild(inner);
    return frame;
  }

  function renderPageManagerGrid() {
    const pages = Array.from(pagesEl.children);
    pageManagerGrid.innerHTML = '';
    pageManagerCount.textContent = pages.length + (pages.length === 1 ? ' página' : ' páginas');

    pages.forEach((page, idx) => {
      const num = idx + 1;
      const card = document.createElement('div');
      card.className = 'pm-card';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'pm-thumb-wrap';
      thumbWrap.appendChild(buildPageManagerThumb(page));

      const label = document.createElement('div');
      label.className = 'pm-label';
      label.textContent = 'Página ' + num;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'pm-delete-btn';
      delBtn.textContent = '🗑 Borrar';
      delBtn.addEventListener('click', () => requestPageDeletion(num));

      card.appendChild(thumbWrap);
      card.appendChild(label);
      card.appendChild(delBtn);
      pageManagerGrid.appendChild(card);
    });
  }

  function openPageManagerModal() {
    closeAllPopovers();
    if (!pagesEl.children.length) { setStatus('No hay páginas en el documento'); return; }
    renderPageManagerGrid();
    pageManagerModal.classList.add('show');
  }
  function closePageManagerModal() {
    pageManagerModal.classList.remove('show');
    pageManagerGrid.innerHTML = ''; // libera las miniaturas clonadas
  }

  btnDeletePagesManager.addEventListener('click', openPageManagerModal);
  document.getElementById('pageManagerClose').addEventListener('click', closePageManagerModal);
  pageManagerModal.addEventListener('click', (e) => { if (e.target === pageManagerModal) closePageManagerModal(); });

  let pendingDeletePageNumber = null;

  function requestPageDeletion(num) {
    if (pagesEl.children.length <= 1) {
      setStatus('Debe quedar al menos una página en el documento');
      return;
    }
    pendingDeletePageNumber = num;
    pageDeleteConfirmText.textContent = '¿Estás seguro que deseas borrar la página número ' + num + '? Esta acción no se puede deshacer.';
    pageDeleteConfirmModal.classList.add('show');
  }
  function closeDeleteConfirmModal() {
    pageDeleteConfirmModal.classList.remove('show');
    pendingDeletePageNumber = null;
  }
  pageDeleteConfirmCancel.addEventListener('click', closeDeleteConfirmModal);
  document.getElementById('pageDeleteConfirmClose').addEventListener('click', closeDeleteConfirmModal);
  pageDeleteConfirmModal.addEventListener('click', (e) => { if (e.target === pageDeleteConfirmModal) closeDeleteConfirmModal(); });

  pageDeleteConfirmAccept.addEventListener('click', () => {
    if (!pendingDeletePageNumber) return;
    const pages = Array.from(pagesEl.children);
    const target = pages[pendingDeletePageNumber - 1];
    const deletedNum = pendingDeletePageNumber;
    if (target) {
      const wasCurrent = target === currentPage;
      target.remove();
      refreshPageLabels();
      if (wasCurrent || !pagesEl.contains(currentPage)) {
        const fallback = pagesEl.lastElementChild;
        if (fallback) focusPage(fallback);
      }
      setStatus('Página ' + deletedNum + ' eliminada');
    }
    closeDeleteConfirmModal();
    if (pagesEl.children.length) renderPageManagerGrid();
    else closePageManagerModal();
  });

  /* ----------------------------------------------------------------------
     IMPORTAR PDF / POWERPOINT / WORD
     Carga librerías externas solo cuando hacen falta (no se agregan al
     <head> del documento para no ralentizar la carga inicial):
       - PDF.js (Mozilla)  → abrir un PDF existente y convertir cada
         página en una hoja "page-image-full" editable con el mismo motor
         de arrastrar/escalar de "Convertir imágenes a PDF" (además, al
         ser hojas normales del editor, se les puede escribir encima,
         tapar zonas, poner sellos, etc.).
       - JSZip              → leer el .pptx (es un .zip) y extraer el
         texto y las imágenes de cada diapositiva.
       - Mammoth.js         → convertir un .docx a HTML manteniendo
         párrafos, títulos e imágenes, listo para paginar en el editor.
     En los tres casos el resultado son hojas normales del editor: se
     pueden seguir editando con el toolbar de siempre y exportarse como
     PDF con el botón "Exportar PDF" de arriba.
     ---------------------------------------------------------------------- */
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-heri-lib="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') { resolve(); return; }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('No se pudo cargar ' + src)));
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.dataset.heriLib = src;
      s.onload = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  let pdfjsLibPromise = null;
  function loadPdfJs() {
    if (!pdfjsLibPromise) {
      pdfjsLibPromise = import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.1.200/pdf.min.mjs').then((mod) => {
        mod.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.1.200/pdf.worker.min.mjs';
        return mod;
      });
    }
    return pdfjsLibPromise;
  }
  let jsZipPromise = null;
  function loadJSZip() {
    if (!jsZipPromise) {
      jsZipPromise = loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').then(() => window.JSZip);
    }
    return jsZipPromise;
  }
  let mammothLibPromise = null;
  function loadMammothLib() {
    if (!mammothLibPromise) {
      mammothLibPromise = loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.11.0/mammoth.browser.min.js').then(() => window.mammoth);
    }
    return mammothLibPromise;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Reparte nodos de un HTML largo en varias hojas nuevas, respetando la
  // altura de página (para documentos de varias páginas, ej. un Word de
  // 20 hojas con imágenes). No divide un párrafo o imagen a la mitad:
  // si un bloque no cabe, pasa entero a la siguiente hoja.
  function paginateHtmlIntoPages(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const nodes = Array.from(temp.childNodes).filter((n) => !(n.nodeType === 3 && !n.textContent.trim()));
    let page = createPage(' ');
    page.innerHTML = '';
    let pagesCreated = 1;
    nodes.forEach((node) => {
      page.appendChild(node);
      if (page.scrollHeight > page.clientHeight + 2) {
        if (page.childNodes.length > 1) {
          page.removeChild(node);
          page = createPage(' ');
          page.innerHTML = '';
          page.appendChild(node);
          pagesCreated += 1;
        }
        // si es el único nodo y ya desborda (ej. una imagen enorme), se
        // deja tal cual: es preferible que sobresalga a perder contenido
      }
    });
    if (!page.childNodes.length) page.innerHTML = '<p><br></p>';
    return pagesCreated;
  }

  /* ---- Visor de PDF (carga páginas como imágenes editables/anotables) ---- */
  const pdfImportInput = document.getElementById('pdfImportInput');
  document.getElementById('tplPdfImport').addEventListener('click', () => pdfImportInput.click());
  pdfImportInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    toggleLoading(true, 'Cargando el lector de PDF…');
    try {
      const pdfjsLib = await loadPdfJs();
      toggleLoading(true, 'Leyendo el PDF…');
      const buffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

      const firstVp = (await pdfDoc.getPage(1)).getViewport({ scale: 1 });
      docOrientation = firstVp.width > firstVp.height ? 'landscape' : 'portrait';
      pageOrientSel.value = docOrientation;

      const firstNewPage = pagesEl.children.length;
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        toggleLoading(true, 'Renderizando página ' + i + ' de ' + pdfDoc.numPages + '…');
        const pdfPage = await pdfDoc.getPage(i);
        const viewport = pdfPage.getViewport({ scale: 2.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');

        const page = createPage(
          '<div class="img-full-bg" contenteditable="false">' +
            '<img class="img-crop-img" src="' + dataUrl + '" draggable="false" alt="">' +
            '<div class="img-edit-handle" title="Arrastra para escalar la imagen"></div>' +
          '</div>'
        );
        page.classList.add('page-image-full');
        const bg = page.querySelector('.img-full-bg');
        const imgEl = bg.querySelector('.img-crop-img');
        setupImageEditor(bg, imgEl, { fit: 'contain', posX: 50, posY: 50, brightness: 100, contrast: 100 });
      }
      const targetPage = pagesEl.children[firstNewPage] || pagesEl.lastElementChild;
      focusPage(targetPage);
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('PDF cargado (' + pdfDoc.numPages + ' página[s]) — usa "Editar imagen" para reencuadrar, o escribe/agrega elementos encima');
    } catch (err) {
      console.error(err);
      alert('No se pudo abrir el PDF. Verifica tu conexión a internet, o que el archivo no esté dañado o protegido con contraseña.');
    } finally {
      toggleLoading(false);
    }
  });

  /* ---- Cargar PowerPoint y exportar ---- */
  const pptxImportInput = document.getElementById('pptxImportInput');
  document.getElementById('tplPptxImport').addEventListener('click', () => pptxImportInput.click());
  pptxImportInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    toggleLoading(true, 'Cargando el lector de PowerPoint…');
    try {
      const JSZip = await loadJSZip();
      toggleLoading(true, 'Leyendo la presentación…');
      const zip = await JSZip.loadAsync(file);
      const slideFiles = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => (+a.match(/slide(\d+)\.xml/)[1]) - (+b.match(/slide(\d+)\.xml/)[1]));
      if (!slideFiles.length) throw new Error('El archivo no contiene diapositivas reconocibles');

      const parser = new DOMParser();
      const firstNewPage = pagesEl.children.length;
      docOrientation = 'landscape'; // las diapositivas son horizontales por defecto
      pageOrientSel.value = docOrientation;

      for (let i = 0; i < slideFiles.length; i++) {
        toggleLoading(true, 'Convirtiendo diapositiva ' + (i + 1) + ' de ' + slideFiles.length + '…');
        const slidePath = slideFiles[i];
        const xmlDoc = parser.parseFromString(await zip.file(slidePath).async('text'), 'application/xml');
        const paragraphs = Array.from(xmlDoc.getElementsByTagName('a:p'))
          .map((p) => Array.from(p.getElementsByTagName('a:t')).map((t) => t.textContent).join(''))
          .filter((t) => t.trim().length);

        // imágenes de la diapositiva (vía su archivo de relaciones)
        const relsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
        const imageDataUrls = [];
        if (zip.file(relsPath)) {
          const relsXml = parser.parseFromString(await zip.file(relsPath).async('text'), 'application/xml');
          const imageRels = Array.from(relsXml.getElementsByTagName('Relationship'))
            .filter((r) => /image/i.test(r.getAttribute('Type') || ''));
          for (const rel of imageRels) {
            const target = rel.getAttribute('Target') || '';
            const mediaPath = 'ppt/' + target.replace(/^(\.\.\/)+/, '');
            const mediaFile = zip.file(mediaPath);
            if (!mediaFile) continue;
            const base64 = await mediaFile.async('base64');
            let ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
            if (ext === 'jpg') ext = 'jpeg';
            if (ext === 'emf' || ext === 'wmf') continue; // formatos vectoriales de Office, no renderizables como <img>
            imageDataUrls.push('data:image/' + ext + ';base64,' + base64);
          }
        }

        let html = '';
        if (paragraphs.length) {
          html += '<p class="tpl-title" style="font-size:24px;">' + escapeHtml(paragraphs[0]) + '</p>';
          paragraphs.slice(1).forEach((p) => { html += '<p>' + escapeHtml(p) + '</p>'; });
        }
        imageDataUrls.forEach((src) => {
          html += '<div class="img-wrap" style="width:320px;height:220px;"><img src="' + src + '" draggable="false"></div>';
        });
        if (!html) html = '<p><br></p>';

        createPage(html);
      }
      const targetPage = pagesEl.children[firstNewPage] || pagesEl.lastElementChild;
      focusPage(targetPage);
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('Presentación cargada (' + slideFiles.length + ' diapositiva[s]) — edítala y expórtala como PDF');
    } catch (err) {
      console.error(err);
      alert('No se pudo abrir el archivo .pptx. Verifica tu conexión a internet, o que el archivo no esté dañado.\n\nNota: el texto y las imágenes se recuperan e insertan como hojas editables; el diseño exacto original de las diapositivas no se reproduce pixel por pixel.');
    } finally {
      toggleLoading(false);
    }
  });

  /* ---- Cargar Word y exportar ---- */
  const docxImportInput = document.getElementById('docxImportInput');
  document.getElementById('tplDocxImport').addEventListener('click', () => docxImportInput.click());
  docxImportInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    toggleLoading(true, 'Cargando el lector de Word…');
    try {
      const mammothLib = await loadMammothLib();
      toggleLoading(true, 'Convirtiendo el documento…');
      const buffer = await file.arrayBuffer();
      const result = await mammothLib.convertToHtml(
        { arrayBuffer: buffer },
        { convertImage: mammothLib.images.imgElement((image) =>
            image.read('base64').then((data) => ({ src: 'data:' + image.contentType + ';base64,' + data }))
          ) }
      );
      docOrientation = 'portrait';
      pageOrientSel.value = docOrientation;
      const firstNewPage = pagesEl.children.length;
      toggleLoading(true, 'Paginando el contenido…');
      const pagesCreated = paginateHtmlIntoPages(result.value);
      const targetPage = pagesEl.children[firstNewPage] || pagesEl.lastElementChild;
      focusPage(targetPage);
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const warn = result.messages && result.messages.length ? ' (algunos estilos avanzados del Word no se conservan)' : '';
      setStatus('Word cargado — ' + pagesCreated + ' página(s) generadas' + warn);
    } catch (err) {
      console.error(err);
      alert('No se pudo abrir el archivo .docx. Verifica tu conexión a internet, o que el archivo no esté dañado.');
    } finally {
      toggleLoading(false);
    }
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

     NOTA IMPORTANTE — por qué existe el bloque "APLANADO DE EFECTOS":
     Los efectos de texto tipo gradiente (Tornasol, Dorado, Plata, Fuego,
     Cromo, etc.) se pintan en pantalla con `background-clip:text` +
     `color:transparent` — el navegador "recorta" el gradiente con la forma
     de las letras. html2canvas NO soporta `background-clip:text`: pinta el
     gradiente como un rectángulo sólido sobre toda la caja del texto (y
     como el color es transparente, las letras reales no se ven), lo que
     produce exactamente esas "barras" de color sin texto que se ven en el
     PDF exportado. Lo mismo pasa con el efecto "Contorno", que usa
     `color:transparent` + `-webkit-text-stroke`.

     La solución: justo antes de capturar cada página con html2canvas,
     trabajamos sobre una COPIA de la página (fuera de pantalla, la hoja
     real que el usuario edita nunca se toca) y "revelamos" cada uno de
     esos textos dibujándolo nosotros mismos en un <canvas> 2D (que sí
     soporta gradientes en texto y trazos), línea por línea tal como
     quedó compuesto en pantalla, y lo insertamos como una imagen en el
     mismo lugar exacto. Así html2canvas ya no ve un texto con
     background-clip, ve una imagen normal — y el efecto se conserva en
     el PDF final tal como se ve en el editor.
     ---------------------------------------------------------------------- */
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');

  function toggleLoading(show, text) {
    loadingOverlay.classList.toggle('show', show);
    if (text) loadingText.textContent = text;
  }

  /* ---- APLANADO DE EFECTOS DE TEXTO PARA EXPORTACIÓN ---- */
  const FX_RASTER_SCALE = 4; // resolución interna del canvas por línea (nitidez)

  function collectTextNodes(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function mapGlobalIndex(nodes, globalIndex) {
    let remaining = globalIndex;
    for (const node of nodes) {
      const len = node.textContent.length;
      if (remaining <= len) return { node, offset: remaining };
      remaining -= len;
    }
    const last = nodes[nodes.length - 1];
    return { node: last, offset: last ? last.textContent.length : 0 };
  }

  // Divide el contenido de un elemento en sus líneas visuales reales
  // (tal como el navegador las compuso), cada una con su propio rect.
  function splitElementIntoVisualLines(el) {
    const nodes = collectTextNodes(el);
    if (!nodes.length) return [];
    const fullText = nodes.map((n) => n.textContent).join('');
    if (!fullText.trim()) return [];
    const range = document.createRange();
    const lines = [];
    let lineStart = 0;
    let lastTop = null;
    const total = fullText.length;
    for (let i = 1; i <= total; i++) {
      const startPos = mapGlobalIndex(nodes, lineStart);
      const endPos = mapGlobalIndex(nodes, i);
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
      const rects = range.getClientRects();
      const r = rects[rects.length - 1];
      if (!r) continue;
      if (lastTop === null) lastTop = r.top;
      if (Math.abs(r.top - lastTop) > 1 && i > lineStart + 1) {
        const cutStart = mapGlobalIndex(nodes, lineStart);
        const cutEnd = mapGlobalIndex(nodes, i - 1);
        range.setStart(cutStart.node, cutStart.offset);
        range.setEnd(cutEnd.node, cutEnd.offset);
        const lineRects = range.getClientRects();
        const lineRect = lineRects[0];
        if (lineRect) lines.push({ text: fullText.slice(lineStart, i - 1), rect: lineRect });
        lineStart = i - 1;
        lastTop = null;
      }
    }
    const lastStart = mapGlobalIndex(nodes, lineStart);
    const lastEnd = mapGlobalIndex(nodes, total);
    range.setStart(lastStart.node, lastStart.offset);
    range.setEnd(lastEnd.node, lastEnd.offset);
    const lastRects = range.getClientRects();
    if (lastRects.length) lines.push({ text: fullText.slice(lineStart), rect: lastRects[0] });
    return lines;
  }

  // Interpreta el valor ya resuelto de `background-image` (linear-gradient
  // o repeating-linear-gradient con colores en rgb()/rgba()/hex) devuelto
  // por getComputedStyle, para poder reconstruirlo con la Canvas API.
  function parseResolvedLinearGradient(bgImage) {
    const m = bgImage.match(/(repeating-)?linear-gradient\(([^)]+)\)/);
    if (!m) return null;
    const inner = m[2];
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of inner) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    if (!parts.length) return null;

    let angleDeg = 180;
    let stopParts = parts;
    const angleMatch = parts[0].match(/^(-?\d+(?:\.\d+)?)deg$/);
    if (angleMatch) { angleDeg = parseFloat(angleMatch[1]); stopParts = parts.slice(1); }

    const stops = [];
    stopParts.forEach((p) => {
      const cm = p.match(/^(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s*(-?\d+(?:\.\d+)?%)?$/);
      if (!cm) return;
      stops.push({ color: cm[1], pos: cm[2] ? parseFloat(cm[2]) / 100 : null });
    });
    if (!stops.length) return null;
    stops.forEach((s, i) => {
      if (s.pos === null) {
        if (i === 0) s.pos = 0;
        else if (i === stops.length - 1) s.pos = 1;
        else s.pos = i / (stops.length - 1);
      }
    });
    return { angleDeg, stops };
  }

  // Vector de la línea de gradiente para un ángulo CSS (0deg = hacia
  // arriba, sentido horario) dentro de una caja w×h — misma fórmula que
  // usan los navegadores para `linear-gradient(<angle>, ...)`.
  function gradientLineVector(angleDeg, w, h) {
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const len = Math.abs((w / 2) * dx) + Math.abs((h / 2) * dy);
    const cx = w / 2, cy = h / 2;
    return [cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len];
  }

  function rasterizeFxLine(text, cs, width, height, isGradient, isStroke, strokeWidthPx) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * FX_RASTER_SCALE));
    canvas.height = Math.max(1, Math.ceil(height * FX_RASTER_SCALE));
    const ctx = canvas.getContext('2d');
    ctx.scale(FX_RASTER_SCALE, FX_RASTER_SCALE);
    ctx.font = [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(' ');
    ctx.textBaseline = 'alphabetic';
    try {
      if (cs.letterSpacing && cs.letterSpacing !== 'normal') ctx.letterSpacing = cs.letterSpacing;
    } catch (e) { /* letterSpacing en canvas no soportado en algunos navegadores: se ignora */ }

    const fontSizePx = parseFloat(cs.fontSize) || 16;
    const baselineY = height - (height - fontSizePx) / 2 - fontSizePx * 0.22;

    if (isGradient) {
      const parsed = parseResolvedLinearGradient(cs.backgroundImage);
      if (parsed) {
        const [x0, y0, x1, y1] = gradientLineVector(parsed.angleDeg, width, height);
        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        parsed.stops.forEach((s) => grad.addColorStop(Math.min(1, Math.max(0, s.pos)), s.color));
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#c08a45';
      }
      ctx.fillText(text, 0, baselineY);
    }
    if (isStroke) {
      ctx.lineWidth = strokeWidthPx || 1.4;
      ctx.strokeStyle = cs.getPropertyValue('-webkit-text-stroke-color') || cs.getPropertyValue('text-stroke-color') || '#c08a45';
      ctx.strokeText(text, 0, baselineY);
    }
    return canvas.toDataURL('image/png');
  }

  function replaceElementWithRasterLines(el, cs, isGradient, isStroke, strokeWidthPx) {
    const lines = splitElementIntoVisualLines(el);
    if (!lines.length) return;
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-fx-flattened', '1');
    wrapper.style.display = 'inline';
    let appended = 0;
    lines.forEach((line) => {
      const w = line.rect.width, h = line.rect.height;
      if (w <= 0 || h <= 0 || !line.text) return;
      const dataUrl = rasterizeFxLine(line.text, cs, w, h, isGradient, isStroke, strokeWidthPx);
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      img.style.display = 'inline-block';
      img.style.verticalAlign = 'middle';
      wrapper.appendChild(img);
      appended++;
    });
    if (appended) el.replaceWith(wrapper);
  }

  // Recorre una copia de la página buscando cualquier elemento pintado con
  // `background-clip:text` (todos los efectos con gradiente: Tornasol,
  // Dorado, Plata, Fuego, Cromo, Arcoíris, etc.) o con `-webkit-text-stroke`
  // + color transparente (efecto Contorno), y lo reemplaza por su versión
  // rasterizada antes de que html2canvas capture la página.
  async function flattenSpecialTextForExport(root) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const candidates = Array.from(root.querySelectorAll('*'));
    for (const el of candidates) {
      if (!root.contains(el)) continue; // ya reemplazado como parte de un elemento padre
      const cs = getComputedStyle(el);
      const clip = cs.getPropertyValue('-webkit-background-clip') || cs.getPropertyValue('background-clip');
      const bgImage = cs.getPropertyValue('background-image');
      const isGradient = clip.trim() === 'text' && bgImage && bgImage !== 'none';
      const strokeWidthPx = parseFloat(
        cs.getPropertyValue('-webkit-text-stroke-width') || cs.getPropertyValue('text-stroke-width') || '0'
      ) || 0;
      const isStroke = strokeWidthPx > 0 && cs.getPropertyValue('color').replace(/\s+/g, '') === 'rgba(0,0,0,0)';
      if (!isGradient && !isStroke) continue;
      try {
        replaceElementWithRasterLines(el, cs, isGradient, isStroke, strokeWidthPx);
      } catch (err) {
        console.warn('No se pudo aplanar un efecto de texto para la exportación:', err);
      }
    }
  }

  async function exportPDF() {
    const pages = Array.from(pagesEl.querySelectorAll('.page'));
    if (!pages.length) return;

    if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      alert('No se pudieron cargar las librerías de exportación (html2canvas / jsPDF). Verifica tu conexión a internet.');
      return;
    }

    toggleLoading(true, 'Preparando documento…');

    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const { jsPDF } = window.jspdf;
      const format = docPageSize === 'carta' ? 'letter' : 'a4';
      const baseDims = docPageSize === 'carta' ? { w: 216, h: 279 } : { w: 210, h: 297 };
      const orientation = docOrientation === 'landscape' ? 'landscape' : 'portrait';
      const dims = orientation === 'landscape'
        ? { w: baseDims.h, h: baseDims.w }
        : baseDims;
      const doc = new jsPDF({ unit: 'mm', format, orientation });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        loadingText.textContent = 'Renderizando página ' + (i + 1) + ' de ' + pages.length + '…';

        // Trabajamos sobre una copia fuera de pantalla: la hoja real que
        // el usuario está editando nunca se modifica ni parpadea.
        const clone = page.cloneNode(true);
        clone.removeAttribute('contenteditable');
        clone.classList.add('exporting');
        clone.style.position = 'fixed';
        clone.style.left = '-99999px';
        clone.style.top = '0';
        clone.style.margin = '0';
        clone.style.outline = 'none';
        document.body.appendChild(clone);

        await flattenSpecialTextForExport(clone);

        const canvas = await window.html2canvas(clone, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: clone.scrollWidth,
          windowHeight: clone.scrollHeight,
        });

        document.body.removeChild(clone);

        const imgData = canvas.toDataURL('image/png', 1.0);
        if (i > 0) doc.addPage(format, orientation);
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
      document.querySelectorAll('body > .page.exporting').forEach((p) => p.remove());
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
