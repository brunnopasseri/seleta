{
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hide", !on);
const ref = (new URLSearchParams(location.search).get("a") || "").toLowerCase().replace(/[^a-z0-9/-]/g, "");
const chave = "seleta-alb-" + ref;
let cod = "", A = null, pag = 0, modoPonto = false, pontoNovo = null, ocupado = false;

const lerCod = () => { try { return sessionStorage.getItem(chave) || ""; } catch { return ""; } };
const gravarCod = v => { try { sessionStorage.setItem(chave, v); } catch {} };
const marca = e => e?.logo ? `<img src="${esc(e.logo)}" alt="${esc(e.nome || "")}">` : `<span>${esc(e?.nome || "")}</span>`;
const dataBR = d => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR") : "";
const aberto = () => A && A.status !== "aprovado";

async function abrir(codigo) {
  const { data, error } = await sb.rpc("abrir_diagramacao", { p_ref: ref, p_codigo: codigo });
  if (error) { show("vCodigo", true); $("cErro").textContent = codigo ? "Código incorreto. Confira a mensagem do fotógrafo." : ""; return; }
  cod = codigo; gravarCod(codigo); A = data;
  show("vCodigo", false); show("vAlbum", true);
  document.title = A.titulo + (A.estudio?.nome ? " · " + A.estudio.nome : "");
  $("aMarca").innerHTML = marca(A.estudio);
  $("aTitulo").textContent = A.titulo;
  pintarTopo();
  if (!A.laminas.length) { $("livro").innerHTML = `<p class="mute" style="padding:60px 20px;text-align:center">O fotógrafo ainda está enviando as páginas. Volte daqui a pouco.</p>`; return; }
  A.laminas.forEach(l => { const i = new Image(); i.src = urlFoto(l.caminho); });
  irPara(Math.min(pag, A.laminas.length - 1), 0);
}
function pintarTopo() {
  $("aInfo").textContent = [A.laminas.length + " páginas", A.versao > 1 && "versão " + A.versao, aberto() && A.prazo && "aprovar até " + dataBR(A.prazo)].filter(Boolean).join(" · ");
  const est = { aguardando: "Aguardando sua aprovação", alteracoes: "Alterações enviadas", aprovado: "Aprovado" }[A.status];
  $("aEstado").textContent = est; $("aEstado").classList.toggle("ok", A.status === "aprovado");
  $("dica").innerHTML = A.status === "aprovado"
    ? `Álbum aprovado${A.respondido_em ? " em " + new Date(A.respondido_em).toLocaleDateString("pt-BR") : ""}. Agora é com o fotógrafo: ele manda para a impressão. 🤍`
    : A.status === "alteracoes"
      ? "Seu pedido de alterações foi enviado. O fotógrafo vai ajustar e te mandar uma nova versão. Se lembrar de mais alguma coisa, pode comentar."
      : (A.mensagem ? esc(A.mensagem) + "<br><br>" : "") + "Folheie com as setas. Para pedir uma mudança, escreva um comentário ou marque o ponto exato na página.";
  show("fCom", aberto());
  $("bAprovar").classList.toggle("hide", !aberto());
  $("bAlterar").classList.toggle("hide", !aberto());
  const n = A.comentarios.length;
  $("resumoComs").textContent = aberto() ? (n ? `${n} ${n === 1 ? "comentário" : "comentários"} no álbum.` : "Sem comentários? Se estiver tudo certo, é só aprovar.") : "";
  $("bAlterar").disabled = !n;
}
function irPara(i, dir) {
  if (i < 0 || i >= A.laminas.length) return;
  cancelarPonto();
  const livro = $("livro");
  const trocar = () => {
    pag = i;
    const l = A.laminas[i];
    $("lImg").src = urlFoto(l.caminho); $("lImg").alt = `Página ${i + 1} de ${A.laminas.length}`;
    $("contador").textContent = (i === 0 ? "Capa · " : "") + `${i + 1} de ${A.laminas.length}`;
    $("ant").disabled = i === 0; $("prox").disabled = i === A.laminas.length - 1;
    pintarPagina();
  };
  if (!dir) return trocar();
  livro.classList.add(dir > 0 ? "virandoP" : "virandoA");
  setTimeout(() => { trocar(); livro.classList.remove("virandoP", "virandoA"); livro.classList.add(dir > 0 ? "virandoA" : "virandoP"); requestAnimationFrame(() => requestAnimationFrame(() => livro.classList.remove("virandoP", "virandoA"))); }, 220);
}
function numero(c) { return A.comentarios.indexOf(c) + 1; }
function pintarPagina() {
  const l = A.laminas[pag], cs = A.comentarios.filter(c => c.lamina === l.id);
  $("pinos").innerHTML = cs.filter(c => c.x != null).map(c => `<span class="pino" style="left:${c.x * 100}%;top:${c.y * 100}%" title="${esc(c.texto)}">${numero(c)}</span>`).join("")
    + (pontoNovo ? `<span class="pino novo" style="left:${pontoNovo.x * 100}%;top:${pontoNovo.y * 100}%">+</span>` : "");
  $("tComs").textContent = `Comentários desta página (${cs.length})`;
  $("coms").innerHTML = cs.length ? cs.map(c => `<li class="${c.autor === "fotografo" ? "foto" : ""}"><b>${numero(c)}</b><span>${esc(c.texto)}${c.autor === "fotografo" ? '<br><span class="small mute">Fotógrafo</span>' : ""}</span>${aberto() && c.autor === "cliente" ? `<button class="x" data-del="${c.id}" aria-label="Apagar comentário">×</button>` : ""}</li>`).join("")
    : `<li class="mute" style="background:none;padding:0">Nenhum comentário nesta página.</li>`;
  $("mini").innerHTML = A.laminas.map((m, i) => { const n = A.comentarios.filter(c => c.lamina === m.id).length;
    return `<button class="${i === pag ? "on" : ""}" data-i="${i}" aria-label="Página ${i + 1}${n ? `, ${n} comentários` : ""}"><img src="${esc(urlFoto(m.caminho))}" alt="" loading="lazy">${n ? `<span class="n">${n}</span>` : ""}</button>`; }).join("");
  $("mini").querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "center" });
}
function cancelarPonto() { modoPonto = false; pontoNovo = null; $("livro").classList.remove("comentando"); $("marcarPonto").textContent = "Marcar um ponto na página"; $("lCom").textContent = "Escreva um comentário sobre esta página"; }

