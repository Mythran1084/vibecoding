# Reserva de Salas

## Stack
- Next.js (App Router), JavaScript, Tailwind CSS.
- Deploy: Vercel. Base de dados: PostgreSQL no Aiven.

## Camadas
A app está organizada em 4 camadas: apresentação, aplicacional, dominio e persistencia.

- dominio, aplicacional e persistencia têm pasta própria em src/
  (src/dominio/, src/aplicacional/, src/persistencia/).
- A apresentação são as páginas e componentes Next.js
  (src/app/ e src/components/); não existe pasta src/apresentacao/.

## Dependências entre camadas
- O domínio não depende de nenhuma outra camada.
- A apresentação só comunica com a camada aplicacional. Exceção: um único
  ficheiro de composição (ex.: src/app/actions.js) cria o repositório e
  entrega-o aos casos de uso; é o único sítio da apresentação que importa
  de src/persistencia/.
- As chamadas à base de dados só existem na camada persistencia/.

## Segurança
- As variáveis de ambiente sensíveis e respetivas credenciais de acesso
  (DATABASE_URL, etc.) nunca aparecem em código do lado do cliente.

## Persistência (PostgreSQL no Aiven)
- A app usa o repositório PostgreSQL (src/persistencia/repositorioPostgres.js),
  criado só no ficheiro de composição src/app/actions.js, e só quando um pedido
  precisa dele (nunca ao carregar o ficheiro, para o build não precisar da base
  de dados). O repositório em memória fica para os testes de contrato.
- Qualquer implementação do repositório tem de passar nos testes de contrato
  (src/persistencia/contratoRepositorio.js).
- A ligação é sempre feita por src/persistencia/ligacao.js: sempre cifrada, com
  o certificado confirmado pelo DATABASE_CA_CERT. Nunca desligar a verificação
  do certificado (rejectUnauthorized: true) e retirar o sslmode do endereço.
- O endereço, o utilizador e a palavra-passe nunca aparecem em mensagens nem em
  registos: os erros do pg passam sempre por mensagemSegura.
- As consultas usam sempre parâmetros ($1, $2, ...); nunca colar no SQL texto
  que venha do utilizador.
- Datas: na base de dados, inicio e fim são TIMESTAMPTZ; no código, Date em UTC.
  A apresentação converte de e para a hora de Lisboa de forma explícita
  (src/app/horaLisboa.js).
- Variáveis de ambiente:
  - DATABASE_URL (utilizador app_reservas, só SELECT, INSERT, UPDATE e DELETE
    nas tabelas salas e reservas) e DATABASE_CA_CERT: no .env.local e na Vercel.
  - DATABASE_ADMIN_URL (utilizador administrador): só no .env.local do
    computador do dono, para npm run migrar. Nunca na Vercel nem no código.
- Alterações às tabelas e permissões fazem-se em src/persistencia/migracao.js
  (npm run migrar), que tem de poder correr várias vezes sem erros.

## Testes
- A lógica de domínio, aplicacional e persistência só está concluída com
  testes validados; não alterar os testes somente para os fazer validar.

## Forma de trabalhar
- Antes de instalar uma dependência, indicar qual é e para que serve.
- Antes de implementar, apresentar sempre um plano curto.
- Antes de dar uma tarefa por concluída, correr npm run test, npm run lint
  e npm run build.
- No fim de cada tarefa, explicar o que foi feito em linguagem simples.

## Regras aprendidas na Sessão 1
- O Next.js 16 corre com cacheComponents: não usar configurações de segmento
  (dynamic, revalidate). Antes de usar uma funcionalidade do Next.js, consultar
  node_modules/next/dist/docs/.
- Não chamar setState diretamente dentro de useEffect. Ler o localStorage com
  useSyncExternalStore e atualizar o estado em callbacks (.then).
- A app é só em tema claro: dar cor explícita ao texto (ex.: text-gray-900) e
  não usar classes dark:.
- Botões e campos com pelo menos 44px de altura (h-11) e texto de pelo menos
  16px (text-base). Verificar cada ecrã a 375px e a 1280px de largura.
- Se um limite do pedido ("não alterar X") entrar em conflito com a tarefa,
  dizê-lo no plano e propor a alteração mínima.
- No domínio, inicio e fim são Date em UTC. Na apresentação, a data entra e
  sai como texto e é convertida sem depender do fuso horário do browser.
- Os segredos ficam só no .env.local, nunca no .env nem no código.

## Regras do Next.js (geridas pelo next dev em AGENTS.md)
@AGENTS.md
