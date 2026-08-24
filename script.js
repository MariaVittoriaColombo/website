// ============================================
// FOTO IN HOMEPAGE — UNA ALLA VOLTA, STILE DVD
// Una sola foto è visibile e si muove come il classico logo
// del DVD sulla vecchia TV: rimbalza sui bordi. Ogni volta che
// tocca un bordo, invece di continuare a rimbalzare, cambia
// foto/progetto (passa al successivo). Si può comunque
// trascinare liberamente (mette in pausa il rimbalzo, riparte
// al rilascio) e un click "fermo" apre la pagina del progetto.
// ============================================
const projectBlocks = Array.from(document.querySelectorAll('.project-block'));
const paintCanvas = document.getElementById('paintCanvas'); // il DVD rimbalza qui dentro
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// su mobile il canvas è piccolo: alla stessa velocità del desktop la
// foto rimbalzerebbe da un bordo all'altro troppo in fretta, quindi
// rallentiamo il movimento sotto i 700px
const isSmallViewport = window.matchMedia('(max-width: 700px)').matches;
const dvdSpeed = isSmallViewport ? 0.18 : 1;
const floatMargin = 4; // piccolo margine dai bordi del canvas

let topZ = 10;
let activeIndex = 0;
let posX = 80;
let posY = 200;
let velX = 3.4 * dvdSpeed;
let velY = 2.6 * dvdSpeed;

function showOnly(index) {
  projectBlocks.forEach((block, i) => {
    block.classList.toggle('is-float-hidden', i !== index);
  });
}

projectBlocks.forEach((block, i) => {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = 0;

  // memorizza la rotazione originale per poterla ripristinare
  // quando si esce dalla vista filtrata (griglia ferma)
  block.dataset.origTransform = block.style.transform || '';

  // i link <a> sono trascinabili di default dal browser (drag nativo
  // per creare un bookmark): lo blocchiamo per lasciare campo libero
  // al nostro drag via pointer events.
  block.addEventListener('dragstart', (e) => e.preventDefault());

  block.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = parseFloat(block.style.left) || 0;
    originTop = parseFloat(block.style.top) || 0;
    block.style.zIndex = ++topZ;
    block.classList.add('is-dragging');
    block.setPointerCapture(e.pointerId);
  });

  block.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    const newLeft = originLeft + dx;
    const newTop = originTop + dy;
    block.style.left = `${newLeft}px`;
    block.style.top = `${newTop}px`;
    // se è la foto attiva del rimbalzo, sincronizza la posizione
    // così il DVD riparte da dove l'hai lasciata
    if (i === activeIndex) {
      posX = newLeft;
      posY = newTop;
    }
  });

  function endDrag() {
    dragging = false;
    block.classList.remove('is-dragging');
  }

  block.addEventListener('pointerup', endDrag);
  block.addEventListener('pointercancel', endDrag);

  // se il puntatore si è spostato oltre una piccola soglia,
  // era un drag: non seguire il link del progetto
  block.addEventListener('click', (e) => {
    if (moved > 6) e.preventDefault();
  });
});

