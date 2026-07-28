// Configuração Supabase — preencha com suas credenciais
// Se vazio, o app usa dados locais de demonstração
const SUPABASE_CONFIG = {
  url: "https://ytpqyxyqlfmwfpjxekea.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHF5eHlxbGZtd2Zwanhla2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzU4NzAsImV4cCI6MjA5OTY1MTg3MH0.sxffwSUgqeIMT8FaMqCbFdYyaYRxXbqkSSA33HxdKDk",
};

// Quando true, o app mostra apenas o Eixo "Documentos legais e curriculares"
// (id 1). Altere para false para mostrar todos os Eixos novamente.
const EIXO_DOCUMENTOS_ONLY = true;
const EIXO_DOCUMENTOS_ID = 1;
