# Rolê na Escola — pacote refeito

Este pacote substitui os arquivos públicos do site por uma interface refeita, responsiva e em português.

## Arquivos
- `index.html` — estrutura do site.
- `styles.css` — layout, cores, modo claro/escuro e responsividade.
- `script.js` — galeria, filtro por ano, destaque, próximo evento, cronograma demonstrativo e detalhes dos eventos.
- `logo-escola.png` — logo enviada para uso no cabeçalho, área de apresentação e rodapé.
- `supabase-schema.sql` — referência inicial para criar as tabelas de conteúdo no Supabase.

## Como atualizar no GitHub Pages
1. Extraia o arquivo ZIP.
2. Abra o repositório `role-na-escola`.
3. Use **Add file → Upload files**.
4. Envie os cinco arquivos desta pasta (incluindo `logo-escola.png`).
5. Confirme em **Commit changes**.
6. Abra o endereço publicado e pressione `Ctrl + F5`.

Se o repositório já contém `index.html`, `styles.css`, `script.js` e `README.md`, confirme que o GitHub realmente mostrou o envio dos arquivos novos e que a alteração foi registrada no histórico de commits.

## O que funciona nesta versão
- Layout responsivo para celular e computador.
- Alternância entre modo claro e escuro, com preferência salva no navegador.
- Logo da escola no cabeçalho, apresentação e rodapé.
- Galeria de eventos e filtro por ano.
- Destaque de um evento.
- Seção de próximo evento e espaço para cronograma.
- Janela com detalhes e álbum fotográfico quando as fotografias têm URLs válidas.
- Dois eventos demonstrativos: conversa sobre ISTs e malefícios do cigarro eletrônico.

## Limitações importantes
Esta é a parte pública e demonstrativa do site. Os eventos de exemplo são dados locais no JavaScript; ainda não existe painel administrativo funcional, banco conectado ou envio de fotos para a nuvem. O botão “Painel da equipe” explica essa etapa pendente. Para publicação real de conteúdo pela equipe, configure o Supabase, autenticação, políticas de acesso e armazenamento de imagens, e conecte o site ao banco. Não coloque chave `service_role` em arquivos públicos.

## Próximo evento e cronograma
O site seleciona automaticamente o evento publicado mais próximo que tenha data cadastrada. Os eventos demonstrativos não possuem datas, porque elas não foram fornecidas. Quando o sistema de cadastro estiver conectado, cada evento deverá ter data, horário, local e uma lista de itens de cronograma com horário e atividade. Não invente datas: cadastre apenas as confirmadas pela escola.


## Evento adicionado: 30/10/2026
Foi incluído o evento **BIOMAS DA BAHIA — O QUE SOBRARÁ PARA O FUTURO?**, com o cronograma fornecido. A seção de agenda foi movida para logo após a abertura principal (hero), para que seja uma das primeiras partes vistas na página.

Observações:
- A oficina de bem-estar / meio ambiente / sabonete artesanal está com responsável indicado como "responsável a confirmar", pois o nome não foi informado.
- Os horários simultâneos às 11:50 e às 13:00 foram mantidos como fornecidos.
- O evento está inserido como dado demonstrativo no `script.js`. Quando houver banco de dados conectado, ele também precisará ser cadastrado no banco para aparecer no site conectado.
