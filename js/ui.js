/* ============================================================
   Helpers de interface — gráficos e tabelas (SVG/CSS, sem deps)
   ============================================================ */

"use strict";

const UI = (() => {
  function esc(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* Gráfico de barras comparativo (2 colunas) */
  function barChart(opts) {
    const { rows, height = 150, compact = false } = opts;
    const max = Math.max(...rows.map((r) => Math.max(r.a, r.b)), 1);
    const bars = rows
      .map((r, i) => {
        const ha = Math.max((r.a / max) * 100, r.a > 0 ? 2 : 0);
        const hb = Math.max((r.b / max) * 100, r.b > 0 ? 2 : 0);
        return `
        <div class="bar-col" style="flex:${compact ? "1 1 20%" : "1"}">
          <div class="bar-track" style="height:${height}px">
            <div style="position:relative;width:100%;height:100%;display:flex;align-items:flex-end">
              <div class="bar" style="height:${ha}%;background:${r.colA}" title="Atual: ${fmtDinheiro(r.a)}"></div>
              ${r.b !== r.a ? `<div class="bar" style="height:${hb}%;background:${r.colB};margin-left:6px" title="Pós: ${fmtDinheiro(r.b)}"></div>` : ""}
            </div>
          </div>
          <div class="bar-val" style="color:${r.colB}">${r.b !== r.a ? fmtDinheiro(r.b) : fmtDinheiro(r.a)}</div>
          <div class="bar-label">${esc(r.label)}</div>
        </div>`;
      })
      .join("");

    const legend = `
      <div class="legend">
        <span class="legend-item"><span class="swatch" style="background:${opts.colA}"></span>${esc(opts.labelA || "Atual")}</span>
        ${opts.colB ? `<span class="legend-item"><span class="swatch" style="background:${opts.colB}"></span>${esc(opts.labelB || "Pós-reforma")}</span>` : ""}
      </div>`;

    return `<div class="chart-bars">${bars}</div>${legend}`;
  }

  /* Gráfico de 3 cenários (comparativo Simples) */
  function barChart3(opts) {
    const { rows, height = 160 } = opts;
    const max = Math.max(...rows.map((r) => r.v), 1);
    const bars = rows
      .map((r) => {
        const h = Math.max((r.v / max) * 100, r.v > 0 ? 2 : 0);
        return `
        <div class="bar-col">
          <div class="bar-track" style="height:${height}px">
            <div style="position:relative;width:100%;height:100%;display:flex;align-items:flex-end">
              <div class="bar" style="height:${h}%;background:${r.col}" title="Valor: ${fmtDinheiro(r.v)}"></div>
            </div>
          </div>
          <div class="bar-val">${fmtDinheiro(r.v)}</div>
          <div class="bar-label">${esc(r.label)}</div>
        </div>`;
      })
      .join("");
    return `<div class="chart-bars">${bars}</div>`;
  }

  /* Donut single value */
  function donut(props) {
    const pct = clamp(props.pct, 0, 1);
    const c = 2 * Math.PI * props.r;
    const off = c * (1 - pct);
    return `
    <div class="donut">
      <svg width="${props.r * 2}" height="${props.r * 2}">
        <circle cx="${props.r}" cy="${props.r}" r="${props.r - 4}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="14" />
        <circle cx="${props.r}" cy="${props.r}" r="${props.r - 4}" fill="none" stroke="${props.color}" stroke-width="14"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" />
      </svg>
      <div class="donut-center">
        <strong>${props.value}</strong>
        <small>${esc(props.label || "")}</small>
      </div>
    </div>`;
  }

  /* Tabela comparativa Atual × Pós */
  function cmpTable(itens, totais) {
    const body = itens
      .filter((i) => i.atual > 0 || i.pos > 0)
      .map((i) => {
        const nota = i.nota ? `<span class="row-note">${esc(i.nota)}</span>` : "";
        const cls = i.pos > i.atual ? "pos" : i.pos < i.atual ? "neg" : "";
        return `<tr>
          <td class="row-title">${esc(i.key)}${nota}</td>
          <td class="num">${i.atual > 0 ? fmtDinheiro(i.atual) : "—"}</td>
          <td class="num ${cls}">${i.pos > 0 ? fmtDinheiro(i.pos) : "—"}</td>
        </tr>`;
      })
      .join("");
    const pct = totais.pct;
    const clsPct = pct > 0 ? "pos" : pct < 0 ? "neg" : "";
    return `
    <table class="tbl">
      <thead><tr><th>Item</th><th class="num">Regime Atual</th><th class="num">Pós-Reforma</th></tr></thead>
      <tbody>
        ${body}
        <tr class="highlight-row"><td class="row-title">TOTAL MENSAL</td><td class="num">${fmtDinheiro(totais.atual)}</td><td class="num ${clsPct}">${fmtDinheiro(totais.pos)}</td></tr>
        <tr class="highlight-row"><td class="row-title">TOTAL ANUAL (×12)</td><td class="num">${fmtDinheiro(totais.anualAtual)}</td><td class="num ${clsPct}">${fmtDinheiro(totais.anualPos)}</td></tr>
        <tr><td class="row-title">Diferença anual — Pós vs. Atual</td><td></td><td class="num ${pct > 0 ? "pos" : pct < 0 ? "neg" : ""}">${pct >= 0 ? "+" : ""}${fmtDinheiro(totais.difAnual)}</td></tr>
        <tr><td class="row-title">Diferença percentual</td><td></td><td class="num ${clsPct}">${pct >= 0 ? "+" : ""}${fmtPct(pct)}</td></tr>
      </tbody>
    </table>`;
  }

  /* Tabela comparativo Simples (3 cenários) */
  function simplesTable(cenarios) {
    const rows = cenarios
      .map((c) => {
        const cls = c.var > 0 ? "pos" : c.var < 0 ? "neg" : "";
        return `<tr>
          <td class="row-title">${esc(c.nome)}<span class="row-note">${esc(c.sub)}</span></td>
          <td class="num">${fmtDinheiro(c.mensal)}</td>
          <td class="num">${fmtDinheiro(c.mensal * 12)}</td>
          <td class="num ${cls}">${c.var >= 0 ? "+" : ""}${fmtPct(c.var)}</td>
        </tr>`;
      })
      .join("");
    return `
    <table class="tbl">
      <thead><tr><th>Cenário</th><th class="num">Total mensal</th><th class="num">Total anual</th><th class="num">Dif. vs. DAS</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  /* Tabela memória de cálculo (Híbrido) */
  function hibridoTable(memoria) {
    const rows = memoria
      .map((m) => {
        const nota = m.nota ? `<span class="row-note">${esc(m.nota)}</span>` : "";
        return `<tr class="${m.total ? "highlight-row" : ""}">
          <td class="row-title">${esc(m.key)}${nota}</td>
          <td class="num">${fmtDinheiro(m.valor)}</td>
        </tr>`;
      })
      .join("");
    return `<table class="tbl"><tbody>${rows}</tbody></table>`;
  }

  /* Explicações dinâmicas */
  function explainBlock(obs) {
    const icones = { up: "▲", down: "▼", neu: "◆", warn: "⚠", hdl: "●" };
    const tags = { up: "Aumento de carga", down: "Redução de carga", neu: "Entenda", warn: "Atenção", hdl: "Destaque" };
    const parts = obs.map((o) => {
      const tag = tags[o.tag] || "";
      return `
      <div style="margin-bottom:14px">
        <div class="explain-title">${icones[o.tag] || "●"} ${esc(tag)}: <span style="color:#e9eef7">${esc(o.titulo)}</span></div>
        <p>${esc(o.texto)}</p>
      </div>`;
    });
    return `<div class="explain-title">Leitura dos resultados</div>${parts.join("")}`;
  }

  return {
    esc,
    barChart,
    barChart3,
    donut,
    cmpTable,
    simplesTable,
    hibridoTable,
    explainBlock,
  };
})();