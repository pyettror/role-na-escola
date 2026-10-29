# Rolê na Escola — pacote inicial

Arquivos: `index.html` (interface), `styles.css` (layout), `script.js` (galeria/agenda/painel), `supabase-schema.sql` (banco, permissões e armazenamento).

## Publicar a parte visual
Envie `index.html`, `styles.css` e `script.js` para a raiz do repositório GitHub. Em Settings > Pages, escolha Deploy from a branch, a branch principal (pode estar traduzida como `principal`) e a pasta `/(root)`. O GitHub Pages publica apenas a parte estática; login, banco e upload precisam do Supabase configurado.

## Ativar banco e painel real
1. Crie um projeto Supabase.
2. Abra SQL Editor e execute todo o `supabase-schema.sql`.
3. Em configurações/API do Supabase, copie a Project URL e a chave pública `anon`/`publishable`.
4. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` no início de `script.js`, salve e envie ao GitHub. Nunca use a chave `service_role` nem qualquer segredo no front-end.
5. Em Authentication > Users, crie um usuário com e-mail e senha.
6. Copie o UUID desse usuário e execute no SQL Editor, substituindo o texto de exemplo: `insert into public.admins(user_id) values ('UUID_DO_USUARIO') on conflict do nothing;`
7. Entre no site pelo botão “Painel da equipe”. Apenas usuários autorizados na tabela `admins` podem administrar conteúdo.
8. No painel, escolha um evento e envie fotos JPG/PNG/WebP de até 5 MB.

## Observações
Sem Supabase configurado, o site mostra dois eventos de demonstração, mas não salva alterações. Não há senha padrão. As capas são ilustrações de reserva, não fotos reais. Não foram inventadas datas. Confirme autorizações para publicar imagens de estudantes. Planos gratuitos têm limites e podem mudar; faça backups e mantenha as contas sob controle institucional. Este pacote precisa ser configurado e testado antes de ser considerado pronto para produção.