$("ant").onclick = () => irPara(pag - 1, -1);
$("prox").onclick = () => irPara(pag + 1, 1);
$("mini").onclick = e => { const b = e.target.closest("[data-i]"); if (b) irPara(+b.dataset.i, +b.dataset.i > pag ? 1 : -1); };
document.addEventListener("keydown", e => {
  if (!A || /TEXTAREA|INPUT/.test(document.activeElement?.tagName) || !$("modal").classList.contains("hide")) return;
  if (e.key === "ArrowRight") irPara(pag + 1, 1); if (e.key === "ArrowLeft") irPara(pag - 1, -1); if (e.key === "Escape") { cancelarPonto(); pintarPagina(); }
});
let x0 = null;
$("livro").addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
$("livro").addEventListener("touchend", e => { if (x0 == null || modoPonto) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) irPara(pag + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); x0 = null; });
$("marcarPonto").onclick = () => {
  if (modoPonto) { cancelarPonto(); pintarPagina(); return; }
  modoPonto = true; $("livro").classList.add("comentando");
  $("marcarPonto").textContent = "Cancelar ponto"; $("lCom").textContent = "Toque na página no lugar que quer mudar";
};
$("lImg").onclick = e => {
  if (!modoPonto) return;
  const r = e.target.getBoundingClientRect();
  pontoNovo = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  $("lCom").textContent = "Agora escreva o que quer mudar nesse ponto"; pintarPagina(); $("tCom").focus();
};
$("fCom").onsubmit = async e => {
  e.preventDefault();
  const texto = $("tCom").value.trim(); if (!texto || ocupado) return;
  ocupado = true; $("salvarCom").disabled = true;
  try {
    const l = A.laminas[pag];
    const { data, error } = await sb.rpc("comentar_lamina", { p_ref: ref, p_codigo: cod, p_lamina: l.id, p_x: pontoNovo?.x ?? null, p_y: pontoNovo?.y ?? null, p_texto: texto });
    if (error) throw error;
    A.comentarios.push({ id: data, lamina: l.id, x: pontoNovo?.x ?? null, y: pontoNovo?.y ?? null, texto, autor: "cliente" });
    $("tCom").value = ""; cancelarPonto(); pintarPagina(); pintarTopo();
  } catch (err) { alert(err.message || "Não foi possível salvar."); }
  ocupado = false; $("salvarCom").disabled = false;
};
$("coms").onclick = async e => {
  const b = e.target.closest("[data-del]"); if (!b) return;
  const { error } = await sb.rpc("apagar_comentario_lamina", { p_ref: ref, p_codigo: cod, p_id: b.dataset.del });
  if (error) return alert(error.message);
  A.comentarios = A.comentarios.filter(c => c.id !== b.dataset.del); pintarPagina(); pintarTopo();
};
function confirmar(titulo, texto, botao, acao) {
  $("mTit").textContent = titulo; $("mTxt").textContent = texto; $("mOk").textContent = botao; show("modal", true); $("mOk").focus();
  $("mOk").onclick = async () => { $("mOk").disabled = true; await acao(); $("mOk").disabled = false; show("modal", false); };
}
$("mVoltar").onclick = () => show("modal", false);
async function responder(aprovar) {
  const { data, error } = await sb.rpc("responder_diagramacao", { p_ref: ref, p_codigo: cod, p_aprovar: aprovar });
  if (error) return alert(error.message);
  A.status = data; A.respondido_em = new Date().toISOString(); pintarTopo(); pintarPagina();
}
$("bAprovar").onclick = () => confirmar("Aprovar o álbum?", A.comentarios.length
  ? `Você deixou ${A.comentarios.length} ${A.comentarios.length === 1 ? "comentário" : "comentários"}. Se aprovar, o álbum vai para impressão assim. Para o fotógrafo ajustar antes, use "Enviar pedido de alterações".`
  : "Depois de aprovar, o fotógrafo pode mandar o álbum para a impressão.", "Aprovar", () => responder(true));
$("bAlterar").onclick = () => confirmar("Enviar pedido de alterações?", `O fotógrafo vai receber seus ${A.comentarios.length} comentários e te mandar uma nova versão.`, "Enviar", () => responder(false));
$("fCodigo").onsubmit = e => { e.preventDefault(); $("cErro").textContent = ""; abrir($("cod").value.trim()); };

if (!ref.includes("/")) { document.body.innerHTML = '<p style="padding:40px;text-align:center">Link inválido.</p>'; }
else {
  const salvo = lerCod();
  if (salvo) abrir(salvo); else show("vCodigo", true);
}
}
