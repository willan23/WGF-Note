# Checklist de release — WGF Note 1.0.1

## 1. Qualidade obrigatória

- [x] `pnpm verify`
- [x] `pnpm build`
- [x] `pnpm build:web`
- [x] `pnpm desktop:make`
- [x] Migrações aplicadas com MySQL local
- [x] Fluxo cloud validado ponta a ponta com dois utilizadores
- [x] Execução Python real validada no backend autenticado

## 2. Aceitação manual ainda necessária antes de publicar fora do teu ambiente

- [ ] Windows: instalar a partir de `release/WGF-Note-1.0.1-Setup.exe`
- [ ] Windows: abrir ficheiros e pastas reais do PC
- [ ] Windows: criar → editar → guardar → reabrir
- [ ] Windows: navegar no workspace, renomear e eliminar
- [ ] Windows: testar autosave, tema, word wrap, templates e IA no cursor real
- [ ] Windows: executar Python e confirmar sync local

## 3. Antes de uma publicação pública

- [ ] Definir domínio/API públicos e variáveis de produção
- [ ] Configurar OAuth real para produção
- [ ] Trocar segredos locais por segredos de produção
- [ ] Preparar backups do MySQL
- [ ] Definir política de privacidade e termos
- [ ] Criar screenshots e ícones finais do instalador
- [ ] Fazer QA em pelo menos dois ambientes Windows reais
- [ ] Rever acessibilidade e comportamento com ficheiros grandes

## 4. Artefactos desta release

- Windows installer: `release/WGF-Note-1.0.1-Setup.exe`
- App desempacotada: `release/win-unpacked/WGF Note.exe`
- Build web estático: `dist/`
- Backend empacotado: `server-dist/index.cjs`
