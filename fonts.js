/* =========================================================================
   HERI PDF — CATÁLOGO DE FUENTES
   Archivo independiente y ampliable. Para agregar una fuente nueva basta con
   añadir un objeto al arreglo HERI_FONTS de abajo (name, css, category,
   weights). El sistema construye automáticamente la URL de Google Fonts,
   inyecta el <link> necesario y genera el <select> de tipografías del
   toolbar y la galería del panel "Fuentes" del sidebar a partir de este
   mismo archivo — un solo lugar de verdad para todo el editor.
   ========================================================================= */
(() => {
  'use strict';

  // category: 'serif' | 'sans' | 'display' | 'script' | 'mono' | 'slab'
  const HERI_FONTS = [
    // ---- SERIF ----
    { name: 'Lora', css: "'Lora', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Playfair Display', css: "'Playfair Display', serif", category: 'serif', weights: '400;600;700;900' },
    { name: 'Merriweather', css: "'Merriweather', serif", category: 'serif', weights: '400;700;900' },
    { name: 'Fraunces', css: "'Fraunces', serif", category: 'serif', weights: '400;600;700' },
    { name: 'EB Garamond', css: "'EB Garamond', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Cormorant Garamond', css: "'Cormorant Garamond', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Crimson Text', css: "'Crimson Text', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Libre Baskerville', css: "'Libre Baskerville', serif", category: 'serif', weights: '400;700' },
    { name: 'PT Serif', css: "'PT Serif', serif", category: 'serif', weights: '400;700' },
    { name: 'Source Serif 4', css: "'Source Serif 4', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Noto Serif', css: "'Noto Serif', serif", category: 'serif', weights: '400;700' },
    { name: 'Bitter', css: "'Bitter', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Vollkorn', css: "'Vollkorn', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Spectral', css: "'Spectral', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Cardo', css: "'Cardo', serif", category: 'serif', weights: '400;700' },
    { name: 'Domine', css: "'Domine', serif", category: 'serif', weights: '400;700' },
    { name: 'Alegreya', css: "'Alegreya', serif", category: 'serif', weights: '400;600;700' },
    { name: 'Gelasio', css: "'Gelasio', serif", category: 'serif', weights: '400;700' },

    // ---- SANS ----
    { name: 'Inter', css: "'Inter', sans-serif", category: 'sans', weights: '400;500;600;700' },
    { name: 'Montserrat', css: "'Montserrat', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Poppins', css: "'Poppins', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Raleway', css: "'Raleway', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Open Sans', css: "'Open Sans', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Roboto', css: "'Roboto', sans-serif", category: 'sans', weights: '400;500;700' },
    { name: 'Lato', css: "'Lato', sans-serif", category: 'sans', weights: '400;700' },
    { name: 'Nunito', css: "'Nunito', sans-serif", category: 'sans', weights: '400;700;800' },
    { name: 'Work Sans', css: "'Work Sans', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Manrope', css: "'Manrope', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Karla', css: "'Karla', sans-serif", category: 'sans', weights: '400;700' },
    { name: 'Rubik', css: "'Rubik', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Mulish', css: "'Mulish', sans-serif", category: 'sans', weights: '400;700' },
    { name: 'DM Sans', css: "'DM Sans', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Barlow', css: "'Barlow', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Barlow Condensed', css: "'Barlow Condensed', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Sora', css: "'Sora', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Outfit', css: "'Outfit', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Jost', css: "'Jost', sans-serif", category: 'sans', weights: '400;600' },
    { name: 'Assistant', css: "'Assistant', sans-serif", category: 'sans', weights: '400;700' },
    { name: 'Figtree', css: "'Figtree', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Urbanist', css: "'Urbanist', sans-serif", category: 'sans', weights: '400;600;800' },
    { name: 'Space Grotesk', css: "'Space Grotesk', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'IBM Plex Sans', css: "'IBM Plex Sans', sans-serif", category: 'sans', weights: '400;600;700' },
    { name: 'Archivo', css: "'Archivo', sans-serif", category: 'sans', weights: '400;600;800' },

    // ---- DISPLAY / TÍTULOS ----
    { name: 'Oswald', css: "'Oswald', sans-serif", category: 'display', weights: '400;600;700' },
    { name: 'Bebas Neue', css: "'Bebas Neue', sans-serif", category: 'display', weights: '400' },
    { name: 'Abril Fatface', css: "'Abril Fatface', serif", category: 'display', weights: '400' },
    { name: 'Anton', css: "'Anton', sans-serif", category: 'display', weights: '400' },
    { name: 'Archivo Black', css: "'Archivo Black', sans-serif", category: 'display', weights: '400' },
    { name: 'Bungee', css: "'Bungee', sans-serif", category: 'display', weights: '400' },
    { name: 'Righteous', css: "'Righteous', sans-serif", category: 'display', weights: '400' },
    { name: 'Alfa Slab One', css: "'Alfa Slab One', serif", category: 'display', weights: '400' },
    { name: 'Passion One', css: "'Passion One', sans-serif", category: 'display', weights: '400;700;900' },
    { name: 'Fjalla One', css: "'Fjalla One', sans-serif", category: 'display', weights: '400' },
    { name: 'Staatliches', css: "'Staatliches', sans-serif", category: 'display', weights: '400' },
    { name: 'Big Shoulders Display', css: "'Big Shoulders Display', sans-serif", category: 'display', weights: '400;700;900' },
    { name: 'Cinzel', css: "'Cinzel', serif", category: 'display', weights: '400;600;700' },
    { name: 'Cinzel Decorative', css: "'Cinzel Decorative', serif", category: 'display', weights: '400;700' },
    { name: 'Marcellus', css: "'Marcellus', serif", category: 'display', weights: '400' },
    { name: 'Unica One', css: "'Unica One', sans-serif", category: 'display', weights: '400' },
    { name: 'Monoton', css: "'Monoton', sans-serif", category: 'display', weights: '400' },
    { name: 'Rubik Mono One', css: "'Rubik Mono One', sans-serif", category: 'display', weights: '400' },

    // ---- SCRIPT / MANUSCRITA ----
    { name: 'Pacifico', css: "'Pacifico', cursive", category: 'script', weights: '400' },
    { name: 'Dancing Script', css: "'Dancing Script', cursive", category: 'script', weights: '400;600;700' },
    { name: 'Great Vibes', css: "'Great Vibes', cursive", category: 'script', weights: '400' },
    { name: 'Caveat', css: "'Caveat', cursive", category: 'script', weights: '400;600;700' },
    { name: 'Sacramento', css: "'Sacramento', cursive", category: 'script', weights: '400' },
    { name: 'Satisfy', css: "'Satisfy', cursive", category: 'script', weights: '400' },
    { name: 'Parisienne', css: "'Parisienne', cursive", category: 'script', weights: '400' },
    { name: 'Alex Brush', css: "'Alex Brush', cursive", category: 'script', weights: '400' },
    { name: 'Allura', css: "'Allura', cursive", category: 'script', weights: '400' },
    { name: 'Tangerine', css: "'Tangerine', cursive", category: 'script', weights: '400;700' },
    { name: 'Kalam', css: "'Kalam', cursive", category: 'script', weights: '400;700' },
    { name: 'Shadows Into Light', css: "'Shadows Into Light', cursive", category: 'script', weights: '400' },
    { name: 'Homemade Apple', css: "'Homemade Apple', cursive", category: 'script', weights: '400' },
    { name: 'Cookie', css: "'Cookie', cursive", category: 'script', weights: '400' },
    { name: 'Playball', css: "'Playball', cursive", category: 'script', weights: '400' },
    { name: 'Yellowtail', css: "'Yellowtail', cursive", category: 'script', weights: '400' },
    { name: 'Meddon', css: "'Meddon', cursive", category: 'script', weights: '400' },

    // ---- MONOESPACIADA ----
    { name: 'Courier Prime', css: "'Courier Prime', monospace", category: 'mono', weights: '400;700' },
    { name: 'JetBrains Mono', css: "'JetBrains Mono', monospace", category: 'mono', weights: '400;500;700' },
    { name: 'Roboto Mono', css: "'Roboto Mono', monospace", category: 'mono', weights: '400;700' },
    { name: 'Space Mono', css: "'Space Mono', monospace", category: 'mono', weights: '400;700' },
    { name: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace", category: 'mono', weights: '400;600' },
    { name: 'Fira Code', css: "'Fira Code', monospace", category: 'mono', weights: '400;600' },
    { name: 'Inconsolata', css: "'Inconsolata', monospace", category: 'mono', weights: '400;700' },
    { name: 'Source Code Pro', css: "'Source Code Pro', monospace", category: 'mono', weights: '400;600' },

    // ---- SLAB ----
    { name: 'Roboto Slab', css: "'Roboto Slab', serif", category: 'slab', weights: '400;600;700' },
    { name: 'Zilla Slab', css: "'Zilla Slab', serif", category: 'slab', weights: '400;600;700' },
    { name: 'Arvo', css: "'Arvo', serif", category: 'slab', weights: '400;700' },
    { name: 'Josefin Slab', css: "'Josefin Slab', serif", category: 'slab', weights: '400;600;700' },
    { name: 'Rokkitt', css: "'Rokkitt', serif", category: 'slab', weights: '400;600;700' },
    { name: 'Aleo', css: "'Aleo', serif", category: 'slab', weights: '400;700' },
    { name: 'Bevan', css: "'Bevan', serif", category: 'slab', weights: '400' },
    { name: 'Alfa Slab', css: "'Alfa Slab One', serif", category: 'slab', weights: '400' },
  ];

  const CATEGORY_LABELS = {
    serif: 'Serif', sans: 'Sans', display: 'Display / Títulos',
    script: 'Manuscrita', mono: 'Monoespaciada', slab: 'Slab',
  };

  // ---- Construye la URL de Google Fonts a partir del catálogo y la inyecta ----
  function buildGoogleFontsHref() {
    const families = HERI_FONTS.map((f) => {
      const familyParam = f.name.replace(/\s+/g, '+');
      return 'family=' + familyParam + ':wght@' + f.weights;
    });
    return 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
  }

  function injectFontLink() {
    if (document.getElementById('heriFontsLink')) return;
    const link = document.createElement('link');
    link.id = 'heriFontsLink';
    link.rel = 'stylesheet';
    link.href = buildGoogleFontsHref();
    document.head.appendChild(link);
  }

  injectFontLink();

  window.HERI_FONTS = HERI_FONTS;
  window.HERI_FONT_CATEGORIES = CATEGORY_LABELS;
})();
