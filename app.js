{
/* ============ utilidades ============ */
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hide", !on);
const C = () => $("conteudo");
const hoje = () => ymd(new Date());
const dataBR = d => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR") : "";
const mesAno = d => { const t = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return t[0].toUpperCase() + t.slice(1); };
const dia = d => new Date(d + "T12:00");
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fone = w => { const d = String(w || "").replace(/\D/g, ""); return d ? (d.length <= 11 ? "55" + d : d) : ""; };
const slugify = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "album";
const raizSite = () => new URL("./", location.href).href;
const TIPOS = ["ensaio", "casamento", "evento", "aniversário", "estúdio", "corporativo", "outro"];
const STATUS_T = { orcamento: "Orçamento", confirmado: "Confirmado", realizado: "Realizado", entregue: "Entregue", cancelado: "Cancelado" };
const STATUS_G = { aberta: "Aguardando cliente", enviada: "Seleção recebida", encerrada: "Encerrada" };
let user = null, estudio = null, modoCriar = false;

function toast(t) { const el = $("toast"); el.textContent = t; show("toast", true); clearTimeout(toast.t); toast.t = setTimeout(() => show("toast", false), 2400); }
function erro(e) { console.error(e); toast("Não deu certo: " + (e?.message || e)); }
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }

/* ---------- formulário em janela ---------- */
function formulario({ titulo, campos, botao = "Salvar", extra = "", aoSalvar, aoExcluir }) {
  const campo = c => {
    const v = c.valor ?? "";
    if (c.tipo === "check") return `<div class="field"><label class="switch"><input type="checkbox" id="f_${c.id}" ${v ? "checked" : ""}> ${esc(c.rotulo)}</label></div>`;
    let inp;
    if (c.tipo === "select") inp = `<select id="f_${c.id}">${c.opcoes.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
    else if (c.tipo === "area") inp = `<textarea id="f_${c.id}" style="font-family:Montserrat;min-height:80px">${esc(v)}</textarea>`;
    else inp = `<input id="f_${c.id}" type="${c.tipo || "text"}" value="${esc(v)}" ${c.req ? "required" : ""} ${c.tipo === "number" ? 'min="0" step="0.01" inputmode="decimal"' : ""} ${c.ph ? `placeholder="${esc(c.ph)}"` : ""}>`;
    return `<div class="field" ${c.largo ? 'style="grid-column:1/-1"' : ""}><label for="f_${c.id}">${esc(c.rotulo)}</label>${inp}</div>`;
  };
  $("modalCaixa").innerHTML = `<form id="fModal"><h2 id="modalTitulo">${esc(titulo)}</h2><div class="grid2">${campos.map(campo).join("")}</div>${extra}
    <div class="row" style="margin-top:8px"><button class="btn fill">${esc(botao)}</button><button type="button" class="btn ghost" id="fCancelar">Cancelar</button>${aoExcluir ? '<span class="grow"></span><button type="button" class="link-btn" id="fExcluir">Excluir</button>' : ""}</div></form>`;
  show("modal", true);
  const primeiro = $("modalCaixa").querySelector("input,select,textarea"); primeiro?.focus();
  $("fCancelar").onclick = fecharModal;
  if (aoExcluir) $("fExcluir").onclick = async () => { if (confirm("Excluir? Isso não pode ser desfeito.")) { try { await aoExcluir(); fecharModal(); } catch (e) { erro(e); } } };
  $("fModal").onsubmit = async e => {
    e.preventDefault();
    const v = {};
    campos.forEach(c => { const el = $("f_" + c.id); v[c.id] = c.tipo === "check" ? el.checked : c.tipo === "number" ? (el.value === "" ? 0 : +el.value) : el.value.trim(); });
    const b = $("fModal").querySelector(".btn.fill"); b.disabled = true;
    try { await aoSalvar(v); fecharModal(); } catch (err) { erro(err); b.disabled = false; }
  };
}
function fecharModal() { show("modal", false); $("modalCaixa").innerHTML = ""; }
$("modal").addEventListener("click", e => { if (e.target.id === "modal") fecharModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("modal").classList.contains("hide")) fecharModal(); });

/* ============ acesso ============ */
const aviso = (txt, ruim) => { const m = $("msgEntrar"); m.textContent = txt; m.className = "msg" + (ruim ? " erro" : ""); };
const setModo = criar => {
  modoCriar = criar;
  $("eTitulo").textContent = criar ? "Criar estúdio" : "Entrar";
  $("eSub").textContent = criar ? "14 dias grátis, sem cartão de crédito." : "Acesse o seu estúdio.";
  show("campoNome", criar); show("esqueci", !criar);
  show("aceite", criar);
  $("bEntrar").textContent = criar ? "Criar meu estúdio" : "Entrar";
  $("senha").autocomplete = criar ? "new-password" : "current-password";
  $("trocar").innerHTML = criar ? 'Já tem conta? <a href="#" id="lTrocar">Entrar.</a>' : 'Primeira vez aqui? <a href="#" id="lTrocar">Crie o seu estúdio.</a>';
  $("lTrocar").onclick = e => { e.preventDefault(); show("msgEntrar", false); setModo(!criar); };
};
$("lTrocar").onclick = e => { e.preventDefault(); setModo(true); };
if (/criar/.test(location.search)) setModo(true);
/* "Manter conectado" desmarcado: a sessão acaba quando o navegador fecha */
try { if (localStorage.getItem("seleta-temporaria") === "1" && !sessionStorage.getItem("seleta-ativa")) sb.auth.signOut(); } catch {}
const marcarSessao = () => { try { const m = $("manter").checked; localStorage.setItem("seleta-temporaria", m ? "0" : "1"); sessionStorage.setItem("seleta-ativa", "1"); } catch {} };
$("fEntrar").onsubmit = async e => {
  e.preventDefault();
  const email = $("email").value.trim(), senha = $("senha").value;
  $("bEntrar").disabled = true;
  try {
    if (modoCriar) {
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome: $("nome").value.trim() || "Meu estúdio" }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) aviso("Conta criada. Enviamos um link de confirmação para " + email + ". Clique nele e depois entre aqui.");
    } else {
      marcarSessao();
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    }
  } catch (err) {
    const t = String(err.message || err);
    aviso(/Invalid login/i.test(t) ? "E-mail ou senha incorretos." : /not confirmed/i.test(t) ? "Confirme seu e-mail pelo link que enviamos." : /already registered/i.test(t) ? "Esse e-mail já tem conta. Use a aba Entrar." : "Não deu certo: " + t, true);
  }
  $("bEntrar").disabled = false;
};
$("esqueci").onclick = async e => {
  e.preventDefault();
  const email = $("email").value.trim();
  if (!email) return aviso("Digite seu e-mail acima e clique de novo em “Esqueci minha senha”.", true);
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  aviso(error ? "Não deu certo: " + error.message : "Se esse e-mail tiver conta, chega um link para criar uma nova senha.", !!error);
};
$("fSenha").onsubmit = async e => {
  e.preventDefault();
  const { error } = await sb.auth.updateUser({ password: $("nova").value });
  if (error) return erro(error);
  show("vSenha", false); entrar();
};
$("sair").onclick = () => sb.auth.signOut();

/* ============ moldura do painel ============ */
const TITULOS = { inicio: "Painel", galerias: "Galerias", galeria: "Galeria", entregas: "Entregas", diagramacoes: "Aprovação de álbum", diagramacao: "Aprovação de álbum", clientes: "Clientes", cliente: "Cliente", trabalhos: "Trabalhos", agenda: "Agenda", financeiro: "Financeiro", tarefas: "Tarefas", config: "Configurações", plano: "Plano e cobrança", admin: "Administrador", conversas: "Conversas", relatorios: "Relatórios", funil: "Funil", indique: "Indique e ganhe" };
const celular = () => matchMedia("(max-width:860px)").matches;
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const ler = k => { try { return localStorage.getItem(k); } catch { return null; } };
if (ler("seleta-menu") === "recolhido") $("vPainel").classList.add("recolhido");
$("recolher").onclick = () => {
  if (celular()) return $("vPainel").classList.toggle("aberto");
  const r = $("vPainel").classList.toggle("recolhido"); guardar("seleta-menu", r ? "recolhido" : "aberto");
};
$("veu").onclick = () => $("vPainel").classList.remove("aberto");
document.querySelectorAll(".gt").forEach((b, i) => {
  if (ler("seleta-grupo-" + i) === "fechado") b.setAttribute("aria-expanded", "false");
  b.onclick = () => { const ab = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", ab); guardar("seleta-grupo-" + i, ab ? "aberto" : "fechado"); };
});
const pintarTema = () => { const esc = document.documentElement.dataset.theme === "dark"; $("tema").innerHTML = `<svg><use href="#i-${esc ? "sol" : "lua"}"/></svg>`; $("tema").setAttribute("aria-label", esc ? "Usar modo claro" : "Usar modo escuro"); };
$("tema").onclick = () => { const esc = document.documentElement.dataset.theme !== "dark"; if (esc) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme; guardar("seleta-tema", esc ? "escuro" : "claro"); pintarTema(); };
pintarTema();
function alternarPop(botao, caixa) {
  const abrir = $(caixa).classList.contains("hide");
  ["notifs", "menuConta"].forEach(id => show(id, false)); ["sino", "avatar"].forEach(id => $(id).setAttribute("aria-expanded", "false"));
  if (abrir) { show(caixa, true); $(botao).setAttribute("aria-expanded", "true"); }
}
$("sino").onclick = e => { e.stopPropagation(); alternarPop("sino", "notifs"); };
$("avatar").onclick = e => { e.stopPropagation(); alternarPop("avatar", "menuConta"); };
document.addEventListener("click", e => { if (!e.target.closest(".caixaPop")) { show("notifs", false); show("menuConta", false); } });
$("notifs").addEventListener("click", e => { if (e.target.closest("a")) show("notifs", false); });
$("menuConta").addEventListener("click", e => { if (e.target.closest("a")) show("menuConta", false); });
window.addEventListener("seleta:lang", () => { if (user && !$("vPainel").classList.contains("hide")) rota(); });
/* --- suporte (gaveta lateral) --- */
async function abrirSuporte() {
  show("menuConta", false); $("vPainel").classList.remove("aberto");
  show("gaveta", true); requestAnimationFrame(() => $("gaveta").classList.add("on"));
  $("sAss").focus();
  const { data } = await sb.from("suporte").select("*").order("criado_em", { ascending: false }).limit(20);
  $("sHist").innerHTML = (data || []).length ? `<h3 class="small mute" style="margin:26px 0 10px;letter-spacing:.12em">CONVERSAS ANTERIORES</h3>` + data.map(m => `
    <div class="supItem"><div class="row" style="justify-content:space-between;gap:8px"><strong>${esc(m.assunto)}</strong><span class="tag ${m.resposta ? "encerrada" : "aberta"}">${m.resposta ? "Respondido" : "Aguardando"}</span></div>
      <p class="small mute">${new Date(m.criado_em).toLocaleDateString("pt-BR")} · ${esc(m.mensagem)}</p>
      ${m.resposta ? `<div class="supResp"><span class="small mute">Resposta da equipe</span><p>${esc(m.resposta)}</p></div>` : ""}</div>`).join("") : "";
}
function fecharSuporte() { $("gaveta").classList.remove("on"); setTimeout(() => show("gaveta", false), 200); }
document.addEventListener("click", e => { if (e.target.closest("[data-suporte]")) { e.preventDefault(); abrirSuporte(); } });
$("gaveta").addEventListener("click", e => { if (e.target.closest("[data-fechar]")) fecharSuporte(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("gaveta").classList.contains("hide")) fecharSuporte(); });
const validarSup = () => $("sEnv").disabled = !($("sAss").value.trim() && $("sMsg").value.trim());
$("sAss").oninput = validarSup; $("sMsg").oninput = validarSup;
$("fSup").onsubmit = async e => {
  e.preventDefault(); $("sEnv").disabled = true;
  try {
    await q(sb.from("suporte").insert({ email: user.email, assunto: $("sAss").value.trim(), mensagem: $("sMsg").value.trim() }));
    $("sAss").value = ""; $("sMsg").value = ""; toast("Mensagem enviada. Respondemos por aqui e no seu e-mail."); abrirSuporte();
  } catch (err) { erro(err); validarSup(); }
};
function pintarConta() {
  const n = (estudio?.nome || user?.email || "").replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/);
  const ini = ((n[0]?.[0] || "") + (n[1]?.[0] || "")).toUpperCase() || "S";
  const conteudo = estudio?.foto_url ? `<img src="${esc(estudio.foto_url)}" alt="">` : esc(ini);
  $("avatar").innerHTML = conteudo; $("avatar").classList.toggle("comFoto", !!estudio?.foto_url);
  $("contaFoto").innerHTML = conteudo; $("contaFoto").classList.toggle("comFoto", !!estudio?.foto_url);
  $("contaNome").textContent = estudio?.nome || ""; $("contaEmail").textContent = user?.email || "";
}
async function notificacoes() {
  try {
    const em2 = new Date(); em2.setDate(em2.getDate() + 2);
    const [sel, atr, tar, dg, pz] = await Promise.all([
      q(sb.from("galerias").select("slug,titulo,cliente_nome,enviada_em").eq("status", "enviada").order("enviada_em", { ascending: false }).limit(8)),
      q(sb.from("pagamentos").select("descricao,valor,vencimento").is("pago_em", null).lt("vencimento", hoje()).order("vencimento").limit(8)),
      q(sb.from("tarefas").select("id,titulo,vencimento").eq("feita", false).lte("vencimento", hoje()).order("vencimento").limit(8)),
      q(sb.from("diagramacoes").select("slug,titulo,cliente_nome,status,respondido_em").eq("status", "alteracoes").order("respondido_em", { ascending: false }).limit(8)),
      q(sb.from("galerias").select("slug,titulo,cliente_nome,prazo").eq("status", "aberta").eq("so_entrega", false).not("prazo", "is", null).lte("prazo", ymd(em2)).order("prazo").limit(8))
    ]);
    const total = sel.length + atr.length + tar.length + dg.length + pz.length;
    $("badge").textContent = total > 9 ? "9+" : total; show("badge", total > 0);
    $("contTarefas").textContent = tar.length || "";
    $("notifs").innerHTML = total ? `
      ${sel.length ? `<h3>Seleções recebidas</h3>${sel.map(g => `<a class="item" href="#/galeria/${esc(g.slug)}"><div class="txt"><strong>${esc(g.titulo)}</strong><span>${esc(g.cliente_nome || "")}${g.enviada_em ? " · " + new Date(g.enviada_em).toLocaleDateString("pt-BR") : ""}</span></div></a>`).join("")}` : ""}
      ${pz.length ? `<h3>Prazos de escolha</h3>${pz.map(g => `<a class="item" href="#/galeria/${esc(g.slug)}"><div class="txt"><strong>${esc(g.titulo)}</strong><span>${esc(g.cliente_nome || "")} · ${g.prazo < hoje() ? "venceu " : g.prazo === hoje() ? "vence hoje" : "vence "}${g.prazo === hoje() ? "" : esc(dataBR(g.prazo))}</span></div><span class="small">Lembrar</span></a>`).join("")}` : ""}
      ${dg.length ? `<h3>Álbuns diagramados com pedido de alteração</h3>${dg.map(d => `<a class="item" href="#/diagramacao/${esc(d.slug)}"><div class="txt"><strong>${esc(d.titulo)}</strong><span>${esc(d.cliente_nome || "")}</span></div></a>`).join("")}` : ""}
      ${atr.length ? `<h3>Pagamentos atrasados</h3>${atr.map(p => `<a class="item" href="#/financeiro"><div class="txt"><strong>${esc(p.descricao)}</strong><span>venceu ${esc(dataBR(p.vencimento))}</span></div><span class="val">${brl(p.valor)}</span></a>`).join("")}` : ""}
      ${tar.length ? `<h3>Tarefas para hoje</h3>${tar.map(t => `<a class="item" href="#/tarefas"><div class="txt"><strong>${esc(t.titulo)}</strong><span>${t.vencimento < hoje() ? "atrasada · " : ""}${esc(dataBR(t.vencimento))}</span></div></a>`).join("")}` : ""}`
      : `<p class="vazioP" style="padding:14px 10px">Tudo em dia por aqui.</p>`;
  } catch (e) { console.error(e); }
}

sb.auth.onAuthStateChange((ev, session) => {
  if (ev === "PASSWORD_RECOVERY") { show("vEntrar", false); show("vPainel", false); show("vSenha", true); return; }
  const antes = user?.id;
  user = session?.user || null;
  if (user && user.id !== antes) setTimeout(entrar, 0);
  else if (!user) { show("vPainel", false); show("vSenha", false); show("vEntrar", true); }
});

async function entrar() {
  show("vEntrar", false); show("vPainel", true);
  await carregarEstudio();
  atualizarUso();
  rota();
}
async function carregarEstudio() {
  estudio = await q(sb.from("estudios").select("*").eq("id", user.id).maybeSingle()) || { id: user.id, nome: "Meu estúdio", marca_dagua: true, marca_opacidade: 0.35 };
  pintarConta(); marcarTravados();
  if (!estudio.slug) {
    const base = slugify(estudio.nome || user.email.split("@")[0]);
    for (let i = 0; i < 30; i++) {
      const tent = i ? `${base}-${i + 1}` : base;
      const { data: livre } = await sb.rpc("slug_livre", { p_slug: tent });
      if (livre) { const r = await sb.from("estudios").update({ slug: tent }).eq("id", user.id).select().single(); if (!r.error) { estudio = r.data; break; } }
    }
  }
  const ref = ler("seleta-ref");
  if (ref && !estudio.indicado_por && ref !== estudio.slug) {
    const r = await sb.from("estudios").update({ indicado_por: ref }).eq("id", user.id).select().single();
    if (!r.error) estudio = r.data;
    try { localStorage.removeItem("seleta-ref"); } catch {}
  }
}
async function slugAlbumLivre(titulo, ignorarId) {
  const base = slugify(titulo);
  const usados = new Set((await q(sb.from("galerias").select("id,slug").like("slug", base + "%"))).filter(g => g.id !== ignorarId).map(g => g.slug));
  let s = base, i = 2; while (usados.has(s)) s = `${base}-${i++}`;
  return s;
}
async function atualizarUso() {
  const { data } = await sb.rpc("espaco_usado");
  const b = Number(data || 0), pct = Math.min(100, b / SELETA.limiteBytes * 100);
  $("uso").innerHTML = `${(b / 1048576).toFixed(0)} MB de 1 GB usados<span class="barra"><i style="width:${pct.toFixed(1)}%"></i></span>`;
}

/* ============ rotas ============ */
const ROTAS = {};
async function rota() {
  if (!user) return;
  const [nome, arg] = location.hash.replace(/^#\/?/, "").split("/");
  let r = ROTAS[nome] ? nome : "inicio";
  if (estudio && nivelAtual() === 0 && r !== "plano") { if (location.hash !== "#/plano") { location.hash = "#/plano"; return; } r = "plano"; }
  const ativo = r === "galeria" ? "galerias" : r === "cliente" ? "clientes" : r === "plano" ? "config" : r === "diagramacao" ? "diagramacoes" : r;
  document.querySelectorAll("#menu a, .ladoPe a[data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === ativo));
  $("tituloPag").textContent = TITULOS[r] || "";
  document.title = (TITULOS[r] || "Painel") + " · Seleta";
  $("vPainel").classList.remove("aberto");
  notificacoes();
  marcarTravados();
  const TRAVA = { diagramacoes: "album", diagramacao: "album", funil: "crm", conversas: "crm", relatorios: "crm" };
  if (TRAVA[r] && !pode(TRAVA[r])) { C().innerHTML = cadeado(TRAVA[r]); return; }
  C().innerHTML = `<p class="mute">Carregando…</p>`;
  try { await ROTAS[r](arg ? decodeURIComponent(arg) : null); } catch (e) { C().innerHTML = `<div class="msg erro">Não foi possível carregar: ${esc(e.message || e)}</div>`; console.error(e); }
  C().focus({ preventScroll: true }); window.scrollTo(0, 0);
}
window.addEventListener("hashchange", rota);
const ir = h => { if (location.hash === h) rota(); else location.hash = h; };

/* listas usadas em vários formulários */
const listaClientes = () => q(sb.from("clientes").select("id,nome,whatsapp").order("nome"));
const listaTrabalhos = () => q(sb.from("trabalhos").select("id,titulo,data,cliente_id").neq("status", "cancelado").order("data", { ascending: false, nullsFirst: false }).limit(200));
const opcClientes = cs => [["", "— sem cliente —"], ...cs.map(c => [c.id, c.nome])];
const opcTrabalhos = ts => [["", "— nenhum —"], ...ts.map(t => [t.id, t.titulo + (t.data ? " · " + dataBR(t.data) : "")])];

/* ============ INÍCIO ============ */
ROTAS.inicio = async () => {
  const d0 = new Date(), ini = ymd(new Date(d0.getFullYear(), d0.getMonth(), 1)), fim = ymd(new Date(d0.getFullYear(), d0.getMonth() + 1, 0));
  const [prox, gals, pagMes, atras, tars] = await Promise.all([
    q(sb.from("trabalhos").select("id,titulo,data,hora,local,status,clientes(nome)").gte("data", hoje()).neq("status", "cancelado").order("data").order("hora").limit(6)),
    q(sb.from("galerias").select("id,slug,titulo,cliente_nome,status,enviada_em").eq("so_entrega", false).neq("status", "encerrada").order("criado_em", { ascending: false })),
    q(sb.from("pagamentos").select("valor,pago_em,vencimento").gte("vencimento", ini).lte("vencimento", fim)),
    q(sb.from("pagamentos").select("valor").is("pago_em", null).lt("vencimento", hoje())),
    q(sb.from("tarefas").select("*, clientes(nome), trabalhos(titulo)").eq("feita", false).order("vencimento", { nullsFirst: false }).limit(6))
  ]);
  const recebido = pagMes.filter(p => p.pago_em).reduce((s, p) => s + +p.valor, 0);
  const aReceber = pagMes.filter(p => !p.pago_em).reduce((s, p) => s + +p.valor, 0);
  const atrasado = atras.reduce((s, p) => s + +p.valor, 0);
  const recebidas = gals.filter(g => g.status === "enviada"), aguardando = gals.filter(g => g.status === "aberta");
  const nome = (estudio.nome || "").split(" ")[0];
  const capa = await sb.from("galerias").select("capa:fotos!galerias_capa_foto_id_fkey(caminho)").not("capa_foto_id", "is", null).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  const fotoFaixa = capa.data?.capa?.caminho ? urlFoto(capa.data.capa.caminho) : "https://images.unsplash.com/photo-1724690336308-02af024b76ab?w=1600&q=70&auto=format&fit=crop";
  C().innerHTML = `${avisoPlano()}
    <div class="faixaFoto faixaPainel" style="--foto:url('${esc(fotoFaixa)}')"><div><h1>Olá${nome ? ", " + esc(nome) : ""}</h1><p>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p></div>
      <div class="acoes"><button class="btn" id="aTrab">Novo trabalho</button><button class="btn" id="aCli">Novo cliente</button><button class="btn fill" id="aGal">Nova galeria</button></div></div>
    <div class="cards">
      <div class="num escuro"><span>Recebido em ${esc(new Date().toLocaleDateString("pt-BR", { month: "long" }))}</span><b>${brl(recebido)}</b></div>
      <div class="num"><span>A receber no mês</span><b>${brl(aReceber)}</b></div>
      <div class="num"><span>Em atraso</span><b>${brl(atrasado)}</b></div>
      <div class="num"><span>Seleções recebidas</span><b>${recebidas.length}</b></div>
    </div>
    <div class="duas">
      <div class="bloco"><h2>Próximos trabalhos <a href="#/agenda">Ver agenda</a></h2>
        ${prox.length ? prox.map(t => `<a class="item" href="#/agenda/${t.data.slice(0, 7)}"><div class="data"><b>${dia(t.data).getDate()}</b><span>${dia(t.data).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>
          <div class="txt"><strong>${esc(t.titulo)}</strong><span>${[t.clientes?.nome, t.hora?.slice(0, 5), t.local].filter(Boolean).map(esc).join(" · ")}</span></div><span class="st">${STATUS_T[t.status]}</span></a>`).join("") : `<p class="vazioP">Nada marcado. Que tal cadastrar o próximo ensaio?</p>`}
      </div>
      <div class="bloco"><h2>Galerias <a href="#/galerias">Ver todas</a></h2>
        ${[...recebidas, ...aguardando].slice(0, 6).map(g => `<a class="item" href="#/galeria/${esc(g.slug)}"><div class="txt"><strong>${esc(g.titulo)}</strong><span>${esc(g.cliente_nome || "Sem cliente")}</span></div><span class="tag ${g.status}">${STATUS_G[g.status]}</span></a>`).join("") || `<p class="vazioP">Nenhuma galeria aberta.</p>`}
      </div>
    </div>
    <div class="bloco" style="margin-top:18px"><h2>Tarefas <span class="acoes"><button class="btn sm ghost" id="aTar">Nova tarefa</button><a href="#/tarefas">Ver todas</a></span></h2>
      <div id="dTar">${tars.length ? tars.map(linhaTarefa).join("") : `<p class="vazioP">Nenhuma tarefa pendente.</p>`}</div></div>`;
  ligarTarefas(tars, $("dTar")); $("aTar").onclick = () => editarTarefa();
  $("aGal").onclick = novaGaleria; $("aCli").onclick = () => editarCliente(); $("aTrab").onclick = () => editarTrabalho();
};

/* ============ GALERIAS ============ */
let filtroGal = "todas";
ROTAS.galerias = async () => {
  const gs = await q(sb.from("galerias").select("id,slug,titulo,cliente_nome,status,criado_em,capa:fotos!galerias_capa_foto_id_fkey(caminho),qtd:fotos!fotos_galeria_id_fkey(count)").eq("so_entrega", false).order("criado_em", { ascending: false }));
  const f = { todas: () => true, aberta: g => g.status === "aberta", enviada: g => g.status === "enviada", encerrada: g => g.status === "encerrada" };
  const pintar = () => {
    const lista = gs.filter(f[filtroGal]);
    $("gLista").innerHTML = lista.length ? lista.map(g => `
      <a class="gcard" href="#/galeria/${esc(g.slug)}">
        <div class="capa" style="${g.capa?.caminho ? `background-image:url('${esc(urlFoto(g.capa.caminho))}')` : ""}"><span class="tag ${g.status}">${STATUS_G[g.status]}</span></div>
        <div class="info"><h3>${esc(g.titulo)}</h3><span class="small mute">${esc(g.cliente_nome || "Sem cliente")} · ${g.qtd?.[0]?.count || 0} fotos · ${new Date(g.criado_em).toLocaleDateString("pt-BR")}</span></div>
      </a>`).join("") : `<div class="vazio" style="grid-column:1/-1">Nenhuma galeria aqui.</div>`;
    document.querySelectorAll(".chip[data-f]").forEach(c => c.setAttribute("aria-pressed", c.dataset.f === filtroGal));
  };
  C().innerHTML = `
    <div class="cabeca"><div><h1>Galerias</h1><p class="mute">Suba as prévias, mande o link e receba a escolha do cliente.</p></div><button class="btn fill" id="aGal">Nova galeria</button></div>
    <div class="filtros">${[["todas", "Todas"], ["aberta", "Aguardando cliente"], ["enviada", "Seleção recebida"], ["encerrada", "Encerradas"]].map(([k, t]) => `<button class="chip" data-f="${k}">${t} (${gs.filter(f[k]).length})</button>`).join("")}</div>
    <div class="galerias" id="gLista"></div>`;
  document.querySelectorAll(".chip[data-f]").forEach(c => c.onclick = () => { filtroGal = c.dataset.f; pintar(); });
  $("aGal").onclick = novaGaleria;
  pintar();
};

/* ============ ENTREGAS (fotos tratadas) ============ */
ROTAS.entregas = async () => {
  const gs = await q(sb.from("galerias").select("id,slug,titulo,entrega_titulo,cliente_nome,status,so_entrega,entrega_liberada,entrega_capa,criado_em,qtd:entregas(count)").order("criado_em", { ascending: false }));
  const lista = gs.filter(g => g.so_entrega || g.entrega_liberada || g.qtd?.[0]?.count || g.status === "enviada");
  const est = g => g.entrega_liberada ? ["Entregue", "encerrada"] : g.qtd?.[0]?.count ? ["Rascunho", "aberta"] : ["Aguardando fotos tratadas", "enviada"];
  C().innerHTML = `
    <div class="cabeca"><div><h1>Entregas</h1><p class="mute">Fotos prontas e tratadas, com capa e título, para o cliente baixar.</p></div><button class="btn fill" id="aEnt">Nova entrega</button></div>
    <div class="galerias">${lista.length ? lista.map(g => `
      <a class="gcard" href="#/galeria/${esc(g.slug)}" data-ent="1">
        <div class="capa" style="${g.entrega_capa ? `background-image:url('${esc(urlEntrega(g.entrega_capa))}')` : ""}"><span class="tag ${est(g)[1]}">${est(g)[0]}</span></div>
        <div class="info"><h3>${esc(g.entrega_titulo || g.titulo)}</h3><span class="small mute">${esc(g.cliente_nome || "Sem cliente")} · ${g.qtd?.[0]?.count || 0} fotos${g.so_entrega ? "" : " · veio da seleção"}</span></div>
      </a>`).join("") : `<div class="vazio" style="grid-column:1/-1">Nenhuma entrega ainda. Crie uma entrega direta ou finalize uma seleção para enviar as fotos tratadas.</div>`}</div>`;
  document.querySelectorAll("[data-ent]").forEach(a => a.onclick = () => { abaG = "entrega"; pintarGaleria.ultima = null; });
  $("aEnt").onclick = novaEntrega;
};
async function novaEntrega() {
  const [cs, ts] = await Promise.all([listaClientes(), listaTrabalhos()]);
  formulario({
    titulo: "Nova entrega", botao: "Criar entrega",
    campos: [
      { id: "titulo", rotulo: "Título que o cliente vai ver", req: true, ph: "Ensaio Sophia · Novembro" },
      { id: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: opcClientes(cs) },
      { id: "trabalho_id", rotulo: "Trabalho da agenda", tipo: "select", opcoes: opcTrabalhos(ts) },
      { id: "mensagem", rotulo: "Recado para o cliente (opcional)", tipo: "area", largo: true, ph: "Foi um prazer fotografar vocês 🤍" }
    ],
    aoSalvar: async v => {
      const cli = cs.find(c => c.id === v.cliente_id);
      const g = await q(sb.from("galerias").insert({ slug: await slugAlbumLivre(v.titulo), titulo: v.titulo, entrega_titulo: v.titulo, so_entrega: true, cliente_id: v.cliente_id || null, cliente_nome: cli?.nome || null,
        trabalho_id: v.trabalho_id || null, fotos_incluidas: 0, permitir_extras: false, mostrar_pacote: false, mensagem: v.mensagem || null }).select("slug").single());
      abaG = "entrega"; pintarGaleria.ultima = null; ir("#/galeria/" + g.slug);
    }
  });
}

async function novaGaleria(pre = {}) {
  const lim = LIMITE_GAL[nivelAtual()] ?? 15;
  if (lim !== Infinity) {
    const { count } = await sb.from("galerias").select("id", { count: "exact", head: true }).neq("status", "encerrada").eq("so_entrega", false);
    if ((count || 0) >= lim) { if (confirm(`Seu plano permite ${lim} galerias ativas e você já tem ${count}. Encerre uma galeria antiga ou mude de plano. Ver planos?`)) ir("#/plano"); return; }
  }
  const [cs, ts] = await Promise.all([listaClientes(), listaTrabalhos()]);
  formulario({
    titulo: "Nova galeria", botao: "Criar galeria",
    campos: [
      { id: "titulo", rotulo: "Nome da galeria", req: true, ph: "Ensaio Sophia", valor: pre.titulo },
      { id: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: opcClientes(cs), valor: pre.cliente_id },
      { id: "trabalho_id", rotulo: "Trabalho da agenda", tipo: "select", opcoes: opcTrabalhos(ts), valor: pre.trabalho_id },
      { id: "prazo", rotulo: "Prazo para escolher", tipo: "date" },
      { id: "fotos_incluidas", rotulo: "Fotos incluídas no pacote", tipo: "number", valor: 20 },
      { id: "preco_extra", rotulo: "Valor da foto extra (R$)", tipo: "number", valor: 20 },
      { id: "mostrar_pacote", rotulo: "Mostrar ao cliente quantas fotos o pacote inclui", tipo: "check", valor: true },
      { id: "permitir_extras", rotulo: "Permitir que o cliente escolha fotos extras (pagas)", tipo: "check", valor: true },
      { id: "mensagem", rotulo: "Recado para o cliente (aparece na galeria)", tipo: "area", largo: true, ph: "Escolha suas favoritas com calma 🤍" }
    ],
    aoSalvar: async v => {
      const cli = cs.find(c => c.id === v.cliente_id);
      const g = await q(sb.from("galerias").insert({ slug: await slugAlbumLivre(v.titulo), titulo: v.titulo, cliente_id: v.cliente_id || null, cliente_nome: cli?.nome || null, trabalho_id: v.trabalho_id || null,
        prazo: v.prazo || null, fotos_incluidas: Math.round(v.fotos_incluidas), preco_extra: v.preco_extra, mostrar_pacote: v.mostrar_pacote, permitir_extras: v.permitir_extras, mensagem: v.mensagem || null }).select("slug").single());
      ir("#/galeria/" + g.slug);
    }
  });
}

/* --- uma galeria --- */
let G = null, fotos = [], marcadas = new Set(), coments = {}, abaG = "fotos";
ROTAS.galeria = async slug => {
  G = await q(sb.from("galerias").select("*, clientes(nome,whatsapp), trabalhos(titulo)").eq("slug", slug).maybeSingle());
  if (!G) return ir("#/galerias");
  const [f, s, c] = await Promise.all([
    q(sb.from("fotos").select("*").eq("galeria_id", G.id).order("ordem")),
    q(sb.from("selecoes").select("foto_id").eq("galeria_id", G.id)),
    q(sb.from("comentarios").select("foto_id,texto").eq("galeria_id", G.id))
  ]);
  fotos = f; marcadas = new Set(s.map(x => x.foto_id)); coments = Object.fromEntries(c.map(x => [x.foto_id, x.texto]));
  if (!G.capa_foto_id && fotos[0]) { G.capa_foto_id = fotos[0].id; sb.from("galerias").update({ capa_foto_id: fotos[0].id }).eq("id", G.id).then(() => {}); }
  if (G.so_entrega && !["entrega", "ajustes"].includes(abaG)) abaG = "entrega";
  if (!G.so_entrega && G.status === "enviada" && abaG === "fotos" && pintarGaleria.ultima !== G.id) abaG = "selecao";
  pintarGaleria.ultima = G.id;
  pintarGaleria();
};
const linkCliente = () => raizSite() + (estudio.slug ? estudio.slug + "/" : "g.html?g=") + G.slug;
const msgCliente = () => `Oi${G.cliente_nome ? ", " + G.cliente_nome.split(" ")[0] : ""}! ${G.so_entrega || G.entrega_liberada ? "Suas fotos finais estão prontas pra baixar 🤍" : "Suas fotos estão prontas 📸"}\n\n${linkCliente()}\nCódigo: ${G.codigo_acesso}`;
function pintarGaleria() {
  const capaP = fotos.find(f => f.id === G.capa_foto_id) || fotos[0];
  const capaUrl = G.so_entrega ? (G.entrega_capa ? urlEntrega(G.entrega_capa) : "") : capaP ? urlFoto(capaP.caminho) : "";
  const abas = G.so_entrega ? [["entrega", "Fotos tratadas"], ["ajustes", "Ajustes"]]
    : [["fotos", `Prévias (${fotos.length})`], ["selecao", `Seleção (${marcadas.size})`], ["design", "Design"], ["entrega", "Fotos tratadas"], ["ajustes", "Ajustes"]];
  const pronta = !G.so_entrega && G.status === "enviada" && !G.entrega_liberada && abaG !== "entrega";
  const sub = G.so_entrega ? [G.cliente_nome, "entrega de fotos tratadas", G.entrega_liberada ? "liberada" : "rascunho"]
    : [G.cliente_nome, `${G.fotos_incluidas} no pacote`, G.permitir_extras === false ? "sem extras" : `extra ${brl(G.preco_extra)}`, G.prazo && "prazo " + dataBR(G.prazo)];
  C().innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:10px"><a class="volta" href="${G.so_entrega ? "#/entregas" : "#/galerias"}" style="margin:0">← ${G.so_entrega ? "Entregas" : "Galerias"}</a><button class="btn sm ghost" id="excluirAlbum">Excluir galeria</button></div>
    <div class="banner" style="${capaUrl ? `background-image:url('${esc(capaUrl)}')` : ""}">
      <div class="sobre"><div><h1>${esc(G.so_entrega ? G.entrega_titulo || G.titulo : G.titulo)}</h1><p style="margin-top:6px;opacity:.85">${sub.filter(Boolean).map(esc).join(" · ")}</p></div><span class="tag">${G.so_entrega ? (G.entrega_liberada ? "Entregue" : "Rascunho") : STATUS_G[G.status]}</span></div>
    </div>
    <div class="bloco compart">
      <div><span class="small mute">Link do cliente</span><br><code>${esc(linkCliente())}</code><div style="margin-top:8px"><span class="small mute">Código</span> <span class="codigo">${esc(G.codigo_acesso)}</span></div></div>
      <div class="acoes"><button class="btn ghost" id="copMsg">Copiar mensagem</button><a class="btn fill" target="_blank" rel="noopener" href="https://wa.me/${fone(G.clientes?.whatsapp)}?text=${encodeURIComponent(msgCliente())}">Enviar no WhatsApp</a><a class="btn ghost" target="_blank" rel="noopener" href="${esc(linkCliente())}">Ver como cliente</a></div>
    </div>
    ${pronta ? `<div class="bloco avisoPronta"><div><strong>Seleção finalizada pelo cliente</strong><br><span class="small mute">${marcadas.size} fotos escolhidas. Depois de editar, suba as fotos tratadas para ele baixar.</span></div><button class="btn fill" id="irEntrega">Enviar fotos tratadas</button></div>` : ""}
    <div class="abasG" role="tablist">${abas.map(([k, t]) => `<button role="tab" data-a="${k}" aria-selected="${abaG === k}">${t}</button>`).join("")}</div>
    <div id="abaConteudo"></div>`;
  $("copMsg").onclick = async () => { try { await navigator.clipboard.writeText(msgCliente()); toast("Mensagem copiada"); } catch { prompt("Copie a mensagem:", msgCliente()); } };
  document.querySelectorAll(".abasG button").forEach(b => b.onclick = () => { abaG = b.dataset.a; pintarGaleria(); });
  $("excluirAlbum").onclick = excluirAlbum;
  if ($("irEntrega")) $("irEntrega").onclick = () => { abaG = "entrega"; pintarGaleria(); };
  ({ fotos: abaFotos, selecao: abaSelecao, design: abaDesign, entrega: abaEntrega, ajustes: abaAjustes })[abaG]();
}

function abaFotos() {
  $("abaConteudo").innerHTML = `
    <label class="soltar" id="soltar" for="arquivos"><strong>Arraste as fotos aqui ou clique pra escolher</strong><br>
      <span class="small mute">Pode mandar em alta: o site reduz pra uma prévia leve${estudio.marca_dagua ? " e aplica sua marca d'água" : ""} antes de enviar.</span>
      <input id="arquivos" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hide"></label>
    <p class="small mute" id="progresso" role="status" style="margin-bottom:12px"></p>
    <div class="fotos" id="grade">${fotos.length ? fotos.map(f => `
      <div class="tile${marcadas.has(f.id) ? " on" : ""}">
        <img src="${esc(urlFoto(f.caminho))}" alt="${esc(f.nome_arquivo)}" loading="lazy">
        ${f.id === G.capa_foto_id ? '<span class="capaTag">Capa</span>' : ""}
        ${f.destaque ? '<span class="favTag" title="Favorita do fotógrafo">♥</span>' : ""}
        <div class="acts">${pode("favoritas") ? "" : "<!--"}<button data-fav="${f.id}" title="${f.destaque ? "Tirar das favoritas" : "Marcar como favorita do fotógrafo"}" aria-label="Favorita: ${esc(f.nome_arquivo)}" aria-pressed="${!!f.destaque}">${f.destaque ? "♥" : "♡"}</button>${pode("favoritas") ? "" : "-->"}<button data-capa="${f.id}" title="Usar como capa" aria-label="Usar ${esc(f.nome_arquivo)} como capa">★</button><button data-del="${f.id}" title="Excluir" aria-label="Excluir ${esc(f.nome_arquivo)}">×</button></div>
        ${marcadas.has(f.id) ? '<span class="marca"></span>' : ""}
        ${coments[f.id] ? `<span class="com" title="${esc(coments[f.id])}"><svg><use href="#i-coment"/></svg></span>` : ""}
        <span class="nome">${esc(f.nome_arquivo)}</span>
      </div>`).join("") : `<div class="vazio" style="grid-column:1/-1">Nenhuma foto ainda.</div>`}</div>`;
  $("arquivos").onchange = e => { enviarFotos(e.target.files); e.target.value = ""; };
  const z = $("soltar");
  ["dragenter", "dragover"].forEach(t => z.addEventListener(t, e => { e.preventDefault(); z.classList.add("ativo"); }));
  ["dragleave", "drop"].forEach(t => z.addEventListener(t, e => { e.preventDefault(); z.classList.remove("ativo"); }));
  z.addEventListener("drop", e => enviarFotos(e.dataTransfer.files));
  $("grade").onclick = async e => {
    const cp = e.target.closest("[data-capa]"), dl = e.target.closest("[data-del]");
    try {
      const fv = e.target.closest("[data-fav]");
      if (fv) { const f = fotos.find(x => x.id === fv.dataset.fav); f.destaque = !f.destaque; await q(sb.from("fotos").update({ destaque: f.destaque }).eq("id", f.id)); toast(f.destaque ? "Marcada como sua favorita: o cliente vê um ♥" : "Removida das favoritas"); pintarGaleria(); return; }
      if (cp) { await q(sb.from("galerias").update({ capa_foto_id: cp.dataset.capa }).eq("id", G.id)); G.capa_foto_id = cp.dataset.capa; toast("Capa atualizada"); pintarGaleria(); }
      if (dl) {
        const f = fotos.find(x => x.id === dl.dataset.del);
        if (!confirm(`Excluir ${f.nome_arquivo}?`)) return;
        await sb.storage.from("fotos").remove([f.caminho]);
        await q(sb.from("fotos").delete().eq("id", f.id));
        fotos = fotos.filter(x => x.id !== f.id); marcadas.delete(f.id);
        if (G.capa_foto_id === f.id) G.capa_foto_id = null;
        pintarGaleria(); atualizarUso();
      }
    } catch (err) { erro(err); }
  };
}

function abaSelecao() {
  const n = marcadas.size, ex = G.permitir_extras === false ? 0 : Math.max(0, n - G.fotos_incluidas);
  const sel = fotos.filter(f => marcadas.has(f.id));
  const nomes = sel.map(f => semExtensao(f.nome_arquivo));
  const comLista = fotos.filter(f => coments[f.id]);
  $("abaConteudo").innerHTML = `
    <div class="bloco">
      <h2>${G.status === "enviada" ? "Seleção recebida" + (G.enviada_em ? " em " + new Date(G.enviada_em).toLocaleDateString("pt-BR") : "") : n ? "Seleção em andamento (o cliente ainda não enviou)" : "Nenhuma foto marcada ainda"}</h2>
      <div class="resumo"><span>Marcadas<b>${n}</b></span><span>Incluídas<b>${Math.min(n, G.fotos_incluidas)}</b></span>${G.permitir_extras === false ? "" : `<span>Extras<b>${ex}</b></span><span>Valor das extras<b>${brl(ex * G.preco_extra)}</b></span>`}</div>
      <label for="lr">Lista para o Lightroom: na Biblioteca, filtro de Texto → Nome do arquivo → Contém</label>
      <textarea id="lr" readonly>${esc(nomes.join(", "))}</textarea>
      <div class="acoes" style="margin-top:12px">
        <button class="btn fill sm" id="copLr" ${n ? "" : "disabled"}>Copiar lista</button>
        ${ex > 0 ? `<button class="btn ghost sm" id="lancar">Lançar ${brl(ex * G.preco_extra)} de extras no financeiro</button>` : ""}
        ${G.status === "enviada" ? `<button class="btn fill sm" id="irEnt2">Enviar fotos tratadas</button>` : ""}
        ${G.status === "enviada" ? `<button class="btn ghost sm" id="reabrir">Reabrir para o cliente</button>` : ""}
      </div>
      ${comLista.length ? `<div class="coms"><h2>Comentários do cliente (${comLista.length})</h2><ul>${comLista.map(f => `<li><strong>${esc(semExtensao(f.nome_arquivo))}:</strong> ${esc(coments[f.id])}</li>`).join("")}</ul></div>` : ""}
    </div>
    ${sel.length ? `<div class="fotos" style="margin-top:18px">${sel.map(f => `<div class="tile on"><img src="${esc(urlFoto(f.caminho))}" alt="" loading="lazy"><span class="marca"></span>${coments[f.id] ? `<span class="com"><svg><use href="#i-coment"/></svg></span>` : ""}<span class="nome">${esc(f.nome_arquivo)}</span></div>`).join("")}</div>` : ""}`;
  if ($("copLr")) $("copLr").onclick = async () => { try { await navigator.clipboard.writeText($("lr").value); toast("Lista copiada"); } catch { $("lr").select(); } };
  if ($("irEnt2")) $("irEnt2").onclick = () => { abaG = "entrega"; pintarGaleria(); };
  if ($("reabrir")) $("reabrir").onclick = async () => { try { await q(sb.from("galerias").update({ status: "aberta", enviada_em: null }).eq("id", G.id)); G.status = "aberta"; toast("Galeria reaberta para o cliente"); pintarGaleria(); } catch (e) { erro(e); } };
  if ($("lancar")) $("lancar").onclick = async () => {
    try { await q(sb.from("pagamentos").insert({ trabalho_id: G.trabalho_id, descricao: `${ex} fotos extras · ${G.titulo}`, valor: ex * G.preco_extra, vencimento: hoje() })); toast("Lançado no financeiro"); }
    catch (e) { erro(e); }
  };
}

const urlEntrega = c => sb.storage.from("entregas").getPublicUrl(c).data.publicUrl;
const mb = b => (b / 1048576).toFixed(b > 104857600 ? 0 : 1).replace(".", ",") + " MB";
let entregas = [];
async function abaEntrega() {
  entregas = await q(sb.from("entregas").select("*").eq("galeria_id", G.id).order("ordem"));
  const total = entregas.reduce((s, e) => s + +e.bytes, 0);
  const capa = G.entrega_capa || entregas[0]?.caminho;
  $("abaConteudo").innerHTML = `
    <div class="duas" style="margin-top:0;align-items:start">
      <form class="bloco" id="fEntrega">
        <h2>Página de entrega</h2>
        <p class="mute small" style="margin-bottom:16px">O cliente abre o mesmo link e código. Quando liberada, ele vê a capa, o título e as fotos para baixar.</p>
        <div class="field"><label for="eTit">Título da entrega</label><input id="eTit" value="${esc(G.entrega_titulo || G.titulo)}" placeholder="Ex.: Ensaio Sophia · Novembro 2026"></div>
        <div class="field"><label class="switch"><input type="checkbox" id="eLib" ${G.entrega_liberada ? "checked" : ""}> Liberar o download para o cliente</label></div>
        <details style="margin-bottom:14px"><summary class="small" style="cursor:pointer">Prefere entregar por link externo (Drive, WeTransfer)?</summary>
          <div class="field" style="margin-top:10px"><label for="eLink">Link externo (opcional)</label><input id="eLink" type="url" placeholder="https://drive.google.com/…" value="${esc(G.link_entrega || "")}"></div></details>
        <div class="field"><label class="switch"><input type="checkbox" id="eEnc" ${G.status === "encerrada" ? "checked" : ""}> Marcar trabalho como encerrado</label></div>
        <div class="acoes"><button class="btn fill">Salvar entrega</button>${G.entrega_liberada ? `<button type="button" class="btn ghost" id="copEntrega">Copiar mensagem de entrega</button>` : ""}</div>
      </form>
      <div class="bloco faixaFoto" style="--foto:url('${capa ? esc(urlEntrega(capa)) : ""}');min-height:230px;display:flex;flex-direction:column;justify-content:flex-end;padding:24px">
        <span class="small" style="opacity:.8">Prévia da capa</span><h2 style="color:#fff;font-size:24px;font-weight:400;margin-top:6px">${esc(G.entrega_titulo || G.titulo)}</h2>
        <span class="small" style="opacity:.8">${entregas.length} fotos · ${mb(total)}</span>
      </div>
    </div>
    <div class="sec">
      <div class="cabeca" style="margin-bottom:12px"><h2>Fotos finais (${entregas.length})</h2>
        <div class="row"><label for="eQual" class="small mute">Qualidade</label><select id="eQual" style="width:auto"><option value="otimizada">Otimizada · até 3000 px (recomendado)</option><option value="original">Original · arquivo como está</option></select></div></div>
      <label class="soltar" id="soltarE" for="arqE"><strong>Arraste as fotos editadas aqui ou clique pra escolher</strong><br>
        <span class="small mute">Sem marca d'água. Na opção otimizada, cada foto fica com uns 1,5 MB, ótima pra imprimir e postar.</span>
        <input id="arqE" type="file" accept="image/jpeg,image/png,image/webp,image/tiff" multiple class="hide"></label>
      <p class="small mute" id="progE" role="status" style="margin-bottom:12px"></p>
      <div class="fotos" id="gradeE">${entregas.length ? entregas.map(e => `
        <div class="tile">
          <img src="${esc(urlEntrega(e.caminho))}" alt="${esc(e.nome_arquivo)}" loading="lazy">
          ${e.caminho === capa ? '<span class="capaTag">Capa</span>' : ""}
          <div class="acts"><button data-capa="${esc(e.caminho)}" title="Usar como capa da entrega" aria-label="Usar ${esc(e.nome_arquivo)} como capa">★</button><button data-del="${e.id}" title="Excluir" aria-label="Excluir ${esc(e.nome_arquivo)}">×</button></div>
          <span class="nome">${esc(e.nome_arquivo)} · ${mb(e.bytes)}</span>
        </div>`).join("") : `<div class="vazio" style="grid-column:1/-1">Nenhuma foto final ainda.</div>`}</div>
    </div>`;
  $("fEntrega").onsubmit = async e => {
    e.preventDefault();
    const lib = $("eLib").checked, link = $("eLink").value.trim();
    if (lib && !entregas.length && !link) return toast("Suba as fotos finais (ou cole um link) antes de liberar");
    const upd = { entrega_titulo: $("eTit").value.trim() || null, link_entrega: link || null, entrega_liberada: lib, entrega_capa: G.entrega_capa || entregas[0]?.caminho || null };
    if ($("eEnc").checked) upd.status = "encerrada"; else if (G.status === "encerrada") upd.status = "enviada";
    try {
      Object.assign(G, await q(sb.from("galerias").update(upd).eq("id", G.id).select().single()));
      if (lib && G.trabalho_id) await sb.from("trabalhos").update({ status: "entregue" }).eq("id", G.trabalho_id);
      toast(lib ? "Entrega liberada para o cliente" : "Entrega salva"); pintarGaleria();
    } catch (err) { erro(err); }
  };
  if ($("copEntrega")) $("copEntrega").onclick = async () => {
    const m = `Oi${G.cliente_nome ? ", " + G.cliente_nome.split(" ")[0] : ""}! Suas fotos finais estão prontas pra baixar 🤍\n\n${linkCliente()}\nCódigo: ${G.codigo_acesso}`;
    try { await navigator.clipboard.writeText(m); toast("Mensagem copiada"); } catch { prompt("Copie a mensagem:", m); }
  };
  $("arqE").onchange = ev => { enviarEntrega(ev.target.files); ev.target.value = ""; };
  const z = $("soltarE");
  ["dragenter", "dragover"].forEach(t => z.addEventListener(t, ev => { ev.preventDefault(); z.classList.add("ativo"); }));
  ["dragleave", "drop"].forEach(t => z.addEventListener(t, ev => { ev.preventDefault(); z.classList.remove("ativo"); }));
  z.addEventListener("drop", ev => enviarEntrega(ev.dataTransfer.files));
  $("gradeE").onclick = async ev => {
    const cp = ev.target.closest("[data-capa]"), dl = ev.target.closest("[data-del]");
    try {
      if (cp) { await q(sb.from("galerias").update({ entrega_capa: cp.dataset.capa }).eq("id", G.id)); G.entrega_capa = cp.dataset.capa; toast("Capa da entrega atualizada"); abaEntrega(); }
      if (dl) {
        const f = entregas.find(x => x.id === dl.dataset.del);
        if (!confirm(`Excluir ${f.nome_arquivo} da entrega?`)) return;
        await sb.storage.from("entregas").remove([f.caminho]);
        await q(sb.from("entregas").delete().eq("id", f.id));
        if (G.entrega_capa === f.caminho) { G.entrega_capa = null; await sb.from("galerias").update({ entrega_capa: null }).eq("id", G.id); }
        atualizarUso(); abaEntrega();
      }
    } catch (err) { erro(err); }
  };
}
async function otimizarFinal(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
}
async function enviarEntrega(files) {
  files = [...files].filter(f => /image\//.test(f.type));
  if (!files.length) return;
  const otim = $("eQual").value === "otimizada", gid = G.id;
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  let feitos = 0, falhas = 0, grandes = 0, ordem = entregas.reduce((m, f) => Math.max(m, f.ordem), 0);
  const fila = files.map(f => ({ f, ordem: ++ordem }));
  const passo = () => { if ($("progE")) $("progE").textContent = `Enviando ${feitos} de ${files.length}…` + (falhas ? ` (${falhas} com erro)` : ""); };
  passo();
  const trab = async () => {
    while (fila.length) {
      const { f, ordem } = fila.shift();
      try {
        const blob = otim && /jpeg|png|webp/.test(f.type) ? await otimizarFinal(f) : f;
        if (blob.size > 50 * 1048576) { grandes++; throw new Error("maior que 50 MB"); }
        const ext = blob.type === "image/jpeg" ? "jpg" : (f.name.split(".").pop() || "jpg").toLowerCase();
        const caminho = `${user.id}/${gid}/${crypto.randomUUID()}.${ext}`;
        const up = await sb.storage.from("entregas").upload(caminho, blob, { contentType: blob.type || f.type, cacheControl: "31536000" });
        if (up.error) throw up.error;
        const nome = otim ? f.name.replace(/\.[^.]+$/, "") + ".jpg" : f.name;
        entregas.push(await q(sb.from("entregas").insert({ galeria_id: gid, nome_arquivo: nome, caminho, bytes: blob.size, ordem }).select().single()));
      } catch (err) { falhas++; console.error(f.name, err); }
      feitos++; passo();
    }
  };
  await Promise.all([trab(), trab()]);
  atualizarUso();
  if (G?.id === gid) { toast(falhas ? `${files.length - falhas} enviadas, ${falhas} com erro${grandes ? " (arquivo acima de 50 MB)" : ""}` : `${files.length} fotos finais enviadas`); if (abaG === "entrega") abaEntrega(); }
}

async function abaAjustes() {
  const [cs, ts] = await Promise.all([listaClientes(), listaTrabalhos()]);
  const sel = (id, ops, v) => `<select id="${id}">${ops.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v ?? "") ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
  $("abaConteudo").innerHTML = `
    <form class="bloco" id="fAj" style="max-width:820px">
      <div class="grid2">
        <div class="field"><label for="aT">Nome da galeria</label><input id="aT" required value="${esc(G.titulo)}"></div>
        <div class="field"><label for="aSlug">Endereço da galeria</label><input id="aSlug" value="${esc(G.slug)}" pattern="[a-z0-9-]+" title="Só letras minúsculas, números e hífen"></div>
        <div class="field"><label for="aC">Cliente</label>${sel("aC", opcClientes(cs), G.cliente_id)}</div>
        <div class="field"><label for="aTr">Trabalho da agenda</label>${sel("aTr", opcTrabalhos(ts), G.trabalho_id)}</div>
        <div class="field${G.so_entrega ? ' hide' : ''}"><label for="aP">Prazo para escolher</label><input id="aP" type="date" value="${esc(G.prazo || "")}"></div>
        <div class="field${G.so_entrega ? ' hide' : ''}"><label for="aI">Fotos incluídas</label><input id="aI" type="number" min="0" value="${G.fotos_incluidas}"></div>
        <div class="field${G.so_entrega ? ' hide' : ''}"><label for="aE">Valor da foto extra (R$)</label><input id="aE" type="number" min="0" step="0.01" value="${G.preco_extra}"></div>
        <div class="field${G.so_entrega ? ' hide' : ''}" style="grid-column:1/-1"><label class="switch"><input type="checkbox" id="aMost" ${G.mostrar_pacote !== false ? "checked" : ""}> Mostrar ao cliente quantas fotos o pacote inclui</label></div>
        <div class="field${G.so_entrega ? ' hide' : ''}" style="grid-column:1/-1"><label class="switch"><input type="checkbox" id="aExt" ${G.permitir_extras !== false ? "checked" : ""}> Permitir que o cliente escolha fotos extras (pagas)</label><span class="small mute" style="display:block;margin-left:32px">Desligado: o cliente não consegue passar do número do pacote.</span></div>
        <div class="field" style="grid-column:1/-1"><label for="aM">Recado para o cliente</label><textarea id="aM" style="font-family:Montserrat;min-height:80px">${esc(G.mensagem || "")}</textarea></div>
      </div>
      <div class="acoes"><button class="btn fill">Salvar</button><button type="button" class="btn ghost" id="novoCod">Gerar novo código</button><span class="grow"></span><button type="button" class="link-btn" id="apagar">Excluir galeria</button></div>
    </form>`;
  $("fAj").onsubmit = async e => {
    e.preventDefault();
    const cli = cs.find(c => c.id === $("aC").value);
    try {
      const novoSlug = slugify($("aSlug").value || $("aT").value);
      if (novoSlug !== G.slug) {
        const livre = await slugAlbumLivre(novoSlug, G.id);
        if (livre !== novoSlug) { toast("Esse endereço já está em uso. Sugestão: " + livre); $("aSlug").value = livre; return; }
        if (!confirm("Mudar o endereço faz o link antigo parar de funcionar. Continuar?")) return;
      }
      Object.assign(G, await q(sb.from("galerias").update({ slug: novoSlug, titulo: $("aT").value.trim(), cliente_id: cli?.id || null, cliente_nome: cli?.nome || null, trabalho_id: $("aTr").value || null,
        prazo: $("aP").value || null, fotos_incluidas: +$("aI").value || 0, preco_extra: +$("aE").value || 0, mostrar_pacote: $("aMost").checked, permitir_extras: $("aExt").checked, mensagem: $("aM").value.trim() || null }).eq("id", G.id).select().single()));
      G.clientes = cli || null; toast("Galeria salva"); pintarGaleria();
    } catch (err) { erro(err); }
  };
  $("novoCod").onclick = async () => {
    const cod = String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
    try { await q(sb.from("galerias").update({ codigo_acesso: cod }).eq("id", G.id)); G.codigo_acesso = cod; toast("Novo código: " + cod); pintarGaleria(); } catch (e) { erro(e); }
  };
  $("apagar").onclick = excluirAlbum;
}

async function excluirAlbum() {
  if (!confirm(`Excluir a galeria “${G.titulo}” e as ${fotos.length} fotos?\n\nO link do cliente para de funcionar. Isso não pode ser desfeito.`)) return;
  try {
    const cam = fotos.map(f => f.caminho);
    for (let i = 0; i < cam.length; i += 100) await sb.storage.from("fotos").remove(cam.slice(i, i + 100));
    const ent = (await q(sb.from("entregas").select("caminho").eq("galeria_id", G.id))).map(e => e.caminho);
    for (let i = 0; i < ent.length; i += 100) await sb.storage.from("entregas").remove(ent.slice(i, i + 100));
    await q(sb.from("galerias").delete().eq("id", G.id));
    atualizarUso(); toast("Galeria excluída"); ir("#/galerias");
  } catch (e) { erro(e); }
}

/* --- envio com prévia e marca d'água --- */
let logoBranco = null;
const FONTES_MARCA = {
  moderna: { nome: "Moderna", css: t => `400 ${t}px Montserrat, sans-serif`, esp: .4, maiuscula: true, escala: 1 },
  elegante: { nome: "Elegante", css: t => `italic 400 ${t}px "Playfair Display", serif`, esp: .06, maiuscula: false, escala: 1.35 },
  assinatura: { nome: "Assinatura", css: t => `400 ${t}px "Great Vibes", cursive`, esp: 0, maiuscula: false, escala: 2.1 }
};
/* cfg: tipo (texto|imagem), texto, fonte, url — por padrão, o que está salvo no estúdio */
async function prepararMarca(cfg = {}) {
  if (!pode("marca")) cfg = { tipo: "texto", texto: "SELETA", fonte: "moderna" };
  const tipo = cfg.tipo ?? estudio.marca_tipo ?? "texto";
  const url = cfg.url ?? estudio.marca_url ?? estudio.logo_url;
  if (tipo === "imagem" && url) {
    if (logoBranco?.src === url) return logoBranco;
    try {
      const img = await new Promise((ok, falha) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = falha; i.src = url; });
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext("2d"); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      logoBranco = { src: url, canvas: c }; return logoBranco;
    } catch { /* cai para o texto */ }
  }
  const fonte = FONTES_MARCA[cfg.fonte ?? estudio.marca_fonte] || FONTES_MARCA.moderna;
  await Promise.all([document.fonts.load(fonte.css(40)), document.fonts.load("400 40px Montserrat")]).catch(() => {});
  const txt = (cfg.texto ?? estudio.marca_texto) || estudio.nome || "";
  return { texto: fonte.maiuscula ? txt.toUpperCase() : txt, fonte };
}
/* Marca discreta. posicao: rodape | canto | centro */
function desenharMarca(x, marca, W, H, posicao = "rodape") {
  const lado = Math.min(W, H), m = lado * 0.05;
  const lugar = (w, h) => posicao === "centro" ? [(W - w) / 2, (H - h) / 2] : posicao === "canto" ? [W - w - m, H - h - m] : [(W - w) / 2, H - h - m * 1.2];
  if (marca.canvas) {
    const w = W * (posicao === "centro" ? 0.22 : posicao === "canto" ? 0.1 : 0.13), h = w * marca.canvas.height / marca.canvas.width;
    const [px, py] = lugar(w, h); x.drawImage(marca.canvas, px, py, w, h);
  } else if (marca.texto) {
    const f = marca.fonte || FONTES_MARCA.moderna;
    let tam = Math.max(9, Math.round(lado * (posicao === "centro" ? 0.032 : 0.022) * f.escala));
    const medir = () => { x.font = f.css(tam); try { x.letterSpacing = Math.round(tam * f.esp) + "px"; } catch {} return x.measureText(marca.texto).width; };
    while (medir() > W * (posicao === "canto" ? 0.4 : 0.6) && tam > 8) tam--;
    const w = medir(), [px, py] = lugar(w, tam);
    x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "top"; x.fillText(marca.texto, px, py);
  }
}
async function previa(file, marca) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, SELETA.ladoMaximo / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext("2d"); x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  if (marca) {
    x.globalAlpha = +estudio.marca_opacidade || 0.35;
    desenharMarca(x, marca, c.width, c.height, estudio.marca_posicao);
    x.globalAlpha = 1;
  }
  return await new Promise(r => c.toBlob(r, "image/jpeg", SELETA.qualidade));
}
async function enviarFotos(files) {
  files = [...files].filter(f => /image\/(jpeg|png|webp)/.test(f.type));
  if (!files.length) return;
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const marca = estudio.marca_dagua ? await prepararMarca() : null;
  let feitos = 0, falhas = 0, ordem = fotos.reduce((m, f) => Math.max(m, f.ordem), 0);
  const fila = files.map(f => ({ f, ordem: ++ordem })), gid = G.id;
  const passo = () => { if ($("progresso")) $("progresso").textContent = `Enviando ${feitos} de ${files.length}…` + (falhas ? ` (${falhas} com erro)` : ""); };
  passo();
  const trab = async () => {
    while (fila.length) {
      const { f, ordem } = fila.shift();
      try {
        const blob = await previa(f, marca);
        const caminho = `${user.id}/${gid}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (up.error) throw up.error;
        fotos.push(await q(sb.from("fotos").insert({ galeria_id: gid, nome_arquivo: f.name, caminho, ordem }).select().single()));
      } catch (err) { falhas++; console.error(f.name, err); }
      feitos++; passo();
    }
  };
  await Promise.all([trab(), trab(), trab()]);
  fotos.sort((a, b) => a.ordem - b.ordem);
  if (!G.capa_foto_id && fotos[0]) { G.capa_foto_id = fotos[0].id; await sb.from("galerias").update({ capa_foto_id: fotos[0].id }).eq("id", gid); }
  atualizarUso();
  if (G?.id === gid) { pintarGaleria(); toast(falhas ? `${files.length - falhas} enviadas, ${falhas} com erro` : `${files.length} fotos enviadas`); }
}

