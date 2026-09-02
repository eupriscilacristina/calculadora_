/* ============================================================
   Aplicação principal — navegação, formulários e renderização
   ============================================================ */

"use strict";

(() => {
  const K_STATE = "gtcon_state";
  const $ = (id) => document.getElementById(id);

  const FIELDS = {
    cliente: { id: "in-cliente", type: "text", def: "" },
    setor: { id: "in-setor", type: "sel", def: "Comércio/Indústria" },
    regime: { id: "in-regime", type: "sel", def: "Lucro Presumido" },
    receita: { id: "in-receita", type: "num", def: 850000 },
    compras: { id: "in-compras", type: "pct", def: 40 },
    atividade: { id: "in-atividade", type: "sel", def: "Comércio/Indústria (8%/12%)" },
    icms: { id: "in-icms", type: "pct", def: 12 },
    iss: { id: "in-iss", type: "pct", def: 3 },
    ipi: { id: "in-ipi", type: "pct", def: 0 },
    rbt12: { id: "in-rbt12", type: "num", def: 9000000 },
    anexo: { id: "in-anexo", type: "sel", def: "Anexo I" },
    fatorR: { id: "in-fatorr", type: "pct", def: 28 },
    recPgd: { id: "in-recpgdas", type: "num", def: 750000 },
    das: { id: "in-das", type: "num", def: 52000 },
    dasIcmsIss: { id: "in-dasicms", type: "num", def: 8500 },
    dasPisCofins: { id: "in-daspis", type: "num", def: 2900 },
    b2b: { id: "in-b2b", type: "pct", def: 30 },
    comprasSimples: { id: "in-comp2", type: "pct", def: 35 },
    cbs: { id: "in-cbs", type: "pct", def: 8.8 },
    ibs: { id: "in-ibs", type: "pct", def: 17.7 },
    ano: { id: "in-ano", type: "sel", def: 2027 },
  };

  let state = {};

  /* ---------------- estado ---------------- */
  function loadState() {
    const saved = JSON.parse(localStorage.getItem(K_STATE) || "null") || {};
    state = {};
    Object.entries(FIELDS).forEach(([key, f]) => {
      state[key] = saved[key] !== undefined && saved[key] !== null && saved[key] !== "" ? saved[key] : f.def;
    });
  }

  function saveState() {
    try {
      localStorage.setItem(K_STATE, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  function fillForm() {
    Object.entries(FIELDS).forEach(([key, f]) => {
      const el = $(f.id);
      if (el) el.value = state[key];
    });
  }

  function readForm() {
    Object.entries(FIELDS).forEach(([key, f]) => {
      const el = $(f.id);
      if (!el) return;
      const v = el.value;
      state[key] = f.type === "num" || f.type === "pct" ? (v === "" ? 0 : Number(v)) : v;
    });
    saveState();
  }

  /* ---------------- cálculo ---------------- */
  function collectEvent() {
    const toDec = (pct) => pct / 100;
    return {
      cliente: state.cliente,
      setor: state.setor,
      regime: state.regime,
      receita: state.receita,
      compras: toDec(state.compras),
      atividade: state.atividade,
      icms: toDec(state.icms),
      iss: toDec(state.iss),
      ipi: toDec(state.ipi),
      rbt12: state.rbt12,
      anexo: state.anexo,
      fatorR: toDec(state.fatorR),
      recPgd: state.recPgd,
      das: state.das,
      dasIcmsIss: state.dasIcmsIss,
      dasPisCofins: state.dasPisCofins,
      b2b: toDec(state.b2b),
      comprasSimples: toDec(state.comprasSimples),
      cbs: toDec(state.cbs),
      ibs: toDec(state.ibs),
      ano: state.ano,
    };
  }

  function computeAll() {
    const par = Calculator.par(collectEvent());
    const pres = Calculator.presumido(collectEvent(), par);
    const simp = Calculator.simples(collectEvent(), par, pres);
    const res = Calculator.resumo(pres, simp);
    return { par, pres, simp, res };
  }

  /* ---------------- views ---------------- */
  function showAuth() {
    $("view-auth").classList.remove("hidden");
    $("view-app").classList.add("hidden");
    $("view-admin").classList.add("hidden");
  }
  function showApp() {
    $("view-auth").classList.add("hidden");
    $("view-app").classList.remove("hidden");
    $("view-admin").classList.add("hidden");
  }
  function showAdmin() {
    $("view-auth").classList.add("hidden");
    $("view-app").classList.add("hidden");
    $("view-admin").classList.remove("hidden");
  }

  function switchCard(which) {
    ["login-card", "register-card", "admin-card"].forEach((id) => $(id).classList.toggle("hidden", id !== which + "-card"));
  }

  function setMsg(id, text, ok) {
    const el = $(id);
    el.textContent = text || "";
    el.className = "form-msg " + (text ? (ok ? "ok" : "err") : "");
  }

  function toast(text, ok = true) {
    const t = $("toast");
    t.textContent = text;
    t.className = "toast " + (ok ? "ok" : "err");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add("hidden"), 3200);
  }

  /* ---------------- tabs ---------------- */
  const TABS = ["dados", "parametros", "presumido", "simples", "resumo"];
  let currentTab = "dados";

  function activateTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== tab));
    renderCurrent();
  }

  function renderCurrent() {
    try {
      const { par, pres, simp, res } = computeAll();
      if (currentTab === "presumido") renderPresumido(par, pres);
      if (currentTab === "simples") renderSimples(par, simp, pres);
      if (currentTab === "resumo") renderResumo(par, res, pres, simp);
      if (currentTab === "parametros") renderParametros(par);
    } catch (e) {
      console.error(e);
    }
  }

  /* ---------------- painéis ---------------- */
  function renderPresumido(par, pres) {
    const t = pres.totais;
    $("pres-header").textContent = `Setor: ${pres.setor} · Ano de análise: ${par.ano} · CBS do ano: ${fmtPct(par.cbsDoAno)} · IBS efetivo do ano: ${fmtPct(par.ibsEfetivo)} · ICMS/ISS mantido: ${fmtPct(par.icmsMantido, 0)}`;

    $("pres-table").innerHTML = UI.cmpTable(pres.itens, t);

    const chartRows = pres.itens.filter((i) => i.atual > 0 || i.pos > 0).map((i) => ({ label: shortKey(i.key), a: i.atual, b: i.pos, colA: "#5c6473", colB: "#c9a45c" }));
    chartRows.push({ label: "TOTAL", a: t.atual, b: t.pos, colA: "#5c6473", colB: "#e3c887" });
    $("pres-chart").innerHTML = UI.barChart({ rows: chartRows, colA: "#5c6473", colB: "#c9a45c", labelA: "Regime Atual", labelB: "Pós-Reforma", height: 150 });

    $("pres-explain").innerHTML = UI.explainBlock(Calculator.leituraPresumido(pres));
  }

  function shortKey(key) {
    return key.split(" (")[0].replace("cumulativo", "cum.").substring(0, 26);
  }

  function renderSimples(par, simp, pres) {
    const c = simp.cenarios;
    $("simples-header").textContent = `Anexo: ${simp.anexo} · Ano de análise: ${par.ano} · CBS do ano: ${fmtPct(par.cbsDoAno)} · IBS efetivo do ano: ${fmtPct(par.ibsEfetivo)}`;
    $("simples-table").innerHTML = UI.simplesTable(c);
    $("hibrido-table").innerHTML = UI.hibridoTable(simp.memoria);
    $("hibrido-note").textContent =
      "No Híbrido, IBS e CBS saem do DAS e são apurados pelo regime regular não cumulativo — o CPP permanece no DAS em qualquer cenário. Antes de comparar a migração, confira se a seção “Lucro Presumido” reflete os dados reais do cliente.";

    const colors = ["#9c7b2e", "#c9a45c", "#e3c887"];
    const rows = c.map((x, i) => ({ label: x.nome.split(" ").slice(0, 2).join(" "), v: x.mensal, col: colors[i] }));
    $("simples-chart").innerHTML =
      '<div style="height:14px"></div><div style="font-size:12.5px;color:var(--muted);margin-bottom:4px">Custo mensal (recolhimento em R$)</div>' + UI.barChart3({ rows });

    $("simples-explain").innerHTML = UI.explainBlock(Calculator.leituraSimples(simp, pres));
  }

  function renderResumo(par, res, pres, simp) {
    $("resumo-header").textContent = `Cliente: ${state.cliente || "Nome do cliente"} · Setor: ${state.setor} · Regime atual: ${state.regime} · Ano de análise: ${par.ano}`;

    const presC = res.presumido;
    const cls = presC.pct > 0 ? "pos" : presC.pct < 0 ? "neg" : "";
    $("resumo-pres").innerHTML = `
      <table class="tbl">
        <thead><tr><th>Cenário</th><th class="num">Total mensal</th><th class="num">Total anual</th><th class="num">Var. %</th></tr></thead>
        <tbody>
          <tr><td class="row-title">Presumido — Regime Atual</td><td class="num">${fmtDinheiro(presC.atual)}</td><td class="num">${fmtDinheiro(presC.anualAtual)}</td><td class="num">—</td></tr>
          <tr class="highlight-row"><td class="row-title">Presumido — Pós-Reforma</td><td class="num">${fmtDinheiro(presC.pos)}</td><td class="num">${fmtDinheiro(presC.anualPos)}</td><td class="num ${cls}">${presC.pct >= 0 ? "+" : ""}${fmtPct(presC.pct)}</td></tr>
        </tbody>
      </table>`;

    const colors = ["#9c7b2e", "#c9a45c", "#e3c887"];
    $("resumo-simples").innerHTML = `
      <table class="tbl">
        <thead><tr><th>Cenário</th><th class="num">Total mensal</th><th class="num">Total anual</th><th class="num">Var. vs. DAS</th></tr></thead>
        <tbody>
          ${res.simples.map((x, i) => {
            const c = x.var > 0 ? "pos" : x.var < 0 ? "neg" : "";
            return `<tr class="${i === 0 ? "highlight-row" : ""}">
              <td class="row-title"><span class="swatch" style="background:${colors[i]}"></span>${UI.esc(x.nome)}</td>
              <td class="num">${fmtDinheiro(x.mensal)}</td>
              <td class="num">${fmtDinheiro(x.anual)}</td>
              <td class="num ${c}">${i === 0 ? "—" : ""}${i > 0 && x.var >= 0 ? "+" : ""}${i > 0 ? fmtPct(x.var) : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div style="height:16px"></div>`;

    const rank = Calculator.recomendacoes(simp);
    const verdict = verdictOf(rank[0], presC, simp);
    const list = rank
      .map((r) => {
        const cls = r.rank === 1 ? "rank-1" : r.rank === 2 ? "rank-2" : "rank-3";
        return `<div class="recom-item ${cls}">
          <div class="recom-rank">${r.rank}º</div>
          <div class="recom-body">
            <strong>${UI.esc(r.nome)} <span class="recom-val">· ${fmtDinheiro(r.mensal)}/mês</span></strong>
            <p>${UI.esc(r.justificativa)}</p>
          </div>
        </div>`;
      })
      .join("");

    $("recomend").innerHTML = `
      ${verdict}
      <div style="height:16px"></div>
      <div class="recom-list">${list}</div>`;

    const obs = [
      { tag: "neu", titulo: "Síntese do Presumido", texto: `Para ${pres.setor.toLowerCase()}, no ano de ${par.ano}, a carga mensal do Lucro Presumido vai de ${fmtDinheiro(presC.atual)} para ${fmtDinheiro(presC.pos)} — variação de ${fmtPct(presC.pct)} no comparativo anual.` },
      { tag: "neu", titulo: "Síntese do Simples", texto: `O DAS unificado recolhe ${fmtDinheiro(simp.cenarios[0].mensal)}/mês; o Híbrido, ${fmtDinheiro(simp.cenarios[1].mensal)}/mês; e a migração para o Presumido, ${fmtDinheiro(simp.cenarios[2].mensal)}/mês.` },
      { tag: "warn", titulo: "Valide antes de recomendar", texto: "Os valores desta aba são calculados automaticamente a partir das abas anteriores. Confira premissas de crédito (% de compras/insumos), % B2B e o ano de análise antes de apresentar ao cliente." },
    ];
    $("resumo-explain").innerHTML = UI.explainBlock(obs);
  }

  function verdictOf(top, presC, simp) {
    const d = simp.cenarios[0];
    const h = simp.cenarios[1];
    const m = simp.cenarios[2];
    const pct = fmtPct(presC.pct);
    const presVerdict =
      presC.pct > 0
        ? `<div class="verdict verdict-up"><div>▲</div><div>Carga do Lucro Presumido AUMENTA pós-reforma (+${pct})<p>Comum em atividades com baixo % de insumos ou alta margem — o crédito de CBS/IBS não compensa a alíquota cheia.</p></div></div>`
        : `<div class="verdict verdict-down"><div>▼</div><div>Carga do Lucro Presumido DIMINUI pós-reforma (−${fmtPct(Math.abs(presC.pct))})<p>Efeito dos créditos de CBS/IBS sobre compras/insumos, algo que o PIS/COFINS cumulativo não permitia.</p></div></div>`;

    const menor = Math.min(d.mensal, h.mensal, m.mensal);
    let simplesVerdict;
    if (menor === d.mensal) {
      simplesVerdict = `<div class="verdict verdict-neutral"><div>◆</div><div>Para o Simples, manter o DAS UNIFICADO gera o menor desembolso.<p>Mesma sistemática dos Anexos e guia única. O Híbrido só compensa pelo crédito B2B, não pelo caixa.</p></div></div>`;
    } else if (menor === h.mensal) {
      simplesVerdict = `<div class="verdict verdict-neutral"><div>◆</div><div>No Simples, o Regime HÍBRIDO apresenta o menor desembolso neste cenário.<p>Além do caixa, considere o crédito integral para clientes B2B não optantes.</p></div></div>`;
    } else {
      simplesVerdict = `<div class="verdict verdict-neutral"><div>◆</div><div>No Simples, a MIGRAÇÃO para o Lucro Presumido sai mais barata.<p>Avalie perda da guia única, obrigações acessórias e margem real de lucro antes de recomendar.</p></div></div>`;
    }

    return `<div class="recom-list">${presVerdict}${simplesVerdict}</div>`;
  }

  function renderParametros(par) {
    const sched = Calculator.schedule(par.cbs, par.ibs);
    const schedHtml = sched
      .map((r) => `<tr class="${r.ano === par.ano ? "now" : ""}">
        <td>${r.ano}</td>
        <td>${fmtPct(r.cbs)}</td>
        <td>${fmtPct(r.ibs)}</td>
        <td>${fmtPct(r.icmsMantido, 0)}</td>
      </tr>`)
      .join("");
    $("schedule-body").innerHTML = schedHtml;

    $("ano-stats").innerHTML = `
      <div class="ano-stat"><span>CBS do ano</span><b class="t-cbs">${fmtPct(par.cbsDoAno)}</b></div>
      <div class="ano-stat"><span>IBS efetivo do ano</span><b class="t-icms">${fmtPct(par.ibsEfetivo)}</b></div>
      <div class="ano-stat"><span>% ICMS/ISS mantido</span><b>${fmtPct(par.icmsMantido, 0)}</b></div>
      <div class="ano-stat"><span>% da alíquota plena de IBS</span><b>${fmtPct(par.ibsAplicado, 0)}</b></div>`;
  }

  /* ---------------- admin ---------------- */
  async function renderAdmin() {
    const users = await Auth.listUsers();
    if (users.error) {
      $("admin-note").textContent = users.error;
      $("admin-table").innerHTML = `<div class="empty-users">Não foi possível carregar os dados.</div>`;
      $("admin-kpis").innerHTML = kpiCard("Erro", "—", "modo: " + (FIREBASE_ENABLED ? "Firebase" : "demo"));
      return;
    }
    const total = users.length;
    const acessos = users.reduce((s, u) => s + (u.loginCount || 0), 0);
    const last = users.reduce((acc, u) => (u.lastLogin && (!acc || u.lastLogin > acc) ? u.lastLogin : acc), "");
    $("admin-kpis").innerHTML = `
      ${kpiCard("Contas criadas", total, "pessoas que criaram acesso", "grad")}
      ${kpiCard("Acessos (logins)", acessos, "total de entradas registradas", "")}
      ${kpiCard("Último acesso", last || "—", "entrada mais recente", "")}
      ${kpiCard("Vínculo", FIREBASE_ENABLED ? "Firebase" : "Demo", FIREBASE_ENABLED ? "banco vinculado no Firestore" : "localStorage · preencha firebase-config.js", FIREBASE_ENABLED ? "grad" : "")}
    `;

    if (!total) {
      $("admin-table").innerHTML = `<div class="empty-users">Nenhum acesso registrado ainda. Quando as pessoas criarem conta e acessarem, os registros aparecerão aqui.</div>`;
      $("admin-note").textContent = FIREBASE_ENABLED
        ? "Banco de dados: Firestore (coleção “users”). O controle conta contas criadas e nº de logins de cada e-mail."
        : "Modo demo (localStorage): o vínculo Firebase ainda não foi configurado. Veja as instruções em js/firebase-config.js.";
      return;
    }

    const rows = users
      .map(
        (u) => `<tr>
          <td><strong>${UI.esc(u.name)}</strong>${u.email ? `<div class="row-note">${UI.esc(u.email)}</div>` : ""}</td>
          <td class="num">${u.loginCount || 0}</td>
          <td class="num">${Auth.formatDT(u.createdAt)}</td>
          <td class="num">${Auth.formatDT(u.lastLogin)}</td>
        </tr>`
      )
      .join("");

    $("admin-table").innerHTML = `
      <table class="tbl">
        <thead><tr><th>Usuário / e-mail</th><th class="num">Acessos</th><th class="num">Criado em</th><th class="num">Último acesso</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    $("admin-note").textContent = FIREBASE_ENABLED
      ? "Fontes: Firebase Auth (contas) + Firestore (contador de logins). A senha ADMIN é a 1882 — configure-a em js/firebase-config.js antes de publicar."
      : "Modo demo (localStorage): o vínculo Firebase ainda não foi configurado. Veja as instruções em js/firebase-config.js.";
  }

  function kpiCard(label, value, sub, grad = "") {
    return `<div class="kpi"><div class="kpi-label">${UI.esc(label)}</div><div class="kpi-value ${grad}">${UI.esc(value)}</div><div class="kpi-sub">${UI.esc(sub)}</div></div>`;
  }

  async function copyAdmin() {
    const users = await Auth.listUsers();
    if (users.error) return toast("Não foi possível gerar o relatório.", false);
    const lines = ["RELATÓRIO DE ACESSOS — CALCULADORA GTCON", ""];
    users.forEach((u) =>
      lines.push(`- ${u.name} | ${u.email} | acessos: ${u.loginCount} | criado: ${u.createdAt} | último: ${u.lastLogin}`)
    );
    const txt = lines.join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      toast("Relatório copiado para a área de transferência.");
    } catch (e) {
      toast("Não foi possível copiar.", false);
    }
  }

  /* ---------------- login/registro ---------------- */
  async function onLogin(e) {
    e.preventDefault();
    const email = $("login-email").value.trim();
    const pass = $("login-password").value;
    if (!email || !pass) return setMsg("login-msg", "Informe e-mail e senha.");
    const btn = $("login-submit");
    btn.disabled = true;
    setMsg("login-msg", "");
    const r = await Auth.login(email, pass);
    btn.disabled = false;
    if (!r.ok) return setMsg("login-msg", r.msg);
    setMsg("login-msg", "Acesso liberado.");
    toast("Bem-vindo, " + nameFromSession() + "!");
    enterMain();
  }

  async function onRegister(e) {
    e.preventDefault();
    const name = $("reg-name").value.trim();
    const email = $("reg-email").value.trim();
    const pass = $("reg-password").value;
    if (!name) return setMsg("register-msg", "Informe seu nome ou empresa.");
    const btn = $("register-submit");
    btn.disabled = true;
    setMsg("register-msg", "");
    const r = await Auth.register(name, email, pass);
    btn.disabled = false;
    if (!r.ok) return setMsg("register-msg", r.msg);
    toast("Conta criada. Acesso registrado!");
    enterMain();
  }

  async function onAdmin(e) {
    e.preventDefault();
    const user = $("admin-user").value.trim();
    const pass = $("admin-password").value;
    if (!pass) return setMsg("admin-msg", "Informe a senha de administrador.");
    const btn = $("admin-submit");
    btn.disabled = true;
    setMsg("admin-msg", "");
    const r = await Auth.adminLogin(user, pass);
    btn.disabled = false;
    if (!r.ok) return setMsg("admin-msg", r.msg);
    setMsg("admin-msg", "Acesso concedido.");
    enterMain(true);
  }

  function nameFromSession() {
    const s = Auth.current();
    return (s && s.name) || "usuário";
  }

  function enterMain(forceAdmin = false) {
    const s = Auth.current();
    if (!s) return showAuth();
    if (Auth.isAdmin() || forceAdmin) {
      showAdmin();
      renderAdmin();
      $("admin-role-line").textContent = Auth.enabled() ? "Equipe GTCON · Firebase vinculado" : "Equipe GTCON · modo demo";
      return;
    }
    showApp();
    $("user-name").textContent = s.name || s.email || "Usuário";
    $("user-role").textContent = "Conta · " + (Auth.enabled() ? "Firebase" : "demo");
    $("user-avatar").textContent = ((s.name || s.email || "?")[0] || "?").toUpperCase();
  }

  async function onLogout() {
    await Auth.logout();
    showAuth();
  }

  /* ---------------- init ---------------- */
  function populateAnos() {
    const sel = $("in-ano");
    Calculator.ANOS.forEach((a) => {
      const o = document.createElement("option");
      o.value = a;
      o.textContent = a;
      sel.appendChild(o);
    });
  }

  function bindInputs() {
    Object.entries(FIELDS).forEach(([key, f]) => {
      const el = $(f.id);
      if (!el) return;
      el.addEventListener("input", () => {
        readForm();
        renderCurrent();
      });
      el.addEventListener("change", () => {
        readForm();
        renderCurrent();
        if (f.id === "in-ano") renderParametros(computeAll().par);
      });
    });

    $("btn-save-dados").addEventListener("click", () => {
      readForm();
      toast("Dados salvos no dispositivo.");
    });
  }

  function bindNav() {
    document.querySelectorAll("#app-tabs .tab").forEach((b) => b.addEventListener("click", () => activateTab(b.dataset.tab)));

    $("btn-logout").addEventListener("click", onLogout);
    $("admin-back").addEventListener("click", () => {
      if (Auth.isAdmin()) enterMain(true);
      else enterMain();
    });
    $("admin-logout").addEventListener("click", onLogout);
    $("admin-refresh").addEventListener("click", renderAdmin);
    $("admin-copy")?.addEventListener("click", copyAdmin);

    $("go-register").addEventListener("click", () => switchCard("register"));
    $("back-login").addEventListener("click", () => switchCard("login"));
    $("go-admin-login").addEventListener("click", () => switchCard("admin"));
    $("back-login-admin").addEventListener("click", () => switchCard("login"));

    $("login-form").addEventListener("submit", onLogin);
    $("register-form").addEventListener("submit", onRegister);
    $("admin-form").addEventListener("submit", onAdmin);
  }

  function bindLoginToasts() {
    setMsg("login-msg", FIREBASE_ENABLED ? "" : "Modo demo: Firebase ainda não vinculado. Crie uma conta para testar.", true);
  }

  function start() {
    loadState();
    fillForm();
    populateAnos();
    bindInputs();
    bindNav();
    bindLoginToasts();
    activateTab("dados");
    if (Auth.current()) {
      enterMain();
    } else {
      showAuth();
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();