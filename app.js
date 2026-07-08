/* =========================================================================
   EDITOR DE DOCUMENTOS — lógica de la aplicación
   100% JavaScript vanilla. Sin frameworks, sin build step.
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

  document.getElementById('fontFamily').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ fontFamily: e.target.value });
    setStatus('Tipografía aplicada');
  });

  document.getElementById('fontSize').addEventListener('change', (e) => {
    wrapSelectionWithStyle({ fontSize: e.target.value + 'pt' });
    setStatus('Tamaño aplicado');
  });

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
     EFECTOS TIPOGRÁFICOS (tornasol, dorado, plata, fuego, neón, 3D…)
     ---------------------------------------------------------------------- */
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

  document.querySelectorAll('.fxbtn').forEach((btn) => {
    btn.addEventListener('click', () => applyEffect(btn.dataset.fx));
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
  document.getElementById('elPagebreak').addEventListener('click', () => {
    const p = createPage();
    focusPage(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

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