/* ============ CLIENTES ============ */
ROTAS.clientes = async () => {
  const cs = await q(sb.from("clientes").select("*, trabalhos(count), galerias(count)").order("nome"));
  C().innerHTML = `
    <div class="cabeca"><div><h1>Clientes</h1><p class="mute">${cs.length} ${cs.length === 1 ? "cliente" : "clientes"} cadastrados</p></div><button class="btn fill" id="aCli">Novo cliente</button></div>
    <div class="field busca"><label for="busca" class="hide">Buscar</label><input id="busca" type="search" placeholder="Buscar por nome, WhatsApp ou Instagram"></div>
    <table class="tabela stack"><thead><tr><th>Nome</th><th>WhatsApp</th><th>Instagram</th><th class="r">Trabalhos</th><th class="r">Galerias</th></tr></thead><tbody id="tCli"></tbody></table>`;
  const pintar = () => {
    const t = $("busca").value.toLowerCase();
    const l = cs.filter(c => [c.nome, c.whatsapp, c.instagram, c.email].join(" ").toLowerCase().includes(t));
    $("tCli").innerHTML = l.length ? l.map(c => `<tr class="clic" data-id="${c.id}"><td><strong style="font-weight:500">${esc(c.nome)}</strong></td><td>${esc(c.whatsapp || "—")}</td><td>${esc(c.instagram || "—")}</td><td class="r">${c.trabalhos?.[0]?.count || 0}</td><td class="r">${c.galerias?.[0]?.count || 0}</td></tr>`).join("")
      : `<tr><td colspan="5" class="mute" style="padding:24px 12px">${cs.length ? "Ninguém encontrado." : "Nenhum cliente ainda. Cadastre o primeiro!"}</td></tr>`;
  };
  $("busca").oninput = pintar;
  $("tCli").onclick = e => { const tr = e.target.closest("tr[data-id]"); if (tr) ir("#/cliente/" + tr.dataset.id); };
  $("aCli").onclick = () => editarCliente();
  pintar();
};
function editarCliente(c = {}) {
  formulario({
    titulo: c.id ? "Editar cliente" : "Novo cliente",
    campos: [
      { id: "nome", rotulo: "Nome", req: true, valor: c.nome },
      { id: "whatsapp", rotulo: "WhatsApp", tipo: "tel", ph: "(61) 99999-9999", valor: c.whatsapp },
      { id: "instagram", rotulo: "Instagram", ph: "@usuario", valor: c.instagram },
      { id: "email", rotulo: "E-mail", tipo: "email", valor: c.email },
      { id: "observacoes", rotulo: "Observações", tipo: "area", largo: true, valor: c.observacoes }
    ],
    aoSalvar: async v => {
      const row = { nome: v.nome, whatsapp: v.whatsapp || null, instagram: v.instagram || null, email: v.email || null, observacoes: v.observacoes || null };
      const r = c.id ? await q(sb.from("clientes").update(row).eq("id", c.id).select().single()) : await q(sb.from("clientes").insert(row).select().single());
      if (c.id) await sb.from("galerias").update({ cliente_nome: r.nome }).eq("cliente_id", r.id);
      ir("#/cliente/" + r.id);
    },
    aoExcluir: c.id ? async () => { await q(sb.from("clientes").delete().eq("id", c.id)); ir("#/clientes"); } : null
  });
}
ROTAS.cliente = async id => {
  const c = await q(sb.from("clientes").select("*").eq("id", id).maybeSingle());
  if (!c) return ir("#/clientes");
  const [ts, gs] = await Promise.all([
    q(sb.from("trabalhos").select("*, pagamentos(valor,pago_em)").eq("cliente_id", id).order("data", { ascending: false })),
    q(sb.from("galerias").select("slug,titulo,status,criado_em").eq("cliente_id", id).order("criado_em", { ascending: false }))
  ]);
  const pags = ts.flatMap(t => t.pagamentos || []);
  const pago = pags.filter(p => p.pago_em).reduce((s, p) => s + +p.valor, 0), aberto = pags.filter(p => !p.pago_em).reduce((s, p) => s + +p.valor, 0);
  const w = fone(c.whatsapp), ig = (c.instagram || "").replace(/^@/, "");
  C().innerHTML = `
    <a class="volta" href="#/clientes">← Clientes</a>
    <div class="cabeca"><div><h1>${esc(c.nome)}</h1><p class="mute">${[c.whatsapp, c.instagram, c.email].filter(Boolean).map(esc).join(" · ") || "Sem contato cadastrado"}</p></div>
      <div class="acoes">${w ? `<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/${w}">WhatsApp</a>` : ""}${ig ? `<a class="btn ghost" target="_blank" rel="noopener" href="https://instagram.com/${encodeURIComponent(ig)}">Instagram</a>` : ""}<button class="btn ghost" id="ed">Editar</button><button class="btn fill" id="nt">Novo trabalho</button></div></div>
    <div class="cards"><div class="num"><span>Trabalhos</span><b>${ts.length}</b></div><div class="num"><span>Galerias</span><b>${gs.length}</b></div><div class="num escuro"><span>Já pagou</span><b>${brl(pago)}</b></div><div class="num"><span>Em aberto</span><b>${brl(aberto)}</b></div></div>
    ${c.observacoes ? `<div class="bloco" style="margin-top:18px"><h2>Observações</h2><p style="white-space:pre-line">${esc(c.observacoes)}</p></div>` : ""}
    <div class="duas">
      <div class="bloco"><h2>Trabalhos</h2>${ts.length ? ts.map(t => `<button class="item" data-t="${t.id}"><div class="txt"><strong>${esc(t.titulo)}</strong><span>${[t.data && dataBR(t.data), t.tipo, brl(t.valor)].filter(Boolean).map(esc).join(" · ")}</span></div><span class="st">${STATUS_T[t.status]}</span></button>`).join("") : `<p class="vazioP">Nenhum trabalho.</p>`}</div>
      <div class="bloco"><h2>Galerias <button class="btn sm ghost" id="ng">Nova galeria</button></h2>${gs.length ? gs.map(g => `<a class="item" href="#/galeria/${esc(g.slug)}"><div class="txt"><strong>${esc(g.titulo)}</strong><span>${new Date(g.criado_em).toLocaleDateString("pt-BR")}</span></div><span class="tag ${g.status}">${STATUS_G[g.status]}</span></a>`).join("") : `<p class="vazioP">Nenhuma galeria.</p>`}</div>
    </div>`;
  $("ed").onclick = () => editarCliente(c);
  $("nt").onclick = () => editarTrabalho({ cliente_id: c.id }, () => rota());
  $("ng").onclick = () => novaGaleria({ cliente_id: c.id, titulo: "Ensaio " + c.nome.split(" ")[0] });
  C().querySelectorAll("[data-t]").forEach(b => b.onclick = () => editarTrabalho(ts.find(t => t.id === b.dataset.t), () => rota()));
};

/* ============ AGENDA ============ */
async function editarTrabalho(t = {}, depois) {
  const cs = await listaClientes();
  formulario({
    titulo: t.id ? "Editar trabalho" : "Novo trabalho",
    extra: t.id && t.data ? `<a class="btn ghost sm gAdd" target="_blank" rel="noopener" href="${esc(linkGoogle({ ...t, clientes: t.clientes || cs.find(c => c.id === t.cliente_id) }))}"><svg class="gIco" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6"/></svg>Adicionar ao Google Agenda</a>` : "",
    campos: [
      { id: "titulo", rotulo: "Título", req: true, ph: "Ensaio pôr do sol", valor: t.titulo },
      { id: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: opcClientes(cs), valor: t.cliente_id },
      { id: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS.map(x => [x, x[0].toUpperCase() + x.slice(1)]), valor: t.tipo || "ensaio" },
      { id: "status", rotulo: "Situação", tipo: "select", opcoes: Object.entries(STATUS_T), valor: t.status || "confirmado" },
      { id: "data", rotulo: "Data", tipo: "date", valor: t.data },
      { id: "hora", rotulo: "Horário", tipo: "time", valor: t.hora?.slice(0, 5) },
      { id: "local", rotulo: "Local", ph: "Barragem do Paranã", valor: t.local },
      { id: "valor", rotulo: "Valor do trabalho (R$)", tipo: "number", valor: t.valor ?? "" },
      { id: "observacoes", rotulo: "Observações", tipo: "area", largo: true, valor: t.observacoes },
      ...(t.id ? [] : [{ id: "lancar", rotulo: "Lançar no financeiro (50% de sinal hoje e 50% na data do trabalho)", tipo: "check", valor: false }])
    ],
    aoSalvar: async v => {
      const row = { titulo: v.titulo, cliente_id: v.cliente_id || null, tipo: v.tipo, status: v.status, data: v.data || null, hora: v.hora || null, local: v.local || null, valor: v.valor || 0, observacoes: v.observacoes || null };
      const r = t.id ? await q(sb.from("trabalhos").update(row).eq("id", t.id).select().single()) : await q(sb.from("trabalhos").insert(row).select().single());
      if (v.lancar && r.valor > 0) {
        const metade = Math.round(r.valor * 50) / 100;
        await q(sb.from("pagamentos").insert([
          { trabalho_id: r.id, descricao: "Sinal · " + r.titulo, valor: metade, vencimento: hoje() },
          { trabalho_id: r.id, descricao: "Restante · " + r.titulo, valor: r.valor - metade, vencimento: r.data || hoje() }
        ]));
      }
      toast("Trabalho salvo"); depois ? depois(r) : rota();
    },
    aoExcluir: t.id ? async () => { await q(sb.from("trabalhos").delete().eq("id", t.id)); toast("Trabalho excluído"); depois ? depois() : rota(); } : null
  });
}
ROTAS.agenda = async arg => {
  const base = arg && /^\d{4}-\d{2}$/.test(arg) ? new Date(+arg.slice(0, 4), +arg.slice(5) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const ini = new Date(base); ini.setDate(1 - ini.getDay());
  const fim = new Date(ini); fim.setDate(ini.getDate() + 41);
  const ts = await q(sb.from("trabalhos").select("*, clientes(nome)").gte("data", ymd(ini)).lte("data", ymd(fim)).order("data").order("hora"));
  const porDia = {}; ts.forEach(t => (porDia[t.data] ||= []).push(t));
  const mesTxt = ymd(base).slice(0, 7);
  const ant = new Date(base.getFullYear(), base.getMonth() - 1, 1), prox = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const dias = Array.from({ length: 42 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });
  const doMes = ts.filter(t => t.data.startsWith(mesTxt));
  C().innerHTML = `
    <div class="cabeca"><div><h1>Agenda</h1><p class="mute">${doMes.length} ${doMes.length === 1 ? "trabalho" : "trabalhos"} no mês · ${brl(doMes.filter(t => t.status !== "cancelado").reduce((s, t) => s + +t.valor, 0))} em valor</p></div>
      <div class="acoes"><div class="mes"><a class="btn ghost sm" href="#/agenda/${ymd(ant).slice(0, 7)}" aria-label="Mês anterior">←</a><strong>${esc(mesAno(base))}</strong><a class="btn ghost sm" href="#/agenda/${ymd(prox).slice(0, 7)}" aria-label="Próximo mês">→</a></div><button class="btn ghost" id="gcal"><svg class="gIco" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6"/></svg>Google Agenda</button><button class="btn fill" id="nt">Novo trabalho</button></div></div>
    <div class="cal">${["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map(d => `<div class="dow">${d}</div>`).join("")}
      ${dias.map(d => { const k = ymd(d); return `<div class="dia${d.getMonth() !== base.getMonth() ? " fora" : ""}${k === hoje() ? " hoje" : ""}"><span class="n">${d.getDate()}</span>${(porDia[k] || []).map(t => `<button class="ev ${t.status}" data-t="${t.id}" title="${esc(t.titulo)}">${t.hora ? esc(t.hora.slice(0, 5)) + " " : ""}${esc(t.titulo)}</button>`).join("")}</div>`; }).join("")}
    </div>
    <div class="bloco" style="margin-top:18px"><h2>Trabalhos de ${esc(base.toLocaleDateString("pt-BR", { month: "long" }))}</h2>
      ${doMes.length ? doMes.map(t => `<button class="item" data-t="${t.id}"><div class="data"><b>${dia(t.data).getDate()}</b><span>${dia(t.data).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span></div><div class="txt"><strong>${esc(t.titulo)}</strong><span>${[t.clientes?.nome, t.hora?.slice(0, 5), t.local, t.tipo].filter(Boolean).map(esc).join(" · ")}</span></div><span class="val">${brl(t.valor)}</span><span class="st">${STATUS_T[t.status]}</span></button>`).join("") : `<p class="vazioP">Nenhum trabalho neste mês.</p>`}
    </div>`;
  $("nt").onclick = () => editarTrabalho({});
  $("gcal").onclick = modalGoogleAgenda;
  C().querySelectorAll("[data-t]").forEach(b => b.onclick = () => editarTrabalho(ts.find(t => t.id === b.dataset.t)));
};
/* --- Google Agenda --- */
const somaHoras = (data, hora, h) => { const d = new Date(`${data}T${hora}`); d.setHours(d.getHours() + h); return d; };
const fmtLocal = d => `${ymd(d).replace(/-/g, "")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
function datasEvento(t) {
  if (t.hora) { const ini = new Date(`${t.data}T${t.hora.slice(0, 5)}`); return [fmtLocal(ini), fmtLocal(somaHoras(t.data, t.hora.slice(0, 5), t.tipo === "casamento" ? 6 : 2)), false]; }
  const fim = new Date(t.data + "T12:00"); fim.setDate(fim.getDate() + 1);
  return [t.data.replace(/-/g, ""), ymd(fim).replace(/-/g, ""), true];
}
const descEvento = t => [t.clientes?.nome && "Cliente: " + t.clientes.nome, t.tipo && "Tipo: " + t.tipo, +t.valor ? "Valor: " + brl(t.valor) : "", t.observacoes].filter(Boolean).join("\n");
function linkGoogle(t) {
  const [a, b] = datasEvento(t);
  return "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: t.titulo + (t.clientes?.nome ? " · " + t.clientes.nome : ""), dates: `${a}/${b}`, details: descEvento(t) + "\n\nCriado pela Seleta", location: t.local || "", ctz: "America/Sao_Paulo" });
}
async function modalGoogleAgenda() {
  const ts = await q(sb.from("trabalhos").select("*, clientes(nome)").gte("data", hoje()).neq("status", "cancelado").order("data").order("hora"));
  $("modalCaixa").innerHTML = `<h2 id="modalTitulo">Levar para o Google Agenda</h2>
    <p class="mute small" style="margin:8px 0 18px">Seus trabalhos aparecem no Google Agenda do celular, com lembrete, local e cliente.</p>
    <div class="gOp"><div><strong>Todos os próximos trabalhos de uma vez</strong><p class="small mute">Baixe o arquivo e importe no Google Agenda: no computador, Configurações → Importar e exportar → Importar. ${ts.length} ${ts.length === 1 ? "trabalho" : "trabalhos"} a partir de hoje.</p></div><button class="btn fill sm" id="gIcs" ${ts.length ? "" : "disabled"}>Baixar agenda (.ics)</button></div>
    <div class="gOp"><div><strong>Um trabalho por vez</strong><p class="small mute">Abre o Google Agenda com o evento já preenchido. Também aparece dentro de cada trabalho.</p></div></div>
    <div class="gLista">${ts.slice(0, 12).map(t => `<a class="item" target="_blank" rel="noopener" href="${esc(linkGoogle(t))}"><div class="txt"><strong>${esc(t.titulo)}</strong><span>${esc([dataBR(t.data), t.hora?.slice(0, 5), t.clientes?.nome].filter(Boolean).join(" · "))}</span></div><span class="small">Adicionar →</span></a>`).join("") || `<p class="vazioP">Nenhum trabalho marcado a partir de hoje.</p>`}</div>
    <div class="acoes" style="margin-top:18px"><button class="btn ghost" id="gFechar">Fechar</button></div>`;
  show("modal", true);
  $("gFechar").onclick = fecharModal;
  if ($("gIcs")) $("gIcs").onclick = () => {
    const e = x => String(x || "").replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
    const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Seleta//Agenda//PT-BR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Seleta · " + e(estudio.nome || "Estúdio"), "X-WR-TIMEZONE:America/Sao_Paulo"];
    ts.forEach(t => {
      const [a, b, dia] = datasEvento(t);
      linhas.push("BEGIN:VEVENT", `UID:${t.id}@seleta`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        dia ? `DTSTART;VALUE=DATE:${a}` : `DTSTART;TZID=America/Sao_Paulo:${a}`, dia ? `DTEND;VALUE=DATE:${b}` : `DTEND;TZID=America/Sao_Paulo:${b}`,
        "SUMMARY:" + e(t.titulo + (t.clientes?.nome ? " · " + t.clientes.nome : "")), t.local ? "LOCATION:" + e(t.local) : "", "DESCRIPTION:" + e(descEvento(t)),
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + e(t.titulo), "TRIGGER:-P1D", "END:VALARM", "END:VEVENT");
    });
    linhas.push("END:VCALENDAR");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([linhas.filter(Boolean).join("\r\n")], { type: "text/calendar" })); a.download = "agenda-seleta.ics"; a.click();
    toast("Arquivo baixado. Agora importe no Google Agenda.");
  };
}

/* ============ FINANCEIRO ============ */
async function editarPagamento(p = {}) {
  const ts = await listaTrabalhos();
  formulario({
    titulo: p.id ? "Editar lançamento" : "Novo lançamento",
    campos: [
      { id: "descricao", rotulo: "Descrição", req: true, ph: "Sinal do ensaio", valor: p.descricao },
      { id: "trabalho_id", rotulo: "Trabalho", tipo: "select", opcoes: opcTrabalhos(ts), valor: p.trabalho_id },
      { id: "valor", rotulo: "Valor (R$)", tipo: "number", req: true, valor: p.valor ?? "" },
      { id: "vencimento", rotulo: "Vencimento", tipo: "date", req: true, valor: p.vencimento || hoje() },
      { id: "forma", rotulo: "Forma de pagamento", tipo: "select", opcoes: [["", "—"], ["Pix", "Pix"], ["Cartão", "Cartão"], ["Dinheiro", "Dinheiro"], ["Transferência", "Transferência"]], valor: p.forma },
      { id: "pago", rotulo: "Já foi pago", tipo: "check", valor: !!p.pago_em }
    ],
    aoSalvar: async v => {
      const row = { descricao: v.descricao, trabalho_id: v.trabalho_id || null, valor: v.valor, vencimento: v.vencimento, forma: v.forma || null, pago_em: v.pago ? (p.pago_em || hoje()) : null };
      p.id ? await q(sb.from("pagamentos").update(row).eq("id", p.id)) : await q(sb.from("pagamentos").insert(row));
      toast("Lançamento salvo"); rota();
    },
    aoExcluir: p.id ? async () => { await q(sb.from("pagamentos").delete().eq("id", p.id)); toast("Lançamento excluído"); rota(); } : null
  });
}
ROTAS.financeiro = async arg => {
  const base = arg && /^\d{4}-\d{2}$/.test(arg) ? new Date(+arg.slice(0, 4), +arg.slice(5) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const ini = ymd(base), fim = ymd(new Date(base.getFullYear(), base.getMonth() + 1, 0));
  const [ps, atras, ano] = await Promise.all([
    q(sb.from("pagamentos").select("*, trabalhos(titulo, clientes(nome))").gte("vencimento", ini).lte("vencimento", fim).order("vencimento")),
    q(sb.from("pagamentos").select("*, trabalhos(titulo, clientes(nome))").is("pago_em", null).lt("vencimento", hoje()).order("vencimento")),
    q(sb.from("pagamentos").select("valor,pago_em").not("pago_em", "is", null).gte("pago_em", base.getFullYear() + "-01-01").lte("pago_em", base.getFullYear() + "-12-31"))
  ]);
  const soma = l => l.reduce((s, p) => s + +p.valor, 0);
  const recebido = soma(ps.filter(p => p.pago_em)), aberto = soma(ps.filter(p => !p.pago_em));
  const meses = Array.from({ length: 12 }, (_, m) => soma(ano.filter(p => +p.pago_em.slice(5, 7) === m + 1)));
  const max = Math.max(1, ...meses);
  const ant = new Date(base.getFullYear(), base.getMonth() - 1, 1), prox = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const linha = p => {
    const st = p.pago_em ? `<span class="st pago">Pago ${esc(dataBR(p.pago_em).slice(0, 5))}</span>` : p.vencimento < hoje() ? `<span class="st atrasado">Atrasado</span>` : `<span class="st">Em aberto</span>`;
    return `<tr class="clic" data-p="${p.id}"><td>${esc(dataBR(p.vencimento))}</td><td><strong style="font-weight:500">${esc(p.descricao)}</strong><br><span class="small mute">${esc([p.trabalhos?.clientes?.nome, p.trabalhos?.titulo].filter(Boolean).join(" · ") || "—")}</span></td><td>${esc(p.forma || "—")}</td><td>${st}</td><td class="r">${brl(p.valor)}</td><td class="r"><button class="btn sm ${p.pago_em ? "ghost" : "fill"}" data-pagar="${p.id}">${p.pago_em ? "Desfazer" : "Recebi"}</button></td></tr>`;
  };
  C().innerHTML = `
    <div class="cabeca"><div><h1>Financeiro</h1><p class="mute">Entradas do estúdio: sinais, saldos e fotos extras.</p></div>
      <div class="acoes"><div class="mes"><a class="btn ghost sm" href="#/financeiro/${ymd(ant).slice(0, 7)}" aria-label="Mês anterior">←</a><strong>${esc(mesAno(base))}</strong><a class="btn ghost sm" href="#/financeiro/${ymd(prox).slice(0, 7)}" aria-label="Próximo mês">→</a></div><button class="btn fill" id="np">Novo lançamento</button></div></div>
    <div class="cards">
      <div class="num escuro"><span>Recebido no mês</span><b>${brl(recebido)}</b></div>
      <div class="num"><span>A receber no mês</span><b>${brl(aberto)}</b></div>
      <div class="num"><span>Previsto no mês</span><b>${brl(recebido + aberto)}</b></div>
      <div class="num"><span>Em atraso (total)</span><b>${brl(soma(atras))}</b></div>
    </div>
    <div class="bloco" style="margin-top:18px"><h2>Recebido em ${base.getFullYear()}<span class="small mute" style="font-weight:400">${brl(soma(ano))} no ano</span></h2>
      <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:140px">
        ${meses.map((v, m) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end" title="${brl(v)}"><div style="width:100%;max-width:34px;border-radius:5px 5px 0 0;background:${m === base.getMonth() ? "var(--ink)" : "var(--line)"};height:${Math.max(2, v / max * 100)}%"></div><span class="small mute">${new Date(2000, m, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>`).join("")}
      </div></div>
    ${atras.length ? `<div class="bloco" style="margin-top:18px"><h2>Em atraso</h2><table class="tabela stack"><tbody>${atras.map(linha).join("")}</tbody></table></div>` : ""}
    <div class="bloco" style="margin-top:18px"><h2>Lançamentos de ${esc(base.toLocaleDateString("pt-BR", { month: "long" }))}</h2>
      <table class="tabela stack"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Forma</th><th>Situação</th><th class="r">Valor</th><th></th></tr></thead>
      <tbody>${ps.length ? ps.map(linha).join("") : `<tr><td colspan="6" class="mute" style="padding:20px 12px">Nenhum lançamento neste mês.</td></tr>`}</tbody></table></div>`;
  $("np").onclick = () => editarPagamento();
  const todos = [...ps, ...atras];
  C().querySelectorAll("tr[data-p]").forEach(tr => tr.onclick = async e => {
    const pg = e.target.closest("[data-pagar]");
    const p = todos.find(x => x.id === tr.dataset.p);
    if (pg) { e.stopPropagation(); try { await q(sb.from("pagamentos").update({ pago_em: p.pago_em ? null : hoje() }).eq("id", p.id)); toast(p.pago_em ? "Marcado como em aberto" : "Pagamento recebido"); rota(); } catch (err) { erro(err); } return; }
    editarPagamento(p);
  });
};

/* ============ CONFIGURAÇÕES ============ */
ROTAS.config = async sub => {
  const pl = typeof PLANOS !== "undefined" && PLANOS.find?.(p => p.id === estudio.plano);
  const dT = typeof diasTeste === "function" ? diasTeste() : 0;
  const n = (estudio?.nome || user?.email || "").replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/);
  const ini = ((n[0]?.[0] || "") + (n[1]?.[0] || "")).toUpperCase() || "S";
  C().innerHTML = `
    <div class="cabeca"><div><h1>Configurações</h1><p class="mute">Seu perfil, seu plano e como o estúdio aparece para os clientes.</p></div></div>
    <div class="perfilTopo bloco" id="perfil">
      <label class="fotoPerfil${estudio.foto_url ? " comFoto" : ""}" for="cFoto" title="Trocar foto de perfil">
        ${estudio.foto_url ? `<img src="${esc(estudio.foto_url)}" alt="Sua foto de perfil">` : `<span>${esc(ini)}</span>`}
        <i><svg><use href="#i-camera"/></svg></i>
        <input id="cFoto" type="file" accept="image/jpeg,image/png,image/webp" class="hide"></label>
      <div class="perfilTxt"><h2>${esc(estudio.nome || "Meu estúdio")}</h2><span class="mute small">${esc(user.email)}</span>
        <div class="acoes" style="margin-top:12px"><label class="btn sm ghost" for="cFoto">${estudio.foto_url ? "Trocar foto" : "Adicionar foto de perfil"}</label>${estudio.foto_url ? `<button class="btn sm ghost" id="tirarFoto">Remover</button>` : ""}</div></div>
      <a class="planoMini" href="#/plano"><span class="small mute">Plano e cobrança</span><strong>${pl ? esc(pl.nome) : dT > 0 ? `Teste grátis · ${dT} ${dT === 1 ? "dia" : "dias"}` : "Teste encerrado"}</strong><span class="small">Ver planos e pagamento →</span></a>
    </div>
    <div class="duas">
      <form class="bloco" id="fEst"><h2>Estúdio</h2>
        <div class="field"><label for="cNome">Nome do estúdio</label><input id="cNome" required value="${esc(estudio.nome || "")}"></div>
        <div class="field"><label for="cSlug">Endereço das suas galerias</label><div class="prefixo"><span>${esc(raizSite().replace(/^https?:\/\//, ""))}</span><input id="cSlug" value="${esc(estudio.slug || "")}" pattern="[a-z0-9-]+" title="Só letras minúsculas, números e hífen" required></div></div>
        <div class="field"><label for="cW">WhatsApp</label><input id="cW" type="tel" placeholder="(61) 99999-9999" value="${esc(estudio.whatsapp || "")}"></div>
        <div class="field"><label for="cI">Instagram</label><input id="cI" placeholder="@seuperfil" value="${esc(estudio.instagram || "")}"></div>
        <button class="btn fill">Salvar</button>
      </form>
      <div class="bloco"><h2>Logo</h2>
        ${estudio.logo_url ? `<img class="logoPrev" src="${esc(estudio.logo_url)}" alt="Logo atual">` : `<p class="mute small" style="margin-bottom:10px">Sem logo. Na galeria aparece o nome do estúdio.</p>`}
        <p class="small mute" style="margin-bottom:12px">Use PNG com fundo transparente. Ele aparece no topo da galeria do cliente e é usado na marca d'água.</p>
        <div class="acoes"><label class="btn ghost" for="cLogo">Escolher logo</label><input id="cLogo" type="file" accept="image/png,image/jpeg,image/webp" class="hide">${estudio.logo_url ? `<button class="btn ghost" id="tirarLogo">Remover</button>` : ""}</div>
      </div>
      <form class="bloco" id="fMarca" style="grid-column:1/-1"><h2>Marca d'água nas prévias</h2>${pode("marca") ? "" : `<div class="msg" style="margin:8px 0 14px">No plano Essencial, as prévias levam a marca d'água da Seleta. Para usar seu logo ou seu nome, <a href="#/plano">conheça o Profissional</a>.</div>`}
        <div class="marcaGrid">
          <div>
            <div class="field"><label class="switch"><input type="checkbox" id="mOn" ${estudio.marca_dagua ? "checked" : ""}> Aplicar marca d'água nas fotos que eu subir</label></div>
            <div class="field"><span class="rotulo">Tipo</span><div class="ciclo" role="group" aria-label="Tipo de marca d'água" style="margin:6px 0 0"><button type="button" data-tipo="texto">Texto</button><button type="button" data-tipo="imagem">Minha imagem</button></div></div>
            <div id="mTexto">
              <div class="field"><label for="mTxt">Texto da marca</label><input id="mTxt" maxlength="40" value="${esc(estudio.marca_texto || "")}" placeholder="${esc(estudio.nome || "Bruno Fotografia")}"></div>
              <div class="field"><span class="rotulo">Estilo da letra</span><div class="estilos">${Object.entries(FONTES_MARCA).map(([k, f]) => `<button type="button" class="estilo" data-fonte="${k}" style="font:${f.css(17).replace(/\d+px/, "17px")}">${f.maiuscula ? "AaBb" : "Aa Bb"}<small>${f.nome}</small></button>`).join("")}</div></div>
            </div>
            <div id="mImagem" class="hide">
              <div class="field"><span class="rotulo">Sua marca d'água</span>
                <div class="quadroMarca">${(estudio.marca_url || estudio.logo_url) ? `<img src="${esc(estudio.marca_url || estudio.logo_url)}" alt="Marca d'água atual">` : `<span class="small mute">Nenhuma imagem</span>`}</div>
                <div class="acoes" style="margin-top:10px"><label class="btn ghost sm" for="mArq">Enviar imagem (PNG)</label><input id="mArq" type="file" accept="image/png,image/webp" class="hide"></div>
                <p class="small mute" style="margin-top:8px">Use PNG com fundo transparente. Ela é aplicada em branco, pra aparecer em qualquer foto.</p></div>
            </div>
            <div class="field"><label for="mPos">Posição</label><select id="mPos">${[["rodape", "Discreta, no rodapé"], ["canto", "Pequena, no canto"], ["centro", "No centro"]].map(([v, t]) => `<option value="${v}" ${(estudio.marca_posicao || "rodape") === v ? "selected" : ""}>${t}</option>`).join("")}</select></div>
            <div class="field"><label for="mOp">Intensidade: <span id="mOpTxt">${Math.round((+estudio.marca_opacidade || .35) * 100)}%</span></label><input id="mOp" type="range" min="0.1" max="0.9" step="0.05" value="${+estudio.marca_opacidade || .35}" style="padding:0"></div>
          </div>
          <div><canvas class="previa" id="mPrev" width="900" height="600" aria-label="Prévia da marca d'água numa foto"></canvas>
            <p class="small mute" style="margin:10px 0 14px">Prévia numa foto. Vale para as próximas fotos enviadas.</p>
            <button class="btn fill">Salvar marca d'água</button></div>
        </div>
      </form>
      <div class="bloco"><h2>Conta</h2><p>${esc(user.email)}</p><p class="small mute" style="margin:6px 0 16px">Plano de teste · 1 GB de armazenamento</p><button class="btn ghost" id="sair2">Sair</button></div>
    </div>`;
  let mTipo = estudio.marca_tipo || "texto", mFonte = estudio.marca_fonte || "moderna", mUrl = estudio.marca_url || estudio.logo_url || null, fotoPrev = null;
  const capaRec = await sb.from("fotos").select("caminho").order("criado_em", { ascending: false }).limit(1).maybeSingle();
  const srcPrev = capaRec.data?.caminho ? urlFoto(capaRec.data.caminho) : "https://images.unsplash.com/photo-1724690336308-02af024b76ab?w=1200&q=80&auto=format&fit=crop";
  fotoPrev = await new Promise(ok => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = srcPrev; });
  const desenhar = async () => {
    const c = $("mPrev"), x = c.getContext("2d"), W = c.width, H = c.height;
    x.fillStyle = "#333"; x.fillRect(0, 0, W, H);
    if (fotoPrev) { const k = Math.max(W / fotoPrev.width, H / fotoPrev.height), w = fotoPrev.width * k, h = fotoPrev.height * k; x.drawImage(fotoPrev, (W - w) / 2, (H - h) * 0.3, w, h); }
    if (!$("mOn").checked) return;
    const m = await prepararMarca({ tipo: mTipo, fonte: mFonte, texto: $("mTxt").value.trim(), url: mUrl }).catch(() => null);
    if (!m) return;
    x.globalAlpha = +$("mOp").value; desenharMarca(x, m, W, H, $("mPos").value); x.globalAlpha = 1;
  };
  const pintarMarcaUI = () => {
    C().querySelectorAll("[data-tipo]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tipo === mTipo));
    C().querySelectorAll("[data-fonte]").forEach(b => b.classList.toggle("on", b.dataset.fonte === mFonte));
    show("mTexto", mTipo === "texto"); show("mImagem", mTipo === "imagem");
    desenhar();
  };
  C().querySelectorAll("[data-tipo]").forEach(b => b.onclick = () => { mTipo = b.dataset.tipo; pintarMarcaUI(); });
  C().querySelectorAll("[data-fonte]").forEach(b => b.onclick = () => { mFonte = b.dataset.fonte; pintarMarcaUI(); });
  ["mTxt", "mOp"].forEach(id => $(id).oninput = () => { $("mOpTxt").textContent = Math.round($("mOp").value * 100) + "%"; desenhar(); });
  ["mPos", "mOn"].forEach(id => $(id).onchange = desenhar);
  $("mArq").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 3 * 1048576) return toast("Use um arquivo de até 3 MB");
    try {
      const cam = `${user.id}/estudio/marca-${Date.now()}.${f.type === "image/webp" ? "webp" : "png"}`;
      const up = await sb.storage.from("fotos").upload(cam, f, { contentType: f.type, cacheControl: "31536000" });
      if (up.error) throw up.error;
      mUrl = urlFoto(cam); logoBranco = null;
      C().querySelector(".quadroMarca").innerHTML = `<img src="${esc(mUrl)}" alt="Marca d'água">`;
      toast("Imagem carregada. Clique em Salvar para usar."); desenhar();
    } catch (err) { erro(err); }
  };
  pintarMarcaUI();
  $("fEst").onsubmit = async e => {
    e.preventDefault();
    const ns = slugify($("cSlug").value);
    if (ns !== estudio.slug) {
      const { data: livre } = await sb.rpc("slug_livre", { p_slug: ns });
      if (!livre) return toast("Esse endereço já é de outro estúdio. Tente outro.");
      if (estudio.slug && !confirm("Mudar o endereço faz os links já enviados pararem de funcionar. Continuar?")) return;
    }
    try { Object.assign(estudio, await q(sb.from("estudios").update({ slug: ns, nome: $("cNome").value.trim(), whatsapp: $("cW").value.trim() || null, instagram: $("cI").value.trim() || null }).eq("id", user.id).select().single())); pintarConta(); toast("Estúdio salvo"); }
    catch (err) { erro(err); }
  };
  $("fMarca").onsubmit = async e => {
    e.preventDefault();
    try { Object.assign(estudio, await q(sb.from("estudios").update({ marca_dagua: $("mOn").checked, marca_opacidade: +$("mOp").value, marca_posicao: $("mPos").value, marca_tipo: mTipo, marca_fonte: mFonte, marca_texto: $("mTxt").value.trim() || null, marca_url: mUrl }).eq("id", user.id).select().single())); logoBranco = null; toast("Marca d'água salva"); }
    catch (err) { erro(err); }
  };
  $("cLogo").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 3 * 1048576) return toast("Use um arquivo de até 3 MB");
    try {
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const cam = `${user.id}/estudio/logo-${Date.now()}.${ext}`;
      const up = await sb.storage.from("fotos").upload(cam, f, { contentType: f.type, cacheControl: "31536000" });
      if (up.error) throw up.error;
      Object.assign(estudio, await q(sb.from("estudios").update({ logo_url: urlFoto(cam) }).eq("id", user.id).select().single()));
      logoBranco = null; toast("Logo atualizado"); rota();
    } catch (err) { erro(err); }
  };
  if ($("tirarLogo")) $("tirarLogo").onclick = async () => { try { Object.assign(estudio, await q(sb.from("estudios").update({ logo_url: null }).eq("id", user.id).select().single())); logoBranco = null; rota(); } catch (err) { erro(err); } };
  $("sair2").onclick = () => sb.auth.signOut();
  $("cFoto").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      const lado = Math.min(bmp.width, bmp.height), c = document.createElement("canvas"); c.width = c.height = 400;
      c.getContext("2d").drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 400, 400); bmp.close?.();
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.88));
      const cam = `${user.id}/estudio/perfil-${Date.now()}.jpg`;
      const up = await sb.storage.from("fotos").upload(cam, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      const antigo = estudio.foto_url;
      Object.assign(estudio, await q(sb.from("estudios").update({ foto_url: urlFoto(cam) }).eq("id", user.id).select().single()));
      if (antigo) { const m = antigo.split("/fotos/")[1]; if (m) sb.storage.from("fotos").remove([decodeURIComponent(m)]); }
      pintarConta(); toast("Foto de perfil atualizada"); rota();
    } catch (err) { erro(err); }
  };
  if ($("tirarFoto")) $("tirarFoto").onclick = async () => {
    try { const antigo = estudio.foto_url; Object.assign(estudio, await q(sb.from("estudios").update({ foto_url: null }).eq("id", user.id).select().single()));
      const m = antigo?.split("/fotos/")[1]; if (m) sb.storage.from("fotos").remove([decodeURIComponent(m)]);
      pintarConta(); rota(); } catch (err) { erro(err); }
  };
  if (sub === "perfil") $("perfil").scrollIntoView({ block: "start" });
};

