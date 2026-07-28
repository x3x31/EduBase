const Views = (() => {
  let currentEixoId = null;
  let currentCategoriaId = null;
  let _iconeCache = null;
  let _dicaTimerId = null;

  function isSingleEixo() {
    return typeof EIXO_DOCUMENTOS_ONLY !== 'undefined' && EIXO_DOCUMENTOS_ONLY;
  }

  async function getIconeMap() {
    if (!_iconeCache) {
      const icones = await Api.getIcones();
      _iconeCache = {};
      icones.forEach(ic => {
        _iconeCache[ic.id] = ic.emoji;
      });
    }
    return _iconeCache;
  }

  function getIconeEmoji(iconeId) {
    if (_iconeCache && _iconeCache[iconeId]) return _iconeCache[iconeId];
    return '📄';
  }

  const DICA_STORAGE_KEY = 'edubase_dica_atual';
  const TEMPO_TROCA_MS = 5 * 60 * 1000;

  function getRandomDica() {
    const index = Math.floor(Math.random() * DICAS_EDUCACAO.length);
    return DICAS_EDUCACAO[index];
  }

  function getDicaAtual() {
    const agora = Date.now();
    const salva = localStorage.getItem(DICA_STORAGE_KEY);

    if (salva) {
      try {
        const { texto, timestamp } = JSON.parse(salva);
        if (agora - timestamp < TEMPO_TROCA_MS) {
          return texto;
        }
      } catch (e) {}
    }

    const nova = getRandomDica();
    localStorage.setItem(DICA_STORAGE_KEY, JSON.stringify({
      texto: nova,
      timestamp: agora
    }));
    return nova;
  }

  function getApp() {
    return document.getElementById('app');
  }

  function showLoading() {
    const app = getApp();
    app.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    `;
  }

  function renderHeader(showBack = false) {
    const brandHtml = `
      <div class="header-brand">
        <img src="assets/images/UERN.png" alt="UERN">
        <img src="assets/images/PROFEI.png" alt="PROFEI" style="height: 55px;">
      </div>
    `;
    if (showBack) {
      return `
        <header class="header">
          <button class="header-back" onclick="window.history.back()">
            ${icon('chevron-left')}
            Voltar
          </button>
          ${brandHtml}
          <div class="header-notif" id="btn-notif">
            ${icon('bell')}
            <span class="badge"></span>
          </div>
        </header>
      `;
    }
    return `
      <header class="header">
        ${brandHtml}
        <div class="header-notif" id="btn-notif">
          ${icon('bell')}
          <span class="badge"></span>
        </div>
      </header>
    `;
  }

  function renderDica(texto) {
    return `
      <div class="dica-banner">
        <div class="dica-icon">${icon('lightbulb')}</div>
        <div class="dica-text">
          <strong>💡 Dica do dia</strong>
          <span>${texto}</span>
        </div>        
      </div>
    `;
  }

  function renderEixoCard(eixo) {
    const theme = EIXO_THEMES[eixo.id];
    return `
      <div class="eixo-card ${theme.class}" onclick="App.navigate('#/eixo/${eixo.id}')">
        <div class="eixo-card-icon"><img src="assets/images/documento.png" alt="" style="width:28px;height:28px;object-fit:contain"></div>
        <div class="eixo-card-content">
          <div class="eixo-card-label">${theme.label}</div>
          <div class="eixo-card-title">${eixo.nome}</div>
          <div class="eixo-card-desc">${eixo.descricao || ''}</div>
        </div>
        <div class="eixo-card-arrow">${icon('chevron-right')}</div>
      </div>
    `;
  }

  function renderObjetivoCard() {
    return `
      <div class="objetivo-card">
        <div class="objetivo-icon">${icon('target')}</div>
        <div class="objetivo-text">
          <h3>Nosso objetivo</h3>
          <p>Fortalecer a educação inclusiva na prática, oferecendo acesso a documentos, estratégias e recursos pedagógicos.</p>
        </div>        
      </div>
    `;
  }

  function renderHeroHome() {
    return `
      <div class="hero-home">
        <h1><span style="color:#022c74">Educação inclusiva</span><br><span style="color:#2180e0">na prática</span></h1>
        <p>Ferramentas, estratégias e recursos para transformar a sala de aula.</p>
        <button class="btn-outline" onclick="App.navigate('#/biblioteca')">
          <span class="play-icon">${icon('play-circle')}</span>
          Começar agora
        </button>
        <div class="hero-illustration">
          <img src="assets/images/arvore.png" alt="">
        </div>
      </div>
    `;
  }

  async function renderHome() {
    showLoading();
    await getIconeMap();
    const eixos = await Api.getEixos();
    const app = getApp();
    app.className = 'app theme-green';

    const eixosSection = isSingleEixo() && eixos.length === 1
      ? `
        <section class="section">
          <div class="section-header">
            <div>
              <h2>${eixos[0].nome}</h2>
              <p>${eixos[0].descricao || ''}</p>
            </div>
            <a href="#/eixo/${eixos[0].id}" class="link-more">Acessar ${icon('chevron-right')}</a>
          </div>
          <div class="eixos-list">
            ${renderEixoCard(eixos[0])}
          </div>
        </section>
      `
      : `
        <section class="section">
          <div class="section-header">
            <div>
              <h2>Eixos do EduBase</h2>
              <p>Explore documentos, estratégias e recursos</p>
            </div>
            <a href="#/biblioteca" class="link-more">Ver todos ${icon('chevron-right')}</a>
          </div>
          <div class="eixos-list">
            ${eixos.map(e => renderEixoCard(e)).join('')}
          </div>
        </section>
      `;

    app.innerHTML = `
      <div class="view-transition">
      ${renderHeader()}
      ${renderHeroHome()}
      ${renderObjetivoCard()}
      ${eixosSection}
      ${renderDica(getDicaAtual())}
      </div>
    `;

    if (_dicaTimerId) clearInterval(_dicaTimerId);
    _dicaTimerId = setInterval(() => {
      const dicaEl = document.querySelector('.dica-text span');
      if (dicaEl) {
        dicaEl.textContent = getDicaAtual();
      }
    }, TEMPO_TROCA_MS);
  }

  function renderHeroEixo(eixo) {
    const theme = EIXO_THEMES[eixo.id];
    return `
      <div class="hero-eixo">
        <div class="hero-eixo-label">Eixo — ${theme.label}</div>
        <h1>${eixo.nome}</h1>
        <p>${eixo.descricao || ''}</p>
        <div class="hero-eixo-art"><img src="assets/images/documento2.png" alt="" style="width:80px;height:80px;object-fit:contain"></div>
      </div>
    `;
  }

  function renderCategoriaCard(cat) {
    return `
      <div class="categoria-card ${currentCategoriaId === cat.id ? 'active' : ''}" data-categoria-id="${cat.id}">
        <div class="categoria-icon">${icon(cat.icone)}</div>
        <h3>${cat.nome}</h3>
        <span>${cat.totaldocumentos} itens</span>
      </div>
    `;
  }

  function renderDocCard(doc, index) {
    const theme = EIXO_THEMES[doc.eixoid];
    const thumbClass = theme ? `doc-thumb-${theme.class}` : '';
    const tipoClass = doc.tipo === 'PDF' ? 'doc-tag-pdf' : 'doc-tag-site';
    const tipoLabel = doc.tipo === 'PDF' ? 'PDF' : 'site';
    const tags = [`<span class="doc-tag ${tipoClass}">${tipoLabel}</span>`, ...(doc.tags || []).map(t => `<span class="doc-tag" style="background:${t.cor || '#E8F5E9'}">${t.nome}</span>`)].join('');
    const eixoClass = theme ? `doc-card-eixo-${theme.class}` : '';
    const emoji = getIconeEmoji(doc.iconeid);
    return `
      <div class="doc-card-destaque ${eixoClass}" data-doc-id="${doc.id}">
        <div class="doc-thumb ${thumbClass}">${emoji}</div>
        <div class="doc-card-destaque-info">
          <h3>${doc.titulo}</h3>
          <p>${doc.descricao || ''}</p>
          <div class="doc-tags">${tags}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex-shrink:0">
          <button class="btn-bookmark ${doc._saved ? 'saved' : ''}" data-action="bookmark" data-doc-id="${doc.id}">
            ${icon('bookmark')}
          </button>
          <button class="btn-visualizar" data-action="visualizar" data-url="${doc.url}" data-doc-id="${doc.id}" data-title="${doc.titulo}" data-tipo="${doc.tipo || ''}" data-tags='${JSON.stringify(doc.tags || [])}' data-icone="${doc.iconeid}">
            ${icon('eye')}
          </button>
        </div>
      </div>
    `;
  }

  function renderSearchBar() {
    return `
      <div class="search-bar">
        <div class="search-input-wrap">
          ${icon('search')}
          <input type="text" class="search-input" id="search-input" placeholder="Buscar documentos..." autocomplete="off">
        </div>
        <button class="btn-filter" id="btn-filter">
          ${icon('filter')}
          Filtrar
        </button>
      </div>
    `;
  }

  function renderCategoriasScroll(categorias) {
    return `
      <div class="categorias-scroll" id="categorias-scroll">
        ${categorias.map(c => renderCategoriaCard(c)).join('')}
      </div>
    `;
  }

  async function renderDocList(docs) {
    if (!docs || docs.length === 0) {
      return `
        <div class="empty-state">
          ${icon('folder')}
          <p>Nenhum documento encontrado</p>
        </div>
      `;
    }
    const items = await Promise.all(docs.map(async (d, i) => {
      const saved = await Store.isBookmarked(d.id);
      return renderDocCard({ ...d, _saved: saved }, i);
    }));
    return `<div class="doc-list-destaque">${items.join('')}</div>`;
  }

  function renderModalFiltro(categorias, eixoId) {
    const cats = categorias.filter(c => c.eixoid === Number(eixoId));
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-sheet">
          <h3>Filtrar por categoria</h3>
          <div class="modal-options">
            <button class="modal-option ${!currentCategoriaId ? 'active' : ''}" data-categoria-id="">Todas as categorias</button>
            ${cats.map(c => `
              <button class="modal-option ${currentCategoriaId === c.id ? 'active' : ''}" data-categoria-id="${c.id}">
                ${c.nome}
              </button>
            `).join('')}
          </div>
          <button class="modal-close" id="modal-close">Fechar</button>
        </div>
      </div>
    `;
  }

  async function renderEixo(eixoId) {
    showLoading();
    await getIconeMap();
    currentEixoId = Number(eixoId);
    const [eixo, categorias, documentos] = await Promise.all([
      Api.getEixo(eixoId),
      Api.getCategorias(eixoId),
      Api.getDocumentos({ eixoId })
    ]);
    const theme = EIXO_THEMES[eixoId];
    let docsFiltrados = documentos;
    if (currentCategoriaId) {
      docsFiltrados = documentos.filter(d => d.categoriaid === currentCategoriaId);
    }
    const app = getApp();
    app.className = `app theme-${theme ? theme.class : 'green'}`;
    const docListHtml = await renderDocList(docsFiltrados);
    app.innerHTML = `
      <div class="view-transition">
      ${renderHeader(true)}
      ${renderHeroEixo(eixo)}
      ${renderSearchBar()}
      ${renderCategoriasScroll(categorias)}
      <section class="section">
        <div class="section-header">
          <div>
            <h2>${theme ? theme.docTitle : 'Documentos'}</h2>
            <p>${docsFiltrados.length} documento(s) encontrado(s)</p>
          </div>
        </div>
        ${docListHtml}
      </section>
      </div>
    `;
    document.getElementById('search-input')?.addEventListener('input', function () {
      renderEixoWithFilter(currentEixoId, this.value.trim());
    });
    document.getElementById('btn-filter')?.addEventListener('click', function () {
      const overlay = document.createElement('div');
      overlay.innerHTML = renderModalFiltro(categorias, eixoId);
      document.body.appendChild(overlay.firstElementChild);
      document.getElementById('modal-overlay')?.addEventListener('click', function (e) {
        if (e.target === this || e.target.id === 'modal-close') {
          this.remove();
        }
      });
      document.querySelectorAll('.modal-option').forEach(btn => {
        btn.addEventListener('click', function () {
          currentCategoriaId = this.dataset.categoriaId ? Number(this.dataset.categoriaId) : null;
          document.getElementById('modal-overlay')?.remove();
          renderEixo(currentEixoId);
        });
      });
    });
    document.getElementById('categorias-scroll')?.addEventListener('click', function (e) {
      const card = e.target.closest('.categoria-card');
      if (!card) return;
      const catId = card.dataset.categoriaId ? Number(card.dataset.categoriaId) : null;
      currentCategoriaId = currentCategoriaId === catId ? null : catId;
      renderEixo(currentEixoId);
    });
  }

  async function renderEixoWithFilter(eixoId, busca) {
    const [documentos] = await Promise.all([
      Api.getDocumentos({ eixoId, busca })
    ]);
    const theme = EIXO_THEMES[eixoId];
    let docsFiltrados = documentos;
    if (currentCategoriaId) {
      docsFiltrados = documentos.filter(d => d.categoriaid === currentCategoriaId);
    }
    const container = document.querySelector('.section');
    if (container) {
      const docListHtml = await renderDocList(docsFiltrados);
      container.innerHTML = `
        <div class="section-header">
          <div>
            <h2>${theme ? theme.docTitle : 'Documentos'}</h2>
            <p>${docsFiltrados.length} documento(s) encontrado(s)</p>
          </div>
        </div>
        ${docListHtml}
      `;
    }
  }

  async function renderBiblioteca() {
    showLoading();
    await getIconeMap();
    const [eixos, documentos] = await Promise.all([
      Api.getEixos(),
      Api.getDocumentos({})
    ]);
    const app = getApp();
    app.className = 'app theme-green';
    const bibDocListHtml = await renderDocList(documentos);

    const filtersHtml = isSingleEixo()
      ? ''
      : `
        <div class="bib-filters" id="bib-filters">
          <button class="bib-filter-chip active" data-eixo-id="">Todos</button>
          ${eixos.map(e => {
            const theme = EIXO_THEMES[e.id];
            return `<button class="bib-filter-chip" data-eixo-id="${e.id}">${theme ? theme.emoji : ''} ${e.nome}</button>`;
          }).join('')}
        </div>
      `;

    app.innerHTML = `
      <div class="view-transition">
      ${renderHeader()}
      <div class="bib-search">
        <div class="search-input-wrap">
          ${icon('search')}
          <input type="text" class="search-input" id="bib-search-input" placeholder="Buscar na biblioteca..." autocomplete="off">
        </div>
      </div>
      ${filtersHtml}
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Biblioteca</h2>
            <p>${documentos.length} documento(s) disponível(is)</p>
          </div>
        </div>
        <div id="bib-doc-list">
          ${bibDocListHtml}
        </div>
      </section>
      </div>
    `;
    document.getElementById('bib-search-input')?.addEventListener('input', function () {
      renderBibliotecaWithFilter(this.value.trim());
    });
    document.getElementById('bib-filters')?.addEventListener('click', function (e) {
      const chip = e.target.closest('.bib-filter-chip');
      if (!chip) return;
      document.querySelectorAll('.bib-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderBibliotecaWithFilter(document.getElementById('bib-search-input')?.value?.trim() || '', chip.dataset.eixoId);
    });
  }

  async function renderBibliotecaWithFilter(busca, eixoId) {
    const docs = await Api.getDocumentos({ eixoId: eixoId || undefined, busca });
    const list = document.getElementById('bib-doc-list');
    if (list) {
      const docListHtml = await renderDocList(docs);
      list.innerHTML = docListHtml;
      const header = document.querySelector('.section-header p');
      if (header) header.textContent = `${docs.length} documento(s) disponível(is)`;
    }
  }

  async function renderFavoritos() {
    showLoading();
    await getIconeMap();
    const bookmarks = await Store.getAllBookmarks();
    const app = getApp();
    app.className = 'app theme-green';
    const content = bookmarks.length > 0
      ? `
        <section class="section">
          <div class="section-header">
            <div>
              <h2>Meus favoritos</h2>
              <p>${bookmarks.length} documento(s) salvo(s)</p>
            </div>
          </div>
          <div class="doc-list-destaque">
            ${bookmarks.map((d, i) => renderDocCard({ ...d, _saved: true, id: d.docId }, i)).join('')}
          </div>
        </section>
      `
      : `
        <section class="section">
          <div class="empty-state">
            ${icon('bookmark')}
            <p>Nenhum documento salvo</p>
            <p style="margin-top:8px;font-size:13px;color:var(--text-muted)">Marque documentos com o ícone <strong>bookmark</strong> para salvá-los aqui.</p>
          </div>
        </section>
      `;
    app.innerHTML = `
      <div class="view-transition">
      ${renderHeader()}
      ${content}
      </div>
    `;
  }

  async function abrirNotificacoes() {
    const [recentes, removidasIds] = await Promise.all([
      Api.getDocumentosRecentes(15),
      Store.getTodasRemovidas()
    ]);
    const removidasSet = new Set(removidasIds.map(Number));
    const docs = recentes.filter(d => !removidasSet.has(Number(d.id)));
    const overlay = document.createElement('div');
    overlay.className = 'notif-overlay';
    overlay.innerHTML = `
      <div class="notif-panel ${docs.length === 0 ? 'notif-empty' : ''}">
        <div class="notif-header">
          <h3>Notificações</h3>
          <button class="notif-close" id="notif-close">${icon('chevron-right')}</button>
        </div>
        <div class="notif-body" id="notif-body">
          ${docs.length > 0
            ? docs.map((d, i) => {
                const eixoClass = EIXO_THEMES[d.eixoid] ? `doc-card-eixo-${EIXO_THEMES[d.eixoid].class}` : '';
                const emoji = getIconeEmoji(d.iconeid);
                return `
                  <div class="notif-item ${eixoClass}" data-doc-id="${d.id}" data-url="${d.url}">
                    <div class="notif-item-bg"></div>
                    <div class="notif-item-content">
                      <div class="notif-thumb">${emoji}</div>
                      <div class="notif-info">
                        <strong>${d.titulo}</strong>
                        <span>${d.descricao ? d.descricao.substring(0, 60) + (d.descricao.length > 60 ? '...' : '') : ''}</span>
                      </div>
                      <button class="notif-view" data-action="visualizar" data-url="${d.url}" data-doc-id="${d.id}" data-title="${d.titulo}" data-tipo="${d.tipo || ''}" data-tags='${JSON.stringify(d.tags || [])}' data-icone="${d.iconeid}">${icon('eye')}</button>
                      <button class="notif-remove" data-action="remover-notif" data-doc-id="${d.id}">${icon('trash-2')}</button>
                    </div>
                  </div>
                `;
              }).join('')
            : '<div class="notif-empty-msg">Todas as notificações foram visualizadas</div>'
          }
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function removerItem(el) {
      el.classList.add('notif-item-removing');
      setTimeout(async () => {
        const docId = el.dataset.docId;
        await Store.addRemovida(docId);
        el.remove();
        const body = document.getElementById('notif-body');
        if (body && body.querySelectorAll('.notif-item').length === 0) {
          body.innerHTML = '<div class="notif-empty-msg">Todas as notificações foram visualizadas</div>';
        }
      }, 300);
    }

    overlay.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action="visualizar"]');
      if (btn) {
        overlay.remove();
        abrirVisualizador(btn);
        return;
      }
      const removeBtn = e.target.closest('[data-action="remover-notif"]');
      if (removeBtn) {
        const item = removeBtn.closest('.notif-item');
        if (item) removerItem(item);
        return;
      }
      if (e.target === overlay || e.target.closest('.notif-close')) overlay.remove();
    });

    const body = document.getElementById('notif-body');
    if (body) {
      let touchStartX = 0, touchCurrentX = 0, touchItem = null;
      body.addEventListener('touchstart', function (e) {
        const item = e.target.closest('.notif-item');
        if (!item || e.target.closest('[data-action="visualizar"]') || e.target.closest('[data-action="remover-notif"]')) return;
        touchItem = item;
        touchStartX = e.touches[0].clientX;
        touchItem.classList.add('swiping');
      }, { passive: true });
      body.addEventListener('touchmove', function (e) {
        if (!touchItem) return;
        touchCurrentX = e.touches[0].clientX;
        const diff = touchCurrentX - touchStartX;
        if (diff < 0) {
          const content = touchItem.querySelector('.notif-item-content');
          if (content) content.style.transform = `translateX(${diff}px)`;
        }
      }, { passive: true });
      body.addEventListener('touchend', function () {
        if (!touchItem) return;
        const diff = touchCurrentX - touchStartX;
        touchItem.classList.remove('swiping');
        const content = touchItem.querySelector('.notif-item-content');
        if (content) content.style.transform = '';
        if (diff < -80) {
          removerItem(touchItem);
        }
        touchItem = null;
        touchStartX = 0;
        touchCurrentX = 0;
      }, { passive: true });
    }
  }

  function abrirVisualizador(btn) {
    const url = btn.dataset.url;
    const titulo = btn.dataset.title || 'Documento';
    const tipo = btn.dataset.tipo || '';
    const tags = JSON.parse(btn.dataset.tags || '[]');
    const iconeId = btn.dataset.icone || '';
    const emoji = getIconeEmoji(Number(iconeId));
    const isPDF = tipo === 'PDF';

    let isCrossOrigin = false;
    try {
      const u = new URL(url, location.href);
      isCrossOrigin = u.origin !== location.origin;
    } catch (e) { isCrossOrigin = true; }

    const tagsHtml = [
      `<span class="doc-tag ${isPDF ? 'doc-tag-pdf' : 'doc-tag-site'}">${isPDF ? 'PDF' : 'site'}</span>`,
      ...tags.map(t => `<span class="doc-tag" style="background:${t.cor || '#E8F5E9'}">${t.nome}</span>`)
    ].join('');

    const overlay = document.createElement('div');
    overlay.className = 'viewer-overlay';
    overlay.innerHTML = `
      <div class="viewer-modal">
        <div class="viewer-header">
          <div class="viewer-header-left">
            <div class="viewer-emoji">${emoji}</div>
            <div class="viewer-header-info">
              <h3>${titulo}</h3>
              <div class="doc-tags">${tagsHtml}</div>
            </div>
          </div>
          <button class="viewer-close" id="viewer-close">${icon('x')}</button>
        </div>
        <div class="viewer-toolbar" id="viewer-toolbar">
          <button class="viewer-tool" id="viewer-zoom-out" title="Diminuir zoom">−</button>
          <span class="viewer-zoom-label" id="viewer-zoom-label">100%</span>
          <button class="viewer-tool" id="viewer-zoom-in" title="Aumentar zoom">+</button>
          ${isPDF ? `
            <span class="viewer-page-info" id="viewer-page-info"></span>
            <button class="viewer-tool" id="viewer-print" title="Imprimir">${icon('printer')}</button>
          ` : ''}
        </div>
        <div class="viewer-body" id="viewer-body">
          ${isPDF
            ? `<div class="viewer-pdf-container" id="viewer-pdf-container">
                <div class="viewer-pdf-loading">Carregando PDF...</div>
                <canvas id="viewer-canvas"></canvas>
              </div>`
            : `<iframe id="viewer-iframe" class="viewer-iframe" style="width:100%;height:100%;border:none"></iframe>`
          }
        </div>
        <div class="viewer-footer" id="viewer-footer">
          ${isPDF
            ? `<a href="${url}" target="_blank" rel="noopener" class="viewer-action-btn viewer-download">${icon('eye')} Acessar PDF</a>`
            : `<a href="${url}" target="_blank" rel="noopener" class="viewer-action-btn viewer-access">${icon('eye')} Acessar site</a>`
          }
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('#viewer-close')) {
        overlay.remove();
        if (pdfDoc) pdfDoc.destroy();
      }
    });

    if (isPDF) {
      initPdfViewer(url, isCrossOrigin);
    } else {
      initSiteViewer(url, isCrossOrigin);
    }

    function initSiteViewer(siteUrl, crossOrigin) {
      const iframe = document.getElementById('viewer-iframe');
      let currentZoom = 100;

      if (crossOrigin) {
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
      }

      iframe.src = siteUrl;

      function updateSiteZoom() {
        iframe.style.transform = `scale(${currentZoom / 100})`;
        iframe.style.transformOrigin = 'top left';
        const label = document.getElementById('viewer-zoom-label');
        if (label) label.textContent = currentZoom + '%';
      }

      document.getElementById('viewer-zoom-in')?.addEventListener('click', () => {
        if (currentZoom < 200) { currentZoom += 25; updateSiteZoom(); }
      });
      document.getElementById('viewer-zoom-out')?.addEventListener('click', () => {
        if (currentZoom > 50) { currentZoom -= 25; updateSiteZoom(); }
      });

      let loaded = false;
      iframe.addEventListener('load', function () {
        loaded = true;
      });

      setTimeout(function () {
        if (!loaded) {
          const body = document.getElementById('viewer-body');
          body.innerHTML = `
            <div class="viewer-pdf-error">
              <p>Não foi possível carregar o site neste modal.</p>
              <a href="${siteUrl}" target="_blank" rel="noopener">${icon('arrow-right')} Abrir site</a>
            </div>
          `;
        }
      }, 10000);
    }

    function initPdfViewer(pdfUrl, crossOrigin) {
      let pdfDoc = null;
      let currentPage = 1;
      let totalPages = 0;
      let currentZoom = 100;
      const canvas = document.getElementById('viewer-canvas');
      const ctx = canvas.getContext('2d');
      const loadingEl = document.querySelector('.viewer-pdf-loading');
      const container = document.getElementById('viewer-pdf-container');

      if (crossOrigin || typeof pdfjsLib === 'undefined') {
        openViaGView();
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      async function tryLoadDirect() {
        const resp = await fetch(pdfUrl);
        if (!resp.ok) throw new Error(resp.status);
        const bytes = await resp.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        pdfDoc = pdf;
        totalPages = pdf.numPages;
        document.getElementById('viewer-page-info').textContent = `1 / ${totalPages}`;
        loadingEl.style.display = 'none';
        renderPage(currentPage, currentZoom / 100);
      }

      tryLoadDirect().catch(openViaGView);

      function openViaGView() {
        const gviewUrl = 'https://docs.google.com/gview?url=' + encodeURIComponent(pdfUrl) + '&embedded=true';
        container.innerHTML = `<iframe src="${gviewUrl}" class="viewer-iframe" style="width:100%;height:100%;border:none"></iframe>`;
        document.getElementById('viewer-toolbar').style.display = 'none';
      }

      function renderPage(num, scale) {
        if (!pdfDoc) return;
        pdfDoc.getPage(num).then(function (page) {
          const viewport = page.getViewport({ scale: scale * 1.5 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderContext = { canvasContext: ctx, viewport: viewport };
          page.render(renderContext);
        });
      }

      function updateZoom() {
        const label = document.getElementById('viewer-zoom-label');
        if (label) label.textContent = currentZoom + '%';
        renderPage(currentPage, currentZoom / 100);
      }

      document.getElementById('viewer-zoom-in')?.addEventListener('click', () => {
        if (currentZoom < 200) { currentZoom += 25; updateZoom(); }
      });
      document.getElementById('viewer-zoom-out')?.addEventListener('click', () => {
        if (currentZoom > 50) { currentZoom -= 25; updateZoom(); }
      });
      document.getElementById('viewer-print')?.addEventListener('click', () => {
        window.open(pdfUrl, '_blank');
      });
    }
  }

  function init() {
    const app = getApp();
    app.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action="visualizar"]');
      if (btn) {
        e.preventDefault();
        abrirVisualizador(btn);
        return;
      }
      const notifBtn = e.target.closest('#btn-notif');
      if (notifBtn) {
        e.preventDefault();
        abrirNotificacoes();
      }
    });
  }

  async function renderCadastro() {
    showLoading();
    const [eixos, tags, icones] = await Promise.all([
      Api.getEixos(),
      Api.getTags(),
      Api.getIcones()
    ]);
    await getIconeMap();
    const app = getApp();
    app.className = 'app theme-green';

    let eixosCategorias = {};
    for (const eixo of eixos) {
      eixosCategorias[eixo.id] = await Api.getCategorias(eixo.id);
    }

    let activeTab = 'novo';
    let editingDoc = null;
    let buscaLista = '';

    let selectedEixoId = isSingleEixo() ? EIXO_DOCUMENTOS_ID : null;
    let selectedCategoriaId = null;
    let selectedIconeId = null;
    let selectedTagIds = new Set();
    let formTitulo = '';
    let formDescricao = '';
    let formUrl = '';
    let formAutor = '';
    let formTipo = 'PDF';

    function resetFormState() {
      selectedEixoId = isSingleEixo() ? EIXO_DOCUMENTOS_ID : null;
      selectedCategoriaId = null;
      selectedIconeId = null;
      selectedTagIds = new Set();
      formTitulo = '';
      formDescricao = '';
      formUrl = '';
      formAutor = '';
      formTipo = 'PDF';
    }

    function saveFormState() {
      const t = document.getElementById('cad-titulo');
      const d = document.getElementById('cad-descricao');
      const u = document.getElementById('cad-url');
      const a = document.getElementById('cad-autor');
      const tp = document.getElementById('cad-tipo');
      if (t) formTitulo = t.value;
      if (d) formDescricao = d.value;
      if (u) formUrl = u.value;
      if (a) formAutor = a.value;
      if (tp) formTipo = tp.value;
    }

    function renderIconGrid() {
      const theme = selectedEixoId ? EIXO_THEMES[selectedEixoId] : null;
      const themeClass = theme ? 'theme-' + theme.class : '';
      return `
        <div class="icon-grid">
          ${icones.map(ic => {
            const isSelected = selectedIconeId === ic.id;
            const selectedClass = isSelected ? 'selected ' + themeClass : '';
            return `
              <div class="icon-option ${selectedClass}" data-icone-id="${ic.id}">
                <div class="icon-option-emoji">${ic.emoji}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderTagChips() {
      return `
        <div class="tag-chips">
          ${tags.map(t => `
            <button class="tag-chip ${selectedTagIds.has(t.id) ? 'active' : ''}" data-tag-id="${t.id}" style="${selectedTagIds.has(t.id) ? 'background:' + t.cor + ';border-color:' + t.cor : ''}">
              ${t.nome}
            </button>
          `).join('')}
        </div>
      `;
    }

    function renderCategoriasDropdown() {
      if (!selectedEixoId) {
        return `<p class="form-hint">Selecione um eixo primeiro</p>`;
      }
      const cats = eixosCategorias[selectedEixoId] || [];
      const theme = EIXO_THEMES[selectedEixoId];
      const iconClass = theme ? 'categoria-option-icon-' + theme.class : '';
      return `
        <div class="categoria-selector">
          ${cats.map(c => {
            const isSelected = selectedCategoriaId === c.id;
            const selectedClass = isSelected ? 'selected theme-' + theme.class : '';
            return `
              <div class="categoria-option ${selectedClass}" data-categoria-id="${c.id}">
                <div class="categoria-option-icon ${iconClass}">${icon(c.icone)}</div>
                <span>${c.nome}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function getEixoBadgeClass(eixoid) {
      const theme = EIXO_THEMES[eixoid];
      if (!theme) return '';
      return 'doc-eixo-badge-' + theme.class;
    }

    function getEixoNome(eixoid) {
      const e = eixos.find(ex => ex.id === eixoid);
      return e ? e.nome : '';
    }

    function getCategoriaNome(catid) {
      for (const eixo of eixos) {
        const cats = eixosCategorias[eixo.id] || [];
        const found = cats.find(c => c.id === catid);
        if (found) return found.nome;
      }
      return '';
    }

    async function renderDocManageList() {
      const docs = await Api.getDocumentos();
      const busca = buscaLista.toLowerCase();
      const filtered = busca
        ? docs.filter(d => d.titulo.toLowerCase().includes(busca) || (d.descricao && d.descricao.toLowerCase().includes(busca)))
        : docs;

      if (filtered.length === 0) {
        return `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('folder')}</div>
            <p>${busca ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}</p>
          </div>
        `;
      }

      return `
        <div class="doc-manage-list">
          ${filtered.map(d => {
            const emoji = getIconeEmoji(d.iconeid);
            const badgeClass = getEixoBadgeClass(d.eixoid);
            const emojiClass = badgeClass.replace('doc-eixo-badge-', 'doc-manage-emoji-');
            const tipoClass = d.tipo === 'PDF' ? 'doc-tag-pdf' : 'doc-tag-site';
            const tipoLabel = d.tipo === 'PDF' ? 'PDF' : 'site';
            const tags = [`<span class="doc-tag ${tipoClass}">${tipoLabel}</span>`, ...(d.tags || []).map(t => `<span class="doc-tag" style="background:${t.cor || '#E8F5E9'}">${t.nome}</span>`)].join('');
            return `
              <div class="doc-manage-item" data-doc-id="${d.id}">
                <div class="doc-manage-emoji ${emojiClass}">${emoji}</div>
                <div class="doc-manage-info">
                  <h4>${d.titulo}</h4>
                  <p>${d.descricao || ''}</p>
                  <div class="doc-tags">${tags}</div>
                </div>
                <div class="doc-manage-actions">
                  <button class="btn-icon-sm" data-action="edit-doc" data-doc-id="${d.id}" title="Editar">
                    ${icon('notebook-pen')}
                  </button>
                  <button class="btn-icon-sm danger" data-action="delete-doc" data-doc-id="${d.id}" data-doc-titulo="${d.titulo}" title="Excluir">
                    ${icon('trash-2')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    async function renderForm() {
      const isEditing = !!editingDoc;
      let docManageListHtml = '';
      if (activeTab === 'lista') {
        docManageListHtml = await renderDocManageList();
      }
      app.innerHTML = `
        <div class="view-transition">
        ${renderHeader(true)}
        <section class="section">
          <div class="cadastro-tabs">
            <button class="cadastro-tab ${activeTab === 'novo' ? 'active' : ''}" data-tab="novo">
              ${icon('arrow-right')} Novo Documento
            </button>
            <button class="cadastro-tab ${activeTab === 'lista' ? 'active' : ''}" data-tab="lista">
              ${icon('folder')} Documentos
            </button>
          </div>

          ${activeTab === 'novo' ? `
            <div class="cadastro-header">
              <h2>${isEditing ? 'Editar Documento' : 'Cadastrar Documento'}</h2>
              <p>${isEditing ? 'Altere os dados do documento' : 'Preencha os dados do documento'}</p>
            </div>

            <form id="cadastro-form" class="cadastro-form">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input type="text" class="form-input" id="cad-titulo" placeholder="Título do documento" required value="${formTitulo}">
              </div>

              <div class="form-group">
                <label class="form-label">Descrição *</label>
                <textarea class="form-textarea" id="cad-descricao" placeholder="Descrição do documento" rows="3" required>${formDescricao}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">URL *</label>
                <input type="url" class="form-input" id="cad-url" placeholder="https://..." required value="${formUrl}">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tipo *</label>
                  <select class="form-select" id="cad-tipo" required>
                    <option value="PDF" ${formTipo === 'PDF' ? 'selected' : ''}>PDF</option>
                    <option value="site" ${formTipo === 'site' ? 'selected' : ''}>Site</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Autor/Origem *</label>
                  <input type="text" class="form-input" id="cad-autor" placeholder="Ex: MEC, PROFEI/UERN" required value="${formAutor}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Eixo *</label>
                <div class="eixo-selector">
                  ${eixos.map(e => {
                    const theme = EIXO_THEMES[e.id];
                    const hidden = isSingleEixo() && e.id !== EIXO_DOCUMENTOS_ID ? 'style="display:none"' : '';
                    const autoSelected = isSingleEixo() && e.id === EIXO_DOCUMENTOS_ID;
                    return `
                      <div class="eixo-option ${(autoSelected || selectedEixoId === e.id) ? 'selected theme-' + theme.class : ''}" data-eixo-id="${e.id}" ${hidden}>
                        <div class="eixo-option-emoji">${theme.emoji}</div>
                        <span>${e.nome}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Categoria *</label>
                <div id="cad-categorias">
                  ${renderCategoriasDropdown()}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Ícone *</label>
                ${renderIconGrid()}
              </div>

              <div class="form-group">
                <label class="form-label">Tags</label>
                ${renderTagChips()}
              </div>

              <div class="cadastro-form-actions">
                ${isEditing ? `<button type="button" class="btn-cancel-edit" id="btn-cancel-edit">Cancelar</button>` : ''}
                <button type="submit" class="btn-submit">
                  ${icon(isEditing ? 'clipboard-check' : 'arrow-right')}
                  ${isEditing ? 'Salvar Alterações' : 'Cadastrar Documento'}
                </button>
              </div>
            </form>
          ` : `
            <div class="cadastro-header">
              <h2>Meus Documentos</h2>
              <p>Gerencie os documentos cadastrados</p>
            </div>

            <div class="search-bar" style="margin-bottom:16px">
              <div class="search-input-wrap">
                ${icon('search')}
                <input type="text" class="search-input" id="cad-search-input" placeholder="Buscar documento..." autocomplete="off" value="${buscaLista}">
              </div>
            </div>

            <div id="doc-manage-list-container">
              ${docManageListHtml}
            </div>
          `}
        </section>
        </div>
      `;

      attachFormListeners();
    }

    function attachFormListeners() {
      document.querySelectorAll('.cadastro-tab').forEach(tab => {
        tab.addEventListener('click', function () {
          activeTab = this.dataset.tab;
          if (activeTab === 'novo' && !editingDoc) {
            resetFormState();
          }
          renderForm();
        });
      });

      if (activeTab === 'lista') {
        const searchInput = document.getElementById('cad-search-input');
        if (searchInput) {
          let debounce;
          searchInput.addEventListener('input', function () {
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
              buscaLista = this.value;
              const container = document.getElementById('doc-manage-list-container');
              if (container) container.innerHTML = await renderDocManageList();
              attachListActions();
            }, 300);
          });
        }
        attachListActions();
        return;
      }

      document.querySelectorAll('.eixo-option').forEach(el => {
        el.addEventListener('click', function () {
          saveFormState();
          selectedEixoId = Number(this.dataset.eixoId);
          selectedCategoriaId = null;
          renderForm();
        });
      });

      const catContainer = document.getElementById('cad-categorias');
      if (catContainer) {
        catContainer.addEventListener('click', function (e) {
          const opt = e.target.closest('.categoria-option');
          if (!opt) return;
          saveFormState();
          selectedCategoriaId = Number(opt.dataset.categoriaId);
          renderForm();
        });
      }

      document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', function () {
          saveFormState();
          selectedIconeId = Number(this.dataset.iconeId);
          renderForm();
        });
      });

      document.querySelectorAll('.tag-chip').forEach(el => {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          saveFormState();
          const tagId = Number(this.dataset.tagId);
          if (selectedTagIds.has(tagId)) {
            selectedTagIds.delete(tagId);
          } else {
            selectedTagIds.add(tagId);
          }
          renderForm();
        });
      });

      const cancelBtn = document.getElementById('btn-cancel-edit');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          editingDoc = null;
          resetFormState();
          activeTab = 'lista';
          renderForm();
        });
      }

      const form = document.getElementById('cadastro-form');
      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();

          const titulo = document.getElementById('cad-titulo').value.trim();
          const descricao = document.getElementById('cad-descricao').value.trim();
          const url = document.getElementById('cad-url').value.trim();
          const tipo = document.getElementById('cad-tipo').value;
          const autor_origem = document.getElementById('cad-autor').value.trim();

          if (!titulo || !descricao || !url || !selectedEixoId || !selectedCategoriaId || !selectedIconeId) {
            alert('Preencha todos os campos obrigatórios.');
            return;
          }

          try {
            if (editingDoc) {
              await Api.updateDocumento(editingDoc.id, {
                titulo,
                descricao,
                url,
                tipo,
                autor_origem,
                iconeid: selectedIconeId,
                eixoid: selectedEixoId,
                categoriaid: selectedCategoriaId
              });
              await Api.updateDocumentoTags(editingDoc.id, [...selectedTagIds]);
              editingDoc = null;
              resetFormState();
              activeTab = 'lista';
              renderForm();
            } else {
              const docId = await Api.createDocumento({
                titulo,
                descricao,
                url,
                tipo,
                autor_origem,
                iconeid: selectedIconeId,
                eixoid: selectedEixoId,
                categoriaid: selectedCategoriaId
              });

              for (const tagId of selectedTagIds) {
                await Api.addDocumentoTag(docId, tagId);
              }

              app.innerHTML = `
                <div class="view-transition">
                ${renderHeader()}
                <section class="section">
                  <div class="cadastro-success">
                    <div class="cadastro-success-icon">${icon('clipboard-check')}</div>
                    <h2>Documento cadastrado!</h2>
                    <p>O documento "${titulo}" foi cadastrado com sucesso.</p>
                    <div class="cadastro-success-actions">
                      <button class="btn-outline" onclick="App.navigate('#/biblioteca')">Ver na Biblioteca</button>
                      <button class="btn-outline" onclick="App.navigate('#/cadastrar')">Cadastrar outro</button>
                    </div>
                  </div>
                </section>
                </div>
              `;
            }
          } catch (err) {
            alert('Erro ao salvar documento. Tente novamente.');
            console.error(err);
          }
        });
      }
    }

    function attachListActions() {
      document.querySelectorAll('[data-action="edit-doc"]').forEach(btn => {
        btn.addEventListener('click', async function () {
          const docId = Number(this.dataset.docId);
          const docs = await Api.getDocumentos();
          const doc = docs.find(d => d.id === docId);
          if (!doc) return;

          editingDoc = doc;
          selectedEixoId = doc.eixoid;
          selectedCategoriaId = doc.categoriaid;
          selectedIconeId = doc.iconeid;
          formTitulo = doc.titulo;
          formDescricao = doc.descricao || '';
          formUrl = doc.url;
          formAutor = doc.autor_origem || '';
          formTipo = doc.tipo || 'PDF';
          selectedTagIds = new Set();
          if (doc.tags) {
            doc.tags.forEach(t => {
              const tag = tags.find(tg => tg.nome === t.nome);
              if (tag) selectedTagIds.add(tag.id);
            });
          }

          activeTab = 'novo';
          renderForm();
        });
      });

      document.querySelectorAll('[data-action="delete-doc"]').forEach(btn => {
        btn.addEventListener('click', function () {
          const docId = Number(this.dataset.docId);
          const docTitulo = this.dataset.docTitulo;
          showDeleteConfirm(docId, docTitulo);
        });
      });
    }

    function showDeleteConfirm(docId, docTitulo) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-confirm">
          <div class="modal-confirm-icon">${icon('trash-2')}</div>
          <h3>Excluir documento</h3>
          <p>Tem certeza que deseja excluir <strong>"${docTitulo}"</strong>? Esta ação não pode ser desfeita.</p>
          <div class="modal-confirm-actions">
            <button class="btn-modal-cancel" id="modal-cancel">Cancelar</button>
            <button class="btn-modal-danger" id="modal-confirm-delete">Excluir</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      overlay.querySelector('#modal-confirm-delete').addEventListener('click', async () => {
        try {
          await Api.deleteDocumento(docId);
          overlay.remove();
          renderForm();
        } catch (err) {
          alert('Erro ao excluir documento.');
          console.error(err);
        }
      });
    }

    await renderForm();
  }

  return {
    init,
    showLoading,
    renderHome,
    renderEixo,
    renderBiblioteca,
    renderFavoritos,
    renderCadastro
  };
})();
