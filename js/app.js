const App = (() => {
  let currentRoute = '';

  function init() {
    Api.init();
    Views.init();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function handleRoute() {
    let hash = window.location.hash || '#/';
    if (hash === '#/' || hash === '' || hash === '#') {
      hash = '#/';
    }
    currentRoute = hash;
    renderView(hash);
    updateNav(hash);
  }

  function renderView(hash) {
    const matchEixo = hash.match(/^#\/eixo\/(\d+)$/);
    if (matchEixo) {
      Views.renderEixo(matchEixo[1]);
      return;
    }
    switch (hash) {
      case '#/':
        Views.renderHome();
        break;
      case '#/biblioteca':
        Views.renderBiblioteca();
        break;
      case '#/favoritos':
        Views.renderFavoritos();
        break;
      case '#/cadastrar':
        Views.renderCadastro();
        break;
      default:
        window.location.hash = '#/';
        break;
    }
  }

  function updateNav(hash) {
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.removeAttribute('hidden');
    document.querySelectorAll('.nav-item').forEach(item => {
      const href = item.getAttribute('href');
      let match = false;
      if (hash === '#/' && href === '#/') {
        match = true;
      } else if (hash === '#/cadastrar' && href === '#/cadastrar') {
        match = true;
      } else if (href !== '#/' && href !== '#/cadastrar' && hash.startsWith(href)) {
        match = true;
      }
      item.classList.toggle('active', match);
    });
  }

  function navigate(path) {
    window.location.hash = path;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
    init();
  });

  function getDocById(id) {
    const idNum = Number(id);
    return (MOCK_DATA.documentos || []).find(d => d.id === idNum) || null;
  }

  document.addEventListener('click', async function (e) {
    const bookmark = e.target.closest('[data-action="bookmark"]');
    if (!bookmark) return;
    e.preventDefault();
    const docId = Number(bookmark.dataset.docId);
    const isSaved = bookmark.classList.contains('saved');
    if (isSaved) {
      bookmark.classList.remove('saved');
      await Store.removeBookmark(docId);
    } else {
      bookmark.classList.add('saved');
      let doc = getDocById(docId);
      if (!doc) {
        const all = await Store.getAllBookmarks();
        doc = all.find(d => d.docId === docId);
        if (doc) doc = { id: doc.docId, ...doc };
      }
      if (doc) await Store.addBookmark(doc);
    }
  });

  return { init, navigate };
})();