/* ============ TRABALHOS ============ */
let filtroTrab = "ativos";
ROTAS.trabalhos = async () => {
  const ts = await q(sb.from("trabalhos").select("*, clientes(nome), pagamentos(valor,pago_em)").order("data", { ascending: false, nullsFirst: true }));
  const f = { ativos: t => ["orcamento", "confirmado", "realizado"].includes(t.status), orcamento: t => t.status === "orcamento", confirmado: t => t.status === "confirmado", realizado: t => t.status === "realizado", entregue: t => t.status === "entregue", todos: () => true };
  C().innerHTML = `
    <div class="cabeca"><div><h1>Trabalhos</h1><p class="mute">Cada ensaio, casamento ou evento, do orçamento à entrega.</p></div><button class="btn fill" id="nt">Novo trabalho</button></div>
    <div class="filtros">${[["ativos", "Em andamento"], ["orcamento", "Orçamentos"], ["confirmado", "Confirmados"], ["realizado", "Realizados"], ["entregue", "Entregues"], ["todos", "Todos"]].map(([k, t]) => `<button class="chip" data-f="${k}">${t} (${ts.filter(f[k]).length})</button>`).join("")}</div>
    <div class="field busca"><label for="bTrab" class="hide">Buscar</label><input id="bTrab" type="search" placeholder="Buscar por trabalho, cliente ou local"></div>
    <div class="bloco" style="padding:6px 8px"><table class="tabela stack"><thead><tr><th>Data</th><th>Trabalho</th><th>Cliente</th><th>Situação</th><th class="r">Valor</th><th class="r">Recebido</th></tr></thead><tbody id="tTrab"></tbody></table></div>`;
  const pintar = () => {
    const b = $("bTrab").value.toLowerCase();
    const l = ts.filter(f[filtroTrab]).filter(t => [t.titulo, t.clientes?.nome, t.local, t.tipo].join(" ").toLowerCase().includes(b));
    $("tTrab").innerHTML = l.length ? l.map(t => { const rec = (t.pagamentos || []).filter(p => p.pago_em).reduce((s, p) => s + +p.valor, 0);
      return `<tr class="clic" data-t="${t.id}"><td>${t.data ? esc(dataBR(t.data)) : "—"}${t.hora ? `<br><span class="small mute">${esc(t.hora.slice(0, 5))}</span>` : ""}</td><td><strong style="font-weight:500">${esc(t.titulo)}</strong><br><span class="small mute">${esc([t.tipo, t.local].filter(Boolean).join(" · "))}</span></td><td>${esc(t.clientes?.nome || "—")}</td><td><span class="st">${STATUS_T[t.status]}</span></td><td class="r">${brl(t.valor)}</td><td class="r">${brl(rec)}</td></tr>`; }).join("")
      : `<tr><td colspan="6" class="mute" style="padding:22px 12px">${ts.length ? "Nada por aqui com esse filtro." : "Nenhum trabalho ainda. Cadastre o primeiro!"}</td></tr>`;
    document.querySelectorAll(".chip[data-f]").forEach(c => c.setAttribute("aria-pressed", c.dataset.f === filtroTrab));
  };
  document.querySelectorAll(".chip[data-f]").forEach(c => c.onclick = () => { filtroTrab = c.dataset.f; pintar(); });
  $("bTrab").oninput = pintar;
  $("tTrab").onclick = e => { const tr = e.target.closest("tr[data-t]"); if (tr) editarTrabalho(ts.find(t => t.id === tr.dataset.t)); };
  $("nt").onclick = () => editarTrabalho({});
  pintar();
};

