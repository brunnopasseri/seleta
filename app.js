{
/* ============ utilidades ============ */
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hide", !on);
const C = () => $("conteudo");
const hoje = () => new Date().toISOString().slice(0, 10);
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
const TITULOS = { inicio: "Painel", galerias: "Álbuns", galeria: "Álbum", clientes: "Clientes", cliente: "Cliente", trabalhos: "Trabalhos", agenda: "Agenda", financeiro: "Financeiro", tarefas: "Tarefas", config: "Configurações", plano: "Plano e cobrança" };
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
function pintarConta() {
  const n = (estudio?.nome || user?.email || "").replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/);
  $("avatar").textContent = ((n[0]?.[0] || "") + (n[1]?.[0] || "")).toUpperCase() || "S";
  $("contaNome").textContent = estudio?.nome || ""; $("contaEmail").textContent = user?.email || "";
}
async function notificacoes() {
  try {
    const [sel, atr, tar] = await Promise.all([
      q(sb.from("galerias").select("slug,titulo,cliente_nome,enviada_em").eq("status", "enviada").order("enviada_em", { ascending: false }).limit(8)),
      q(sb.from("pagamentos").select("descricao,valor,vencimento").is("pago_em", null).lt("vencimento", hoje()).order("vencimento").limit(8)),
      q(sb.from("tarefas").select("id,titulo,vencimento").eq("feita", false).lte("vencimento", hoje()).order("vencimento").limit(8))
    ]);
    const total = sel.length + atr.length + tar.length;
    $("badge").textContent = total > 9 ? "9+" : total; show("badge", total > 0);
    $("contTarefas").textContent = tar.length || "";
    $("notifs").innerHTML = total ? `
      ${sel.length ? `<h3>Seleções recebidas</h3>${sel.map(g => `<a class="item" href="#/galeria/${esc(g.slug)}"><div class="txt"><strong>${esc(g.titulo)}</strong><span>${esc(g.cliente_nome || "")}${g.enviada_em ? " · " + new Date(g.enviada_em).toLocaleDateString("pt-BR") : ""}</span></div></a>`).join("")}` : ""}
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
  pintarConta();
  if (!estudio.slug) {
    const base = slugify(estudio.nome || user.email.split("@")[0]);
    for (let i = 0; i < 30; i++) {
      const tent = i ? `${base}-${i + 1}` : base;
      const { data: livre } = await sb.rpc("slug_livre", { p_slug: tent });
      if (livre) { const r = await sb.from("estudios").update({ slug: tent }).eq("id", user.id).select().single(); if (!r.error) { estudio = r.data; break; } }
    }
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
  const r = ROTAS[nome] ? nome : "inicio";
  const ativo = r === "galeria" ? "galerias" : r === "cliente" ? "clientes" : r;
  document.querySelectorAll("#menu a, .ladoPe a[data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === ativo));
  $("tituloPag").textContent = TITULOS[r] || "";
  document.title = (TITULOS[r] || "Painel") + " · Seleta";
  $("vPainel").classList.remove("aberto");
  notificacoes();
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
    q(sb.from("galerias").select("id,slug,titulo,cliente_nome,status,enviada_em").neq("status", "encerrada").order("criado_em", { ascending: false })),
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
      <div class="acoes"><button class="btn" id="aTrab">Novo trabalho</button><button class="btn" id="aCli">Novo cliente</button><button class="btn fill" id="aGal">Novo álbum</button></div></div>
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
      <div class="bloco"><h2>Álbuns <a href="#/galerias">Ver todos</a></h2>
        ${[...recebidas, ...aguardando].slice(0, 6).map(g => `<a class="item" href="#/galeria/${esc(g.slug)}"><div class="txt"><strong>${esc(g.titulo)}</strong><span>${esc(g.cliente_nome || "Sem cliente")}</span></div><span class="tag ${g.status}">${STATUS_G[g.status]}</span></a>`).join("") || `<p class="vazioP">Nenhum álbum aberto.</p>`}
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
  const gs = await q(sb.from("galerias").select("id,slug,titulo,cliente_nome,status,criado_em,capa:fotos!galerias_capa_foto_id_fkey(caminho),qtd:fotos!fotos_galeria_id_fkey(count)").order("criado_em", { ascending: false }));
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
    <div class="cabeca"><div><h1>Álbuns</h1><p class="mute">Suba as prévias, mande o link e receba a escolha do cliente.</p></div><button class="btn fill" id="aGal">Nova galeria</button></div>
    <div class="filtros">${[["todas", "Todas"], ["aberta", "Aguardando cliente"], ["enviada", "Seleção recebida"], ["encerrada", "Encerradas"]].map(([k, t]) => `<button class="chip" data-f="${k}">${t} (${gs.filter(f[k]).length})</button>`).join("")}</div>
    <div class="galerias" id="gLista"></div>`;
  document.querySelectorAll(".chip[data-f]").forEach(c => c.onclick = () => { filtroGal = c.dataset.f; pintar(); });
  $("aGal").onclick = novaGaleria;
  pintar();
};

async function novaGaleria(pre = {}) {
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
      { id: "mensagem", rotulo: "Recado para o cliente (aparece na galeria)", tipo: "area", largo: true, ph: "Escolha suas favoritas com calma 🤍" }
    ],
    aoSalvar: async v => {
      const cli = cs.find(c => c.id === v.cliente_id);
      const g = await q(sb.from("galerias").insert({ slug: await slugAlbumLivre(v.titulo), titulo: v.titulo, cliente_id: v.cliente_id || null, cliente_nome: cli?.nome || null, trabalho_id: v.trabalho_id || null,
        prazo: v.prazo || null, fotos_incluidas: Math.round(v.fotos_incluidas), preco_extra: v.preco_extra, mensagem: v.mensagem || null }).select("slug").single());
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
  if (G.status === "enviada" && abaG === "fotos" && pintarGaleria.ultima !== G.id) abaG = "selecao";
  pintarGaleria.ultima = G.id;
  pintarGaleria();
};
const linkCliente = () => raizSite() + (estudio.slug ? estudio.slug + "/" : "g.html?g=") + G.slug;
const msgCliente = () => `Oi${G.cliente_nome ? ", " + G.cliente_nome.split(" ")[0] : ""}! Suas fotos estão prontas 📸\n\n${linkCliente()}\nCódigo: ${G.codigo_acesso}`;
function pintarGaleria() {
  const capa = fotos.find(f => f.id === G.capa_foto_id) || fotos[0];
  const abas = [["fotos", `Fotos (${fotos.length})`], ["selecao", `Seleção (${marcadas.size})`], ["entrega", "Entrega"], ["ajustes", "Ajustes"]];
  C().innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:10px"><a class="volta" href="#/galerias" style="margin:0">← Álbuns</a><button class="btn sm ghost" id="excluirAlbum">Excluir álbum</button></div>
    <div class="banner" style="${capa ? `background-image:url('${esc(urlFoto(capa.caminho))}')` : ""}">
      <div class="sobre"><div><h1>${esc(G.titulo)}</h1><p style="margin-top:6px;opacity:.85">${[G.cliente_nome, `${G.fotos_incluidas} no pacote`, `extra ${brl(G.preco_extra)}`, G.prazo && "prazo " + dataBR(G.prazo)].filter(Boolean).map(esc).join(" · ")}</p></div><span class="tag">${STATUS_G[G.status]}</span></div>
    </div>
    <div class="bloco compart">
      <div><span class="small mute">Link do cliente</span><br><code>${esc(linkCliente())}</code><div style="margin-top:8px"><span class="small mute">Código</span> <span class="codigo">${esc(G.codigo_acesso)}</span></div></div>
      <div class="acoes"><button class="btn ghost" id="copMsg">Copiar mensagem</button><a class="btn fill" target="_blank" rel="noopener" href="https://wa.me/${fone(G.clientes?.whatsapp)}?text=${encodeURIComponent(msgCliente())}">Enviar no WhatsApp</a><a class="btn ghost" target="_blank" rel="noopener" href="${esc(linkCliente())}">Ver como cliente</a></div>
    </div>
    <div class="abasG" role="tablist">${abas.map(([k, t]) => `<button role="tab" data-a="${k}" aria-selected="${abaG === k}">${t}</button>`).join("")}</div>
    <div id="abaConteudo"></div>`;
  $("copMsg").onclick = async () => { try { await navigator.clipboard.writeText(msgCliente()); toast("Mensagem copiada"); } catch { prompt("Copie a mensagem:", msgCliente()); } };
  document.querySelectorAll(".abasG button").forEach(b => b.onclick = () => { abaG = b.dataset.a; pintarGaleria(); });
  $("excluirAlbum").onclick = excluirAlbum;
  ({ fotos: abaFotos, selecao: abaSelecao, entrega: abaEntrega, ajustes: abaAjustes })[abaG]();
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
        <div class="acts"><button data-capa="${f.id}" title="Usar como capa" aria-label="Usar ${esc(f.nome_arquivo)} como capa">★</button><button data-del="${f.id}" title="Excluir" aria-label="Excluir ${esc(f.nome_arquivo)}">×</button></div>
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
  const n = marcadas.size, ex = Math.max(0, n - G.fotos_incluidas);
  const sel = fotos.filter(f => marcadas.has(f.id));
  const nomes = sel.map(f => semExtensao(f.nome_arquivo));
  const comLista = fotos.filter(f => coments[f.id]);
  $("abaConteudo").innerHTML = `
    <div class="bloco">
      <h2>${G.status === "enviada" ? "Seleção recebida" + (G.enviada_em ? " em " + new Date(G.enviada_em).toLocaleDateString("pt-BR") : "") : n ? "Seleção em andamento (o cliente ainda não enviou)" : "Nenhuma foto marcada ainda"}</h2>
      <div class="resumo"><span>Marcadas<b>${n}</b></span><span>Incluídas<b>${Math.min(n, G.fotos_incluidas)}</b></span><span>Extras<b>${ex}</b></span><span>Valor das extras<b>${brl(ex * G.preco_extra)}</b></span></div>
      <label for="lr">Lista para o Lightroom: na Biblioteca, filtro de Texto → Nome do arquivo → Contém</label>
      <textarea id="lr" readonly>${esc(nomes.join(", "))}</textarea>
      <div class="acoes" style="margin-top:12px">
        <button class="btn fill sm" id="copLr" ${n ? "" : "disabled"}>Copiar lista</button>
        ${ex > 0 ? `<button class="btn ghost sm" id="lancar">Lançar ${brl(ex * G.preco_extra)} de extras no financeiro</button>` : ""}
        ${G.status === "enviada" ? `<button class="btn ghost sm" id="reabrir">Reabrir para o cliente</button>` : ""}
      </div>
      ${comLista.length ? `<div class="coms"><h2>Comentários do cliente (${comLista.length})</h2><ul>${comLista.map(f => `<li><strong>${esc(semExtensao(f.nome_arquivo))}:</strong> ${esc(coments[f.id])}</li>`).join("")}</ul></div>` : ""}
    </div>
    ${sel.length ? `<div class="fotos" style="margin-top:18px">${sel.map(f => `<div class="tile on"><img src="${esc(urlFoto(f.caminho))}" alt="" loading="lazy"><span class="marca"></span>${coments[f.id] ? `<span class="com"><svg><use href="#i-coment"/></svg></span>` : ""}<span class="nome">${esc(f.nome_arquivo)}</span></div>`).join("")}</div>` : ""}`;
  if ($("copLr")) $("copLr").onclick = async () => { try { await navigator.clipboard.writeText($("lr").value); toast("Lista copiada"); } catch { $("lr").select(); } };
  if ($("reabrir")) $("reabrir").onclick = async () => { try { await q(sb.from("galerias").update({ status: "aberta", enviada_em: null }).eq("id", G.id)); G.status = "aberta"; toast("Galeria reaberta para o cliente"); pintarGaleria(); } catch (e) { erro(e); } };
  if ($("lancar")) $("lancar").onclick = async () => {
    try { await q(sb.from("pagamentos").insert({ trabalho_id: G.trabalho_id, descricao: `${ex} fotos extras · ${G.titulo}`, valor: ex * G.preco_extra, vencimento: hoje() })); toast("Lançado no financeiro"); }
    catch (e) { erro(e); }
  };
}

function abaEntrega() {
  $("abaConteudo").innerHTML = `
    <form class="bloco" id="fEntrega" style="max-width:720px">
      <h2>Entrega das fotos finais</h2>
      <p class="mute small" style="margin-bottom:16px">Depois de editar, cole aqui o link da pasta com as fotos em alta (Google Drive, Dropbox, WeTransfer…). Quando você liberar, aparece um botão “Baixar minhas fotos” na galeria do cliente.</p>
      <div class="field"><label for="eLink">Link das fotos finais</label><input id="eLink" type="url" placeholder="https://drive.google.com/…" value="${esc(G.link_entrega || "")}"></div>
      <div class="field"><label class="switch"><input type="checkbox" id="eLib" ${G.entrega_liberada ? "checked" : ""}> Liberar o download para o cliente</label></div>
      <div class="field"><label class="switch"><input type="checkbox" id="eEnc" ${G.status === "encerrada" ? "checked" : ""}> Marcar trabalho como encerrado</label></div>
      <button class="btn fill">Salvar entrega</button>
    </form>`;
  $("fEntrega").onsubmit = async e => {
    e.preventDefault();
    const link = $("eLink").value.trim(), lib = $("eLib").checked;
    if (lib && !link) return toast("Cole o link antes de liberar");
    const upd = { link_entrega: link || null, entrega_liberada: lib };
    if ($("eEnc").checked) upd.status = "encerrada"; else if (G.status === "encerrada") upd.status = "enviada";
    try {
      Object.assign(G, await q(sb.from("galerias").update(upd).eq("id", G.id).select().single()));
      if (lib && G.trabalho_id) await sb.from("trabalhos").update({ status: "entregue" }).eq("id", G.trabalho_id);
      toast(lib ? "Entrega liberada para o cliente" : "Entrega salva"); pintarGaleria();
    } catch (err) { erro(err); }
  };
}

async function abaAjustes() {
  const [cs, ts] = await Promise.all([listaClientes(), listaTrabalhos()]);
  const sel = (id, ops, v) => `<select id="${id}">${ops.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v ?? "") ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
  $("abaConteudo").innerHTML = `
    <form class="bloco" id="fAj" style="max-width:820px">
      <div class="grid2">
        <div class="field"><label for="aT">Nome do álbum</label><input id="aT" required value="${esc(G.titulo)}"></div>
        <div class="field"><label for="aSlug">Endereço do álbum</label><input id="aSlug" value="${esc(G.slug)}" pattern="[a-z0-9-]+" title="Só letras minúsculas, números e hífen"></div>
        <div class="field"><label for="aC">Cliente</label>${sel("aC", opcClientes(cs), G.cliente_id)}</div>
        <div class="field"><label for="aTr">Trabalho da agenda</label>${sel("aTr", opcTrabalhos(ts), G.trabalho_id)}</div>
        <div class="field"><label for="aP">Prazo para escolher</label><input id="aP" type="date" value="${esc(G.prazo || "")}"></div>
        <div class="field"><label for="aI">Fotos incluídas</label><input id="aI" type="number" min="0" value="${G.fotos_incluidas}"></div>
        <div class="field"><label for="aE">Valor da foto extra (R$)</label><input id="aE" type="number" min="0" step="0.01" value="${G.preco_extra}"></div>
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
        prazo: $("aP").value || null, fotos_incluidas: +$("aI").value || 0, preco_extra: +$("aE").value || 0, mensagem: $("aM").value.trim() || null }).eq("id", G.id).select().single()));
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
  if (!confirm(`Excluir o álbum “${G.titulo}” e as ${fotos.length} fotos?\n\nO link do cliente para de funcionar. Isso não pode ser desfeito.`)) return;
  try {
    const cam = fotos.map(f => f.caminho);
    for (let i = 0; i < cam.length; i += 100) await sb.storage.from("fotos").remove(cam.slice(i, i + 100));
    await q(sb.from("galerias").delete().eq("id", G.id));
    atualizarUso(); toast("Álbum excluído"); ir("#/galerias");
  } catch (e) { erro(e); }
}

/* --- envio com prévia e marca d'água --- */
let logoBranco = null;
async function prepararMarca() {
  if (!estudio.marca_dagua) return null;
  if (estudio.logo_url) {
    if (logoBranco?.src === estudio.logo_url) return logoBranco;
    try {
      const img = await new Promise((ok, falha) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = falha; i.src = estudio.logo_url; });
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext("2d"); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      logoBranco = { src: estudio.logo_url, canvas: c }; return logoBranco;
    } catch { /* cai para o texto */ }
  }
  await document.fonts.load("500 40px Montserrat").catch(() => {});
  return { texto: (estudio.nome || "").toUpperCase() };
}
/* Marca discreta: pequena, fina e espaçada. posicao: rodape | canto | centro */
function desenharMarca(x, marca, W, H, posicao = "rodape") {
  const lado = Math.min(W, H), m = lado * 0.05;
  const lugar = (w, h) => posicao === "centro" ? [(W - w) / 2, (H - h) / 2] : posicao === "canto" ? [W - w - m, H - h - m] : [(W - w) / 2, H - h - m * 1.2];
  if (marca.canvas) {
    const w = W * (posicao === "centro" ? 0.22 : posicao === "canto" ? 0.1 : 0.13), h = w * marca.canvas.height / marca.canvas.width;
    const [px, py] = lugar(w, h); x.drawImage(marca.canvas, px, py, w, h);
  } else if (marca.texto) {
    let tam = Math.max(9, Math.round(lado * (posicao === "centro" ? 0.032 : 0.022)));
    const medir = () => { x.font = `400 ${tam}px Montserrat, sans-serif`; try { x.letterSpacing = Math.round(tam * 0.4) + "px"; } catch {} return x.measureText(marca.texto).width; };
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
  const marca = await prepararMarca();
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
      <div class="acoes"><div class="mes"><a class="btn ghost sm" href="#/agenda/${ymd(ant).slice(0, 7)}" aria-label="Mês anterior">←</a><strong>${esc(mesAno(base))}</strong><a class="btn ghost sm" href="#/agenda/${ymd(prox).slice(0, 7)}" aria-label="Próximo mês">→</a></div><button class="btn fill" id="nt">Novo trabalho</button></div></div>
    <div class="cal">${["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map(d => `<div class="dow">${d}</div>`).join("")}
      ${dias.map(d => { const k = ymd(d); return `<div class="dia${d.getMonth() !== base.getMonth() ? " fora" : ""}${k === hoje() ? " hoje" : ""}"><span class="n">${d.getDate()}</span>${(porDia[k] || []).map(t => `<button class="ev ${t.status}" data-t="${t.id}" title="${esc(t.titulo)}">${t.hora ? esc(t.hora.slice(0, 5)) + " " : ""}${esc(t.titulo)}</button>`).join("")}</div>`; }).join("")}
    </div>
    <div class="bloco" style="margin-top:18px"><h2>Trabalhos de ${esc(base.toLocaleDateString("pt-BR", { month: "long" }))}</h2>
      ${doMes.length ? doMes.map(t => `<button class="item" data-t="${t.id}"><div class="data"><b>${dia(t.data).getDate()}</b><span>${dia(t.data).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span></div><div class="txt"><strong>${esc(t.titulo)}</strong><span>${[t.clientes?.nome, t.hora?.slice(0, 5), t.local, t.tipo].filter(Boolean).map(esc).join(" · ")}</span></div><span class="val">${brl(t.valor)}</span><span class="st">${STATUS_T[t.status]}</span></button>`).join("") : `<p class="vazioP">Nenhum trabalho neste mês.</p>`}
    </div>`;
  $("nt").onclick = () => editarTrabalho({});
  C().querySelectorAll("[data-t]").forEach(b => b.onclick = () => editarTrabalho(ts.find(t => t.id === b.dataset.t)));
};

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
ROTAS.config = async () => {
  C().innerHTML = `
    <div class="cabeca"><div><h1>Configurações</h1><p class="mute">Como seu estúdio aparece para os clientes.</p></div></div>
    <div class="duas" style="margin-top:0">
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
      <form class="bloco" id="fMarca"><h2>Marca d'água nas prévias</h2>
        <div class="field"><label class="switch"><input type="checkbox" id="mOn" ${estudio.marca_dagua ? "checked" : ""}> Aplicar marca d'água nas fotos que eu subir</label></div>
        <div class="field"><label for="mPos">Posição</label><select id="mPos">${[["rodape", "Discreta, no rodapé"], ["canto", "Pequena, no canto"], ["centro", "No centro"]].map(([v, t]) => `<option value="${v}" ${(estudio.marca_posicao || "rodape") === v ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label for="mOp">Intensidade: <span id="mOpTxt">${Math.round((+estudio.marca_opacidade || .35) * 100)}%</span></label><input id="mOp" type="range" min="0.1" max="0.8" step="0.05" value="${+estudio.marca_opacidade || .35}" style="padding:0"></div>
        <canvas class="previa" id="mPrev" width="600" height="400" aria-label="Prévia da marca d'água"></canvas>
        <p class="small mute" style="margin:10px 0 14px">Vale para as próximas fotos enviadas. As que já estão na galeria não mudam.</p>
        <button class="btn fill">Salvar</button>
      </form>
      <div class="bloco"><h2>Conta</h2><p>${esc(user.email)}</p><p class="small mute" style="margin:6px 0 16px">Plano de teste · 1 GB de armazenamento</p><button class="btn ghost" id="sair2">Sair</button></div>
    </div>`;
  const desenhar = async () => {
    const c = $("mPrev"), x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 600, 400); g.addColorStop(0, "#8a7a66"); g.addColorStop(1, "#2b2722"); x.fillStyle = g; x.fillRect(0, 0, 600, 400);
    x.fillStyle = "#e8d6b8"; x.beginPath(); x.arc(150, 120, 46, 0, 7); x.fill();
    if (!$("mOn").checked) return;
    const salvo = estudio.marca_opacidade; estudio.marca_opacidade = +$("mOp").value;
    const m = await prepararMarca().catch(() => null) || { texto: (estudio.nome || "").toUpperCase() };
    x.globalAlpha = estudio.marca_opacidade;
    desenharMarca(x, m, 600, 400, $("mPos").value);
    x.globalAlpha = 1; estudio.marca_opacidade = salvo;
  };
  const marcaOn = estudio.marca_dagua; estudio.marca_dagua = true; await desenhar(); estudio.marca_dagua = marcaOn;
  $("mOp").oninput = () => { $("mOpTxt").textContent = Math.round($("mOp").value * 100) + "%"; const o = estudio.marca_dagua; estudio.marca_dagua = true; desenhar().then(() => estudio.marca_dagua = o); };
  $("mPos").onchange = () => { const o = estudio.marca_dagua; estudio.marca_dagua = true; desenharMarca && desenhar().then(() => estudio.marca_dagua = o); };
  $("mOn").onchange = () => { const o = estudio.marca_dagua; estudio.marca_dagua = true; desenhar().then(() => estudio.marca_dagua = o); };
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
    try { Object.assign(estudio, await q(sb.from("estudios").update({ marca_dagua: $("mOn").checked, marca_opacidade: +$("mOp").value, marca_posicao: $("mPos").value }).eq("id", user.id).select().single())); toast("Marca d'água salva"); }
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
  { id: "essencial", nome: "Essencial", m: 24.9, desc: "Para quem está começando a entregar com profissionalismo.", itens: ["20 GB de armazenamento", "15 álbuns ativos", "Seleção com limite do pacote e fotos extras", "Lista pronta pro Lightroom", "Marca d'água com o nome do estúdio"] },
  { id: "profissional", nome: "Profissional", m: 44.9, rec: true, desc: "Para o estúdio que quer crescer: sua marca nas prévias, clientes, agenda e financeiro.", itens: ["80 GB de armazenamento", "Álbuns ilimitados", "Clientes, trabalhos, agenda, tarefas e financeiro", "Marca d'água com o seu logo", "Entrega das fotos finais"] },
  { id: "estudio", nome: "Estúdio", m: 84.9, desc: "Para estúdios com alto volume e equipe.", itens: ["250 GB de armazenamento", "Tudo do Profissional", "Domínio próprio", "Sem a marca Seleta na galeria", "Até 3 usuários"] }
];
const diasTeste = () => estudio?.teste_ate ? Math.ceil((dia(estudio.teste_ate) - dia(hoje())) / 864e5) : 14;
function avisoPlano() {
  if (!estudio || (estudio.plano && estudio.plano !== "teste")) return "";
  const d = diasTeste();
  return `<div class="aviso"><span>${d > 0 ? `Você está no teste grátis: <strong style="font-weight:500">${d} ${d === 1 ? "dia restante" : "dias restantes"}</strong>.` : `<strong style="font-weight:500">Seu teste grátis terminou.</strong> Tudo foi mantido. Escolha um plano para continuar.`}</span><a class="btn sm fill" href="#/plano">Ver planos</a></div>`;
}
let cicloPlano = "mensal", planoSel = "profissional";
ROTAS.plano = async () => {
  const atual = estudio.plano && estudio.plano !== "teste" ? PLANOS.find(p => p.id === estudio.plano) : null;
  const d = diasTeste();
  const preco = p => cicloPlano === "anual" ? p.m * 10 / 12 : p.m;
  const pintar = () => {
    const p = PLANOS.find(x => x.id === planoSel);
    C().innerHTML = `<div class="planosApp">
      <h1>${atual ? "Seu plano" : d > 0 ? "Escolha seu plano" : "Seu teste terminou"}</h1>
      <p class="mute" style="margin:10px 0 26px;font-size:16px">${atual ? `Você está no plano <strong style="font-weight:500">${esc(atual.nome)}</strong>.` : d > 0 ? `Seu teste grátis vai até ${esc(dataBR(estudio.teste_ate))} (${d} ${d === 1 ? "dia" : "dias"}). Assine quando quiser: nada do que você já fez se perde.` : `Seu teste terminou em ${esc(dataBR(estudio.teste_ate))}. Tudo foi mantido; escolha um plano para continuar.`}</p>
      <div class="ciclo" role="group" aria-label="Cobrança"><button data-c="mensal" aria-pressed="${cicloPlano === "mensal"}">Mensal</button><button data-c="anual" aria-pressed="${cicloPlano === "anual"}">Anual</button></div>
      <p class="mute small" style="margin-bottom:16px">Todos os planos incluem álbuns com seleção do cliente, comentários por foto, marca d'água e lista pro Lightroom.</p>
      ${PLANOS.map(x => `<label class="opPlano${x.id === planoSel ? " sel" : ""}"><div class="lin"><input type="radio" name="plano" value="${x.id}" ${x.id === planoSel ? "checked" : ""}><div style="flex:1;min-width:0"><span class="nome">${x.nome}</span>${x.rec ? '<span class="rec">Recomendado</span>' : ""}<p>${x.desc}</p><details><summary>Ver detalhes</summary><ul>${x.itens.map(i => `<li>${i}</li>`).join("")}</ul></details></div><span class="pr">${brl(preco(x))}/mês${cicloPlano === "anual" ? `<br><span class="small">${brl(x.m * 10)} por ano</span>` : ""}</span></div></label>`).join("")}
      <p class="miudo">No plano anual você paga 10 meses e usa 12 (economia de cerca de 17%).</p>
      <button class="btn fill assinar" id="assinar">Assinar ${p.nome} · ${brl(preco(p))}/mês</button>
      <p class="miudo">Pagamento seguro · Cancele quando quiser · Recibo por e-mail</p>
      <div id="msgPlano"></div>
    </div>`;
    C().querySelectorAll("[data-c]").forEach(b => b.onclick = () => { cicloPlano = b.dataset.c; pintar(); });
    C().querySelectorAll("input[name=plano]").forEach(r => r.onchange = () => { planoSel = r.value; pintar(); });
    $("assinar").onclick = () => {
      const link = SELETA.pagamento?.[planoSel]?.[cicloPlano];
      if (link) { window.open(link, "_blank", "noopener"); return; }
      $("msgPlano").innerHTML = `<div class="msg" style="margin-top:16px">O pagamento online está sendo ativado. Enquanto isso, fale com a gente para assinar: <a href="mailto:brunopasseri@gmail.com?subject=${encodeURIComponent("Quero assinar o plano " + p.nome + " (" + cicloPlano + ")")}">enviar e-mail</a>.</div>`;
    };
  };
  pintar();
};
}
