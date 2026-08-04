-- ============================================================
-- EduBase — Schema Supabase
-- Execute no SQL Editor do Supabase (Dashboard > SQL)
-- ============================================================

-- Limpar objetos anteriores (seguro re-executar)
DROP VIEW IF EXISTS documentos_completo CASCADE;
DROP VIEW IF EXISTS documentos_com_tags CASCADE;
DROP TRIGGER IF EXISTS trg_atualizar_total_documentos ON documentos;
DROP FUNCTION IF EXISTS atualizar_total_documentos() CASCADE;
DROP FUNCTION IF EXISTS registrar_visualizacao(INTEGER) CASCADE;
DROP TABLE IF EXISTS estatisticas CASCADE;
DROP TABLE IF EXISTS documento_tags CASCADE;
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS icone CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS eixos CASCADE;

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS eixos (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  ordem         INTEGER NOT NULL DEFAULT 0,
  cor           TEXT DEFAULT '#1B5E4B',
  icone         TEXT DEFAULT 'book-open',
  dica          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
  id                SERIAL PRIMARY KEY,
  eixoid            INTEGER NOT NULL REFERENCES eixos(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  icone             TEXT DEFAULT 'folder',
  ordem             INTEGER NOT NULL DEFAULT 0,
  totaldocumentos   INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL UNIQUE,
  cor       TEXT DEFAULT '#E8F5E9',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS icone (
  id          SERIAL PRIMARY KEY,
  emoji       TEXT NOT NULL,
  nome        TEXT NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id              SERIAL PRIMARY KEY,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  url             TEXT NOT NULL,
  tipo            TEXT DEFAULT 'PDF',
  autor_origem    TEXT,
  iconeid         INTEGER REFERENCES icone(id),
  eixoid          INTEGER NOT NULL REFERENCES eixos(id) ON DELETE CASCADE,
  categoriaid     INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  datacadastro    TIMESTAMPTZ DEFAULT NOW(),
  ativo           BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS documento_tags (
  documentoid INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  tagid       INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (documentoid, tagid)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_categorias_eixoid ON categorias(eixoid);
CREATE INDEX IF NOT EXISTS idx_documentos_categoriaid ON documentos(categoriaid);
CREATE INDEX IF NOT EXISTS idx_documentos_eixoid ON documentos(eixoid);
CREATE INDEX IF NOT EXISTS idx_documentos_iconeid ON documentos(iconeid);
CREATE INDEX IF NOT EXISTS idx_documentos_ativo ON documentos(ativo);
CREATE INDEX IF NOT EXISTS idx_documento_tags_doc ON documento_tags(documentoid);
CREATE INDEX IF NOT EXISTS idx_documento_tags_tag ON documento_tags(tagid);

-- ============================================================
-- FUNÇÃO: atualizar totaldocumentos
-- ============================================================

CREATE OR REPLACE FUNCTION atualizar_total_documentos()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE categorias
    SET totaldocumentos = (
      SELECT COUNT(*) FROM documentos
      WHERE categoriaid = OLD.categoriaid AND ativo = TRUE
    )
    WHERE id = OLD.categoriaid;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE categorias
    SET totaldocumentos = (
      SELECT COUNT(*) FROM documentos
      WHERE categoriaid = NEW.categoriaid AND ativo = TRUE
    )
    WHERE id = NEW.categoriaid;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.categoriaid IS DISTINCT FROM NEW.categoriaid THEN
      UPDATE categorias
      SET totaldocumentos = (
        SELECT COUNT(*) FROM documentos
        WHERE categoriaid = OLD.categoriaid AND ativo = TRUE
      )
      WHERE id = OLD.categoriaid;
    END IF;
    UPDATE categorias
    SET totaldocumentos = (
      SELECT COUNT(*) FROM documentos
      WHERE categoriaid = NEW.categoriaid AND ativo = TRUE
    )
    WHERE id = NEW.categoriaid;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_atualizar_total_documentos ON documentos;
CREATE TRIGGER trg_atualizar_total_documentos
  AFTER INSERT OR UPDATE OR DELETE ON documentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_total_documentos();

-- ============================================================
-- VIEW: documentos completos com tags agregadas
-- ============================================================

CREATE OR REPLACE VIEW documentos_completo AS
SELECT
  d.*,
  c.nome  AS categoria_nome,
  e.nome  AS eixo_nome,
  e.cor   AS eixo_cor,
  e.icone AS eixo_icone,
  i.nome  AS icone_nome,
  i.descricao AS icone_descricao,
  COALESCE(
    json_agg(
      json_build_object('id', t.id, 'nome', t.nome, 'cor', t.cor)
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) AS tags
FROM documentos d
JOIN categorias c   ON c.id  = d.categoriaid
JOIN eixos e        ON e.id  = d.eixoid
LEFT JOIN icone i   ON i.id  = d.iconeid
LEFT JOIN documento_tags dt ON dt.documentoid = d.id
LEFT JOIN tags t    ON t.id  = dt.tagid
WHERE d.ativo = TRUE
GROUP BY d.id, c.id, e.id, i.id;

-- ============================================================
-- ROW LEVEL SECURITY (leitura pública)
-- ============================================================

ALTER TABLE eixos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE icone ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública eixos" ON eixos FOR SELECT USING (true);
CREATE POLICY "Leitura pública categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Leitura pública documentos" ON documentos FOR SELECT USING (ativo = true);
CREATE POLICY "Leitura pública tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Leitura pública icone" ON icone FOR SELECT USING (true);
CREATE POLICY "Leitura pública documento_tags" ON documento_tags FOR SELECT USING (true);

-- Permissão de inserção para documentos (via anon/authenticated)
CREATE POLICY "Inserir documentos" ON documentos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Inserir documento_tags" ON documento_tags FOR INSERT TO anon WITH CHECK (true);

-- Permissão de atualização para documentos (via anon/authenticated)
CREATE POLICY "Atualizar documentos" ON documentos FOR UPDATE TO anon USING (true);
CREATE POLICY "Atualizar documento_tags" ON documento_tags FOR UPDATE TO anon USING (true);

-- Permissão de exclusão para documentos e tags (via anon/authenticated)
CREATE POLICY "Remover documento_tags" ON documento_tags FOR DELETE TO anon USING (true);
CREATE POLICY "Remover documentos" ON documentos FOR DELETE TO anon USING (true);

GRANT SELECT ON documentos_completo TO anon, authenticated;

-- ============================================================
-- DADOS INICIAIS — EIXOS
-- ============================================================

INSERT INTO eixos (id, nome, descricao, ordem, cor, icone, dica) VALUES
(1, 'Documentos Normativos',
 'Políticas Públicas de Educação Especial Inclusiva.',
 1, '#1B5E4B', 'file-shield',
 'Conhecer os documentos legais é o primeiro passo para garantir direitos e promover práticas pedagógicas inclusivas.'),
(2, 'Estratégias pedagógicas',
 'Abordagens e práticas que promovem o ensino inclusivo e significativo, favorecendo o desenvolvimento de todos os estudantes.',
 2, '#624693', 'book-open',
 'Combine diferentes estratégias pedagógicas para atender às diversidades da sua turma.'),
(3, 'Atividades e recursos pedagógicos',
 'Materiais e atividades adaptadas para diferentes necessidades e contextos, promovendo acessibilidade e participação.',
 3, '#E8752A', 'pencil-case',
 'Adapte as atividades às necessidades dos alunos, mantendo os objetivos de aprendizagem.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('eixos_id_seq', (SELECT MAX(id) FROM eixos));

-- ============================================================
-- DADOS INICIAIS — CATEGORIAS
-- ============================================================

INSERT INTO categorias (eixoid, nome, icone, ordem) VALUES
-- Eixo 1
(1, 'Legislação e políticas',       'scale',          1),
(1, 'Diretrizes e orientações',     'book-open',      2),
(1, 'BNCC e currículo',             'graduation-cap', 3),
(1, 'Direitos e marcos legais',     'gavel',          4),
(1, 'Planos e normativas',          'file-text',      5),
-- Eixo 2
(2, 'Ensino colaborativo',          'users',          1),
(2, 'Aprendizagem ativa',           'lightbulb',      2),
(2, 'Diferenciação pedagógica',     'layers',         3),
(2, 'Avaliação inclusiva',          'clipboard-check',4),
(2, 'Metodologias ativas',          'puzzle',         5),
-- Eixo 3
(3, 'Planos de aula adaptados',     'calendar',       1),
(3, 'Materiais imprimíveis',        'printer',        2),
(3, 'Vídeos e tutoriais',           'play-circle',    3),
(3, 'Recursos digitais',            'monitor',        4),
(3, 'Jogos e brincadeiras',         'gamepad-2',      5);

-- ============================================================
-- DADOS INICIAIS — TAGS
-- ============================================================

INSERT INTO tags (nome, cor) VALUES
('Colaboração',      '#EDE7F6'),
('Planejamento',     '#FFF3E0'),
('Metodologia',      '#E3F2FD'),
('Avaliação',        '#FCE4EC'),
('Inclusão',         '#FFF3E0'),
('Deficiência intelectual', '#E8F5E9'),
('Tecnologia assistiva', '#E3F2FD'),
('DA',               '#EDE7F6'),
('Ensino colaborativo', '#E8F5E9')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- DADOS INICIAIS — ÍCONES
-- ============================================================

INSERT INTO icone (emoji, nome, descricao) VALUES
('📄', 'file-shield',      'Escudo com documento'),
('📖', 'book-open',        'Livro aberto'),
('✏️', 'pencil-case',      'Estojo de lápis'),
('⚖️', 'scale',            'Balança'),
('🎓', 'graduation-cap',   'Capelo de formatura'),
('⚖️', 'gavel',            'Martelo de juiz'),
('📝', 'file-text',        'Documento com texto'),
('👥', 'users',            'Grupo de pessoas'),
('💡', 'lightbulb',        'Lâmpada de ideia'),
('📚', 'layers',           'Camadas empilhadas'),
('✅', 'clipboard-check',  'Prancheta com check'),
('🧩', 'puzzle',           'Peça de quebra-cabeça'),
('📅', 'calendar',         'Calendário'),
('🖨️', 'printer',          'Impressora'),
('▶️', 'play-circle',      'Círculo com play'),
('🖥️', 'monitor',          'Monitor de computador'),
('🎮', 'gamepad-2',        'Controle de jogos'),
('📁', 'folder',           'Pasta'),
('➡️', 'chevron-right',    'Seta para direita'),
('⬅️', 'chevron-left',     'Seta para esquerda'),
('🔔', 'bell',             'Sino de notificação'),
('🎯', 'target',           'Alvo'),
('⭐', 'star',             'Estrela'),
('👁️', 'eye',              'Olho de visualização'),
('🔖', 'bookmark',         'Marcador'),
('🔍', 'search',           'Lupa de busca'),
('🔽', 'filter',           'Filtro'),
('➡️', 'arrow-right',      'Seta direita'),
('🗑️', 'trash-2',          'Lixeira'),
('⚖️', 'balanca-juridica', 'Balança — Legislação geral e pareceres jurídicos'),
('📜', 'pergaminho',       'Pergaminho — Leis federais (LDB, ECA, Estatuto da Pessoa com Deficiência)'),
('📕', 'livro-vermelho',   'Livro vermelho — Código Civil, Constituição ou regimento interno'),
('🏛️', 'predio-constitucional', 'Prédio constitucional — Decisões de tribunais, Ministério Público'),
('👨', 'juiz',      'Juiz — Sentenças judiciais, liminares e mandados de segurança'),
('👩', 'juiza',     'Juíza — Atas de audiência e determinações do Poder Judiciário'),
('🛡️', 'escudo',           'Escudo — Medidas de proteção ao menor, garantias legais'),
('📑', 'separadores',      'Separadores — Decretos, portarias normativas e emendas'),
('✒️', 'caneta-tinteiro',  'Caneta tinteiro — Assinatura de termos de ajustamento de conduta (TAC)'),
('🖋️', 'caneta-estilografica', 'Caneta estilográfica — Contratos de prestação de serviços e convênios legais'),
('🔏', 'cadeado-caneta',   'Cadeado com caneta — Termos de confidencialidade e LGPD'),
('🔒', 'cadeado-fechado',  'Cadeado fechado — Segredo de justiça, processos sigilosos'),
('🔓', 'cadeado-aberto',   'Cadeado aberto — Documentos de domínio público'),
('🤝', 'aperto-maos',      'Aperto de mãos — Acordos extrajudiciais, mediações'),
('🗣️', 'megafone',         'Megafone — Denúncias formais, ouvidoria'),
('🚫', 'proibido',         'Proibido — Notificações de infrações, penalidades'),
('⚠️', 'alerta',           'Alerta — Notificações de urgência judicial'),
('📅', 'calendario-prazo', 'Calendário com prazo — Prazos legais para cumprimento de decisões'),
('📬', 'caixa-correio',    'Caixa de correio — Citações, intimações e notificações oficiais'),
('📝', 'memorial',         'Memorial — Petições, defesas administrativas'),
('🧩', 'quebra-cabeca-TEA', 'Quebra-cabeça — Documentos, laudos e triagens de estudantes com TEA'),
('🧠', 'cerebro',          'Cérebro — Laudos de neurodivergências (TDAH, Dislexia, Discalculia, TOD)'),
('♿', 'cadeira-rodas',    'Cadeira de rodas — Acessibilidade arquitetônica e laudos de deficiência motora'),
('🤟', 'te-amo',           'Sinal de Te Amo — Recursos de acessibilidade em Libras e cultura surda'),
('👂', 'ouvido-aparelho',  'Ouvido com aparelho — Deficiência auditiva e uso de tecnologias (AASI/IC)'),
('🧏', 'pessoa-surda',     'Pessoa surda — Relatórios de intérpretes e tradutores de Libras oficiais'),
('🦯', 'bengala-branca',   'Bengala branca — Documentos de estudantes com deficiência visual ou cegueira'),
('👁️', 'olho-adaptacoes',  'Olho — Adaptações de layout (textos ampliados ou material em Braille)'),
('🐕', 'cao-guia', 'Cão-guia — Autorizações legais para o trânsito de animais de assistência'),
('👣', 'pegadas',          'Pegadas — Relatórios de evolução psicomotora e fisioterapia'),
('🌈', 'arco-iris',        'Arco-íris — Transtornos globais do desenvolvimento e neurodiversidade geral'),
('💡', 'lampada-ahsd',     'Lâmpada — Estudantes com Altas Habilidades / Superdotação identificados'),
('🧬', 'dna',              'DNA — Laudos de síndromes genéticas estruturais (Síndrome de Down, etc.)'),
('🤍', 'coracao-branco',   'Coração branco — Declarações e laudos de Deficiência Intelectual (DI)'),
('🛠️', 'ferramentas',     'Ferramentas — Adaptações de mobiliário ou recursos de Tecnologia Assistiva'),
('🌱', 'broto',            'Broto — Relatórios de evolução contínua do Plano de Atendimento (PAE)'),
('🎨', 'paleta',           'Paleta de tintas — Relatórios técnicos de Terapia Ocupacional'),
('🗣️', 'cabeca-falando',   'Cabeça falando — Pareceres analíticos de Fonoaudiologia'),
('🧸', 'urso-pelucia',     'Urso de pelúcia — Relatórios e manejos de Psicologia Infantil'),
('🏥', 'hospital',         'Hospital — Encaminhamentos oficiais para a rede de saúde (SUS, CAPS)'),
('📄', 'folha-branco',     'Folha em branco — Arquivos textuais simples, ofícios e circulares'),
('📂', 'pasta-aberta',     'Pasta aberta — Prontuário digital unificado do estudante'),
('📋', 'prancheta',        'Prancheta — Fichas cadastrais e requerimentos de matrícula'),
('📜', 'diploma',          'Diploma — Histórico escolar, certidões de conclusão e diplomas'),
('📊', 'grafico',          'Gráfico de barras — Boletins de notas e relatórios quantitativos de desempenho'),
('🗓️', 'calendario-letivo', 'Calendário — Calendário letivo e registros de cumprimento de carga horária'),
('📥', 'caixa-entrada',    'Caixa de entrada — Upload de novos arquivos aguardando validação interna'),
('🆔', 'botao-id',         'Botão ID — Documentos pessoais obrigatórios (RG, CPF, Certidão de Nascimento)'),
('📷', 'camera',           'Câmera — Foto oficial do aluno para o sistema de identificação'),
('✉️', 'envelope',         'Envelope — Correspondências e avisos formais enviados aos responsáveis'),
('📌', 'taxinha',          'Taxinha — Avisos de extrema importância fixados no topo do prontuário'),
('📎', 'clipe',            'Clipe de papel — Adendos contratuais ou documentos anexos secundários'),
('🖨️', 'impressora-doc',  'Impressora — Documentos validados prontos para emissão física'),
('🔍', 'lupa-auditoria',   'Lupa — Auditorias de documentos ou processos em fase de verificação'),
('🗂️', 'divisorias',       'Divisórias de fichário — Organização de arquivos por anos letivos anteriores'),
('✔️', 'verificacao',      'Marca de verificação — Documentação homologada e totalmente regularizada'),
('❌', 'xis-vermelho',     'Xis vermelho — Documentação rejeitada, vencida ou com pendências'),
('🔄', 'setas-rotacao',    'Setas de rotação — Documentos que precisam de renovação periódica (ex: laudos)'),
('💼', 'pasta-trabalho',   'Pasta de trabalho — Documentos funcionais de professores e corpo técnico'),
('✍️', 'mao-escrevendo',   'Mão escrevendo — Atas de reuniões pedagógicas e conselhos de classe'),
('🍼', 'mamadeira',        'Mamadeira — Matrículas e rotinas do Berçário'),
('👶', 'bebe',             'Bebê — Documentação da Educação Infantil (Creche)'),
('🧒', 'crianca',          'Criança — Documentos do Ensino Fundamental I (Anos Iniciais)'),
('🧑', 'adolescente',      'Adolescente — Documentos do Ensino Fundamental II (Anos Finais)'),
('🧑', 'estudante', 'Estudante — Documentos do Ensino Médio'),
('🎒', 'mochila',          'Mochila — Listas de materiais e termos de uso de uniforme'),
('🏫', 'escola',           'Escola — Projetos Político-Pedagógicos (PPP) institucionais'),
('🚌', 'onibus-escolar',   'Ônibus escolar — Autorizações de transporte escolar e viagens de estudo'),
('🍽️', 'prato',            'Prato e talheres — Mapeamento de restrições alimentares e merenda'),
('🏡', 'casa',             'Casa — Pareceres sobre Ensino Domiciliar ou estudantes em regime hospitalar'),
('⏰', 'relogio',          'Relógio — Controle rigoroso de frequência, faltas e atrasos'),
('🌅', 'sol-nascente',     'Sol nascente — Documentos vinculados ao Turno Matutino'),
('🌇', 'por-do-sol',       'Pôr do sol — Documentos vinculados ao Turno Vespertino'),
('🌃', 'noite-estrelada',  'Noite estrelada — Documentos vinculados à EJA (Educação de Jovens e Adultos)'),
('👟', 'tenis',            'Tênis de corrida — Práticas esportivas e relatórios de Educação Física'),
('🩺', 'estetoscopio',     'Estetoscópio — Autorizações médicas para atividades físicas severas'),
('💊', 'pillula',          'Pílula — Termos de autorização para administração de remédios na rotina'),
('🩹', 'curativo',         'Curativo — Prontuário de primeiros socorros e ocorrências escolares'),
('🍎', 'maca',             'Maçã vermelha — Declarações de alergias alimentares graves'),
('💬', 'balao-conversa',   'Balão de conversa — Anamneses e entrevistas formais com a família'),
('✏️', 'lapis-alfabetizacao', 'Lápis — Alfabetização e relatórios de escrita inicial'),
('📚', 'livros',           'Livros — Fichas de leitura e projetos da biblioteca'),
('📐', 'esquadro',         'Esquadro e régua — Produções de matemática e geometria'),
('🔬', 'microscopio',      'Microscópio — Relatórios de laboratório de ciências'),
('🗺️', 'mapa-mundi',       'Mapa-múndi — Trabalhos e projetos de geografia e história'),
('🎵', 'nota-musical',     'Nota musical — Oficinas de música e expressões rítmicas'),
('🖼️', 'quadro',           'Quadro moldurado — Portfólios de artes visuais dos alunos'),
('💻', 'computador',       'Computador — Atividades de informática ou uso de plataformas digitais'),
('🧮', 'abaco',            'Ábaco — Estimulação cognitiva e matemática básica estruturada'),
('🎭', 'mascaras',         'Máscaras de teatro — Projetos de expressão corporal e artes cênicas'),
('♟️', 'peao-xadrez',      'Peão de xadrez — Oficinas de raciocínio lógico e jogos de tabuleiro'),
('🚀', 'foguete',          'Foguete — Projetos de astronomia, robótica ou feiras científicas'),
('🌳', 'arvore',           'Árvore — Projetos e relatórios de educação ambiental'),
('💵', 'cedula',           'Cédula de dólar — Projetos transversais de educação financeira'),
('🇺🇸', 'bandeira-eua',    'Bandeira EUA — Registros de proficiência ou aulas de língua inglesa'),
('🗣️', 'rosto-falando',    'Rosto falando — Avaliações de produções orais e debates'),
('🍳', 'frigideira',       'Frigideira — Oficinas de culinária pedagógica para desenvolvimento de autonomia'),
('🌱', 'planta-jovem',     'Planta jovem — Projetos de horta escolar e biologia prática'),
('🎯', 'alvo-pdi',         'Alvo — Relatórios de atingimento de metas do PDI/PEI'),
('🏆', 'trofeu',           'Troféu — Registros de premiações e destaques acadêmicos'),
('📝', 'memorial-recursos', 'Memorial — Petições, defesas administrativas e recursos escolares')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- DADOS INICIAIS — DOCUMENTOS
-- ============================================================

-- Eixo 1 — Documentos legais
INSERT INTO documentos (titulo, descricao, url, tipo, autor_origem, iconeid, eixoid, categoriaid) VALUES
('Lei Brasileira de Inclusão da Pessoa com Deficiência',
 'Lei que garante os direitos das pessoas com deficiência.',
 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm',
 'PDF', 'Lei nº 13.146/2015',
 (SELECT id FROM icone WHERE nome = 'pergaminho'), 1,
 (SELECT id FROM categorias WHERE nome = 'Legislação e políticas' AND eixoid = 1)),

('Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva',
 'Documento que orienta a educação especial inclusiva no Brasil.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'PDF', 'Ministério da Educação',
 (SELECT id FROM icone WHERE nome = 'predio-constitucional'), 1,
 (SELECT id FROM categorias WHERE nome = 'Legislação e políticas' AND eixoid = 1)),

('Base Nacional Comum Curricular (BNCC)',
 'Documento que define o conjunto orgânico de aprendizagens essenciais.',
 'http://basenacionalcomum.mec.gov.br/',
 'site', 'Ministério da Educação',
 (SELECT id FROM icone WHERE nome = 'separadores'), 1,
 (SELECT id FROM categorias WHERE nome = 'BNCC e currículo' AND eixoid = 1)),

('Orientações para a Implementação da Educação Inclusiva',
 'Orientações práticas para implementação da educação inclusiva nas escolas.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'PDF', 'Ministério da Educação',
 (SELECT id FROM icone WHERE nome = 'memorial'), 1,
 (SELECT id FROM categorias WHERE nome = 'Diretrizes e orientações' AND eixoid = 1));

-- Eixo 2 — Estratégias pedagógicas
INSERT INTO documentos (titulo, descricao, url, tipo, autor_origem, iconeid, eixoid, categoriaid) VALUES
('Ensino Colaborativo',
 'Estratégia que promove a interação entre pares com e sem deficiência.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'site', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'aperto-maos'), 2,
 (SELECT id FROM categorias WHERE nome = 'Ensino colaborativo' AND eixoid = 2)),

('Aprendizagem Baseada em Projetos',
 'Metodologia que envolve os estudantes em projetos reais e significativos.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'site', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'lampada-ahsd'), 2,
 (SELECT id FROM categorias WHERE nome = 'Aprendizagem ativa' AND eixoid = 2)),

('Diferenciação Pedagógica na Prática',
 'Como adaptar ensino, conteúdo e avaliação para atender a todos.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'site', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'quebra-cabeca-TEA'), 2,
 (SELECT id FROM categorias WHERE nome = 'Diferenciação pedagógica' AND eixoid = 2)),

('Avaliação Inclusiva: Princípios e Práticas',
 'Princípios para uma avaliação que considera as diversidades.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'site', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'verificacao'), 2,
 (SELECT id FROM categorias WHERE nome = 'Avaliação inclusiva' AND eixoid = 2));

-- Eixo 3 — Atividades e recursos
INSERT INTO documentos (titulo, descricao, url, tipo, autor_origem, iconeid, eixoid, categoriaid) VALUES
('Comunicação Alternativa em Sala de Aula',
 'Recursos e estratégias de comunicação alternativa para estudantes com necessidades específicas.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'site', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'cadeira-rodas'), 3,
 (SELECT id FROM categorias WHERE nome = 'Recursos digitais' AND eixoid = 3)),

('Atividades de Matemática Adaptadas',
 'Sequências didáticas de matemática adaptadas para diferentes necessidades.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'PDF', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'abaco'), 3,
 (SELECT id FROM categorias WHERE nome = 'Planos de aula adaptados' AND eixoid = 3)),

('Cartões de Comunicação Visual',
 'Materiais imprimíveis para comunicação aumentativa e alternativa.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'PDF', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'te-amo'), 3,
 (SELECT id FROM categorias WHERE nome = 'Materiais imprimíveis' AND eixoid = 3)),

('Jogos Cooperativos Inclusivos',
 'Atividades lúdicas que promovem a participação de todos os estudantes.',
 'https://www.gov.br/mec/pt-br/escolas-educacao-basica/educacao-especial',
 'site', 'PROFEI/UERN',
 (SELECT id FROM icone WHERE nome = 'peao-xadrez'), 3,
 (SELECT id FROM categorias WHERE nome = 'Jogos e brincadeiras' AND eixoid = 3));

-- ============================================================
-- DADOS INICIAIS — RELAÇÃO DOCUMENTO-TAGS
-- ============================================================

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id
FROM documentos d
JOIN tags t ON t.nome = 'PDF'
WHERE d.tipo = 'PDF'
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Ensino Colaborativo' AND t.nome = 'Colaboração'
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Aprendizagem Baseada em Projetos' AND t.nome = 'Metodologia'
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Diferenciação Pedagógica na Prática' AND t.nome = 'Planejamento'
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Avaliação Inclusiva: Princípios e Práticas' AND t.nome = 'Avaliação'
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Comunicação Alternativa em Sala de Aula' AND t.nome IN ('Inclusão', 'Tecnologia assistiva')
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Atividades de Matemática Adaptadas' AND t.nome IN ('Inclusão', 'DA')
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Cartões de Comunicação Visual' AND t.nome = 'Deficiência intelectual'
ON CONFLICT DO NOTHING;

INSERT INTO documento_tags (documentoid, tagid)
SELECT d.id, t.id FROM documentos d, tags t
WHERE d.titulo = 'Jogos Cooperativos Inclusivos' AND t.nome = 'Ensino colaborativo'
ON CONFLICT DO NOTHING;

-- ============================================================
-- ATUALIZAR TOTAIS APÓS SEED
-- ============================================================

UPDATE categorias c SET totaldocumentos = (
  SELECT COUNT(*) FROM documentos d WHERE d.categoriaid = c.id AND d.ativo = TRUE
);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION delete_documento(p_id bigint)
RETURNS void AS $$
DECLARE
  v_categoriaid integer;
BEGIN
  SELECT categoriaid INTO v_categoriaid FROM documentos WHERE id = p_id;
  DELETE FROM documento_tags WHERE documentoid = p_id;
  DELETE FROM documentos WHERE id = p_id;
  UPDATE categorias SET totaldocumentos = (
    SELECT COUNT(*) FROM documentos WHERE categoriaid = v_categoriaid AND ativo = TRUE
  ) WHERE id = v_categoriaid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