/* ============ TAREFAS ============ */
async function editarTarefa(t = {}) {
  const [cs, ts] = await Promise.all([listaClientes(), listaTrabalhos()]);
  formulario({
    titulo: t.id ? "Editar tarefa" : "Nova tarefa",
    campos: [
      { id: "titulo", rotulo: "O que fazer", req: true, largo: true, ph: "Editar fotos do ensaio da Ana", valor: t.titulo },
      { id: "vencimento", rotulo: "Para quando", tipo: "date", valor: t.vencimento },
      { id: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: opcClientes(cs), valor: t.cliente_id },
      { id: "trabalho_id", rotulo: "Trabalho", tipo: "select", opcoes: opcTrabalhos(ts), valor: t.trabalho_id }
    ],
    aoSalvar: async v => {
      const row = { titulo: v.titulo, vencimento: v.vencimento || null, cliente_id: v.cliente_id || null, trabalho_id: v.trabalho_id || null };
      t.id ? await q(sb.from("tarefas").update(row).eq("id", t.id)) : await q(sb.from("tarefas").insert(row));
      toast("Tarefa salva"); rota();
    },
    aoExcluir: t.id ? async () => { await q(sb.from("tarefas").delete().eq("id", t.id)); rota(); } : null
  });
}
const linhaTarefa = t => {
  const atr = !t.feita && t.vencimento && t.vencimento < hoje();
  const sub = [t.clientes?.nome, t.trabalhos?.titulo].filter(Boolean).join(" · ");
  return `<div class="tarefa${t.feita ? " feita" : ""}" data-id="${t.id}">
    <input type="checkbox" ${t.feita ? "checked" : ""} aria-label="Concluir ${esc(t.titulo)}" data-ok="${t.id}">
    <div class="tt" data-ed="${t.id}"><strong>${esc(t.titulo)}</strong>${sub ? `<span>${esc(sub)}</span>` : ""}</div>
    ${t.vencimento ? `<span class="data${atr ? " atr" : ""}">${t.vencimento === hoje() ? "hoje" : atr ? "atrasada · " + esc(dataBR(t.vencimento).slice(0, 5)) : esc(dataBR(t.vencimento).slice(0, 5))}</span>` : ""}
    <button class="x" data-del="${t.id}" aria-label="Excluir ${esc(t.titulo)}">×</button></div>`;
};
async function ligarTarefas(lista, raiz) {
  raiz.onclick = async e => {
    const ok = e.target.closest("[data-ok]"), ed = e.target.closest("[data-ed]"), del = e.target.closest("[data-del]");
    try {
      if (ok) { const v = ok.checked; await q(sb.from("tarefas").update({ feita: v, feita_em: v ? new Date().toISOString() : null }).eq("id", ok.dataset.ok)); if (v) toast("Tarefa concluída"); rota(); }
      else if (del) { await q(sb.from("tarefas").delete().eq("id", del.dataset.del)); rota(); }
      else if (ed) editarTarefa(lista.find(t => t.id === ed.dataset.ed));
    } catch (err) { erro(err); }
  };
}
ROTAS.tarefas = async () => {
  const ts = await q(sb.from("tarefas").select("*, clientes(nome), trabalhos(titulo)").order("vencimento", { nullsFirst: false }).order("criado_em"));
  const h = hoje(), pend = ts.filter(t => !t.feita);
  const grupos = [
    ["Atrasadas", pend.filter(t => t.vencimento && t.vencimento < h)],
    ["Hoje", pend.filter(t => t.vencimento === h)],
    ["Próximas", pend.filter(t => t.vencimento && t.vencimento > h)],
    ["Sem data", pend.filter(t => !t.vencimento)],
    ["Concluídas", ts.filter(t => t.feita).sort((a, b) => (b.feita_em || "").localeCompare(a.feita_em || "")).slice(0, 20)]
  ];
  C().innerHTML = `
    <div class="cabeca"><div><h1>Tarefas</h1><p class="mute">${pend.length} ${pend.length === 1 ? "pendente" : "pendentes"}</p></div></div>
    <form class="novaTarefa" id="fTar"><label for="tTit" class="hide">Nova tarefa</label><input id="tTit" placeholder="Nova tarefa: ex. editar fotos do casamento" required><label for="tData" class="hide">Data</label><input id="tData" type="date" value="${h}"><button class="btn fill">Adicionar</button></form>
    <div id="tLista">${grupos.filter(g => g[1].length).map(([n, l]) => `<section class="tgrupo"><h2>${n} (${l.length})</h2>${l.map(linhaTarefa).join("")}</section>`).join("") || `<div class="vazio">Nenhuma tarefa. Anote aqui o que não pode esquecer: editar, entregar, cobrar, responder.</div>`}</div>`;
  $("fTar").onsubmit = async e => {
    e.preventDefault();
    try { await q(sb.from("tarefas").insert({ titulo: $("tTit").value.trim(), vencimento: $("tData").value || null })); rota(); } catch (err) { erro(err); }
  };
  ligarTarefas(ts, $("tLista"));
};

