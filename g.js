{
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hide", !on);
const slug = new URLSearchParams(location.search).get("g") || "";
const chaveCod = "seleta-cod-" + slug;
let cod = "", g = null, marc = new Set(), so = false, atual = -1, timer = null, enviando = false;

const lerCod = () => { try { return sessionStorage.getItem(chaveCod) || ""; } catch { return ""; } };
const gravarCod = v => { try { sessionStorage.setItem(chaveCod, v); } catch {} };

async function abrir(codigo) {
  const { data, error } = await sb.rpc("abrir_galeria", { p_slug: slug, p_codigo: codigo });
  if (error) { show("vCodigo", true); $("cErro").textContent = codigo ? "Código incorreto. Confira a mensagem do fotógrafo." : ""; return; }
  cod = codigo; gravarCod(codigo); g = data; marc = new Set(g.marcadas || []);
  show("vCodigo", false);
  document.title = g.titulo + " · " + (g.estudio?.nome || "Seleção de fotos");
  if (g.status !== "aberta") return fim(g.status === "enviada" ? "Sua seleção já foi enviada" : "Esta galeria foi encerrada", "Se quiser mudar alguma foto, fale direto com o fotógrafo.");
  $("gTitulo").textContent = g.titulo;
  $("gEstudio").textContent = [g.estudio?.nome, g.prazo && "escolha até " + new Date(g.prazo + "T12:00").toLocaleDateString("pt-BR")].filter(Boolean).join(" · ");
  show("vGal", true); pintar();
}
$("fCodigo").onsubmit = e => { e.preventDefault(); $("cErro").textContent = ""; abrir($("cod").value.trim()); };

function medidor() {
  const n = marc.size, inc = g.incluidas, ex = Math.max(0, n - inc);
  $("mTxt").textContent = ex ? `${n} fotos · ${ex} extra${ex > 1 ? "s" : ""} (${brl(ex * g.preco_extra)})` : `${n} de ${inc} fotos do pacote`;
  $("mBar").style.width = (inc ? Math.min(100, n / inc * 100) : (n ? 100 : 0)) + "%";
  $("mBar").classList.toggle("ex", ex > 0);
  $("enviar").disabled = n === 0;
}
function pintar() {
  const lista = g.fotos.map((f, i) => ({ f, i })).filter(o => !so || marc.has(o.f.id));
  $("grade").innerHTML = lista.length ? lista.map(({ f, i }) => `
    <div class="tile${marc.has(f.id) ? " on" : ""}" data-i="${i}">
      <img src="${esc(urlFoto(f.caminho))}" alt="Foto ${i + 1}" loading="lazy" data-ver="${i}">
      <button class="marca" data-marcar="${i}" aria-pressed="${marc.has(f.id)}" aria-label="Marcar foto ${i + 1}">✓</button>
      <span class="nome">${esc(semExtensao(f.nome))}</span>
    </div>`).join("") : `<div class="vazio" style="grid-column:1/-1">${so ? "Nenhuma foto marcada ainda." : "O fotógrafo ainda não subiu as fotos."}</div>`;
  medidor();
}
function alternar(i) {
  const id = g.fotos[i].id;
  marc.has(id) ? marc.delete(id) : marc.add(id);
  const t = document.querySelector(`.tile[data-i="${i}"]`);
  if (so) pintar();
  else if (t) { t.classList.toggle("on", marc.has(id)); t.querySelector(".marca").setAttribute("aria-pressed", marc.has(id)); medidor(); }
  if (atual === i) caixa(i);
  salvarDepois();
}
function salvarDepois() {
  $("salvo").textContent = "Salvando…";
  clearTimeout(timer); timer = setTimeout(salvar, 700);
}
async function salvar(enviar = false) {
  clearTimeout(timer);
  const { data, error } = await sb.rpc("salvar_selecao", { p_slug: slug, p_codigo: cod, p_fotos: [...marc], p_enviar: enviar });
  $("salvo").textContent = error ? "Não salvou, tente de novo" : "Salvo";
  return { data, error };
}
$("grade").onclick = e => {
  const m = e.target.closest("[data-marcar]"); if (m) return alternar(+m.dataset.marcar);
  const v = e.target.closest("[data-ver]"); if (v) caixa(+v.dataset.ver);
};
const filtro = v => { so = v; $("fTodas").setAttribute("aria-pressed", !v); $("fMarc").setAttribute("aria-pressed", v); pintar(); };
$("fTodas").onclick = () => filtro(false); $("fMarc").onclick = () => filtro(true);

/* foto ampliada */
function caixa(i) {
  atual = i; const f = g.fotos[i];
  $("cImg").src = urlFoto(f.caminho); $("cImg").alt = "Foto " + (i + 1);
  $("cNome").textContent = `${i + 1} de ${g.fotos.length} · ${semExtensao(f.nome)}`;
  $("cMarcar").textContent = marc.has(f.id) ? "✓ Marcada" : "Marcar";
  show("caixa", true);
}
const fechar = () => { atual = -1; show("caixa", false); };
$("cFechar").onclick = fechar;
$("cMarcar").onclick = () => alternar(atual);
$("cAnt").onclick = () => caixa((atual - 1 + g.fotos.length) % g.fotos.length);
$("cProx").onclick = () => caixa((atual + 1) % g.fotos.length);
document.addEventListener("keydown", e => { if (atual < 0) return; if (e.key === "Escape") fechar(); if (e.key === "ArrowLeft") $("cAnt").click(); if (e.key === "ArrowRight") $("cProx").click(); });
let x0 = null;
$("caixa").addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
$("caixa").addEventListener("touchend", e => { if (x0 == null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) (d > 0 ? $("cAnt") : $("cProx")).click(); x0 = null; });

/* envio */
$("enviar").onclick = () => {
  const n = marc.size, ex = Math.max(0, n - g.incluidas);
  $("mResumo").innerHTML = `<div class="linha"><span>Fotos marcadas</span><b>${n}</b></div><div class="linha"><span>Incluídas no pacote</span><b>${Math.min(n, g.incluidas)}</b></div><div class="linha"><span>Fotos extras</span><b>${ex}</b></div><div class="linha"><span>Valor das extras</span><b>${brl(ex * g.preco_extra)}</b></div>`;
  show("modal", true); $("mConfirmar").focus();
};
$("mVoltar").onclick = () => show("modal", false);
$("mConfirmar").onclick = async () => {
  if (enviando) return; enviando = true; $("mConfirmar").disabled = true;
  const { error } = await salvar(true);
  enviando = false; $("mConfirmar").disabled = false;
  if (error) { $("mResumo").insertAdjacentHTML("beforeend", `<p class="small" style="color:#ff9b9b;margin-top:10px">Não deu certo: ${esc(error.message)}</p>`); return; }
  show("modal", false); show("vGal", false);
  fim("Seleção enviada!", `Você escolheu ${marc.size} fotos. ${esc(g.estudio?.nome || "O fotógrafo")} já recebeu a sua lista.`);
};

function fim(titulo, texto) {
  const w = (g?.estudio?.whatsapp || "").replace(/\D/g, "");
  $("vFim").innerHTML = `<h1>${esc(titulo)}</h1><p class="mute" style="margin-top:14px">${texto}</p>${w ? `<p style="margin-top:24px"><a class="btn fill" href="https://wa.me/${w}" target="_blank" rel="noopener">Falar com o fotógrafo</a></p>` : ""}`;
  show("vFim", true);
}

if (!slug) fim("Link incompleto", "Abra o link exatamente como o fotógrafo enviou.");
else { const c = lerCod(); c ? abrir(c) : show("vCodigo", true); }
}
