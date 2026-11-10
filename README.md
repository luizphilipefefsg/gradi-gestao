# Gradi Gestão

Aplicação React + Vite para gestão de lojas de roupas, preparada para Firebase Authentication, Cloud Firestore e hospedagem na Vercel.

## Configuração local

1. Instale Node.js 20.19+ ou 22.12+.
2. Execute `npm install`.
3. Copie `.env.example` para `.env` e preencha os dados do Firebase Web App do projeto `gradi-gestao`.
4. Execute `npm run dev`.
5. Valide com `npm run lint` e `npm run build`.

## Variáveis de ambiente

Configure na Vercel as variáveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` e, se disponível, `VITE_FIREBASE_MEASUREMENT_ID`.

A configuração do Firebase Web é pública por natureza. Nunca coloque credenciais de Service Account, chaves privadas ou senhas no frontend.

## Modelo de dados

- `systemUsers/{uid}`: perfil e vínculo de cada usuário com `lojaId`.
- `stores/{lojaId}`: metadados da loja.
- `stores/{lojaId}/produtos/{id}` e demais subcoleções: dados isolados por loja.
- O administrador master é identificado pelo e-mail verificado `administrativo@gmail.com`.

O primeiro login master deve usar uma conta Firebase Authentication com esse e-mail e e-mail verificado. Os demais usuários precisam ter um perfil provisionado em `systemUsers/{uid}` pelo administrador.

## Firestore Rules

Publique o conteúdo de `firestore.rules` em Firebase Console > Firestore Database > Regras. Faça isso somente depois de configurar o app e validar os acessos com contas de teste.

## Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `./`
- Adicione todas as variáveis `VITE_FIREBASE_*` em Project Settings > Environment Variables.

## Observações de produção

A aplicação sincroniza os módulos de dados com subcoleções por loja. O rascunho da venda atual permanece local ao navegador. A criação de contas de lojistas é feita por uma instância secundária do Firebase Auth no cliente; para um ambiente SaaS público, recomenda-se migrar esse provisionamento para uma Cloud Function com Firebase Admin SDK e App Check. A remoção do perfil não desativa a conta Authentication; essa operação também deve ser feita por função administrativa segura.

## Primeiro acesso do Administrador Master

1. No Firebase Console > Authentication > Usuários, crie ou entre com a conta `administrativo@gmail.com`.
2. Recomendado: use o botão **Entrar com Google** com essa conta, pois o Google informa o e-mail como verificado.
3. Se usar e-mail e senha, confirme o link de verificação enviado pelo Firebase antes de acessar o Firestore.
4. Cadastre os lojistas pelo painel administrativo do Gradi Gestão. Não grave senhas no Firestore.
5. Em Authentication > Configurações, adicione o domínio `gradi-gestao.vercel.app` e o domínio personalizado, se houver, aos domínios autorizados.

## Importante sobre provisionamento e exclusão de contas

Nesta etapa, a criação de conta usa uma instância secundária do Firebase Authentication no navegador para não encerrar a sessão master. A autorização para criar o perfil é reforçada pelas regras do Firestore. Para operação SaaS comercial, a próxima melhoria recomendada é mover criação, bloqueio e exclusão de contas para Cloud Functions (Admin SDK), e ativar App Check. Excluir um perfil Firestore não exclui nem desativa automaticamente o usuário no Authentication.