/* ============ PLANO E COBRANÇA ============ */
const PLANOS = [
  { id: "essencial", nome: "Essencial", m: 24.9, desc: "Para quem está começando a entregar com profissionalismo.",
    itens: ["20 GB de armazenamento", "15 galerias ativas", "Seleção com limite do pacote e fotos extras", "Entrega de fotos tratadas", "Clientes, agenda, tarefas e financeiro", "Marca d'água padrão da Seleta"] },
  { id: "profissional", nome: "Profissional", m: 44.9, rec: true, desc: "Para o estúdio que quer crescer: sua marca, seu visual e o CRM.",
    itens: ["80 GB de armazenamento", "60 galerias ativas", "Marca d'água com seu logo ou nome", "Galeria com o seu visual: capas, temas e fontes", "Aprovação de álbum", "CRM: funil, conversas e relatórios", "Favoritas do fotógrafo e proteção contra print"] },
  { id: "estudio", nome: "Estúdio", m: 84.9, desc: "Para estúdios com alto volume e equipe.",
    itens: ["250 GB de armazenamento", "Galerias ilimitadas", "Tudo do Profissional", "Sem \"feito com Seleta\" na galeria", "Domínio próprio (em breve)", "Até 3 usuários (em breve)"] }
];
/* ---- níveis e recursos ---- */
const ehAdmin = () => (user?.email || "").toLowerCase() === "brunnopasseri@gmail.com";
const NIVEL_PLANO = { essencial: 1, profissional: 2, estudio: 3 };
const diasPara = d => d ? Math.round((dia(d) - dia(hoje())) / 864e5) : -999;
function nivelAtual() {
  if (ehAdmin()) return 3;
  if (!estudio) return 3;
  if (estudio.plano === "teste") return diasPara(estudio.teste_ate) >= 0 ? 3 : 0;
  if (NIVEL_PLANO[estudio.plano]) return diasPara(estudio.plano_ate) >= -3 ? NIVEL_PLANO[estudio.plano] : 0;
  return 0;
}
const REC = { marca: 2, design: 2, album: 2, crm: 2, favoritas: 2, protecao: 2, semMarca: 3 };
const NOME_REC = { marca: "Marca d'água personalizada", design: "Visual personalizado da galeria", album: "Aprovação de álbum", crm: "CRM", favoritas: "Favoritas do fotógrafo" };
const pode = rec => nivelAtual() >= (REC[rec] || 1);
const LIMITE_GAL = { 1: 15, 2: 60, 3: Infinity };
function cadeado(rec) {
  const n = REC[rec] >= 3 ? "Estúdio" : "Profissional";
  return `<div class="cadeado bloco"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
    <h2>${esc(NOME_REC[rec] || "Recurso")}</h2><p class="mute">Disponível a partir do plano ${n}.</p><a class="btn fill" href="#/plano">Ver planos</a></div>`;
}
function marcarTravados() {
  const map = { diagramacoes: "album", funil: "crm", conversas: "crm", relatorios: "crm" };
  for (const [r, rec] of Object.entries(map)) document.querySelector(`#menu a[data-r="${r}"]`)?.classList.toggle("travado", !pode(rec));
  document.querySelectorAll(".soAdmin").forEach(el => el.classList.toggle("hide", !ehAdmin()));
}
const diasTeste = () => estudio?.teste_ate ? diasPara(estudio.teste_ate) : 14;
function avisoPlano() {
  if (!estudio || ehAdmin()) return "";
  if (estudio.plano === "teste") {
    const d = diasTeste();
    return `<div class="aviso"><span>${d > 0 ? `Você está no teste grátis: <strong style="font-weight:500">${d} ${d === 1 ? "dia restante" : "dias restantes"}</strong>.` : d === 0 ? `<strong style="font-weight:500">Último dia do seu teste grátis.</strong>` : `<strong style="font-weight:500">Seu teste terminou.</strong>`}</span><a class="btn sm fill" href="#/plano">Ver planos</a></div>`;
  }
  const d = diasPara(estudio.plano_ate);
  if (d < 0 && d >= -3) return `<div class="aviso alerta"><span><strong style="font-weight:500">Pagamento pendente.</strong> Regularize em até ${3 + d} ${3 + d === 1 ? "dia" : "dias"} para não pausar seu acesso.</span><a class="btn sm fill" href="#/plano">Pagar agora</a></div>`;
  if (d >= 0 && d <= 3) return `<div class="aviso"><span>Seu plano renova em ${d === 0 ? "hoje" : d + (d === 1 ? " dia" : " dias")}.</span></div>`;
  return "";
}
let cicloPlano = "mensal", planoSel = "profissional";
ROTAS.plano = async () => {
  const nv = nivelAtual(), pago = NIVEL_PLANO[estudio.plano];
  const atual = pago ? PLANOS.find(p => p.id === estudio.plano) : null;
  if (atual && planoSel === "profissional" && !pintarPlano.mexeu) planoSel = atual.id;
  const temAnual = Object.values(SELETA.pagamento || {}).some(x => x.anual);
  if (!temAnual) cicloPlano = "mensal";
  const preco = p => cicloPlano === "anual" ? p.m * 10 / 12 : p.m;
  const d = pago ? diasPara(estudio.plano_ate) : diasTeste();
  const bloqueado = nv === 0;
  const status = bloqueado
    ? `<div class="statusPlano ruim"><b>${pago ? "Seu acesso está pausado" : "Seu teste grátis terminou"}</b><span>${pago ? "Não encontramos o pagamento do seu plano. Atualize o pagamento para voltar a usar a Seleta. Suas galerias e dados continuam guardados." : "Escolha um plano para continuar usando a Seleta. Tudo o que você criou continua guardado."}</span></div>`
    : pago ? `<div class="statusPlano${d < 0 ? " ruim" : ""}"><b>Plano ${esc(atual.nome)}${d < 0 ? " · pagamento pendente" : ""}</b><span>${d < 0 ? "Regularize o pagamento para não pausar o acesso." : "Ativo até " + esc(dataBR(estudio.plano_ate)) + ". A renovação é automática no cartão ou por Pix."}</span></div>`
    : `<div class="statusPlano"><b>Teste grátis · ${d} ${d === 1 ? "dia restante" : "dias restantes"}</b><span>Até ${esc(dataBR(estudio.teste_ate))}, com todos os recursos liberados. Assine quando quiser: nada do que você fez se perde.</span></div>`;
  const cob = estudio.cobranca || {};
  function pintarPlano() {
    const p = PLANOS.find(x => x.id === planoSel);
    C().innerHTML = `${bloqueado ? "" : `<a class="volta" href="#/config">← Configurações</a>`}<div class="planosApp">
      <h1>${bloqueado ? (pago ? "Atualize seu pagamento" : "Escolha seu plano") : atual ? "Seu plano" : "Escolha seu plano"}</h1>
      ${status}
      <div class="ciclo${temAnual ? "" : " hide"}" role="group" aria-label="Cobrança"><button data-c="mensal" aria-pressed="${cicloPlano === "mensal"}">Mensal</button><button data-c="anual" aria-pressed="${cicloPlano === "anual"}">Anual</button></div>
      <p class="mute small" style="margin-bottom:16px">Todos os planos incluem galerias com seleção do cliente, entrega das fotos, download em .zip, agenda, tarefas e financeiro.</p>
      ${PLANOS.map(x => `<label class="opPlano${x.id === planoSel ? " sel" : ""}"><div class="lin"><input type="radio" name="plano" value="${x.id}" ${x.id === planoSel ? "checked" : ""}><div style="flex:1;min-width:0"><span class="nome">${x.nome}</span>${x.rec ? '<span class="rec">Recomendado</span>' : ""}${atual?.id === x.id ? '<span class="rec">Seu plano</span>' : ""}<p>${x.desc}</p>
        <ul class="itensPlano">${x.itens.map(i => `<li>${esc(i)}</li>`).join("")}</ul>${temAnual ? `<p class="small mute">ou ${brl(x.m * 10 / 12)} por mês no plano anual · economize 17%</p>` : ""}</div>
        <span class="pr">${brl(preco(x))}/mês${cicloPlano === "anual" ? `<br><span class="small">${brl(x.m * 10)} por ano</span>` : ""}</span></div></label>`).join("")}
      <button class="btn fill assinar" id="assinar">${atual?.id === planoSel ? "Pagar ou atualizar cartão" : "Assinar " + p.nome} · ${cicloPlano === "anual" ? brl(p.m * 10) + "/ano" : brl(p.m) + "/mês"}</button>
      <p class="miudo">Pagamento seguro pela InfinitePay · Pix ou cartão em até 12x · Cancele quando quiser</p>
      <p class="miudo">Já pagou? A liberação é feita em até 1 dia útil. Se demorar, <a href="#" data-suporte>fale com o suporte</a>.</p>
      <div id="msgPlano"></div>
      <div class="bloco cupomBox"><h2>Tem um cupom?</h2><p class="small mute">Cupons dão dias grátis a mais no seu teste ou no seu plano.</p>
        <form id="fCupom" class="row" style="margin-top:12px;gap:8px"><input id="cupom" placeholder="Ex.: FOTOGRAFO30" autocomplete="off" style="max-width:240px;text-transform:uppercase"><button class="btn">Aplicar</button></form><p class="small" id="msgCupom" role="status"></p></div>
      <div class="bloco"><h2>Dados de cobrança</h2><p class="small mute" style="margin-bottom:14px">Para quem as cobranças e os recibos são emitidos.</p>
        <form id="fCob" class="grid2">
          <div class="field"><label>Cobrado de</label><input value="${esc(estudio.nome || "")}" disabled></div>
          <div class="field"><label for="cDoc">CPF ou CNPJ</label><input id="cDoc" inputmode="numeric" value="${esc(cob.doc || "")}" placeholder="000.000.000-00"></div>
          <div class="field" style="grid-column:1/-1"><label for="cEmail">E-mail de cobrança</label><input id="cEmail" type="email" value="${esc(cob.email || "")}" placeholder="${esc(user.email)}"><span class="small mute">Deixe em branco para usar ${esc(user.email)}.</span></div>
          <div class="field"><label for="cTel">Telefone</label><input id="cTel" inputmode="tel" value="${esc(cob.telefone || "")}" placeholder="(61) 99999-9999"></div>
          <div class="field"><label for="cEnd">Endereço</label><input id="cEnd" value="${esc(cob.endereco || "")}" placeholder="Rua, número, cidade, estado"></div>
          <div class="acoes" style="grid-column:1/-1"><button class="btn fill">Salvar dados</button></div>
        </form></div>
    </div>`;
    C().querySelectorAll("[data-c]").forEach(b => b.onclick = () => { cicloPlano = b.dataset.c; pintarPlano(); });
    C().querySelectorAll("input[name=plano]").forEach(r => r.onchange = () => { planoSel = r.value; pintarPlano.mexeu = true; pintarPlano(); });
    $("assinar").onclick = () => {
      const link = SELETA.pagamento?.[planoSel]?.[cicloPlano];
      if (link) { window.open(link, "_blank", "noopener"); return; }
      $("msgPlano").innerHTML = `<div class="msg" style="margin-top:16px">O pagamento online está sendo ativado. Enquanto isso, fale com a gente para assinar: <a href="#" data-suporte>abrir o suporte</a>.</div>`;
    };
    $("fCupom").onsubmit = async e => {
      e.preventDefault(); const c = $("cupom").value.trim(); if (!c) return;
      const { data, error } = await sb.rpc("aplicar_cupom", { p_codigo: c });
      if (error) { $("msgCupom").textContent = error.message; $("msgCupom").style.color = "#b3261e"; return; }
      $("msgCupom").style.color = ""; toast(`Cupom aplicado: +${data.dias} dias`);
      const r = await sb.from("estudios").select("*").eq("id", user.id).single(); if (r.data) estudio = r.data;
      marcarTravados(); rota();
    };
    $("fCob").onsubmit = async e => {
      e.preventDefault();
      const cobranca = { doc: $("cDoc").value.trim(), email: $("cEmail").value.trim(), telefone: $("cTel").value.trim(), endereco: $("cEnd").value.trim() };
      try { Object.assign(estudio, await q(sb.from("estudios").update({ cobranca }).eq("id", user.id).select().single())); toast("Dados de cobrança salvos"); } catch (err) { erro(err); }
    };
  }
  pintarPlano();
};

