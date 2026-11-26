{
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hide", !on);
let user = null, estudio = null, galeria = null, fotos = [], marcadas = new Set(), modoCriar = false;

/* ---------- acesso ---------- */
const aviso = (txt, erro) => { const m = $("msgEntrar"); m.textContent = txt; m.className = "msg" + (erro ? " erro" : ""); };
const setModo = criar => {
  modoCriar = criar;
  $("abaEntrar").setAttribute("aria-pressed", !criar); $("abaCriar").setAttribute("aria-pressed", criar);
  show("campoNome", criar); $("bEntrar").textContent = criar ? "Criar minha conta" : "Entrar";
  $("senha").autocomplete = criar ? "new-password" : "current-password";
};
$("abaEntrar").onclick = () => setModo(false);
$("abaCriar").onclick = () => setModo(true);
$("fEntrar").onsubmit = async e => {
  e.preventDefault();
  const email = $("email").value.trim(), senha = $("senha").value;
  $("bEntrar").disabled = true;
  try {
    if (modoCriar) {
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome: $("nome").value.trim() || "Meu estúdio" }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) aviso("Conta criada. Enviamos um link de confirmação para " + email + ". Abra o e-mail, clique no link e depois entre aqui.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    }
  } catch (err) {
    const t = String(err.message || err);
    aviso(/Invalid login/i.test(t) ? "E-mail ou senha incorretos." : /not confirmed/i.test(t) ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : /already registered/i.test(t) ? "Esse e-mail já tem conta. Use a aba Entrar." : "Não deu certo: " + t, true);
  }
  $("bEntrar").disabled = false;
};
$("esqueci").onclick = async e => {
  e.preventDefault();
  const email = $("email").value.trim();
  if (!email) return aviso("Digite seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.", true);
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  aviso(error ? "Não deu certo: " + error.message : "Se esse e-mail tiver conta, chega um link para criar uma nova senha.", !!error);
};
$("fSenha").onsubmit = async e => {
  e.preventDefault();
  const { error } = await sb.auth.updateUser({ password: $("nova").value });
  if (error) return alert("Não deu certo: " + error.message);
  show("vSenha", false); entrar();
};
$("sair").onclick = async () => { await sb.auth.signOut(); };

sb.auth.onAuthStateChange((ev, session) => {
  if (ev === "PASSWORD_RECOVERY") { show("vEntrar", false); show("vPainel", false); show("vSenha", true); return; }
  const antes = user?.id;
  user = session?.user || null;
  if (user && user.id !== antes) setTimeout(entrar, 0);
  else if (!user) { show("vPainel", false); show("vSenha", false); show("vEntrar", true); }
});

async function entrar() {
  show("vEntrar", false); show("vPainel", true);
  const { data } = await sb.from("estudios").select("*").eq("id", user.id).maybeSingle();
  estudio = data || { nome: user.user_metadata?.nome || "Meu estúdio" };
  $("nomeEstudio").textContent = estudio.nome;
  atualizarUso();
  const slug = new URLSearchParams(location.hash.slice(1)).get("g");
  slug ? abrirGaleria(slug) : listar();
}

async function atualizarUso() {
  const { data } = await sb.rpc("espaco_usado");
  const b = Number(data || 0), pct = Math.min(100, b / SELETA.limiteBytes * 100);
  $("uso").innerHTML = `${(b / 1048576).toFixed(0)} MB de 1 GB<span class="barra"><i style="width:${pct.toFixed(1)}%"></i></span>`;
}

/* ---------- lista ---------- */
async function listar() {
  galeria = null; history.replaceState(null, "", location.pathname);
  show("vGal", false); show("vLista", true);
  const { data, error } = await sb.from("galerias").select("id,slug,titulo,cliente_nome,status,criado_em,fotos(count)").order("criado_em", { ascending: false });
  if (error) { $("lista").innerHTML = `<p class="msg erro">${esc(error.message)}</p>`; return; }
  $("lista").innerHTML = data.length ? data.map(g => `
    <button class="card gal" data-slug="${esc(g.slug)}">
      <span class="tag ${g.status}">${g.status === "enviada" ? "Seleção recebida" : g.status === "aberta" ? "Aguardando cliente" : "Encerrada"}</span>
      <h3>${esc(g.titulo)}</h3>
      <span class="small mute">${esc(g.cliente_nome || "Sem cliente")} · ${g.fotos?.[0]?.count || 0} fotos · ${new Date(g.criado_em).toLocaleDateString("pt-BR")}</span>
    </button>`).join("") : `<div class="vazio" style="grid-column:1/-1">Nenhuma galeria ainda. Clique em “Nova galeria” pra começar.</div>`;
}
$("lista").onclick = e => { const b = e.target.closest(".gal"); if (b) abrirGaleria(b.dataset.slug); };
$("irLista").onclick = $("voltar").onclick = e => { e.preventDefault(); listar(); };
$("novaGal").onclick = () => { show("fNova", true); $("nTitulo").focus(); };
$("cancNova").onclick = () => show("fNova", false);
$("fNova").onsubmit = async e => {
  e.preventDefault();
  const row = { estudio_id: user.id, titulo: $("nTitulo").value.trim(), cliente_nome: $("nCliente").value.trim() || null,
    fotos_incluidas: +$("nInc").value || 0, preco_extra: +$("nExtra").value || 0, prazo: $("nPrazo").value || null };
  const { data, error } = await sb.from("galerias").insert(row).select().single();
  if (error) return alert("Não deu certo: " + error.message);
  $("fNova").reset(); $("nInc").value = 20; $("nExtra").value = 20; show("fNova", false);
  abrirGaleria(data.slug);
};

/* ---------- galeria ---------- */
const linkCliente = g => new URL("g.html?g=" + g.slug, location.href).href;
async function abrirGaleria(slug) {
  const { data: g, error } = await sb.from("galerias").select("*").eq("slug", slug).maybeSingle();
  if (error || !g) return listar();
  galeria = g; history.replaceState(null, "", "#g=" + g.slug);
  show("vLista", false); show("vGal", true); show("fEditar", false);
  pintarCabeca();
  await carregarFotos();
}
function pintarCabeca() {
  const g = galeria;
  $("gTitulo").textContent = g.titulo;
  $("gInfo").textContent = [g.cliente_nome, `${g.fotos_incluidas} fotos no pacote`, `extra ${brl(g.preco_extra)}`, g.prazo && "prazo " + new Date(g.prazo + "T12:00").toLocaleDateString("pt-BR")].filter(Boolean).join(" · ");
  $("gStatus").textContent = g.status === "enviada" ? "Seleção recebida" : g.status === "aberta" ? "Aguardando cliente" : "Encerrada";
  $("gStatus").className = "tag " + g.status;
  $("gLink").textContent = linkCliente(g);
  $("gCodigo").textContent = g.codigo_acesso;
  $("whats").href = "https://wa.me/?text=" + encodeURIComponent(mensagem());
}
const mensagem = () => `Oi${galeria.cliente_nome ? ", " + galeria.cliente_nome : ""}! Suas fotos estão prontas pra escolher 📸\n\nLink: ${linkCliente(galeria)}\nCódigo: ${galeria.codigo_acesso}\n\nSeu pacote inclui ${galeria.fotos_incluidas} fotos${galeria.preco_extra > 0 ? `; cada foto extra sai por ${brl(galeria.preco_extra)}` : ""}.${galeria.prazo ? `\nEscolha até ${new Date(galeria.prazo + "T12:00").toLocaleDateString("pt-BR")}.` : ""}`;
$("copiarMsg").onclick = async () => {
  try { await navigator.clipboard.writeText(mensagem()); $("copiarMsg").textContent = "Copiada!"; }
  catch { prompt("Copie a mensagem:", mensagem()); }
  setTimeout(() => $("copiarMsg").textContent = "Copiar mensagem", 1800);
};

async function carregarFotos() {
  const [f, s] = await Promise.all([
    sb.from("fotos").select("*").eq("galeria_id", galeria.id).order("ordem"),
    sb.from("selecoes").select("foto_id").eq("galeria_id", galeria.id)
  ]);
  fotos = f.data || []; marcadas = new Set((s.data || []).map(x => x.foto_id));
  pintarFotos(); pintarSelecao();
}
function pintarFotos() {
  $("gQtd").textContent = fotos.length + (fotos.length === 1 ? " foto" : " fotos");
  $("gFotos").innerHTML = fotos.length ? fotos.map(f => `
    <div class="tile${marcadas.has(f.id) ? " on" : ""}">
      <img src="${esc(urlFoto(f.caminho))}" alt="${esc(f.nome_arquivo)}" loading="lazy">
      ${marcadas.has(f.id) ? '<span class="marca">✓</span>' : ""}
      <button class="excluir" data-id="${esc(f.id)}" aria-label="Excluir ${esc(f.nome_arquivo)}">×</button>
      <span class="nome">${esc(f.nome_arquivo)}</span>
    </div>`).join("") : `<div class="vazio" style="grid-column:1/-1">Nenhuma foto ainda.</div>`;
}
function pintarSelecao() {
  const g = galeria, n = marcadas.size, ex = Math.max(0, n - g.fotos_incluidas);
  const nomes = fotos.filter(f => marcadas.has(f.id)).map(f => semExtensao(f.nome_arquivo));
  if (g.status !== "enviada" && !n) { $("selecao").innerHTML = `<h2>Seleção do cliente</h2><p class="mute" style="margin-top:8px">Quando o cliente enviar a escolha, ela aparece aqui com a lista pronta pro Lightroom.</p>`; return; }
  $("selecao").innerHTML = `
    <div class="cabeca" style="margin-bottom:16px"><h2>${g.status === "enviada" ? "Seleção recebida" : "Seleção em andamento"}</h2>
      ${g.status === "enviada" ? `<button class="btn sm ghost" id="reabrir">Reabrir para o cliente</button>` : `<span class="small mute">O cliente ainda não clicou em enviar.</span>`}</div>
    <div class="resumo"><span>Marcadas<b>${n}</b></span><span>Incluídas<b>${Math.min(n, g.fotos_incluidas)}</b></span><span>Extras<b>${ex}</b></span><span>Valor extra<b>${brl(ex * g.preco_extra)}</b></span></div>
    <div class="sec" style="margin-top:20px"><label for="lr">Lista para o Lightroom (filtro de texto “Nome do arquivo” → “Contém”)</label>
    <textarea id="lr" readonly>${esc(nomes.join(", "))}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn fill sm" id="copiarLr">Copiar lista</button></div></div>`;
  $("copiarLr").onclick = async () => { try { await navigator.clipboard.writeText($("lr").value); $("copiarLr").textContent = "Copiada!"; } catch { $("lr").select(); } };
  const r = $("reabrir"); if (r) r.onclick = async () => {
    const { error } = await sb.from("galerias").update({ status: "aberta", enviada_em: null }).eq("id", g.id);
    if (error) return alert(error.message);
    galeria.status = "aberta"; pintarCabeca(); pintarSelecao();
  };
}

$("gFotos").onclick = async e => {
  const b = e.target.closest(".excluir"); if (!b) return;
  const f = fotos.find(x => x.id === b.dataset.id);
  if (!f || !confirm(`Excluir ${f.nome_arquivo}?`)) return;
  await sb.storage.from("fotos").remove([f.caminho]);
  await sb.from("fotos").delete().eq("id", f.id);
  fotos = fotos.filter(x => x.id !== f.id); marcadas.delete(f.id);
  pintarFotos(); pintarSelecao(); atualizarUso();
};

$("editar").onclick = () => {
  const g = galeria;
  $("eTitulo").value = g.titulo; $("eCliente").value = g.cliente_nome || ""; $("eInc").value = g.fotos_incluidas;
  $("eExtra").value = g.preco_extra; $("ePrazo").value = g.prazo || ""; show("fEditar", true);
};
$("cancEditar").onclick = () => show("fEditar", false);
$("fEditar").onsubmit = async e => {
  e.preventDefault();
  const upd = { titulo: $("eTitulo").value.trim(), cliente_nome: $("eCliente").value.trim() || null, fotos_incluidas: +$("eInc").value || 0, preco_extra: +$("eExtra").value || 0, prazo: $("ePrazo").value || null };
  const { data, error } = await sb.from("galerias").update(upd).eq("id", galeria.id).select().single();
  if (error) return alert(error.message);
  galeria = data; show("fEditar", false); pintarCabeca(); pintarSelecao();
};
$("apagarGal").onclick = async () => {
  if (!confirm(`Excluir a galeria “${galeria.titulo}” e todas as ${fotos.length} fotos? Isso não pode ser desfeito.`)) return;
  const caminhos = fotos.map(f => f.caminho);
  for (let i = 0; i < caminhos.length; i += 100) await sb.storage.from("fotos").remove(caminhos.slice(i, i + 100));
  const { error } = await sb.from("galerias").delete().eq("id", galeria.id);
  if (error) return alert(error.message);
  atualizarUso(); listar();
};

/* ---------- envio de fotos ---------- */
async function previa(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, SELETA.ladoMaximo / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return await new Promise(r => c.toBlob(r, "image/jpeg", SELETA.qualidade));
}
async function enviar(files) {
  files = [...files].filter(f => /image\/(jpeg|png|webp)/.test(f.type));
  if (!files.length) return;
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  let feitos = 0, falhas = 0, ordem = fotos.reduce((m, f) => Math.max(m, f.ordem), 0);
  const fila = files.map(f => ({ f, ordem: ++ordem }));
  const passo = () => $("progresso").textContent = `Enviando ${feitos} de ${files.length}…` + (falhas ? ` (${falhas} com erro)` : "");
  passo();
  const trabalhador = async () => {
    while (fila.length) {
      const { f, ordem } = fila.shift();
      try {
        const blob = await previa(f);
        const caminho = `${user.id}/${galeria.id}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (up.error) throw up.error;
        const { data, error } = await sb.from("fotos").insert({ galeria_id: galeria.id, nome_arquivo: f.name, caminho, ordem }).select().single();
        if (error) throw error;
        fotos.push(data);
      } catch (err) { falhas++; console.error(f.name, err); }
      feitos++; passo();
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
  fotos.sort((a, b) => a.ordem - b.ordem);
  $("progresso").textContent = falhas ? `${files.length - falhas} enviadas, ${falhas} com erro.` : `${files.length} fotos enviadas.`;
  pintarFotos(); atualizarUso();
}
$("arquivos").onchange = e => { enviar(e.target.files); e.target.value = ""; };
const z = $("soltar");
["dragenter", "dragover"].forEach(t => z.addEventListener(t, e => { e.preventDefault(); z.classList.add("ativo"); }));
["dragleave", "drop"].forEach(t => z.addEventListener(t, e => { e.preventDefault(); z.classList.remove("ativo"); }));
z.addEventListener("drop", e => enviar(e.dataTransfer.files));
}
