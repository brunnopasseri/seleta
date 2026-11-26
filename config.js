// Conexão com o Supabase (chave publicável: pode ficar no site, a segurança está nas regras do banco)
window.SELETA = {
  url: "https://eadobdofitwmeyayttrd.supabase.co",
  chave: "sb_publishable_1DAo7M7rj2OcnRx6UPggAQ_buX_0fuA",
  limiteBytes: 1024 * 1024 * 1024, // 1 GB do plano grátis
  ladoMaximo: 1600,               // prévias com no máximo 1600 px
  qualidade: 0.82,
  // Links de assinatura (Mercado Pago ou outro). Deixe "" enquanto não estiver configurado.
  pagamento: {
    essencial: { mensal: "", anual: "" },
    profissional: { mensal: "", anual: "" },
    estudio: { mensal: "", anual: "" }
  }
};
window.sb = window.supabase.createClient(SELETA.url, SELETA.chave);
window.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
window.brl = v => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
window.semExtensao = n => String(n).replace(/\.[^.]+$/, "");
window.urlFoto = caminho => sb.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
