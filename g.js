{
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hide", !on);
const slug = new URLSearchParams(location.search).get("g") || "";
const chaveCod = "seleta-cod-" + slug;
let cod = "", g = null, marc = new Set(), coms = {}, so = false, atual = -1, timer = null, enviando = false;

const lerCod = () => { try { return sessionStorage.getItem(chaveCod) || ""; } catch { return ""; } };
const gravarCod = v => { try { sessionStorage.setItem(chaveCod, v); } catch {} };
const fone = w => { const d = String(w || "").replace(/\D/g, ""); return d ? (d.length <= 11 ? "55" + d : d) : ""; };
const marcaEstudio = e => e?.logo ? `<img src="${esc(e.logo)}" alt="${esc(e.nome || "")}">` : `<span>${esc(e?.nome || "")}</span>`;

async function abrir(codigo) {
  const { data, error } = await sb.rpc("abrir_galeria", { p_slug: slug, p_codigo: codigo });
  if (error) { show("vCodigo", true); $("cErro").textContent = codigo ? "Código incorreto. Confira a mensagem do fotógrafo." : ""; return; }
  cod = codigo; gravarCod(codigo); g = data; marc = new Set(g.marcadas || []); coms = g.comentarios || {};
  show("vCodigo", false);
  document.title = g.titulo + (g.estudio?.nome ? " · " + g.estudio.nome : "");
  const capa = g.capa || g.fotos[0]?.caminho;
  if (capa) $("hero").style.backgroundImage = `url('${urlFoto(capa)}')`;
  $("hTopo").innerHTML = marcaEstudio(g.estudio);
  $("hTitulo").textContent = g.titulo;
  const aberta = g.status === "aberta";
  $("hSub").textContent = aberta
    ? [`${g.fotos.length} fotos`, g.prazo && "escolha até " + new Date(g.prazo + "T12:00").toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")
    : g.entrega ? "Suas fotos finais estão prontas" : "Sua seleção já foi enviada";
  $("recado").textContent = g.mensagem || "";
  show("recado", !!g.mensagem);
  if (g.entrega) {
    $("blocoEntrega").innerHTML = `<div class="entrega"><h2>Suas fotos finais estão prontas</h2><p class="mute" style="margin:10px 0 20px">Baixe e guarde num lugar seguro.</p><a class="btn fill" href="${esc(g.entrega)}" target="_blank" rel="noopener">Baixar minhas fotos</a></div>`;
    $("hBtn").textContent = "Baixar minhas fotos"; $("hBtn").href = g.entrega; $("hBtn").target = "_blank"; $("hBtn").rel = "noopener";
  } else if (!aberta) { $("hBtn").classList.add("hide"); }
  show("selecao", aberta);
  const w = fone(g.estudio?.whatsapp), ig = String(g.estudio?.instagram || "").replace(/^@/, "");
  $("contato").innerHTML = (w ? `<a class="btn ghost" href="https://wa.me/${w}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : "") + (ig ? `<a class="btn ghost" href="https://instagram.com/${encodeURIComponent(ig)}" target="_blank" rel="noopener">@${esc(ig)}</a>` : "");
  show("vGal", true);
  if (aberta) pintar();
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
      ${coms[f.id] ? `<span class="com" title="${esc(coms[f.id])}">✎</span>` : ""}
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
  if (atual === i) $("cMarcar").textContent = marc.has(id) ? "✓ Marcada" : "Marcar";
  $("salvo").textContent = "Salvando…";
  clearTimeout(timer); timer = setTimeout(salvar, 700);
}
async function salvar(enviar = false) {
  clearTimeout(timer);
  const r = await sb.rpc("salvar_selecao", { p_slug: slug, p_codigo: cod, p_fotos: [...marc], p_enviar: enviar });
  $("salvo").textContent = r.error ? "Não salvou, tente de novo" : "Salvo";
  return r;
}
$("grade").onclick = e => {
  const m = e.target.closest("[data-marcar]"); if (m) return alternar(+m.dataset.marcar);
  const v = e.target.closest("[data-ver]"); if (v) caixa(+v.dataset.ver);
};
const filtro = v => { so = v; $("fTodas").setAttribute("aria-pressed", !v); $("fMarc").setAttribute("aria-pressed", v); pintar(); };
$("fTodas").onclick = () => filtro(false); $("fMarc").onclick = () => filtro(true);

/* foto ampliada + comentário */
function caixa(i) {
  atual = i; const f = g.fotos[i];
  $("cImg").src = urlFoto(f.caminho); $("cImg").alt = "Foto " + (i + 1);
  $("cNome").textContent = `${i + 1} de ${g.fotos.length} · ${semExtensao(f.nome)}`;
  $("cMarcar").textContent = marc.has(f.id) ? "✓ Marcada" : "Marcar";
  $("cTexto").value = coms[f.id] || ""; $("cSalvarCom").textContent = "Salvar";
  show("caixa", true);
}
const fechar = () => { atual = -1; show("caixa", false); pintar(); };
$("cFechar").onclick = fechar;
$("cMarcar").onclick = () => alternar(atual);
$("cAnt").onclick = () => caixa((atual - 1 + g.fotos.length) % g.fotos.length);
$("cProx").onclick = () => caixa((atual + 1) % g.fotos.length);
$("cSalvarCom").onclick = async () => {
  const f = g.fotos[atual], txt = $("cTexto").value.trim();
  const { error } = await sb.rpc("comentar_foto", { p_slug: slug, p_codigo: cod, p_foto: f.id, p_texto: txt });
  if (error) { $("cSalvarCom").textContent = "Erro"; return; }
  if (txt) coms[f.id] = txt; else delete coms[f.id];
  $("cSalvarCom").textContent = "Salvo ✓";
};
document.addEventListener("keydown", e => {
  if (atual < 0 || e.target.tagName === "TEXTAREA") return;
  if (e.key === "Escape") fechar(); if (e.key === "ArrowLeft") $("cAnt").click(); if (e.key === "ArrowRight") $("cProx").click();
});
let x0 = null;
$("caixa").addEventListener("touchstart", e => { if (e.target.tagName !== "TEXTAREA") x0 = e.touches[0].clientX; }, { passive: true });
$("caixa").addEventListener("touchend", e => { if (x0 == null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) (d > 0 ? $("cAnt") : $("cProx")).click(); x0 = null; });

/* envio */
$("enviar").onclick = () => {
  const n = marc.size, ex = Math.max(0, n - g.incluidas), nc = Object.keys(coms).length;
  $("mResumo").innerHTML = `<div class="linha"><span>Fotos marcadas</span><b>${n}</b></div><div class="linha"><span>Incluídas no pacote</span><b>${Math.min(n, g.incluidas)}</b></div><div class="linha"><span>Fotos extras</span><b>${ex}</b></div><div class="linha"><span>Valor das extras</span><b>${brl(ex * g.preco_extra)}</b></div>${nc ? `<div class="linha"><span>Comentários</span><b>${nc}</b></div>` : ""}`;
  show("modal", true); $("mConfirmar").focus();
};
$("mVoltar").onclick = () => show("modal", false);
$("mConfirmar").onclick = async () => {
  if (enviando) return; enviando = true; $("mConfirmar").disabled = true;
  const { error } = await salvar(true);
  enviando = false; $("mConfirmar").disabled = false;
  if (error) { $("mResumo").insertAdjacentHTML("beforeend", `<p class="small" style="color:#ff9b9b;margin-top:10px">Não deu certo: ${esc(error.message)}</p>`); return; }
  show("modal", false);
  g.status = "enviada";
  show("selecao", false);
  $("hSub").textContent = `Seleção enviada: ${marc.size} fotos. ${g.estudio?.nome || "O fotógrafo"} já recebeu a sua lista.`;
  $("hBtn").classList.add("hide");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

if (!slug) { show("vCodigo", true); $("cErro").textContent = "Link incompleto. Abra o link exatamente como o fotógrafo enviou."; $("fCodigo").classList.add("hide"); }
else { const c = lerCod(); c ? abrir(c) : show("vCodigo", true); }
}
