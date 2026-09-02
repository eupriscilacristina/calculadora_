/* ============================================================
   Autenticação e controle de acessos
   - Firebase Auth + Firestore quando configurado
   - Fallback localStorage caso o Firebase ainda não esteja vinculado
   - Painel ADMIN (senha 1882) para controle de quem acessou
   ============================================================ */

"use strict";

const Auth = (() => {
  const K_SESSION = "gtcon_session";
  const K_USERS_DEMO = "gtcon_demo_users";

  const session = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(K_SESSION) || "null");
      } catch {
        return null;
      }
    },
    set(s) {
      localStorage.setItem(K_SESSION, JSON.stringify(s));
    },
    clear() {
      localStorage.removeItem(K_SESSION);
    },
  };

  const demoUsers = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(K_USERS_DEMO) || "[]");
      } catch {
        return [];
      }
    },
    set(list) {
      localStorage.setItem(K_USERS_DEMO, JSON.stringify(list));
    },
  };

  function nowISO() {
    return new Date().toISOString();
  }

  function readable(dt) {
    if (!dt) return "—";
    const d = new Date(dt);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  /* ---------------- Demo (localStorage) ---------------- */
  function demoRegister(name, email, password) {
    const list = demoUsers.get();
    const lower = String(email).toLowerCase();
    if (list.some((u) => u.email.toLowerCase() === lower)) {
      return { ok: false, msg: "Este e-mail já possui uma conta cadastrada." };
    }
    const u = {
      id: "demo_" + Date.now(),
      name: name.trim(),
      email: lower,
      password,
      loginCount: 1,
      createdAt: nowISO(),
      lastLogin: nowISO(),
    };
    list.push(u);
    demoUsers.set(list);
    session.set({ role: "user", id: u.id, name: u.name, email: u.email });
    return { ok: true };
  }

  function demoLogin(email, password) {
    const list = demoUsers.get();
    const lower = String(email).toLowerCase();
    const u = list.find((x) => x.email.toLowerCase() === lower);
    if (!u || u.password !== password) {
      return { ok: false, msg: "E-mail ou senha incorretos." };
    }
    u.loginCount = (u.loginCount || 0) + 1;
    u.lastLogin = nowISO();
    demoUsers.set(list);
    session.set({ role: "user", id: u.id, name: u.name, email: u.email });
    return { ok: true };
  }

  function demoAdminLogin(user, password) {
    if (String(user).trim().toLowerCase() !== ADMIN_USER.toLowerCase() || password !== ADMIN_PASS) {
      return { ok: false, msg: "Credenciais de administrador inválidas." };
    }
    session.set({ role: "admin", name: "Administrador GTCON", email: ADMIN_USER });
    return { ok: true };
  }

  /* ---------------- Firebase ---------------- */
  async function fbRegister(name, email, password) {
    const auth = firebaseApp.auth;
    const userCred = await auth.createUserWithEmailAndPassword(email.trim(), password);
    await userCred.user.updateProfile({ displayName: name.trim() });
    const user = userCred.user;
    await firebaseApp.db.collection("users").doc(user.uid).set({
      name: name.trim(),
      email: user.email.toLowerCase(),
      loginCount: 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      isAdmin: false,
    });
    session.set({ role: "user", id: user.uid, name: name.trim(), email: user.email });
    return { ok: true };
  }

  async function fbLogin(email, password) {
    const auth = firebaseApp.auth;
    const userCred = await auth.signInWithEmailAndPassword(email.trim(), password);
    const user = userCred.user;
    const doc = firebaseApp.db.collection("users").doc(user.uid);
    await doc.set(
      {
        name: user.displayName || email.split("@")[0],
        email: user.email.toLowerCase(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        loginCount: firebase.firestore.FieldValue.increment(1),
      },
      { merge: true }
    );
    session.set({ role: "user", id: user.uid, name: user.displayName || email.split("@")[0], email: user.email });
    return { ok: true };
  }

  async function fbAdminLogin(user, password) {
    if (String(user).trim().toLowerCase() !== ADMIN_USER.toLowerCase() || password !== ADMIN_PASS) {
      return { ok: false, msg: "Credenciais de administrador inválidas." };
    }
    try {
      await firebaseApp.auth.signInAnonymously();
    } catch (e) {
      /* leitura anônima não obrigatória; segue o fluxo */
    }
    session.set({ role: "admin", name: "Administrador GTCON", email: ADMIN_USER });
    return { ok: true };
  }

  async function fbLogout() {
    try {
      await firebaseApp.auth.signOut();
    } catch (e) {
      /* ignora */
    }
  }

  /* ---------------- API pública ---------------- */
  return {
    enabled: () => FIREBASE_ENABLED,

    current() {
      return session.get();
    },

    isAdmin() {
      const s = session.get();
      return !!(s && s.role === "admin");
    },

    async register(name, email, password) {
      if (FIREBASE_ENABLED) {
        try {
          return await fbRegister(name, email, password);
        } catch (e) {
          return { ok: false, msg: msgFirebase(e) };
        }
      }
      return demoRegister(name, email, password);
    },

    async login(email, password) {
      if (FIREBASE_ENABLED) {
        try {
          return await fbLogin(email, password);
        } catch (e) {
          return { ok: false, msg: msgFirebase(e) };
        }
      }
      return demoLogin(email, password);
    },

    async adminLogin(user, password) {
      if (FIREBASE_ENABLED) {
        return await fbAdminLogin(user, password);
      }
      return demoAdminLogin(user, password);
    },

    async logout() {
      if (FIREBASE_ENABLED) await fbLogout();
      session.clear();
    },

    readable,
    formatDT: readable,

    /* Lista de usuários para o painel ADMIN */
    async listUsers() {
      if (FIREBASE_ENABLED) {
        try {
          const snap = await firebaseApp.db.collection("users").orderBy("createdAt", "desc").get();
          const rows = [];
          snap.forEach((d) => {
            const v = d.data();
            rows.push({
              name: v.name || "—",
              email: v.email,
              loginCount: v.loginCount || 0,
              createdAt: v.createdAt ? readable(v.createdAt.toDate?.() ?? v.createdAt) : "—",
              lastLogin: v.lastLogin ? readable(v.lastLogin.toDate?.() ?? v.lastLogin) : "—",
            });
          });
          return rows;
        } catch (e) {
          return { error: "Não foi possível ler o Firestore. Verifique o banco e as regras (veja js/firebase-config.js)." };
        }
      }
      const rows = demoUsers.get().map((u) => ({
        name: u.name,
        email: u.email,
        loginCount: u.loginCount || 0,
        createdAt: readable(u.createdAt),
        lastLogin: readable(u.lastLogin),
      }));
      return rows;
    },
  };

  function msgFirebase(e) {
    const m = String((e && (e.message || e.code)) || "");
    if (m.includes("invalid-email")) return "Formato de e-mail inválido.";
    if (m.includes("user-not-found") || m.includes("wrong-password") || m.includes("invalid-credential"))
      return "E-mail ou senha incorretos.";
    if (m.includes("email-already-in-use")) return "Este e-mail já possui uma conta cadastrada.";
    if (m.includes("weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
    if (m.includes("network-request-failed")) return "Sem conexão com o Firebase. Verifique a internet.";
    return "Erro de autenticação: " + (m || "desconhecido");
  }
})();