/* ============ ADMINISTRADOR ============ */
ROTAS.admin = async () => {
  if (!ehAdmin()) return ir("#/inicio");
  const [es, cs] = await Promise.all([sb.rpc("admin_estudios"), sb.rpc("admin_cupons")]);
  if (es.error) throw es.error;
  const lista = es.data || [], cupons = cs.data || [];
  const st = e => e.nivel === 0 ? ["Pausado", "atrasado"] : e.plano === "teste" ? ["Teste", "aberta"] : ["Ativo", "encerrada"];
  const conta = k => lista.filter(e => (k === "pagos" ? NIVEL_PLANO[e.plano] && e.nivel > 0 : k === "teste" ? e.plano === "teste" && e.nivel > 0 : e.nivel === 0)).length;
  const receita = lista.filter(e => NIVEL_PLANO[e.plano] && e.nivel > 0).reduce((s, e) => s + (PLANOS.find(p => p.id === e.plano)?.m || 0), 0);
  C().innerHTML = `
    <div class="cabeca"><div><h1>Administrador</h1><p class="mute">Estúdios cadastrados, planos e cupons. Só você vê esta página.</p></div></div>
    <div class="cards"><div class="num"><span>Assinantes</span><b>${conta("pagos")}</b><small class="mute">${brl(receita)}/mês</small></div><div class="num"><span>Em teste</span><b>${conta("teste")}</b></div><div class="num"><span>Pausados</span><b>${conta("pausados")}</b></div><div class="num"><span>Total</span><b>${lista.length}</b></div></div>
    <div class="bloco" style="padding:6px 8px;margin-top:20px"><table class="tabela stack"><thead><tr><th>Estúdio</th><th>Plano</th><th>Situação</th><th>Vence</th><th>Galerias</th><th></th></tr></thead><tbody>
    ${lista.map(e => `<tr><td><strong style="font-weight:500">${esc(e.nome || "—")}</strong><br><span class="small mute">${esc(e.email)}${e.cobranca?.doc ? " · " + esc(e.cobranca.doc) : ""}${e.indicado_por ? " · indicado por " + esc(e.indicado_por) : ""}</span></td>
      <td>${esc(e.plano === "teste" ? "Teste" : PLANOS.find(p => p.id === e.plano)?.nome || e.plano)}</td>
      <td><span class="tag ${st(e)[1]}">${st(e)[0]}</span></td>
      <td>${esc(dataBR(e.plano === "teste" ? e.teste_ate : e.plano_ate) || "—")}</td><td>${e.galerias}</td>
      <td class="r"><button class="btn sm" data-ed="${e.id}">Alterar</button></td></tr>`).join("")}</tbody></table></div>
    <div class="bloco" style="margin-top:20px"><h2>Cupons</h2>
      <form id="fNovoCupom" class="row" style="gap:8px;flex-wrap:wrap;margin:12px 0"><input id="nCod" placeholder="CÓDIGO" required style="max-width:180px;text-transform:uppercase"><input id="nDias" type="number" min="1" max="365" value="30" style="max-width:110px" aria-label="Dias grátis"><input id="nUsos" type="number" min="1" placeholder="Usos (vazio = ilimitado)" style="max-width:220px"><button class="btn fill">Criar cupom</button></form>
      <table class="tabela"><thead><tr><th>Código</th><th>Dias</th><th>Usos</th><th>Situação</th><th></th></tr></thead><tbody>
      ${cupons.map(c => `<tr><td><strong style="font-weight:500;letter-spacing:.06em">${esc(c.codigo)}</strong></td><td>${c.dias}</td><td>${c.usos}${c.usos_max ? " / " + c.usos_max : ""}</td><td><span class="tag ${c.ativo ? "encerrada" : "aberta"}">${c.ativo ? "Ativo" : "Desativado"}</span></td>
        <td class="r"><button class="btn sm ghost" data-tog="${esc(c.codigo)}">${c.ativo ? "Desativar" : "Ativar"}</button></td></tr>`).join("") || `<tr><td colspan="5" class="mute">Nenhum cupom ainda.</td></tr>`}</tbody></table></div>`;
  C().querySelectorAll("[data-ed]").forEach(b => b.onclick = () => {
    const e = lista.find(x => x.id === b.dataset.ed);
    const mais = n => { const d = new Date(); d.setMonth(d.getMonth() + n); return ymd(d); };
    formulario({
      titulo: "Alterar plano · " + (e.nome || e.email), botao: "Salvar",
      campos: [
        { id: "plano", rotulo: "Plano", tipo: "select", opcoes: [["teste", "Teste grátis"], ["essencial", "Essencial"], ["profissional", "Profissional"], ["estudio", "Estúdio"]], valor: e.plano },
        { id: "ate", rotulo: "Válido até", tipo: "date", req: true, valor: (e.plano === "teste" ? e.teste_ate : e.plano_ate) || mais(1) }
      ],
      extra: `<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px"><button type="button" class="btn sm" data-mais="1">+1 mês</button><button type="button" class="btn sm" data-mais="12">+1 ano</button><button type="button" class="btn sm ghost" data-pausar>Pausar acesso</button></div>`,
      aoSalvar: async v => { const r = await sb.rpc("admin_definir_plano", { p_id: e.id, p_plano: v.plano, p_ate: v.ate }); if (r.error) throw r.error; toast("Plano atualizado"); rota(); }
    });
    document.querySelectorAll("[data-mais]").forEach(x => x.onclick = () => { $("f_ate").value = mais(+x.dataset.mais); });
    document.querySelector("[data-pausar]").onclick = () => { const d = new Date(); d.setDate(d.getDate() - 10); $("f_ate").value = ymd(d); };
  });
  $("fNovoCupom").onsubmit = async ev => {
    ev.preventDefault();
    const r = await sb.rpc("admin_salvar_cupom", { p_codigo: $("nCod").value, p_dias: +$("nDias").value, p_usos_max: $("nUsos").value ? +$("nUsos").value : null, p_ativo: true });
    if (r.error) return erro(r.error); toast("Cupom criado"); rota();
  };
  C().querySelectorAll("[data-tog]").forEach(b => b.onclick = async () => {
    const c = cupons.find(x => x.codigo === b.dataset.tog);
    const r = await sb.rpc("admin_salvar_cupom", { p_codigo: c.codigo, p_dias: c.dias, p_usos_max: c.usos_max, p_ativo: !c.ativo });
    if (r.error) return erro(r.error); rota();
  });
};

