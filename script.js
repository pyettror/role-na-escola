(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const formatDate = (date) => {
    if (!date) return "Data a confirmar";
    const [y,m,d] = date.split("-");
    return `${d}/${m}/${y}`;
  };
  const monthName = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR",{month:"short"}).replace(".","") : "";
  const photoPlaceholder = (title) => `<div class="featured-placeholder"><span>ROLÊ NA ESCOLA<br><br>${esc(title).slice(0,70)}</span></div>`;
  const safeUrl = (value) => {
    try { const u = new URL(value); return ["https:","http:"].includes(u.protocol) ? u.href : ""; }
    catch { return ""; }
  };

  // Eventos demonstrativos. As datas ficam vazias até serem confirmadas pela equipe.
  // Para inserir cronogramas reais, inclua itens em "cronograma" com horário e atividade.
  const demoEvents = [
    {
      id:"demo-ist", titulo:"Conversa sobre doenças sexualmente transmissíveis",
      descricao:"Registro de uma atividade educativa dedicada à prevenção das infecções sexualmente transmissíveis (ISTs), à conscientização sobre saúde sexual, à importância da informação confiável e às formas de prevenção.",
      categoria:"Saúde e conscientização", data:null, horario_inicio:null, local:"Colégio de Tempo Integral Filomena Pereira Rodrigues",
      imagem_capa:"", estado:"publicado", destaque:true, cronograma:[], fotografias:[]
    },
    {
      id:"demo-vape", titulo:"Os malefícios do uso do cigarro eletrônico",
      descricao:"Registro de uma atividade educativa sobre os riscos associados ao uso de cigarros eletrônicos, seus possíveis impactos na saúde, a dependência de nicotina e a importância da prevenção e da conscientização entre os jovens.",
      categoria:"Saúde e conscientização", data:null, horario_inicio:null, local:"Colégio de Tempo Integral Filomena Pereira Rodrigues",
      imagem_capa:"", estado:"publicado", destaque:false, cronograma:[], fotografias:[]
    }
  ];
  let events = [...demoEvents];

  function coverMarkup(event, featured=false) {
    const url = safeUrl(event.imagem_capa);
    if (url) return `<img src="${esc(url)}" alt="Imagem de ${esc(event.titulo)}" loading="lazy">`;
    return photoPlaceholder(event.titulo);
  }
  function publicEvents() { return events.filter(e => e.estado === "publicado"); }
  function selectFeatured() {
    const list = publicEvents(), today = todayISO();
    const todays = list.filter(e => e.data === today);
    if (todays.length) return {event: todays.find(e => e.destaque) || todays[0], label:"Acontecendo hoje"};
    const upcoming = list.filter(e => e.data && e.data > today).sort((a,b) => a.data.localeCompare(b.data));
    if (upcoming.length) return {event:upcoming[0],label:"Próximo evento"};
    const dated = list.filter(e => e.data).sort((a,b) => b.data.localeCompare(a.data));
    return {event:list.find(e=>e.destaque) || dated[0] || list[0],label:"Registro em destaque"};
  }
  function renderFeatured() {
    const selected = selectFeatured();
    if (!selected) { $("featuredEvent").innerHTML = `<div class="empty-state">Ainda não há eventos publicados.</div>`; return; }
    const e = selected.event;
    $("featuredEvent").innerHTML = `<article class="featured-card"><div class="featured-art">${coverMarkup(e,true)}</div><div class="featured-content"><span class="pill">${esc(selected.label)}</span><h3>${esc(e.titulo)}</h3><p>${esc(e.descricao)}</p><div class="meta-row"><span>◷ ${formatDate(e.data)}</span><span>⌖ ${esc(e.local || "Local a confirmar")}</span></div><button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">Ver cobertura <span>→</span></button></div></article>`;
  }
  function renderAgenda() {
    const today = todayISO();
    const upcoming = publicEvents().filter(e=>e.data && e.data >= today).sort((a,b)=>a.data.localeCompare(b.data) || (a.horario_inicio||"").localeCompare(b.horario_inicio||""));
    if (!upcoming.length) {
      $("nextEvent").innerHTML = `<div class="empty-state"><strong>Nenhum evento futuro cadastrado ainda.</strong><br>Quando a equipe confirmar uma data, o próximo evento e o cronograma aparecerão automaticamente aqui.</div>`;
      $("otherUpcoming").innerHTML = "";
      return;
    }
    const e = upcoming[0];
    const agenda = Array.isArray(e.cronograma) ? e.cronograma : [];
    const timeline = agenda.length
      ? agenda.slice().sort((a,b)=>(a.horario||"").localeCompare(b.horario||"")).map(item=>`<li><time>${esc(item.horario || "Horário a confirmar")}</time><p>${esc(item.atividade || "Atividade a confirmar")}</p></li>`).join("")
      : `<li><time>${esc(e.horario_inicio || "Horário a confirmar")}</time><p>${esc(e.titulo)}</p></li><li><time>Mais horários</time><p>O restante do cronograma será exibido quando for cadastrado.</p></li>`;
    $("nextEvent").innerHTML = `<article class="next-event-card"><div class="next-main"><span class="pill">${e.data===today ? "Acontecendo hoje" : "Próximo compromisso"}</span><h3>${esc(e.titulo)}</h3><p>${esc(e.descricao)}</p><div class="event-facts"><span class="fact">▣ ${formatDate(e.data)}</span><span class="fact">◷ ${esc(e.horario_inicio || "Horário a confirmar")}</span><span class="fact">⌖ ${esc(e.local || "Local a confirmar")}</span></div><button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">Ver detalhes <span>→</span></button></div><aside class="timeline-panel"><h4>⌁ Cronograma do evento</h4><ol class="timeline">${timeline}</ol></aside></article>`;
    $("otherUpcoming").innerHTML = upcoming.slice(1).map(item=>`<article class="upcoming-row"><div class="date-box"><strong>${item.data.slice(8,10)}</strong><span>${monthName(item.data)}</span></div><div><h4>${esc(item.titulo)}</h4><p>${formatDate(item.data)} · ${esc(item.horario_inicio || "Horário a confirmar")}</p></div></article>`).join("");
  }
  function renderGallery() {
    const previous = $("yearFilter").value;
    const years = [...new Set(publicEvents().map(e=>e.data ? e.data.slice(0,4) : null).filter(Boolean))].sort().reverse();
    $("yearFilter").innerHTML = `<option value="todos">Todos os anos</option>` + years.map(y=>`<option value="${y}">${y}</option>`).join("");
    $("yearFilter").value = years.includes(previous) ? previous : "todos";
    const chosen = $("yearFilter").value;
    const list = publicEvents().filter(e=>chosen==="todos" || (e.data||"").startsWith(chosen));
    $("eventGrid").innerHTML = list.length ? list.map(e=>`<article class="event-card"><div class="event-art">${coverMarkup(e)}</div><div class="event-body"><span class="pill">${esc(e.categoria || "Evento escolar")}</span><h3>${esc(e.titulo)}</h3><p>${esc(e.descricao.length>125 ? e.descricao.slice(0,125)+"…" : e.descricao)}</p><div class="event-date">▣ ${formatDate(e.data)}</div><button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">Ver cobertura <span>→</span></button></div></article>`).join("") : `<div class="empty-state">Nenhum evento encontrado para este filtro.</div>`;
  }
  function openEvent(id) {
    const e = events.find(item=>String(item.id)===String(id));
    if (!e) return;
    const photos = Array.isArray(e.fotografias) ? e.fotografias : [];
    const photoHtml = photos.length ? `<div class="modal-photos">${photos.map(p=>{const u=safeUrl(p.url);return u?`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(p.alt||e.titulo)}" loading="lazy"></a>`:"";}).join("")}</div>` : `<p>As fotografias deste evento serão adicionadas pela equipe.</p>`;
    const timeline = Array.isArray(e.cronograma) && e.cronograma.length ? `<h3>Cronograma</h3><ol class="timeline">${e.cronograma.map(x=>`<li><time>${esc(x.horario||"A confirmar")}</time><p>${esc(x.atividade||"Atividade")}</p></li>`).join("")}</ol>` : "";
    $("eventDetails").innerHTML = `<span class="pill">${esc(e.categoria||"Evento escolar")}</span><h2>${esc(e.titulo)}</h2><p>▣ ${formatDate(e.data)}　⌖ ${esc(e.local||"Local a confirmar")}</p>${safeUrl(e.imagem_capa)?`<img class="modal-cover" src="${esc(safeUrl(e.imagem_capa))}" alt="${esc(e.titulo)}">`:""}<p>${esc(e.descricao)}</p>${timeline}<h3>Álbum fotográfico</h3>${photoHtml}`;
    $("eventDialog").showModal();
  }
  function setTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark", dark);
    $("themeIcon").textContent = dark ? "☀" : "☾";
    $("themeLabel").textContent = dark ? "Modo claro" : "Modo escuro";
    $("themeToggle").setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#0b1220" : "#174ea6");
  }
  let initialTheme = "light";
  try { initialTheme = localStorage.getItem("role-na-escola-theme") || "light"; } catch {}
  setTheme(initialTheme === "dark" ? "dark" : "light");
  $("themeToggle").addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("role-na-escola-theme", next); } catch {}
  });
  $("yearFilter").addEventListener("change", renderGallery);
  $("menuToggle").addEventListener("click", () => {
    const nav = $("mainNav"), open = nav.classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-event]");
    if (opener) openEvent(opener.dataset.openEvent);
    const closer = event.target.closest("[data-close]");
    if (closer) $(closer.dataset.close).close();
    if (event.target.id === "teamLogin" || event.target.id === "footerLogin") $("loginDialog").showModal();
    if (event.target.closest("#mainNav a")) {
      $("mainNav").classList.remove("open");
      $("menuToggle").setAttribute("aria-expanded","false");
    }
  });
  // Exibe a demonstração até que a equipe configure a conexão real com o banco.
  renderFeatured();
  renderAgenda();
  renderGallery();
})();