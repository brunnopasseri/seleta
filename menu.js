/* Menu de 3 barrinhas para celular (página inicial, Sobre, Blog, Preços, Termos, Privacidade) */
(function () {
  var links = document.querySelector("nav .links") || document.querySelector(".topoS nav");
  if (!links) return;
  var barra = links.parentElement;
  var css = document.createElement("style");
  css.textContent =
    ".burger{display:none;width:42px;height:42px;border:0;background:transparent;color:inherit;cursor:pointer;padding:0;align-items:center;justify-content:center;flex:none;margin-left:-6px}" +
    ".burger span{display:block;width:20px;height:1.6px;background:currentColor;position:relative;transition:background .2s}" +
    ".burger span::before,.burger span::after{content:'';position:absolute;left:0;width:20px;height:1.6px;background:currentColor;transition:transform .25s}" +
    ".burger span::before{top:-6px}.burger span::after{top:6px}" +
    ".menuAberto .burger span{background:transparent}.menuAberto .burger span::before{transform:translateY(6px) rotate(45deg)}.menuAberto .burger span::after{transform:translateY(-6px) rotate(-45deg)}" +
    ".gavetaMenu{position:fixed;inset:0;z-index:1000;background:#0c0c0c;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:90px 9vw 40px;gap:6px;opacity:0;pointer-events:none;transition:opacity .3s}" +
    ".gavetaMenu a{color:#fff;text-decoration:none;font:300 30px/1.3 Montserrat,sans-serif;padding:8px 0;border-bottom:1px solid #262626;transform:translateY(12px);transition:transform .4s}" +
    ".gavetaMenu .acoesM{display:flex;gap:12px;margin-top:28px}.gavetaMenu .acoesM a{font-size:15px;font-weight:500;border:1px solid #fff;border-radius:8px;padding:12px 20px}.gavetaMenu .acoesM a.f{background:#fff;color:#111}" +
    ".gavetaMenu .fecha{position:absolute;top:18px;right:6vw;width:44px;height:44px;border:0;background:transparent;color:#fff;font-size:30px;font-weight:200;cursor:pointer}" +
    ".menuAberto .gavetaMenu{opacity:1;pointer-events:auto}.menuAberto .gavetaMenu a{transform:none}" +
    ".menuAberto{overflow:hidden}" +
    "@media(max-width:980px){.burger{display:inline-flex}}" +
    "@media(max-width:560px){nav .entrar,.topoS .entrar{display:none}}";
  document.head.appendChild(css);

  var btn = document.createElement("button");
  btn.className = "burger"; btn.type = "button";
  btn.setAttribute("aria-label", "Abrir menu"); btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = "<span></span>";
  barra.insertBefore(btn, barra.firstChild);

  var g = document.createElement("div");
  g.className = "gavetaMenu"; g.setAttribute("role", "dialog"); g.setAttribute("aria-label", "Menu");
  var itens = Array.prototype.map.call(links.querySelectorAll("a"), function (a) { return '<a href="' + a.getAttribute("href") + '">' + a.textContent + "</a>"; }).join("");
  g.innerHTML = '<button class="fecha" type="button" aria-label="Fechar menu">×</button>' + itens +
    '<div class="acoesM"><a href="app.html">Entrar</a><a class="f" href="app.html?criar">Começar grátis</a></div>';
  document.body.appendChild(g);

  function abre(v) {
    document.documentElement.classList.toggle("menuAberto", v);
    btn.setAttribute("aria-expanded", v ? "true" : "false");
  }
  btn.onclick = function () { abre(true); };
  g.querySelector(".fecha").onclick = function () { abre(false); };
  g.addEventListener("click", function (e) { if (e.target.tagName === "A") abre(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") abre(false); });
})();