if (paintCanvas && projectBlocks.length && !prefersReducedMotion) {
  showOnly(activeIndex);

  function tick() {
    const active = projectBlocks[activeIndex];

    if (!active.classList.contains('is-dragging')) {
      const canvasRect = paintCanvas.getBoundingClientRect();
      const w = active.offsetWidth;
      const h = active.offsetHeight;

      // se la foto (o il canvas) non hanno ancora una dimensione reale
      // — foto ancora in caricamento, tipico su rete mobile lenta —
      // saltiamo il frame invece di calcolare i rimbalzi su misure a
      // 0px: altrimenti il movimento "impazzisce" per un istante e poi
      // scatta di colpo appena la foto finisce di caricare (il glitch)
      const isReady = canvasRect.width > 0 && canvasRect.height > 0 && w > 0 && h > 0;

      if (isReady) {
        const maxLeft = Math.max(floatMargin, canvasRect.width - w - floatMargin);
        const maxTop = Math.max(floatMargin, canvasRect.height - h - floatMargin);

        posX += velX;
        posY += velY;

        let bounced = false;
        if (posX <= floatMargin || posX >= maxLeft) {
          velX *= -1;
          posX = Math.min(Math.max(posX, floatMargin), maxLeft);
          bounced = true;
        }
        if (posY <= floatMargin || posY >= maxTop) {
          velY *= -1;
          posY = Math.min(Math.max(posY, floatMargin), maxTop);
          bounced = true;
        }

        active.style.left = `${posX}px`;
        active.style.top = `${posY}px`;

        if (bounced) {
          // tocca un bordo: cambia foto invece di continuare a rimbalzare
          activeIndex = (activeIndex + 1) % projectBlocks.length;
          showOnly(activeIndex);
          const next = projectBlocks[activeIndex];
          next.style.left = `${posX}px`;
          next.style.top = `${posY}px`;

          // ...e cambia anche il colore del sito, a meno che l'utente
          // non ne abbia già scelto uno manualmente dalla palette: in
          // quel caso la scelta manuale resta fissa (vedi sezione
          // PALETTE COLORI più sotto per applyAccent/pickRandomAccent)
          if (typeof onBounceChangeAccent === 'function') {
            onBounceChangeAccent();
          }
        }
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ============================================
// MINIATURE DI NAVIGAZIONE (toolbar)
// Ogni miniatura nella toolbar è la foto reale di un progetto.
// Basta passarci sopra il mouse per cambiare subito il progetto
// mostrato nel canvas (hover = navigazione immediata); il click
// fa la stessa cosa, utile su touch dove l'hover non esiste. Il
// DVD continua a muoversi/rimbalzare con la nuova foto da lì in
// poi. Se non si sceglie nulla, continua a cambiare da solo
// (comportamento sopra).
// ============================================
function selectThumb(thumb) {
  const slug = thumb.dataset.slug;
  const index = projectBlocks.findIndex(b => new URL(b.href).searchParams.get('project') === slug);
  if (index === -1 || index === activeIndex) return;

  activeIndex = index;
  showOnly(activeIndex);
  const next = projectBlocks[activeIndex];
  next.style.left = `${posX}px`;
  next.style.top = `${posY}px`;
}

document.querySelectorAll('.thumb-nav-item').forEach(thumb => {
  thumb.addEventListener('mouseenter', () => selectThumb(thumb));
  thumb.addEventListener('click', () => selectThumb(thumb));
});

// Nota: i pulsanti categoria in homepage sono ora link diretti a
// category.html?cat=... (nuova pagina archivio), quindi non serve
// più gestire qui un filtro/lista in pagina.

// ============================================
// PALETTE COLORI INTERATTIVA
// Ricrea la barra colori di Paint, sempre visibile e integrata
// nella finestra. Cliccando uno swatch si cambia davvero il
// colore d'accento del sito (titlebar, evidenziazioni del
// filtro, link della lista "index of"), non è solo decorativa.
// Scelta salvata tra un refresh e l'altro.
// ============================================
const paintPalette = document.getElementById('paintPalette');

const PALETTE_COLORS = [
  '#000000', '#7F7F7F', '#880015', '#B97A57', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
  '#FFFFFF', '#C3C3C3', '#ED1C24', '#FFAEC9', '#FFC90E', '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7',
];

function hexToRgb(hex) {
  const num = parseInt(hex.slice(1), 16);
  return [num >> 16, (num >> 8) & 0xff, num & 0xff];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

let currentAccentHex = null;

function applyAccent(hex) {
  currentAccentHex = hex;
  const solid = luminance(hex) > 0.75 ? darken(hex, 0.45) : hex;
  // testo delle titlebar: nero sui colori chiari (giallo, bianco,
  // pastello...), bianco su quelli scuri — resta sempre leggibile
  const titlebarText = luminance(hex) > 0.55 ? '#000000' : '#ffffff';
  document.documentElement.style.setProperty('--accent-start', hex);
  document.documentElement.style.setProperty('--accent-end', lighten(hex, 0.35));
  document.documentElement.style.setProperty('--accent-solid', solid);
  document.documentElement.style.setProperty('--titlebar-text', titlebarText);
}

// esclude facoltativamente il colore attuale, cosi' il rimbalzo si
// vede sempre cambiare qualcosa invece di ripescare lo stesso colore
function pickRandomAccent(excludeHex) {
  const pool = excludeHex
    ? PALETTE_COLORS.filter(c => c.toUpperCase() !== excludeHex.toUpperCase())
    : PALETTE_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Colore attivo, in ordine di priorità:
// 1) scelta manuale salvata (persiste per sempre, finché non la si
//    ricambia dalla palette) — localStorage
// 2) colore random già scelto in QUESTA visita: resta lo stesso
//    passando tra homepage/categorie/progetti, ma cambia alla
//    prossima apertura del sito — sessionStorage
// 3) altrimenti se ne sceglie uno nuovo a caso dalla palette e si
//    fissa per questa visita
const manualAccent = localStorage.getItem('accentColor');
let activeAccent = manualAccent;
if (!activeAccent) {
  activeAccent = sessionStorage.getItem('sessionAccentColor');
  if (!activeAccent) {
    activeAccent = pickRandomAccent();
    sessionStorage.setItem('sessionAccentColor', activeAccent);
  }
}
applyAccent(activeAccent);

if (paintPalette) {
  PALETTE_COLORS.forEach(hex => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.background = hex;
    btn.title = hex;
    if (hex.toUpperCase() === activeAccent.toUpperCase()) btn.classList.add('active');
    btn.addEventListener('click', () => {
      applyAccent(hex);
      // scelta manuale: da qui in poi resta questa, anche nelle
      // prossime visite, finché non se ne sceglie un'altra
      localStorage.setItem('accentColor', hex);
      paintPalette.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    paintPalette.appendChild(btn);
  });
}

// chiamata dal rimbalzo del DVD (vedi sopra): ad ogni tocco del bordo
// il colore cambia da solo, MA solo finché l'utente non ne ha scelto
// uno a mano dalla palette — in quel caso la scelta manuale resta
// fissa "per l'uso del sito" (localStorage), niente più cambi automatici
function onBounceChangeAccent() {
  if (localStorage.getItem('accentColor')) return;

  const newAccent = pickRandomAccent(currentAccentHex);
  applyAccent(newAccent);
  sessionStorage.setItem('sessionAccentColor', newAccent);

  if (paintPalette) {
    paintPalette.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.title.toUpperCase() === newAccent.toUpperCase());
    });
  }
}

// "Click to change color" e' anche un pulsante: se in precedenza era
// stato scelto un colore a mano (magari solo per provare la palette),
// questo lo dimentica e fa ripartire subito il cambio automatico al
// rimbalzo, senza dover aprire la console del browser
const resetAccentBtn = document.getElementById('resetAccentBtn');
if (resetAccentBtn) {
  resetAccentBtn.addEventListener('click', () => {
    localStorage.removeItem('accentColor');
    if (paintPalette) {
      paintPalette.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    }
    onBounceChangeAccent();
  });
}

// ============================================
// PAGINA ARCHIVIO (category.html)
// Legge ?cat= dalla URL (assets/data/projects.js contiene tutti i
// progetti). A sinistra la lista di quella categoria: hover la
// evidenzia, click carica il contenuto a destra (di default il
// primo progetto della lista). Le immagini sono disposte in un
// mosaico a dimensioni variabili invece che in una griglia uniforme;
// se il progetto ha un video, compare un indicatore cliccabile.
// ============================================
const archiveList = document.getElementById('archiveList');
const archiveContent = document.getElementById('archiveContent');

if (archiveList && archiveContent && typeof PROJECTS !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const currentCat = params.get('cat') || 'production';
  const requestedSlug = params.get('project');
  const items = PROJECTS.filter(p => p.category === currentCat);

  // nome breve mostrato in "Index of /..." — piu' corto dello slug
  // per le categorie con un nome lungo (es. product-material-research)
  const CATEGORY_SHORT_NAME = {
    'production': 'production',
    'product-material-research': 'product-research',
    'photography': 'photography',
  };

  // evidenzia la voce corrente nella barra di navigazione
  document.querySelectorAll('#archiveNavLinks a[data-cat]').forEach(a => {
    a.classList.toggle('active', a.dataset.cat === currentCat);
  });

  function renderList(activeSlug) {
    const rows = items.map(p => (
      `<button type="button" class="list-row${p.slug === activeSlug ? ' active' : ''}" data-slug="${p.slug}">` +
      `<span class="list-row-name">${p.title}</span>` +
      `<span class="list-row-year">${p.year}</span>` +
      `</button>`
    )).join('');

    archiveList.innerHTML =
      `<div class="win-titlebar">` +
      `<span class="win-title">Index of /${CATEGORY_SHORT_NAME[currentCat] || currentCat}</span>` +
      `<span class="win-controls"><span></span><span></span><span></span></span>` +
      `</div>` +
      `<div class="list-window-body">` +
      `<div class="list-row list-row--header"><span>Name</span><span>Year</span></div>` +
      `<div class="list-rows">${rows}</div>` +
      `</div>`;
  }

  const MAX_IMAGES = 10; // limite curato per non appesantire pagine con 40+ foto

  function renderContent(project, showAll) {
    const shownImages = showAll ? project.images : project.images.slice(0, MAX_IMAGES);
    const hiddenCount = project.images.length - shownImages.length;

    // ogni immagine e' di norma solo una stringa (il src), ma puo'
    // anche essere {src, credit} quando serve indicare chi ha
    // scattato quella specifica foto (es. Nike, dove i file erano
    // nominati con il nome del fotografo)
    const imgSrc = entry => (typeof entry === 'string' ? entry : entry.src);
    const imgCredit = entry => (typeof entry === 'string' ? null : entry.credit);

    // solo la primissima foto della galleria carica "eager" (e' quella
    // vicina al titolo, visibile subito); tutte le altre sono "lazy"
    // cosi' il browser non scarica decine di foto che magari non si
    // vedranno mai (utile soprattutto sui progetti con piu' foto, es. B612)
    function imageHtml(entry, eager) {
      const src = imgSrc(entry);
      const credit = imgCredit(entry);
      const loadingAttr = eager ? '' : ' loading="lazy"';
      if (!credit) return `<img src="${src}" alt=""${loadingAttr}>`;
      return (
        `<figure class="archive-photo">` +
        `<img src="${src}" alt=""${loadingAttr}>` +
        `<figcaption class="photo-credit">Photo: ${credit}</figcaption>` +
        `</figure>`
      );
    }

    // il primo paragrafo resta la descrizione generale del progetto,
    // in cima alla pagina come testo semplice (non riquadrato) come
    // era in origine; eventuali paragrafi successivi sono le
    // "specifiche" aggiuntive, quelle sì in piccoli riquadri distribuiti
    // nel mosaico vicino alle foto invece che tutti insieme in alto
    const paragraphs = project.paragraphs || [];
    const mainParagraphHtml = paragraphs.length ? `<p>${paragraphs[0]}</p>` : '';
    const extraParagraphs = paragraphs.slice(1);
    const descBoxHtml = text =>
      `<div class="desc-box"><div class="desc-box-bar"></div><p>${text}</p></div>`;

    const mediaParts = [];
    if (extraParagraphs.length && shownImages.length) {
      const perGroup = Math.max(1, Math.ceil(shownImages.length / extraParagraphs.length));
      let paraIndex = 0;
      shownImages.forEach((entry, i) => {
        mediaParts.push(imageHtml(entry, i === 0));
        const groupEnd = (i + 1) % perGroup === 0;
        const lastImage = i === shownImages.length - 1;
        if ((groupEnd || lastImage) && paraIndex < extraParagraphs.length) {
          mediaParts.push(descBoxHtml(extraParagraphs[paraIndex]));
          paraIndex++;
        }
      });
      while (paraIndex < extraParagraphs.length) {
        mediaParts.push(descBoxHtml(extraParagraphs[paraIndex]));
        paraIndex++;
      }
    } else if (extraParagraphs.length) {
      extraParagraphs.forEach(text => mediaParts.push(descBoxHtml(text)));
    } else {
      shownImages.forEach((entry, i) => mediaParts.push(imageHtml(entry, i === 0)));
    }

    // formato originale, senza ritagliare: ogni foto entra nel
    // mosaico "masonry" alla sua altezza naturale (vedi CSS)
    const mediaHtml = mediaParts.join('');

    // se ci sono altre foto oltre a quelle mostrate, un'ultima
    // "tessera" del mosaico lo segnala; cliccandola le carica tutte
    const morePhotosHtml = hiddenCount > 0
      ? `<button type="button" class="archive-more-photos" id="archiveMoreBtn">` +
        `<img src="assets/icons/icon-morephotos.png" alt="">` +
        `<span>+${hiddenCount} more photos</span>` +
        `</button>`
      : '';

    // un video puo' essere un file locale (riprodotto inline nella galleria)
    // oppure un link esterno tipo YouTube (apre in una nuova scheda)
    const isExternalVideo = project.video && /^https?:\/\//.test(project.video);

    const videoButtonHtml = project.video
      ? (isExternalVideo
          ? `<a class="archive-video-btn" href="${project.video}" target="_blank" rel="noopener">` +
            `<img src="assets/icons/icon-movie.png" alt="">` +
            `<span>Click for the video</span>` +
            `</a>`
          : `<button type="button" class="archive-video-btn" id="archiveVideoBtn">` +
            `<img src="assets/icons/icon-movie.png" alt="">` +
            `<span>Click for the video</span>` +
            `</button>`)
      : '';

    const posterSrc = project.images.length ? imgSrc(project.images[0]) : '';
    const videoTagHtml = (project.video && !isExternalVideo)
      ? `<video src="${project.video}" controls playsinline preload="none" poster="${posterSrc}" id="archiveVideo"></video>`
      : '';

    // i crediti stanno tutti in fondo alla pagina, dopo la galleria,
    // in un riquadro unico invece che una riga sparsa in cima: ogni
    // voce puo' essere "ETICHETTA: valore" (in grassetto la parte
    // prima dei due punti) oppure una semplice frase
    const credits = project.credits || [];
    const creditLineHtml = line => {
      const sep = line.indexOf(': ');
      if (sep === -1) return `<p>${line}</p>`;
      return `<p><strong>${line.slice(0, sep)}:</strong> ${line.slice(sep + 2)}</p>`;
    };
    const creditsBoxHtml = credits.length
      ? `<div class="credits-box">` +
        `<div class="credits-box-bar"></div>` +
        `<div class="credits-box-label">Credits</div>` +
        credits.map(creditLineHtml).join('') +
        `</div>`
      : '';

    archiveContent.innerHTML =
      `<div class="category-label">${project.categoryLabel}</div>` +
      `<h1>${project.title}</h1>` +
      mainParagraphHtml +
      videoButtonHtml +
      `<div class="archive-gallery">${mediaHtml}${videoTagHtml}${morePhotosHtml}</div>` +
      creditsBoxHtml;

    // titolo e meta description della scheda del browser seguono il
    // progetto mostrato, non restano fissi su "Archive" per ogni pagina
    document.title = `${project.title} — Maria Vittoria Colombo`;
    const metaDescEl = document.querySelector('meta[name="description"]');
    if (metaDescEl && paragraphs.length) {
      const plainText = paragraphs[0].replace(/<[^>]+>/g, '');
      metaDescEl.setAttribute('content', plainText.slice(0, 160));
    }

    const videoBtnEl = document.getElementById('archiveVideoBtn');
    const videoTagEl = document.getElementById('archiveVideo');
    if (videoBtnEl && videoTagEl) {
      videoBtnEl.addEventListener('click', () => {
        videoTagEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        videoTagEl.play().catch(() => {});
      });
    }

    const moreBtnEl = document.getElementById('archiveMoreBtn');
    if (moreBtnEl) {
      moreBtnEl.addEventListener('click', () => renderContent(project, true));
    }
  }

  if (items.length) {
    // se si arriva da un link diretto a un progetto (es. dalle foto in
    // homepage) apriamo subito quello, altrimenti il primo della lista
    const initialProject = (requestedSlug && items.find(p => p.slug === requestedSlug)) || items[0];
    renderList(initialProject.slug);
    renderContent(initialProject);
  }

  archiveList.addEventListener('click', (e) => {
    const btn = e.target.closest('.list-row[data-slug]');
    if (!btn) return;
    const project = items.find(p => p.slug === btn.dataset.slug);
    if (!project) return;
    renderList(project.slug);
    renderContent(project);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // aggiorna l'URL (senza ricaricare la pagina) con il progetto
    // appena scelto: cosi' un refresh riparte da qui invece che
    // tornare sempre al primo della lista
    params.set('project', project.slug);
    history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  });
}

// ============================================
// LIGHTBOX
// Su tutto il sito, cliccando una foto di galleria (pagine
// progetto o pagina archivio) si apre ingrandita, a schermo
// intero; le freccine — a schermo o da tastiera — scorrono tra
// le foto della stessa galleria. Un click fuori dalla foto, la X
// o Esc chiudono. I video e il tassello "more photos" non aprono
// il lightbox. Usa la delegazione degli eventi (document), quindi
// funziona anche con la galleria dell'archivio che viene
// ricostruita ogni volta che si sceglie un progetto.
// ============================================
(function () {
  let overlay = null;
  let imgEl = null;
  let counterEl = null;
  let currentList = [];
  let currentIndex = 0;

  function galleryImages(container) {
    return Array.from(container.querySelectorAll('img')).filter(
      img => !img.closest('.archive-more-photos')
    );
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Close">×</button>' +
      '<button type="button" class="lightbox-prev" aria-label="Previous">‹</button>' +
      '<img class="lightbox-img" alt="">' +
      '<button type="button" class="lightbox-next" aria-label="Next">›</button>' +
      '<span class="lightbox-counter"></span>';
    document.body.appendChild(overlay);

    imgEl = overlay.querySelector('.lightbox-img');
    counterEl = overlay.querySelector('.lightbox-counter');

    overlay.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    overlay.querySelector('.lightbox-prev').addEventListener('click', () => show(currentIndex - 1));
    overlay.querySelector('.lightbox-next').addEventListener('click', () => show(currentIndex + 1));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
    });
  }

  function show(index) {
    currentIndex = (index + currentList.length) % currentList.length;
    imgEl.src = currentList[currentIndex].src;
    counterEl.textContent = `${currentIndex + 1} / ${currentList.length}`;
  }

  function openLightbox(list, index) {
    if (!overlay) build();
    currentList = list;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    show(index);
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('.project-images img, .archive-gallery img');
    if (!img || img.closest('.archive-more-photos')) return;
    const container = img.closest('.project-images, .archive-gallery');
    const list = galleryImages(container);
    const index = list.indexOf(img);
    if (index === -1) return;
    openLightbox(list, index);
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay || overlay.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(currentIndex - 1);
    if (e.key === 'ArrowRight') show(currentIndex + 1);
  });
})();
