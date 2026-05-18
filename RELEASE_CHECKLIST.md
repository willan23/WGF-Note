# Checklist de release — Note Py++ 1.0.0

## 1. Qualidade obrigatória

- [x] `pnpm verify`
- [x] `pnpm build`
- [x] `pnpm build:web`
- [x] `pnpm desktop:make`
- [x] Migrações aplicadas com MySQL local
- [x] Fluxo cloud validado ponta a ponta com dois utilizadores
- [x] Execução Python real validada no backend autenticado

## 2. Aceitação manual ainda necessária antes de publicar fora do teu ambiente

- [ ] Android físico: criar → editar → guardar → reabrir
- [ ] Android físico: navegar por pastas, renomear e eliminar
- [ ] Android físico: testar autosave, tema, word wrap e templates no cursor real
- [ ] Android físico: testar login local apontando `EXPO_PUBLIC_API_BASE_URL` para o IP do computador
- [ ] Windows: instalar a partir de `release/Note-Py-Plus-Plus-1.0.0-Setup.exe`
- [ ] Windows: abrir a app instalada, executar Python e confirmar sync local

## 3. Antes de uma publicação pública

- [ ] Definir domínio/API públicos e variáveis de produção
- [ ] Configurar OAuth real para produção
- [ ] Trocar segredos locais por segredos de produção
- [ ] Preparar backups do MySQL
- [ ] Definir política de privacidade e termos
- [ ] Criar screenshots, ícones finais e materiais da store
- [ ] Fazer QA em pelo menos dois dispositivos Android reais
- [ ] Rever acessibilidade e comportamento com ficheiros grandes

## 4. Artefactos desta release

- Windows installer: `release/Note-Py-Plus-Plus-1.0.0-Setup.exe`
- App desempacotada: `release/win-unpacked/Note Py++.exe`
- Build web estático: `dist/`
- Backend empacotado: `server-dist/index.cjs`
