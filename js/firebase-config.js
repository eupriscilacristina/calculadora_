/* ============================================================
   CONFIGURAÇÃO FIREBASE — VÍNCULO PARA CONTROLE DE ACESSOS
   ============================================================
   ► Para ATIVAR o controle de acessos (recomendado):

     1) Crie um projeto em https://console.firebase.google.com
        (plano Spark é gratuito e suficiente para começar).

     2) Adicione um "App Web" e copie os dados de configuração
        que o console exibe (apiKey, authDomain, projectId,
        storageBucket, messagingSenderId, appId).

     3) Cole os valores nas constantes abaixo, no lugar de "SUA-...".

     4) Habilite em "Authentication":
          · Sign-in method → E-mail/Senha (Email/Password) → ATIVAR.

     5) Crie o banco em "Firestore Database" (modo de teste) e
        aplique estas regras (aba "Rules"):
        -------------------------------------------------------
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{uid} {
              allow create: if request.auth != null &&
                           request.resource.data.email != null;
              allow read, update, delete: if request.auth != null;
            }
          }
        }
        -------------------------------------------------------
        (Isto permite que qualquer usuário autenticado leia o
        cadastro — suficiente para o painel ADMIN ler o total de
        acessos. Reforce as regras se desejar mais restrição.)

     6) Publique o projeto (Firebase Hosting, Netlify, Vercel ou
        GitHub Pages). O painel ADMIN (senha 1882) mostra quem
        acessou: contas criadas, nº de logins e último acesso.
   ============================================================ */

"use strict";

const FIREBASE_CONFIG = {
  apiKey: "SUA-apiKey",
  authDomain: "SUA-authDomain",
  projectId: "SUA-projectId",
  storageBucket: "SUA-storageBucket",
  messagingSenderId: "SUA-messagingSenderId",
  appId: "SUA-appId",
};

/* Senha do painel ADMIN — equipe GTCON. Mude antes de publicar. */
const ADMIN_USER = "admin";
const ADMIN_PASS = "1882";

const firebaseApp = (() => {
  const cfg = FIREBASE_CONFIG || {};
  const ok =
    typeof firebase !== "undefined" &&
    cfg.apiKey &&
    !String(cfg.apiKey).toUpperCase().startsWith("SUA-") &&
    cfg.projectId &&
    !String(cfg.projectId).toUpperCase().startsWith("SUA-");
  if (!ok) return null;
  try {
    const app = firebase.initializeApp(cfg);
    app.auth = firebase.auth(app);
    app.db = firebase.firestore(app);
    return app;
  } catch (e) {
    // CDN indisponível ou config inválida → modo demo (localStorage).
    return null;
  }
})();

const FIREBASE_ENABLED = !!firebaseApp;
console.log("[GTCON] Firebase:", FIREBASE_ENABLED ? "vinculado ✓" : "modo demo (preencha js/firebase-config.js)");