/* ============ CRM: situação de cada álbum ============ */
const ETAPA_A = {
  aguardando: ["Ainda não abriu / não marcou", "aberta"],
  andamento: ["Escolhendo agora", "andamento"],
  escolheu: ["Já escolheu · editar", "enviada"],
  entregue: ["Entregue", "encerrada"]
};
async function dadosAlbuns() {
  const [gs, sel] = await Promise.all([
    q(sb.from("galerias").select("id,slug,titulo,cliente_id,cliente_nome,status,prazo,criado_em,enviada_em,entrega_liberada,fotos_incluidas,preco_extra,permitir_extras,clientes(nome,whatsapp),qtd:fotos!fotos_galeria_id_fkey(count)").eq("so_entrega", false).order("criado_em", { ascending: false })),
    q(sb.from("selecoes").select("galeria_id"))
  ]);
  const n = {}; sel.forEach(x => n[x.galeria_id] = (n[x.galeria_id] || 0) + 1);
  return gs.map(g => {
    const marc = n[g.id] || 0;
    const etapa = g.entrega_liberada || g.status === "encerrada" ? "entregue" : g.status === "enviada" ? "escolheu" : marc ? "andamento" : "aguardando";
    const atrasado = etapa !== "entregue" && etapa !== "escolheu" && g.prazo && g.prazo < hoje();
    const dias = Math.floor((Date.now() - new Date(g.enviada_em || g.criado_em)) / 864e5);
    return { ...g, marc, etapa, atrasado, dias };
  });
}

/* --- Relatórios --- */
let filtroRel = "todos";
ROTAS.relatorios = async () => {
  const [als, pags, ts] = await Promise.all([dadosAlbuns(), q(sb.from("pagamentos").select("valor,pago_em,vencimento")), q(sb.from("trabalhos").select("status,valor,tipo"))]);
  const cont = k => als.filter(a => a.etapa === k).length;
  const atrasados = als.filter(a => a.atrasado).length;
  // receita dos últimos 6 meses
  const meses = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d; });
  const rec = meses.map(d => pags.filter(p => p.pago_em && p.pago_em.slice(0, 7) === ymd(d).slice(0, 7)).reduce((s, p) => s + +p.valor, 0));
  const maxR = Math.max(1, ...rec);
  const orc = ts.length, fech = ts.filter(t => ["confirmado", "realizado", "entregue"].includes(t.status)).length;
  const extras = als.filter(a => a.permitir_extras !== false && a.etapa !== "aguardando").reduce((s, a) => s + Math.max(0, a.marc - a.fotos_incluidas) * a.preco_extra, 0);
  const f = { todos: () => true, aguardando: a => a.etapa === "aguardando", andamento: a => a.etapa === "andamento", escolheu: a => a.etapa === "escolheu", entregue: a => a.etapa === "entregue", atrasado: a => a.atrasado };
  C().innerHTML = `
    <div class="cabeca"><div><h1>Relatórios</h1><p class="mute">Quem já escolheu, quem está escolhendo e quem ainda não abriu o link.</p></div><button class="btn ghost" id="csv">Baixar planilha (CSV)</button></div>
    <div class="cards">
      <button class="num" data-k="aguardando"><span>Não escolheram ainda</span><b>${cont("aguardando")}</b><small class="mute">${atrasados ? `${atrasados} com prazo vencido` : "nenhum atrasado"}</small></button>
      <button class="num" data-k="andamento"><span>Escolhendo agora</span><b>${cont("andamento")}</b><small class="mute">já marcaram fotos</small></button>
      <button class="num" data-k="escolheu"><span>Já escolheram</span><b>${cont("escolheu")}</b><small class="mute">esperando edição</small></button>
      <button class="num" data-k="entregue"><span>Entregues</span><b>${cont("entregue")}</b><small class="mute">fotos tratadas liberadas</small></button>
    </div>
    <div class="filtros" style="margin-top:22px">${[["todos", "Todos"], ["aguardando", "Não escolheram"], ["andamento", "Escolhendo"], ["escolheu", "Já escolheram"], ["entregue", "Entregues"], ["atrasado", "Prazo vencido"]].map(([k, t]) => `<button class="chip" data-f="${k}">${t} (${als.filter(f[k]).length})</button>`).join("")}</div>
    <div class="bloco" style="padding:6px 8px"><table class="tabela stack"><thead><tr><th>Cliente</th><th>Galeria</th><th>Situação</th><th class="r">Marcadas</th><th>Prazo</th><th class="r">Parado há</th><th></th></tr></thead><tbody id="tRel"></tbody></table></div>
    <div class="duas">
      <div class="bloco"><h2>Recebido nos últimos 6 meses</h2>
        <div class="barras">${meses.map((d, i) => `<div class="bcol"><span class="bval">${rec[i] ? brl(rec[i]).replace(",00", "") : ""}</span><i style="height:${Math.round(rec[i] / maxR * 100)}%"></i><span class="small mute">${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>`).join("")}</div></div>
      <div class="bloco"><h2>Resumo</h2>
        <div class="resumo" style="grid-template-columns:1fr 1fr"><span>Orçamentos que viraram trabalho<b>${orc ? Math.round(fech / orc * 100) : 0}%</b></span><span>Trabalhos cadastrados<b>${orc}</b></span><span>Fotos extras vendidas<b>${brl(extras)}</b></span><span>Galerias no total<b>${als.length}</b></span></div></div>
    </div>`;
  const pintar = () => {
    const l = als.filter(f[filtroRel]);
    $("tRel").innerHTML = l.length ? l.map(a => `<tr class="clic" data-s="${esc(a.slug)}">
      <td><strong style="font-weight:500">${esc(a.cliente_nome || "Sem cliente")}</strong></td><td>${esc(a.titulo)}</td>
      <td><span class="tag ${ETAPA_A[a.etapa][1]}">${ETAPA_A[a.etapa][0]}</span></td>
      <td class="r">${a.marc}${a.fotos_incluidas ? ` / ${a.fotos_incluidas}` : ""}</td>
      <td${a.atrasado ? ' style="color:#b3261e;font-weight:500"' : ""}>${a.prazo ? esc(dataBR(a.prazo)) + (a.atrasado ? " · vencido" : "") : "—"}</td>
      <td class="r">${a.dias} ${a.dias === 1 ? "dia" : "dias"}</td>
      <td class="r">${a.clientes?.whatsapp && a.etapa !== "entregue" ? `<a class="btn sm ghost" target="_blank" rel="noopener" data-wa href="https://wa.me/${fone(a.clientes.whatsapp)}?text=${encodeURIComponent(sugestaoMsg(a).texto)}">Lembrar</a>` : ""}</td></tr>`).join("")
      : `<tr><td colspan="7" class="mute" style="padding:22px 12px">Nada por aqui com esse filtro.</td></tr>`;
    document.querySelectorAll(".chip[data-f]").forEach(c => c.setAttribute("aria-pressed", c.dataset.f === filtroRel));
  };
  document.querySelectorAll(".chip[data-f]").forEach(c => c.onclick = () => { filtroRel = c.dataset.f; pintar(); });
  document.querySelectorAll(".num[data-k]").forEach(c => c.onclick = () => { filtroRel = c.dataset.k; pintar(); });
  $("tRel").onclick = e => { if (e.target.closest("[data-wa]")) return; const r = e.target.closest("[data-s]"); if (r) ir("#/galeria/" + r.dataset.s); };
  $("csv").onclick = () => {
    const linhas = [["Cliente", "Galeria", "Situação", "Marcadas", "Incluídas", "Prazo", "Dias parado"], ...als.map(a => [a.cliente_nome || "", a.titulo, ETAPA_A[a.etapa][0], a.marc, a.fotos_incluidas, a.prazo ? dataBR(a.prazo) : "", a.dias])];
    const csv = "﻿" + linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); el.download = "relatorio-galerias.csv"; el.click();
  };
  pintar();
};

