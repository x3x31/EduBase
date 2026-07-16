const Api = (() => {
  let supabase = null;
  let useMock = true;

  function init() {
    const { url, anonKey } = SUPABASE_CONFIG || {};
    if (url && anonKey && typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(url, anonKey);
      useMock = false;
    }
  }

  async function getEixos() {
    if (useMock) return MOCK_DATA.eixos;
    const { data, error } = await supabase.from('eixos').select('*').order('ordem');
    if (error) throw error;
    return data;
  }

  async function getEixo(id) {
    if (useMock) return MOCK_DATA.eixos.find(e => e.id === Number(id));
    const { data, error } = await supabase.from('eixos').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function getCategorias(eixoId) {
    if (useMock) {
      return MOCK_DATA.categorias
        .filter(c => c.eixoid === Number(eixoId))
        .sort((a, b) => a.ordem - b.ordem);
    }
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('eixoid', eixoId)
      .order('ordem');
    if (error) throw error;
    return data;
  }

  async function getTags() {
    if (useMock) return MOCK_DATA.tags;
    const { data, error } = await supabase.from('tags').select('*').order('nome');
    if (error) throw error;
    return data;
  }

  async function getIcones() {
    if (useMock) return MOCK_DATA.icone;
    const { data, error } = await supabase.from('icone').select('*').order('id');
    if (error) throw error;
    return data;
  }

  async function getDocumentos({ eixoId, categoriaId, busca } = {}) {
    if (useMock) {
      let docs = [...MOCK_DATA.documentos];
      if (eixoId) docs = docs.filter(d => d.eixoid === Number(eixoId));
      if (categoriaId) docs = docs.filter(d => d.categoriaid === Number(categoriaId));
      if (busca) {
        const q = busca.toLowerCase();
        docs = docs.filter(d =>
          d.titulo.toLowerCase().includes(q) ||
          (d.descricao && d.descricao.toLowerCase().includes(q)) ||
          (d.autor_origem && d.autor_origem.toLowerCase().includes(q))
        );
      }
      return docs;
    }

    let query = supabase.from('documentos_completo').select('*');

    if (eixoId) query = query.eq('eixoid', eixoId);
    if (categoriaId) query = query.eq('categoriaid', categoriaId);
    if (busca) query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%,autor_origem.ilike.%${busca}%`);

    const { data, error } = await query.order('titulo');
    if (error) throw error;

    return data.map(d => ({
      ...d,
      tags: typeof d.tags === 'string' ? JSON.parse(d.tags) : (d.tags || [])
    }));
  }

  async function getDocumentosRecentes(limite = 15) {
    if (useMock) {
      return [...MOCK_DATA.documentos]
        .sort((a, b) => b.id - a.id)
        .slice(0, limite);
    }
    const { data, error } = await supabase
      .from('documentos_completo')
      .select('*')
      .order('datacadastro', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data.map(d => ({
      ...d,
      tags: typeof d.tags === 'string' ? JSON.parse(d.tags) : (d.tags || [])
    }));
  }

  async function createDocumento(doc) {
    if (useMock) {
      const newId = Math.max(...MOCK_DATA.documentos.map(d => d.id)) + 1;
      const newDoc = { id: newId, ...doc, datacadastro: new Date().toISOString(), ativo: true };
      MOCK_DATA.documentos.push(newDoc);
      const cat = MOCK_DATA.categorias.find(c => c.id === doc.categoriaid);
      if (cat) cat.totaldocumentos++;
      return newId;
    }

    const { data, error } = await supabase
      .from('documentos')
      .insert({
        titulo: doc.titulo,
        descricao: doc.descricao,
        url: doc.url,
        tipo: doc.tipo,
        autor_origem: doc.autor_origem,
        iconeid: doc.iconeid,
        eixoid: doc.eixoid,
        categoriaid: doc.categoriaid
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async function addDocumentoTag(docId, tagId) {
    if (useMock) return;
    const { error } = await supabase
      .from('documento_tags')
      .insert({ documentoid: docId, tagid: tagId });
    if (error) throw error;
  }

  async function removeDocumentoTags(docId) {
    if (useMock) return;
    const { error } = await supabase
      .from('documento_tags')
      .delete()
      .eq('documentoid', docId);
    if (error) throw error;
  }

  async function updateDocumentoTags(docId, tagIds) {
    await removeDocumentoTags(docId);
    for (const tagId of tagIds) {
      await addDocumentoTag(docId, tagId);
    }
  }

  async function updateDocumento(id, doc) {
    if (useMock) {
      const idx = MOCK_DATA.documentos.findIndex(d => d.id === Number(id));
      if (idx === -1) throw new Error('Documento não encontrado');
      MOCK_DATA.documentos[idx] = { ...MOCK_DATA.documentos[idx], ...doc };
      return;
    }
    const { error } = await supabase
      .from('documentos')
      .update({
        titulo: doc.titulo,
        descricao: doc.descricao,
        url: doc.url,
        tipo: doc.tipo,
        autor_origem: doc.autor_origem,
        iconeid: doc.iconeid,
        eixoid: doc.eixoid,
        categoriaid: doc.categoriaid
      })
      .eq('id', id);
    if (error) throw error;
  }

  async function deleteDocumento(id) {
    if (useMock) {
      const doc = MOCK_DATA.documentos.find(d => d.id === Number(id));
      if (doc) {
        const cat = MOCK_DATA.categorias.find(c => c.id === doc.categoriaid);
        if (cat && cat.totaldocumentos > 0) cat.totaldocumentos--;
      }
      MOCK_DATA.documentos = MOCK_DATA.documentos.filter(d => d.id !== Number(id));
      return;
    }
    const { error } = await supabase.rpc('delete_documento', { p_id: id });
    if (error) throw error;
  }

  function isUsingMock() {
    return useMock;
  }

  return { init, getEixos, getEixo, getCategorias, getTags, getIcones, getDocumentos, getDocumentosRecentes, createDocumento, addDocumentoTag, removeDocumentoTags, updateDocumentoTags, updateDocumento, deleteDocumento, isUsingMock };
})();
