-- ============================================================
-- EduBase — Migration: Usuários e autenticação
-- Execute no SQL Editor do Supabase (Dashboard > SQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- TABELA DE USUÁRIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  senha_padrao  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- SEED: usuários iniciais (senha padrão: 123456)
-- A senha é armazenada como hash bcrypt (pgcrypto)
-- ------------------------------------------------------------
INSERT INTO usuarios (nome, email, senha_hash, senha_padrao)
VALUES
  ('Priscila Kaline', 'priscilakalinec@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE),
  ('Michel Alves',    'x3x31@hotmail.com',         crypt('123456', gen_salt('bf', 10)), TRUE)
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------
-- FUNÇÃO: autenticar_usuario
-- Valida e-mail e senha no servidor (a senha nunca sai em claro)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION autenticar_usuario(p_email TEXT, p_senha TEXT)
RETURNS TABLE(id INTEGER, nome TEXT, email TEXT, senha_padrao BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT u.id, u.nome, u.email, u.senha_padrao
  FROM usuarios u
  WHERE LOWER(u.email) = LOWER(p_email)
    AND u.senha_hash = crypt(p_senha, u.senha_hash);
$$;

-- ------------------------------------------------------------
-- FUNÇÃO: alterar_senha
-- Troca a senha validando a senha atual; novo hash no banco
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION alterar_senha(p_email TEXT, p_senha_atual TEXT, p_nova_senha TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE usuarios
  SET senha_hash = crypt(p_nova_senha, gen_salt('bf', 10)),
      senha_padrao = FALSE
  WHERE LOWER(email) = LOWER(p_email)
    AND senha_hash = crypt(p_senha_atual, senha_hash);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- ------------------------------------------------------------
-- PERMISSÕES (anon pode executar apenas as funções)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION autenticar_usuario(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION alterar_senha(TEXT, TEXT, TEXT) TO anon;
GRANT USAGE ON SCHEMA public TO anon;