/* --- Conversas --- */
function sugestaoMsg(a) {
  const nome = (a.cliente_nome || "").split(" ")[0], oi = `Oi${nome ? ", " + nome : ""}!`;
  const link = raizSite() + (estudio.slug ? estudio.slug + "/" : "g.html?g=") + a.slug;
  if (a.etapa === "aguardando") return { titulo: a.atrasado ? "Prazo vencido" : "Ainda não escolheu", texto: `${oi} Passando pra lembrar que suas fotos estão te esperando 📸${a.prazo ? ` O prazo pra escolher ${a.atrasado ? "era" : "é"} ${dataBR(a.prazo)}.` : ""}\n\n${link}` };
  if (a.etapa === "andamento") return { titulo: "Escolhendo", texto: `${oi} Vi que você já começou a escolher suas fotos 🤍 Quando terminar, é só clicar em "Enviar seleção" no final da página.\n\n${link}` };
  if (a.etapa === "escolheu") return { titulo: "Seleção recebida", texto: `${oi} Recebi sua seleção, obrigado! Já vou começar a edição e te aviso assim que as fotos estiverem prontas.` };
  return { titulo: "Entregue", texto: `${oi} Conseguiu baixar suas fotos? Se puder, me marca quando postar, vou adorar ver 🤍` };
}
ROTAS.conversas = async () => {
  const [als, cs] = await Promise.all([dadosAlbuns(), q(sb.from("clientes").select("id,nome,whatsapp").order("nome"))]);
  const ult = {}; als.forEach(a => { if (a.cliente_id && !ult[a.cliente_id]) ult[a.cliente_id] = a; });
  const prior = { aguardando: 0, andamento: 1, escolheu: 2, entregue: 3 };
  const lista = cs.map(c => ({ c, a: ult[c.id] })).sort((x, y) => (x.a ? prior[x.a.etapa] - (x.a.atrasado ? 1 : 0) : 9) - (y.a ? prior[y.a.etapa] - (y.a.atrasado ? 1 : 0) : 9));
  C().innerHTML = `
    <div class="cabeca"><div><h1>Conversas</h1><p class="mute">Cada cliente com a mensagem certa para o momento. Um toque abre o WhatsApp já com o texto pronto.</p></div></div>
    <div class="field busca"><input id="bConv" type="search" placeholder="Buscar cliente"></div>
    <div class="conversas" id="lConv"></div>`;
  const pintar = () => {
    const b = $("bConv").value.toLowerCase();
    const l = lista.filter(x => x.c.nome.toLowerCase().includes(b));
    $("lConv").innerHTML = l.length ? l.map(({ c, a }) => {
      const s = a ? sugestaoMsg(a) : { titulo: "Sem galeria", texto: `Oi, ${c.nome.split(" ")[0]}! Tudo bem?` };
      const ini = c.nome.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
      return `<div class="conv bloco">
        <span class="avatarC">${esc(ini)}</span>
        <div class="convTxt"><div class="row" style="gap:8px;flex-wrap:wrap"><strong>${esc(c.nome)}</strong>${a ? `<span class="tag ${ETAPA_A[a.etapa][1]}">${esc(s.titulo)}</span><span class="small mute">${esc(a.titulo)}</span>` : `<span class="small mute">${s.titulo}</span>`}</div>
          <textarea class="convMsg" aria-label="Mensagem para ${esc(c.nome)}">${esc(s.texto)}</textarea></div>
        <div class="convAcoes">${c.whatsapp ? `<button class="btn fill sm" data-w="${esc(fone(c.whatsapp))}">Abrir no WhatsApp</button>` : `<a class="btn ghost sm" href="#/cliente/${c.id}">Adicionar WhatsApp</a>`}<button class="btn ghost sm" data-cp>Copiar</button></div>
      </div>`; }).join("") : `<div class="vazio">${cs.length ? "Nenhum cliente com esse nome." : "Cadastre seus clientes para ver as conversas aqui."}</div>`;
  };
  $("bConv").oninput = pintar;
  $("lConv").onclick = async e => {
    const box = e.target.closest(".conv"); if (!box) return;
    const txt = box.querySelector("textarea").value;
    if (e.target.closest("[data-w]")) window.open(`https://wa.me/${e.target.closest("[data-w]").dataset.w}?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
    if (e.target.closest("[data-cp]")) { try { await navigator.clipboard.writeText(txt); toast("Mensagem copiada"); } catch { prompt("Copie:", txt); } }
  };
  pintar();
};

/* --- Funil --- */
const ETAPAS_F = [["orcamento", "Orçamento"], ["confirmado", "Fechado"], ["realizado", "Fotografado"], ["entregue", "Entregue"]];
ROTAS.funil = async () => {
  const [ts, gs] = await Promise.all([
    q(sb.from("trabalhos").select("*, clientes(nome)").neq("status", "cancelado").order("data", { nullsFirst: false })),
    dadosAlbuns()
  ]);
  const albumDo = {}; (await q(sb.from("galerias").select("id,trabalho_id").not("trabalho_id", "is", null))).forEach(g => { const a = gs.find(x => x.id === g.id); if (a) albumDo[g.trabalho_id] = a; });
  const pintar = () => {
    $("kanban").innerHTML = ETAPAS_F.map(([k, t]) => {
      const l = ts.filter(x => x.status === k), tot = l.reduce((s, x) => s + +(x.valor || 0), 0);
      return `<div class="col" data-col="${k}"><div class="colTopo"><strong>${t}</strong><span class="small mute">${l.length} · ${brl(tot)}</span></div>
        <div class="colCards">${l.map(x => { const a = albumDo[x.id]; return `<div class="kcard" draggable="true" data-id="${x.id}">
          <strong>${esc(x.titulo)}</strong><span class="small mute">${esc([x.clientes?.nome, x.data && dataBR(x.data)].filter(Boolean).join(" · "))}</span>
          <div class="row" style="justify-content:space-between;margin-top:8px"><span class="small">${brl(x.valor)}</span>${a ? `<span class="tag ${ETAPA_A[a.etapa][1]}" style="font-size:10px">${ETAPA_A[a.etapa][0]}</span>` : ""}</div>
          <select class="kmover" aria-label="Mover ${esc(x.titulo)}">${ETAPAS_F.map(([kk, tt]) => `<option value="${kk}" ${kk === k ? "selected" : ""}>${tt}</option>`).join("")}</select>
        </div>`; }).join("") || `<p class="small mute" style="padding:8px">Arraste um card para cá</p>`}</div></div>`;
    }).join("");
  };
  const total = ts.length, fech = ts.filter(t => t.status !== "orcamento").length;
  C().innerHTML = `
    <div class="cabeca"><div><h1>Funil</h1><p class="mute">Do primeiro orçamento à entrega. Arraste os cards para mudar a etapa.</p></div><button class="btn fill" id="nf">Novo orçamento</button></div>
    <p class="small mute" style="margin:-6px 0 16px">${total} trabalhos · ${total ? Math.round(fech / total * 100) : 0}% dos orçamentos fecharam</p>
    <div class="kanban" id="kanban"></div>`;
  const mover = async (id, st) => {
    const t = ts.find(x => x.id === id); if (!t || t.status === st) return;
    try { await q(sb.from("trabalhos").update({ status: st }).eq("id", id)); t.status = st; pintar(); toast("Movido para " + ETAPAS_F.find(e => e[0] === st)[1]); } catch (e) { erro(e); }
  };
  const k = $("kanban");
  k.addEventListener("dragstart", e => { const c = e.target.closest(".kcard"); if (c) { e.dataTransfer.setData("text/plain", c.dataset.id); c.classList.add("arrastando"); } });
  k.addEventListener("dragend", e => e.target.closest?.(".kcard")?.classList.remove("arrastando"));
  k.addEventListener("dragover", e => { const c = e.target.closest(".col"); if (c) { e.preventDefault(); k.querySelectorAll(".col").forEach(x => x.classList.toggle("alvo", x === c)); } });
  k.addEventListener("drop", e => { const c = e.target.closest(".col"); k.querySelectorAll(".col").forEach(x => x.classList.remove("alvo")); if (c) { e.preventDefault(); mover(e.dataTransfer.getData("text/plain"), c.dataset.col); } });
  k.addEventListener("change", e => { if (e.target.classList.contains("kmover")) mover(e.target.closest(".kcard").dataset.id, e.target.value); });
  k.addEventListener("click", e => { if (e.target.closest("select")) return; const c = e.target.closest(".kcard"); if (c) editarTrabalho(ts.find(x => x.id === c.dataset.id), () => rota()); });
  $("nf").onclick = () => editarTrabalho({ status: "orcamento" }, () => rota());
  pintar();
};

/* --- Indique e ganhe --- */
ROTAS.indique = async () => {
  const { data } = await sb.rpc("minhas_indicacoes");
  const n = data || { total: 0, assinantes: 0 };
  const link = raizSite() + "?ref=" + encodeURIComponent(estudio.slug || "");
  const msg = `Tô usando o Seleta pra mandar as prévias e receber a seleção dos clientes, e organizar agenda e financeiro num lugar só. Testa 14 dias grátis pelo meu link:\n${link}`;
  C().innerHTML = `
    <div class="indique bloco faixaFoto" style="--foto:url('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&q=70')">
      <span class="small" style="opacity:.8;letter-spacing:.2em">INDIQUE E GANHE</span>
      <h1 style="color:#fff;font-weight:400;margin:10px 0 8px">Indique um fotógrafo e ganhe 1 mês grátis</h1>
      <p style="opacity:.85;max-width:520px">A cada amigo que assinar um plano pelo seu link, você ganha 1 mês no seu plano. E ele começa com 14 dias de teste.</p>
    </div>
    <div class="duas">
      <div class="bloco"><h2>Seu link de indicação</h2>
        <div class="field" style="margin-top:12px"><input id="lRef" readonly value="${esc(link)}"></div>
        <div class="acoes"><button class="btn fill" id="cRef">Copiar link</button><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Mandar no WhatsApp</a></div></div>
      <div class="bloco"><h2>Suas indicações</h2>
        <div class="resumo" style="grid-template-columns:1fr 1fr 1fr;margin-top:12px"><span>Cadastros<b>${n.total}</b></span><span>Assinaram<b>${n.assinantes}</b></span><span>Meses ganhos<b>${n.assinantes}</b></span></div></div>
    </div>
    <div class="bloco" style="margin-top:18px"><h2>Como funciona</h2>
      <ol class="passos"><li><b>1</b><span>Mande seu link para outro fotógrafo.</span></li><li><b>2</b><span>Ele cria o estúdio e testa 14 dias grátis.</span></li><li><b>3</b><span>Quando ele assinar, você ganha 1 mês grátis.</span></li></ol></div>`;
  $("cRef").onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link copiado"); } catch { $("lRef").select(); } };
};

/* ============ APROVAÇÃO DE ÁLBUM (diagramação) ============ */
const STATUS_D = { aguardando: ["Aguardando cliente", "aberta"], alteracoes: ["Pediu alterações", "andamento"], aprovado: ["Aprovado", "encerrada"] };
const linkDiag = d => raizSite() + (estudio.slug || "") + "/album/" + d.slug;
ROTAS.diagramacoes = async () => {
  const ds = await q(sb.from("diagramacoes").select("id,slug,titulo,cliente_nome,status,versao,prazo,criado_em,laminas(caminho,versao,ordem),lamina_comentarios(id,versao)").order("criado_em", { ascending: false }));
  C().innerHTML = `
    <div class="cabeca"><div><h1>Aprovação de álbum</h1><p class="mute">Envie as lâminas diagramadas. O cliente folheia, comenta nas páginas e aprova.</p></div><button class="btn fill" id="nd">Novo álbum para aprovar</button></div>
    <div class="galerias">${ds.length ? ds.map(d => {
      const capa = (d.laminas || []).filter(l => l.versao === d.versao).sort((a, b) => a.ordem - b.ordem)[0];
      const nc = (d.lamina_comentarios || []).filter(c => c.versao === d.versao).length;
      return `<a class="gcard" href="#/diagramacao/${esc(d.slug)}"><div class="capa capaLarga" style="${capa ? `background-image:url('${esc(urlFoto(capa.caminho))}')` : ""}"><span class="tag ${STATUS_D[d.status][1]}">${STATUS_D[d.status][0]}</span></div>
        <div class="info"><h3>${esc(d.titulo)}</h3><span class="small mute">${esc(d.cliente_nome || "Sem cliente")} · versão ${d.versao}${nc ? ` · ${nc} ${nc === 1 ? "comentário" : "comentários"}` : ""}</span></div></a>`; }).join("")
      : `<div class="vazio" style="grid-column:1/-1">Nenhum álbum ainda. Exporte as lâminas do seu programa de diagramação em JPG e envie aqui.</div>`}</div>`;
  $("nd").onclick = novaDiagramacao;
};
async function novaDiagramacao() {
  const [cs, ts] = await Promise.all([listaClientes(), listaTrabalhos()]);
  formulario({
    titulo: "Novo álbum para aprovar", botao: "Criar e enviar lâminas",
    campos: [
      { id: "titulo", rotulo: "Nome do álbum", req: true, ph: "Álbum Júlia e Rafael" },
      { id: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: opcClientes(cs) },
      { id: "trabalho_id", rotulo: "Trabalho da agenda", tipo: "select", opcoes: opcTrabalhos(ts) },
      { id: "prazo", rotulo: "Prazo para aprovar", tipo: "date" },
      { id: "mensagem", rotulo: "Recado para o cliente", tipo: "area", largo: true, ph: "Folheie com calma e toque na página para comentar 🤍" }
    ],
    aoSalvar: async v => {
      const cli = cs.find(c => c.id === v.cliente_id);
      const base = slugify(v.titulo); const usados = new Set((await q(sb.from("diagramacoes").select("slug").like("slug", base + "%"))).map(x => x.slug));
      let slug = base, i = 2; while (usados.has(slug)) slug = `${base}-${i++}`;
      const d = await q(sb.from("diagramacoes").insert({ slug, titulo: v.titulo, cliente_id: v.cliente_id || null, cliente_nome: cli?.nome || null, trabalho_id: v.trabalho_id || null, prazo: v.prazo || null, mensagem: v.mensagem || null }).select("slug").single());
      ir("#/diagramacao/" + d.slug);
    }
  });
}
let D = null, versaoVer = null;
ROTAS.diagramacao = async slug => {
  D = await q(sb.from("diagramacoes").select("*, clientes(nome,whatsapp)").eq("slug", slug).maybeSingle());
  if (!D) return ir("#/diagramacoes");
  if (versaoVer === null || versaoVer.id !== D.id) versaoVer = { id: D.id, v: D.versao };
  const [ls, cs] = await Promise.all([
    q(sb.from("laminas").select("*").eq("diagramacao_id", D.id).order("versao").order("ordem")),
    q(sb.from("lamina_comentarios").select("*").eq("diagramacao_id", D.id).order("criado_em"))
  ]);
  const v = versaoVer.v, lv = ls.filter(l => l.versao === v), cv = cs.filter(c => c.versao === v);
  const versoes = [...new Set(ls.map(l => l.versao).concat(D.versao))].sort((a, b) => a - b);
  const msg = `Oi${D.cliente_nome ? ", " + D.cliente_nome.split(" ")[0] : ""}! ${D.versao > 1 ? "A nova versão do seu álbum está pronta" : "A diagramação do seu álbum está pronta"} 📖 Folheie, comente nas páginas e aprove por aqui:\n\n${linkDiag(D)}\nCódigo: ${D.codigo_acesso}`;
  const capa = lv[0];
  C().innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:10px"><a class="volta" href="#/diagramacoes" style="margin:0">← Aprovação de álbum</a><button class="btn sm ghost" id="exD">Excluir</button></div>
    <div class="banner" style="${capa ? `background-image:url('${esc(urlFoto(capa.caminho))}')` : ""}"><div class="sobre"><div><h1>${esc(D.titulo)}</h1><p style="margin-top:6px;opacity:.85">${[D.cliente_nome, `versão ${D.versao}`, `${ls.filter(l => l.versao === D.versao).length} lâminas`, D.prazo && "prazo " + dataBR(D.prazo)].filter(Boolean).map(esc).join(" · ")}</p></div><span class="tag">${STATUS_D[D.status][0]}</span></div></div>
    ${D.status === "alteracoes" ? `<div class="bloco avisoPronta"><div><strong>O cliente pediu alterações na versão ${D.versao}</strong><br><span class="small mute">${cs.filter(c => c.versao === D.versao).length} comentários abaixo. Ajuste a diagramação e envie a versão ${D.versao + 1}.</span></div><label class="btn fill" for="novaV">Enviar nova versão</label></div>` : ""}
    ${D.status === "aprovado" ? `<div class="bloco avisoPronta"><div><strong>Álbum aprovado${D.respondido_em ? " em " + new Date(D.respondido_em).toLocaleDateString("pt-BR") : ""} 🎉</strong><br><span class="small mute">Pode mandar para impressão. O cliente continua podendo folhear pelo mesmo link.</span></div></div>` : ""}
    <div class="bloco compart">
      <div><span class="small mute">Link do cliente</span><br><code>${esc(linkDiag(D))}</code><div style="margin-top:8px"><span class="small mute">Código</span> <span class="codigo">${esc(D.codigo_acesso)}</span></div></div>
      <div class="acoes"><button class="btn ghost" id="cpD">Copiar mensagem</button><a class="btn fill" target="_blank" rel="noopener" href="https://wa.me/${fone(D.clientes?.whatsapp)}?text=${encodeURIComponent(msg)}">Enviar no WhatsApp</a><a class="btn ghost" target="_blank" rel="noopener" href="${esc(linkDiag(D))}">Ver como cliente</a></div>
    </div>
    <div class="abasG" role="tablist">${versoes.map(n => `<button role="tab" data-v="${n}" aria-selected="${n === v}">Versão ${n}${n === D.versao ? " (atual)" : ""}</button>`).join("")}</div>
    <div class="sec" style="margin-top:0">
      ${v === D.versao && D.status !== "aprovado" ? `<label class="soltar" id="soltarL" for="arqL"><strong>${lv.length ? "Adicionar mais lâminas a esta versão" : "Arraste as lâminas aqui ou clique pra escolher"}</strong><br>
        <span class="small mute">JPG exportado do seu programa de diagramação, uma imagem por lâmina (página dupla). A ordem segue o nome do arquivo.</span>
        <input id="arqL" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hide"></label><p class="small mute" id="progL" role="status" style="margin-bottom:12px"></p>` : ""}
      <input id="novaV" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hide">
      <div class="laminasAdm">${lv.length ? lv.map((l, i) => { const cl = cv.filter(c => c.lamina_id === l.id); return `
        <div class="lamAdm"><div class="lamImg"><img src="${esc(urlFoto(l.caminho))}" alt="Lâmina ${i + 1}" loading="lazy">${cl.filter(c => c.x != null).map(c => `<span class="pino" style="left:${c.x * 100}%;top:${c.y * 100}%">${cv.indexOf(c) + 1}</span>`).join("")}
          ${v === D.versao && D.status !== "aprovado" ? `<button class="lamDel" data-del="${l.id}" aria-label="Excluir lâmina ${i + 1}">×</button>` : ""}</div>
          <div class="lamInfo"><strong>${i === 0 ? "Capa / lâmina 1" : "Lâmina " + (i + 1)}</strong>${cl.length ? `<ul>${cl.map(c => `<li><b>${cv.indexOf(c) + 1}</b>${esc(c.texto)}</li>`).join("")}</ul>` : `<span class="small mute">Sem comentários</span>`}</div></div>`; }).join("")
        : `<div class="vazio">Nenhuma lâmina nesta versão ainda.</div>`}</div>
    </div>`;
  $("cpD").onclick = async () => { try { await navigator.clipboard.writeText(msg); toast("Mensagem copiada"); } catch { prompt("Copie:", msg); } };
  document.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { versaoVer.v = +b.dataset.v; rota(); });
  $("exD").onclick = async () => {
    if (!confirm(`Excluir “${D.titulo}” com todas as versões? O link do cliente para de funcionar.`)) return;
    try { const cam = ls.map(l => l.caminho); for (let i = 0; i < cam.length; i += 100) await sb.storage.from("fotos").remove(cam.slice(i, i + 100));
      await q(sb.from("diagramacoes").delete().eq("id", D.id)); atualizarUso(); toast("Excluído"); ir("#/diagramacoes"); } catch (e) { erro(e); }
  };
  if ($("arqL")) {
    $("arqL").onchange = e => { enviarLaminas(e.target.files, D.versao, lv.length); e.target.value = ""; };
    const z = $("soltarL");
    ["dragenter", "dragover"].forEach(t => z.addEventListener(t, ev => { ev.preventDefault(); z.classList.add("ativo"); }));
    ["dragleave", "drop"].forEach(t => z.addEventListener(t, ev => { ev.preventDefault(); z.classList.remove("ativo"); }));
    z.addEventListener("drop", ev => enviarLaminas(ev.dataTransfer.files, D.versao, lv.length));
  }
  $("novaV").onchange = async e => {
    const files = e.target.files; if (!files.length) return;
    const nv = D.versao + 1;
    if (!await enviarLaminas(files, nv, 0, true)) return;
    try { await q(sb.from("diagramacoes").update({ versao: nv, status: "aguardando", respondido_em: null }).eq("id", D.id)); versaoVer.v = nv; toast(`Versão ${nv} enviada. Mande o link de novo pro cliente.`); rota(); } catch (err) { erro(err); }
  };
  C().querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    const l = lv.find(x => x.id === b.dataset.del); if (!confirm("Excluir esta lâmina?")) return;
    try { await sb.storage.from("fotos").remove([l.caminho]); await q(sb.from("laminas").delete().eq("id", l.id)); atualizarUso(); rota(); } catch (e) { erro(e); }
  });
};
async function otimizarLamina(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return { blob: await new Promise(r => c.toBlob(r, "image/jpeg", 0.86)), w: c.width, h: c.height };
}
async function enviarLaminas(files, versao, inicio, silencioso) {
  files = [...files].filter(f => /image\//.test(f.type)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!files.length) return false;
  const prog = $("progL"), did = D.id; let ok = 0;
  if (silencioso) toast(`Enviando ${files.length} lâminas…`);
  for (const [i, f] of files.entries()) {
    if (prog) prog.textContent = `Enviando lâmina ${i + 1} de ${files.length}…`;
    try {
      const { blob, w, h } = await otimizarLamina(f);
      const cam = `${user.id}/diag/${did}/v${versao}-${Date.now()}-${i}.jpg`;
      const up = await sb.storage.from("fotos").upload(cam, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      await q(sb.from("laminas").insert({ diagramacao_id: did, versao, ordem: inicio + i, caminho: cam, largura: w, altura: h }));
      ok++;
    } catch (e) { erro(e); }
  }
  atualizarUso();
  if (!silencioso) { toast(`${ok} lâminas enviadas`); rota(); }
  return ok > 0;
}

/* ============ DESIGN DA GALERIA ============ */
const PADRAO_D = { capa: "cheia", tema: "escuro", fonte: "moderna", grade: "grade", protecao: true };
const OPC_D = {
  capa: [["cheia", "Tela cheia", "Foto inteira, título embaixo"], ["centro", "Centralizada", "Título no meio da foto"], ["dividida", "Dividida", "Foto de um lado, título do outro"], ["moldura", "Moldura", "Foto com margem, ar de revista"], ["minimal", "Minimalista", "Só o título, direto nas fotos"]],
  tema: [["escuro", "Escuro", "Fundo preto, fotos em destaque"], ["claro", "Claro", "Fundo off-white, leve"]],
  fonte: [["moderna", "Moderna", "Montserrat"], ["classica", "Clássica", "Playfair Display"], ["elegante", "Elegante", "Cormorant"]],
  grade: [["grade", "Grade", "Quadros iguais"], ["mosaico", "Mosaico", "Cada foto no formato original"], ["ampla", "Ampla", "Fotos maiores, menos por linha"]]
};
const designDe = g => ({ ...PADRAO_D, ...(estudio.design_padrao || {}), ...(g?.design || {}) });
function previaDesign(d, capaUrl, imgs) {
  return `<div class="prevG t-${d.tema} f-${d.fonte} c-${d.capa} g-${d.grade}">
    <div class="pvHero" style="${capaUrl ? `--img:url('${esc(capaUrl)}')` : ""}"><div class="pvFoto"></div><div class="pvTxt"><small>${esc(estudio.nome || "Seu estúdio")}</small><b>${esc(G?.titulo || "Ensaio Sophia")}</b><span>32 fotos · escolha até 30/11</span><i>Ver fotos</i></div></div>
    <div class="pvGrade">${imgs.slice(0, 8).map((u, i) => `<span style="background-image:url('${esc(u)}')" class="${i % 3 === 1 ? "alta" : ""}">${i === 1 ? "<em>♥</em>" : ""}</span>`).join("")}</div></div>`;
}
let dEdit = null;
function abaDesign() {
  if (!pode("design")) { $("abaConteudo").innerHTML = cadeado("design"); return; }
  dEdit = designDe(G);
  const capa = fotos.find(f => f.id === G.capa_foto_id) || fotos[0];
  const capaUrl = capa ? urlFoto(capa.caminho) : "https://images.unsplash.com/photo-1578220375772-9a71d4d2ff82?w=1200&q=70&auto=format&fit=crop";
  const imgs = fotos.length ? fotos.map(f => urlFoto(f.caminho)) : ["1625832954356-6ddaffc45853", "1560915109-f54ff3d7664c", "1644901381402-69804395b4e0", "1600069265050-3555d89d187b", "1612821996907-d3710d7f1351", "1578220375772-9a71d4d2ff82"].map(i => `https://images.unsplash.com/photo-${i}?w=400&q=60&auto=format&fit=crop`);
  const grupo = (k, titulo) => `<div class="field"><span class="rotulo">${titulo}</span><div class="opD opD-${k}" role="radiogroup" aria-label="${titulo}">${OPC_D[k].map(([v, n, dsc]) => `<button type="button" role="radio" data-k="${k}" data-v="${v}" aria-checked="${dEdit[k] === v}"><span class="ico-${k}-${v}"></span><b>${n}</b><small>${dsc}</small></button>`).join("")}</div></div>`;
  $("abaConteudo").innerHTML = `
    <div class="designGrid">
      <div class="bloco">
        <h2>Visual da galeria</h2><p class="small mute" style="margin:4px 0 16px">Escolha como o cliente vê esta galeria. A prévia ao lado muda na hora.</p>
        ${grupo("capa", "Capa")}${grupo("tema", "Tema")}${grupo("fonte", "Fonte do título")}${grupo("grade", "Fotos")}
        <div class="field"><label class="switch"><input type="checkbox" id="dProt" ${dEdit.protecao !== false ? "checked" : ""}> Proteção contra print e download</label>
          <span class="small mute" style="display:block;margin-left:32px">Bloqueia o botão direito e arrastar a foto, e desfoca as fotos quando a pessoa tenta tirar print no computador. No celular, o print não pode ser bloqueado: aí a marca d'água é a proteção.</span></div>
        <div class="acoes"><button class="btn fill" id="dSalvar">Salvar nesta galeria</button><button class="btn ghost" id="dPadrao">Usar como padrão do estúdio</button></div>
        <p class="small mute" style="margin-top:10px">O padrão vale para todas as galerias que não tiverem um visual próprio.</p>
      </div>
      <div class="prevWrap"><div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="small mute">Prévia</span><a class="small" target="_blank" rel="noopener" href="${esc(linkCliente())}">Abrir como cliente ↗</a></div><div id="dPrev"></div></div>
    </div>`;
  const pintarPrev = () => { $("dPrev").innerHTML = previaDesign(dEdit, capaUrl, imgs); };
  $("abaConteudo").querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    dEdit[b.dataset.k] = b.dataset.v;
    $("abaConteudo").querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach(x => x.setAttribute("aria-checked", x === b));
    pintarPrev();
  });
  $("dProt").onchange = () => { dEdit.protecao = $("dProt").checked; };
  $("dSalvar").onclick = async () => { try { G.design = { ...dEdit }; await q(sb.from("galerias").update({ design: G.design }).eq("id", G.id)); toast("Visual salvo nesta galeria"); } catch (e) { erro(e); } };
  $("dPadrao").onclick = async () => {
    try { Object.assign(estudio, await q(sb.from("estudios").update({ design_padrao: { ...dEdit } }).eq("id", user.id).select().single()));
      G.design = {}; await q(sb.from("galerias").update({ design: {} }).eq("id", G.id));
      toast("Agora este é o visual padrão das suas galerias"); } catch (e) { erro(e); }
  };
  pintarPrev();
}
}
