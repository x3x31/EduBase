const Store = (() => {
  const DB_NAME = 'edubase';
  const DB_VERSION = 2;
  const STORE_BOOKMARKS = 'bookmarks';
  const STORE_REMOVIDAS = 'notificacoes_removidas';

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

  return { addBookmark, removeBookmark, getAllBookmarks, isBookmarked, addRemovida, isRemovida, getTodasRemovidas };
})();
