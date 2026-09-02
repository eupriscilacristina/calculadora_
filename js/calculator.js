/* ============================================================
   Motor de cálculo — réplica fiel das fórmulas da planilha
   "Calculadora_Impacto_Reforma_Presumido_Simples_GTCON.xlsx"
   ============================================================ */

"use strict";

const Calculator = (() => {
  const ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

  const REGRAS_PRESUNCAO = {
    "Comércio/Indústria (8%/12%)": { irpj: 0.08, csll: 0.12 },
    "Serviços Gerais (32%/32%)": { irpj: 0.32, csll: 0.32 },
    "Serviços — Transporte de carga (8%/12%)": { irpj: 0.08, csll: 0.12 },
    "Serviços — Transporte demais (16%/12%)": { irpj: 0.16, csll: 0.12 },
  };

  /* Cronograma de transição (aba "Parâmetros" da planilha). */
  function schedule(cbs, ibs) {
    return [
      { ano: 2026, cbs: 0.009, ibs: 0.001, icmsMantido: 1, ibsAplicado: 0 },
      { ano: 2027, cbs: cbs, ibs: 0.001, icmsMantido: 1, ibsAplicado: 0 },
      { ano: 2028, cbs: cbs, ibs: 0.001, icmsMantido: 1, ibsAplicado: 0 },
      { ano: 2029, cbs: cbs, ibs: ibs * 0.1, icmsMantido: 0.9, ibsAplicado: 0.1 },
      { ano: 2030, cbs: cbs, ibs: ibs * 0.2, icmsMantido: 0.8, ibsAplicado: 0.2 },
      { ano: 2031, cbs: cbs, ibs: ibs * 0.3, icmsMantido: 0.7, ibsAplicado: 0.3 },
      { ano: 2032, cbs: cbs, ibs: ibs * 0.4, icmsMantido: 0.6, ibsAplicado: 0.4 },
      { ano: 2033, cbs: cbs, ibs: ibs, icmsMantido: 0, ibsAplicado: 1 },
    ];
  }

  function yearParams(ano, cbs, ibs) {
    const row = schedule(cbs, ibs).find((r) => r.ano === ano) || schedule(cbs, ibs)[1];
    return { cbsDoAno: row.cbs, ibsEfetivo: row.ibs, icmsMantido: row.icmsMantido, ibsAplicado: row.ibsAplicado, ano };
  }

  /* ---------- Parâmetros ---------- */
  function par(event) {
    const cbs = clamp(event.cbs ?? 0.088, 0, 1);
    const ibs = clamp(event.ibs ?? 0.177, 0, 1);
    const ano = ANOS.includes(Number(event.ano)) ? Number(event.ano) : 2027;
    return { cbs, ibs, ano, ...yearParams(ano, cbs, ibs) };
  }

  /* ---------- Dados de Entrada ---------- */
  function dados(event, par) {
    const num = (v) => (isFinite(v) ? Number(v) : 0);
    return {
      cliente: String(event.cliente || "").trim() || "Nome do cliente",
      setor: event.setor || "Comércio/Indústria",
      regime: event.regime || "Lucro Presumido",
      receita: num(event.receita),
      compras: clamp(num(event.compras), 0, 1),
      atividade: event.atividade || "Comércio/Indústria (8%/12%)",
      icms: clamp(num(event.icms), 0, 1),
      iss: clamp(num(event.iss), 0, 1),
      ipi: clamp(num(event.ipi), 0, 1),
      rbt12: num(event.rbt12),
      anexo: event.anexo || "Anexo I",
      fatorR: clamp(num(event.fatorR), 0, 1),
      recPgd: num(event.recPgd),
      das: num(event.das),
      dasIcmsIss: num(event.dasIcmsIss),
      dasPisCofins: num(event.dasPisCofins),
      b2b: clamp(num(event.b2b), 0, 1),
      comprasSimples: clamp(num(event.comprasSimples), 0, 1),
    };
  }

  /* ---------- Lucro Presumido (aba "Presumido") ---------- */
  function presumido(event, par) {
    const d = dados(event, par);
    const p = REGRAS_PRESUNCAO[d.atividade] || REGRAS_PRESUNCAO["Comércio/Indústria (8%/12%)"];
    const r = d.receita;

    const baseIRPJ = r * p.irpj;
    const irpj = baseIRPJ * 0.15 + Math.max(0, baseIRPJ - 20000) * 0.1;
    const baseCSLL = r * p.csll;
    const csll = baseCSLL * 0.09;
    const pisCofins = r * 0.0365;

    const cbsLiquida = r * par.cbsDoAno * (1 - d.compras);
    const ibsLiquida = r * par.ibsEfetivo * (1 - d.compras);

    const ehComercio = d.setor === "Comércio/Indústria";
    const icmsAtual = ehComercio ? r * d.icms : 0;
    const icmsPos = ehComercio ? r * d.icms * par.icmsMantido : 0;
    const issAtual = !ehComercio ? r * d.iss : 0;
    const issPos = !ehComercio ? r * d.iss * par.icmsMantido : 0;
    const ipiAtual = r * d.ipi;
    const ipiPos = 0;

    const totalAtual = irpj + csll + pisCofins + icmsAtual + issAtual + ipiAtual;
    const totalPos = irpj + csll + cbsLiquida + icmsPos + issPos + ibsLiquida + ipiPos;

    const totalAnualAtual = totalAtual * 12;
    const totalAnualPos = totalPos * 12;
    const difAnual = totalAnualPos - totalAnualAtual;
    const pct = totalAnualAtual !== 0 ? totalAnualPos / totalAnualAtual - 1 : 0;

    return {
      setor: d.setor,
      presuncaoIRPJ: p.irpj,
      presuncaoCSLL: p.csll,
      itens: [
        { key: "IRPJ (15% + adicional 10% s/ excedente a R$20.000/mês)", atual: irpj, pos: irpj, nota: "Reforma não altera IRPJ/CSLL — mesma fórmula nas duas colunas." },
        { key: "CSLL (9% sobre a base)", atual: csll, pos: csll, nota: "Reforma não altera IRPJ/CSLL — mesma fórmula nas duas colunas." },
        { key: "PIS/COFINS cumulativo (3,65% s/ receita, sem crédito)", atual: pisCofins, pos: 0, nota: "Extinto a partir de 2027 — substituído pela CBS não cumulativa." },
        { key: "CBS líquida (receita × alíq. − créditos s/ compras)", atual: 0, pos: cbsLiquida, nota: "Não cumulativa: desconta crédito sobre o % de compras/insumos informado." },
        { key: "ICMS (de acordo com o setor)", atual: icmsAtual, pos: icmsPos, nota: "Pós-reforma: parcela residual de ICMS ainda vigente no ano selecionado (0% a partir de 2033)." },
        { key: "ISS (de acordo com o setor)", atual: issAtual, pos: issPos, nota: "Pós-reforma: parcela residual de ISS ainda vigente no ano selecionado (0% a partir de 2033)." },
        { key: "IBS líquida (substitui ICMS/ISS − créditos)", atual: 0, pos: ibsLiquida, nota: "Não cumulativa e unificada para comércio, indústria e serviços." },
        { key: "IPI", atual: ipiAtual, pos: ipiPos, nota: "Extinto a partir de 2027 (mantido apenas residualmente na Zona Franca de Manaus)." },
      ],
      totais: {
        atual: totalAtual, pos: totalPos,
        anualAtual: totalAnualAtual, anualPos: totalAnualPos,
        difAnual, pct,
      },
    };
  }

  /* ---------- Simples Nacional (aba "Simples") ---------- */
  function simples(event, par, pres) {
    const d = dados(event, par);
    const r = d.recPgd;

    const das = d.das;
    const parcelaMantida = das - d.dasIcmsIss - d.dasPisCofins;
    const cbsLiquida = r * par.cbsDoAno * (1 - d.comprasSimples);
    const ibsLiquida = r * par.ibsEfetivo * (1 - d.comprasSimples);
    const hibrido = parcelaMantida + cbsLiquida + ibsLiquida;

    const migracao = pres ? pres.totais.pos : 0;

    const cenarios = [
      {
        nome: "DAS Unificado",
        sub: d.anexo + " · regime atual",
        mensal: das,
        var: 0,
        tipo: "das",
      },
      {
        nome: "Regime Híbrido",
        sub: "IBS/CBS fora do DAS",
        mensal: hibrido,
        var: das !== 0 ? hibrido / das - 1 : 0,
        tipo: "hibrido",
      },
      {
        nome: "Migração para Lucro Presumido",
        sub: "cenário pós-reforma",
        mensal: migracao,
        var: das !== 0 ? migracao / das - 1 : 0,
        tipo: "migracao",
      },
    ];

    return {
      anexo: d.anexo,
      cenarios,
      memoria: [
        { key: "Parcela do DAS mantida (IRPJ + CSLL + CPP)", valor: parcelaMantida, nota: "DAS total menos as parcelas de ICMS/ISS e PIS/COFINS." },
        { key: "CBS líquida (fora do DAS, com direito a crédito)", valor: cbsLiquida, nota: `${fmtPct(par.cbsDoAno)} sobre a receita, com crédito de ${fmtPct(d.comprasSimples)} sobre compras/insumos.` },
        { key: "IBS líquida (fora do DAS, com direito a crédito)", valor: ibsLiquida, nota: `${fmtPct(par.ibsEfetivo)} efetivo sobre a receita, com créditos de CBS/IBS.` },
        { key: "Total mensal — Híbrido", valor: hibrido, nota: "", total: true },
      ],
    };
  }

  function resumo(pres, simples) {
    const c = simples.cenarios;
    return {
      presumido: {
        atual: pres.totais.atual,
        pos: pres.totais.pos,
        anualAtual: pres.totais.anualAtual,
        anualPos: pres.totais.anualPos,
        pct: pres.totais.pct,
      },
      simples: c.map((x) => ({ nome: x.nome, mensal: x.mensal, anual: x.mensal * 12, var: x.var })),
    };
  }

  /* ---------- Leitura / interpretação ---------- */
  function leituraPresumido(pres) {
    const t = pres.totais;
    const temCredito = pres.itens.some((i) => i.key.startsWith("CBS") || i.key.startsWith("IBS"));
    const obs = [];
    if (t.pct < -1e-9) {
      obs.push({
        tag: "hdl",
        titulo: "Queda de carga pós-reforma",
        texto: `A carga cai ${fmtPct(Math.abs(t.pct))} no ano analisado — efeito dos créditos de CBS/IBS sobre compras/insumos, algo que o PIS/COFINS cumulativo não permitia no regime atual.`,
      });
    } else if (t.pct > 1e-9) {
      obs.push({
        tag: "up",
        titulo: "Aumento de carga pós-reforma",
        texto: `A carga sobe ${fmtPct(t.pct)} no ano analisado. É comum em atividades com baixo volume de insumos ou alta margem de valor agregado, onde o crédito recuperável é pequeno frente à alíquota cheia de CBS/IBS.`,
      });
    } else {
      obs.push({ tag: "neu", titulo: "Carga estável", texto: "Pouca ou nenhuma variação de carga no cenário comparado." });
    }
    if (temCredito) {
      obs.push({
        tag: "neu",
        titulo: "Onde está o efeito",
        texto: "A CBS substitui o PIS/COFINS cumulativo (tributo sem crédito) por regime não cumulativo: quanto maior o % de compras/insumos, maior o crédito recuperável e menor o efeito líquido. O ICMS/ISS permanece integral neste ano apenas por sobrar a transição do cronograma.",
      });
    }
    obs.push({
      tag: "warn",
      titulo: "Limites do modelo",
      texto: "Créditos estimados pela alíquota do ano sobre o % de compras informado (simplificação). Em apuração real o crédito depende do CST/cClassTrib de cada aquisição. Não contempla ICMS-ST, Imposto Seletivo, incentivos ou créditos acumulados de ICMS.",
    });
    return obs;
  }

  function leituraSimples(simples, pres) {
    const c = simples.cenarios;
    const [das, hib, mig] = c;
    const obs = [];
    const menor = [...c].sort((a, b) => a.mensal - b.mensal)[0];

    obs.push({
      tag: "neu",
      titulo: "Como ler o Regime Híbrido",
      texto: "No Híbrido, IBS e CBS saem do DAS e passam a ser apurados pelas alíquotas cheias do regime regular (não cumulativo). O recolhido costuma SUBIR em relação à pequena parcela embutida no DAS — o ganho não é de caixa: é o crédito INTEGRAL destacado na nota para clientes B2B não optantes, que o Simples tradicional só permite de forma limitada (proporcional à alíquota efetiva do Anexo).",
    });
    if (hib.var > 1e-9) {
      obs.push({
        tag: "up",
        titulo: "Híbrido: desembolso maior",
        texto: `No cenário atual o Híbrido sai ${fmtPct(hib.var)} acima do DAS. Vale a pena quando o % de vendas B2B é alto o suficiente para que o crédito maior sustente preço ou retenha cliente que compraria de concorrente do regime regular.`,
      });
    }
    obs.push({
      tag: "warn",
      titulo: "Sobre a migração para o Lucro Presumido",
      texto: "A migração só costuma compensar quando a margem real é baixa frente à presunção legal, há alto volume de créditos de insumos, ou carteira majoritariamente B2B — mas considere a perda da guia única e o aumento das obrigações acessórias antes de recomendar.",
    });
    obs.push({
      tag: "neu",
      titulo: "Menor desembolso do comparativo",
      texto: `No cenário informado, a opção de menor desembolso mensal é "${menor.nome}" (${fmtDinheiro(menor.mensal)}). A escolha também depende de perfil de clientes (B2B), folha (CPP permanece no DAS em todos os cenários) e estrutura tributária.`,
    });
    return obs;
  }

  function recomendacoes(simples) {
    const ranked = [...simples.cenarios].sort((a, b) => a.mensal - b.mensal);
    const regras = {
      das: "Mantém o DAS unificado (guia única, menor desembolso e mesma sistemática dos Anexos). Ideal quando o crédito extra do Híbrido não muda a competitividade da carteira B2B.",
      hibrido: "IBS/CBS fora do DAS com crédito integral na nota — vantagem competitiva relevante se a empresa tem % alto de vendas B2B não optantes. Atenção ao desembolso maior no ano de transição.",
      migracao: "Migração para o Lucro Presumido pós-reforma. Compensa com margem real baixa, alto volume de créditos de insumos ou carteira majoritariamente B2B; cuidado com obrigações acessórias e perda da guia única.",
    };
    return ranked.map((c, i) => ({ ...c, rank: i + 1, justificativa: regras[c.tipo] }));
  }

  return { ANOS, schedule, yearParams, par, dados, presumido, simples, resumo, leituraPresumido, leituraSimples, recomendacoes };
})();

/* ---------- helpers ---------- */
function clamp(v, min, max) {
  if (!isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function fmtDinheiro(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v % 1 === 0 ? 0 : 2, minimumFractionDigits: v % 1 === 0 ? 0 : 2 });
}

function fmtPct(v, digits = 2) {
  return (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits }) + "%";
}

function assetDate() {
  const d = new Date();
  return d.toLocaleDateString("pt-BR");
}