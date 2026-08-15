const Store = (() => {
  const DB_NAME = 'edubase';
  const DB_VERSION = 2;
  const STORE_BOOKMARKS = 'bookmarks';
  const STORE_REMOVIDAS = 'notificacoes_removidas';
  const SESSION_KEY = 'edubase_sessao';
  const SESSION_DURACAO_MS = 60 * 60 * 1000;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
          const store = db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'docId' });
          store.createIndex('saved_at', 'saved_at', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_REMOVIDAS)) {
          db.createObjectStore(STORE_REMOVIDAS, { keyPath: 'docId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addBookmark(doc) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
      const store = tx.objectStore(STORE_BOOKMARKS);
      store.put({
        docId: Number(doc.id),
        titulo: doc.titulo,
        descricao: doc.descricao || '',
        url: doc.url,
        tipo: doc.tipo || '',
        autor_origem: doc.autor_origem || '',
        iconeid: doc.iconeid,
        tags: doc.tags || [],
        eixoid: doc.eixoid,
        saved_at: new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function removeBookmark(docId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
      const store = tx.objectStore(STORE_BOOKMARKS);
      store.delete(Number(docId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAllBookmarks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKMARKS);
      const request = store.getAll();
      request.onsuccess = () => {
        const docs = request.result || [];
        docs.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllBookmarkIds() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKMARKS);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function isBookmarked(docId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKMARKS);
      const request = store.get(Number(docId));
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addRemovida(docId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REMOVIDAS, 'readwrite');
      const store = tx.objectStore(STORE_REMOVIDAS);
      store.put({ docId: Number(docId), removed_at: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function isRemovida(docId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REMOVIDAS, 'readonly');
      const store = tx.objectStore(STORE_REMOVIDAS);
      const request = store.get(Number(docId));
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getTodasRemovidas() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REMOVIDAS, 'readonly');
      const store = tx.objectStore(STORE_REMOVIDAS);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function setSessao(user) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: user.id,
        nome: user.nome,
        email: user.email,
        senha_padrao: !!user.senha_padrao,
        login_em: new Date().toISOString()
      }));
    } catch (e) {}
  }

  function getSessao() {
    try {
      const sessao = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
      if (!sessao) return null;
      if (!sessao.login_em) return null;
      const idadeMs = Date.now() - new Date(sessao.login_em).getTime();
      if (idadeMs > SESSION_DURACAO_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return sessao;
    } catch (e) {
      return null;
    }
  }

  function clearSessao() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  return { addBookmark, removeBookmark, getAllBookmarks, getAllBookmarkIds, isBookmarked, addRemovida, isRemovida, getTodasRemovidas, setSessao, getSessao, clearSessao };
})();
