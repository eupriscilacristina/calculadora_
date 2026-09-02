# Calculadora de Impacto da Reforma Tributária · GTCON

Aplicação web moderna que replica fielmente a planilha
`Calculadora_Impacto_Reforma_Presumido_Simples_GTCON.xlsx`:

- **Lucro Presumido** — comparativo de carga tributária *Atual × Pós-Reforma*
  (EC 132/2023 · LC 214/2025), com créditos de CBS/IBS, cronograma de transição
  2026 → 2033 e leitura automática dos resultados.
- **Simples Nacional** — comparativo *DAS Unificado × Regime Híbrido × Migração
  para o Lucro Presumido*, com memória de cálculo do Híbrido.
- **Resumo** — painel consolidado com gráficos e **recomendação automática** de cenário.
- **Controle de acessos** — login/registro por e-mail (Firebase) e painel **ADMIN**
  que mostra quantas pessoas criaram conta e quantos acessos cada uma realizou.

---

## 1. Rodar localmente

Basta servir a pasta como site estático:

```bash
python -m http.server 8000
# ou
npx serve .
```

Abra `http://localhost:8000`.

> No primeiro acesso, crie uma conta (e-mail + senha) para entrar na calculadora.

---

## 2. Vincular o Firebase (controle de acessos)

O app já funciona em **modo demo** (localStorage) para você testar. Para o
controle real de acessos distribuído a várias pessoas, vincule o Firebase:

1. Crie um projeto em <https://console.firebase.google.com> (plano **Spark** basta).
2. *Build → Authentication → Get started* e ative o sign-in **E-mail/Senha**.
3. *Build → Firestore Database → Create database* (modo de teste é suficiente).
4. Em **Rules**, aplique:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow create: if request.auth != null && request.resource.data.email != null;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

5. Adicione um **App Web** no console e copie as credenciais para
   `js/firebase-config.js` (substitua os valores `SUA-...`):

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "seu-app.firebaseapp.com",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "1:..."
};
```

Pronto: o console passa a exibir `Firebase: vinculado ✓` e os acessos passam a
ser registrados na coleção `users` do Firestore.

---

## 3. Painel ADMIN

Na tela de login, clique em **Acesso ADMIN** e informe:

- **Usuário:** `admin`
- **Senha:** `1882`

O painel mostra: total de contas criadas, total de acessos (logins), último
acesso, e a lista de usuários (nome, e-mail, nº de acessos, cadastro e último
login) — além de exportação manual via **Copiar relatório**.

> ⚠️ Troque a senha ADMIN em `ADMIN_USER` / `ADMIN_PASS` no
> `js/firebase-config.js` antes de publicar.

---

## 4. Publicação

É uma SPA 100% estática — publica em qualquer host:

- **Firebase Hosting:** `firebase deploy` (após `firebase init hosting`)
- **Netlify / Vercel:** apontar para esta pasta
- **GitHub Pages:** servir `index.html`

O Firebase SDK é carregado via CDN (`www.gstatic.com`); não há build.

---

## 5. Estrutura

```
index.html              # SPA (login, calculadora, painel admin)
css/styles.css          # tema dark fintech
js/calculator.js        # motor de cálculo — réplica das fórmulas da planilha
js/firebase-config.js   # credenciais e instruções do Firebase
js/auth.js              # autenticação (Firebase + fallback demo) e tracking
js/ui.js                # gráficos/tabelas (SVG/CSS, sem dependências)
js/app.js               # navegação, formulários e renderização
```

## 6. Fidelidade à planilha

O motor (`js/calculator.js`) reproduz todas as fórmulas das abas *Parâmetros*,
*Dados de Entrada*, *Presumido*, *Simples* e *Resumo*. Os valores padrão
retornam exatamente os resultados da planilha (validação automatizada: 32
checks, incluindo total Presumido R$ 157.205/171.570, DAS R$ 52.000, Híbrido
R$ 83.987,50 e Migração R$ 171.570).

*Documento de apoio interno GTCON Brasil Contabilidade — não distribuir sem
revisão técnica.*