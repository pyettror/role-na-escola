(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const BUCKET = "fotos-eventos";
  const SCHOOL = "Colégio de Tempo Integral Filomena Pereira Rodrigues";
  const HISTORY_KEY = "role-na-escola-admin-history";

  let db = null;
  let currentUser = null;
  let events = [];
  let currentCoverUrl = "";
  let scheduleItems = [];

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const formatDate = date => {
    if (!date) return "Data a confirmar";
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
  };

  const monthName = date => date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
    : "";

  const safeUrl = value => {
    try {
      const u = new URL(value);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  };

  function initializeSupabase() {
    if (db) return db;

    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      throw new Error("Configuração do Supabase não encontrada. Confira supabase-config.js.");
    }

    db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    return db;
  }

  function storagePublicUrl(path) {
    if (!path) return "";
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", !isError && Boolean(message));
  }

  function photoPlaceholder(title) {
    return `<div class="featured-placeholder"><span>ROLÊ NA ESCOLA<br><br>${esc(title).slice(0, 70)}</span></div>`;
  }

  // HISTÓRICO LOCAL

  function addHistory(action, detail) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      history.unshift({
        action,
        detail,
        date: new Date().toLocaleString("pt-BR")
      });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
    } catch (error) {
      console.warn("Não foi possível salvar o histórico local.", error);
    }
  }

  function renderHistory() {
    const container = $("adminHistoryList");
    if (!container) return;

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {}

    container.innerHTML = history.length
      ? history.map(item => `
          <div class="history-row">
            <span class="history-icon">◷</span>
            <div><strong>${esc(item.action)}</strong><p>${esc(item.detail)}</p><small>${esc(item.date)}</small></div>
          </div>
        `).join("")
      : `<p class="empty-state">Nenhuma atividade registrada neste navegador.</p>`;
  }

  // DADOS PÚBLICOS

  async function loadPhotosForEvents(list) {
    const ids = list.map(e => Number(e.id)).filter(Number.isFinite);
    if (!ids.length) return;

    const { data, error } = await db
      .from("fotos_eventos")
      .select("id,evento_id,caminho,legenda,criado_em")
      .in("evento_id", ids);

    if (error) {
      console.error("Erro ao carregar fotografias:", error);
      return;
    }

    for (const event of list) {
      event.fotografias = (data || [])
        .filter(photo => String(photo.evento_id) === String(event.id))
        .map(photo => ({
          id: photo.id,
          evento_id: photo.evento_id,
          caminho: photo.caminho,
          url: storagePublicUrl(photo.caminho),
          alt: photo.legenda || event.titulo,
          legenda: photo.legenda || ""
        }));
    }
  }

  async function loadEventsFromSupabase() {
    try {
      initializeSupabase();

      const { data, error } = await db
        .from("eventos")
        .select("id,titulo,descricao,data_evento,imagem_capa,publicado,categoria,local,horario_inicio,destaque")
        .eq("publicado", true)
        .order("data_evento", { ascending: true });

      if (error) throw error;

      const loaded = [];

      for (const row of data || []) {
        let agenda = [];

        try {
          const { data: scheduleData, error: agendaError } = await db
            .from("programacao")
            .select("id,evento_id,horario,atividade,responsavel,ordem")
            .eq("evento_id", row.id)
            .order("ordem", { ascending: true });

          if (agendaError) throw agendaError;
          agenda = scheduleData || [];
        } catch (scheduleError) {
          console.warn(`Não foi possível carregar a programação do evento ${row.id}:`, scheduleError);
        }

        const schedule = agenda.map(item => ({
          horario: String(item.horario || "").slice(0, 5),
          atividade: item.responsavel
            ? `${item.atividade} — ${item.responsavel}`
            : item.atividade
        }));

        loaded.push({
          id: String(row.id),
          titulo: row.titulo,
          descricao: row.descricao || "",
          categoria: row.categoria || "Evento escolar",
          data: row.data_evento,
          horario_inicio: String(row.horario_inicio || "").slice(0, 5) || schedule[0]?.horario || null,
          local: row.local || SCHOOL,
          imagem_capa: row.imagem_capa || "",
          estado: row.publicado ? "publicado" : "rascunho",
          destaque: Boolean(row.destaque),
          cronograma: schedule,
          fotografias: []
        });
      }

      await loadPhotosForEvents(loaded);
      events = loaded;
      renderAll();
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      events = [];
      renderAll();
    }
  }

  function publicEvents() {
    return events.filter(e => e.estado === "publicado");
  }

  // PÁGINA PÚBLICA

  function coverMarkup(event) {
    const url = safeUrl(event.imagem_capa);
    return url
      ? `<img src="${esc(url)}" alt="Imagem de ${esc(event.titulo)}" loading="lazy">`
      : photoPlaceholder(event.titulo);
  }

  function selectFeatured() {
    const list = publicEvents();
    if (!list.length) return null;

    const today = todayISO();
    const todays = list.filter(e => e.data === today);

    if (todays.length) {
      return { event: todays.find(e => e.destaque) || todays[0], label: "Acontecendo hoje" };
    }

    const upcoming = list.filter(e => e.data && e.data > today)
      .sort((a, b) => a.data.localeCompare(b.data));

    if (upcoming.length) return { event: upcoming[0], label: "Próximo evento" };

    const dated = list.filter(e => e.data).sort((a, b) => b.data.localeCompare(a.data));
    return { event: list.find(e => e.destaque) || dated[0] || list[0], label: "Registro em destaque" };
  }

  function renderFeatured() {
    const slot = $("featuredEvent");
    if (!slot) return;

    const selected = selectFeatured();

    if (!selected) {
      slot.innerHTML = `<div class="empty-state">Ainda não há eventos publicados.</div>`;
      return;
    }

    const e = selected.event;
    slot.innerHTML = `
      <article class="featured-card">
        <div class="featured-art">${coverMarkup(e)}</div>
        <div class="featured-content">
          <span class="pill">${esc(selected.label)}</span>
          <h3>${esc(e.titulo)}</h3>
          <p>${esc(e.descricao)}</p>
          <div class="meta-row">
            <span>◷ ${formatDate(e.data)}</span>
            <span>⌖ ${esc(e.local)}</span>
          </div>
          <button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">Ver cobertura →</button>
        </div>
      </article>`;
  }

  function renderAgenda() {
    const slot = $("nextEvent");
    if (!slot) return;

    const today = todayISO();
    const upcoming = publicEvents()
      .filter(e => e.data && e.data >= today)
      .sort((a, b) => a.data.localeCompare(b.data) ||
        (a.horario_inicio || "").localeCompare(b.horario_inicio || ""));

    if (!upcoming.length) {
      slot.innerHTML = `<div class="empty-state">Nenhum evento futuro cadastrado ainda.</div>`;
      $("otherUpcoming").innerHTML = "";
      return;
    }

    const e = upcoming[0];
    const agenda = (e.cronograma || []).slice().sort((a, b) =>
      (a.horario || "").localeCompare(b.horario || ""));

    const timeline = agenda.length
      ? agenda.map(item => `<li><time>${esc(item.horario)}</time><p>${esc(item.atividade)}</p></li>`).join("")
      : `<li><time>${esc(e.horario_inicio || "A confirmar")}</time><p>${esc(e.titulo)}</p></li>`;

    slot.innerHTML = `
      <article class="next-event-card">
        <div class="next-main">
          <span class="pill">${e.data === today ? "Acontecendo hoje" : "Próximo compromisso"}</span>
          <h3>${esc(e.titulo)}</h3>
          <p>${esc(e.descricao)}</p>
          <div class="event-facts">
            <span class="fact">▣ ${formatDate(e.data)}</span>
            <span class="fact">◷ ${esc(e.horario_inicio || "A confirmar")}</span>
            <span class="fact">⌖ ${esc(e.local)}</span>
          </div>
          <button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">Ver detalhes →</button>
        </div>
        <aside class="timeline-panel"><h4>⌁ Cronograma do evento</h4><ol class="timeline">${timeline}</ol></aside>
      </article>`;

    $("otherUpcoming").innerHTML = upcoming.slice(1).map(item => `
      <article class="upcoming-row">
        <div class="date-box"><strong>${item.data.slice(8, 10)}</strong><span>${monthName(item.data)}</span></div>
        <div><h4>${esc(item.titulo)}</h4><p>${formatDate(item.data)} · ${esc(item.horario_inicio || "A confirmar")}</p></div>
      </article>`).join("");
  }

  function renderGallery() {
    const filter = $("yearFilter");
    if (!filter) return;

    const previous = filter.value;
    const years = [...new Set(publicEvents().map(e => e.data?.slice(0, 4)).filter(Boolean))].sort().reverse();

    filter.innerHTML = `<option value="todos">Todos os anos</option>` +
      years.map(y => `<option value="${y}">${y}</option>`).join("");

    filter.value = years.includes(previous) ? previous : "todos";

    const list = publicEvents().filter(e =>
      filter.value === "todos" || (e.data || "").startsWith(filter.value));

    $("eventGrid").innerHTML = list.length ? list.map(e => `
      <article class="event-card">
        <div class="event-art">${coverMarkup(e)}</div>
        <div class="event-body">
          <span class="pill">${esc(e.categoria)}</span>
          <h3>${esc(e.titulo)}</h3>
          <p>${esc(e.descricao.length > 125 ? e.descricao.slice(0, 125) + "…" : e.descricao)}</p>
          <div class="event-date">▣ ${formatDate(e.data)}</div>
          <button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">Ver cobertura →</button>
        </div>
      </article>`).join("")
      : `<div class="empty-state">Nenhum evento encontrado para este filtro.</div>`;
  }

  async function openEvent(id) {
    const e = events.find(item => String(item.id) === String(id));
    if (!e) return;

    const photos = e.fotografias || [];
    const photoHtml = photos.length
      ? `<div class="modal-photos">${photos.map(p => {
          const url = safeUrl(p.url);
          return url ? `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(p.alt)}" loading="lazy"></a>` : "";
        }).join("")}</div>`
      : `<p>As fotografias deste evento serão adicionadas pela equipe.</p>`;

    const timeline = e.cronograma?.length
      ? `<h3>Cronograma</h3><ol class="timeline">${e.cronograma.map(x =>
          `<li><time>${esc(x.horario)}</time><p>${esc(x.atividade)}</p></li>`).join("")}</ol>`
      : "";

    $("eventDetails").innerHTML = `
      <span class="pill">${esc(e.categoria)}</span>
      <h2>${esc(e.titulo)}</h2>
      <p>▣ ${formatDate(e.data)}　⌖ ${esc(e.local)}</p>
      ${safeUrl(e.imagem_capa) ? `<img class="modal-cover" src="${esc(e.imagem_capa)}" alt="${esc(e.titulo)}">` : ""}
      <p>${esc(e.descricao)}</p>${timeline}
      <h3>Álbum fotográfico</h3>${photoHtml}`;

    $("eventDialog").showModal();
  }

  function renderAll() {
    renderFeatured();
    renderAgenda();
    renderGallery();
  }

  // LOGIN E AUTORIZAÇÃO

  async function checkAdministrator(user) {
    const { data, error } = await db.from("administradores")
      .select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function handleLogin(event) {
    event.preventDefault();

    const button = $("loginSubmit");
    showMessage($("loginError"), "");
    button.disabled = true;
    button.textContent = "Verificando…";

    try {
      initializeSupabase();

      const { data, error } = await db.auth.signInWithPassword({
        email: $("adminEmail").value.trim(),
        password: $("adminPassword").value
      });

      if (error) throw error;

      if (!await checkAdministrator(data.user)) {
        await db.auth.signOut();
        throw new Error("Esta conta não tem autorização de administrador.");
      }

      currentUser = data.user;
      $("loginDialog").close();
      $("loginForm").reset();
      $("adminAccountEmail").textContent = currentUser.email || "Conta conectada";

      await openAdminPanel();
    } catch (error) {
      showMessage($("loginError"), error.message || "Não foi possível entrar.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Entrar no painel";
    }
  }

  async function restoreSession() {
    try {
      initializeSupabase();
      const { data } = await db.auth.getSession();
      const user = data?.session?.user;
      if (!user) return;

      if (await checkAdministrator(user)) {
        currentUser = user;
        $("adminAccountEmail").textContent = user.email || "Conta conectada";
      } else {
        await db.auth.signOut();
      }
    } catch (error) {
      console.warn("Não foi possível restaurar a sessão:", error);
    }
  }

  async function logout() {
    if (db) await db.auth.signOut();
    currentUser = null;
    $("adminDialog").close();
    $("loginDialog").close();
    $("loginForm").reset();
  }

  // NAVEGAÇÃO DO PAINEL

  const adminPages = {
    dashboard: ["adminDashboardSection", "Visão geral"],
    events: ["adminEventsSection", "Eventos"],
    eventForm: ["adminEventFormSection", "Novo evento"],
    schedule: ["adminScheduleSection", "Programação"],
    photos: ["adminPhotosSection", "Galeria de fotos"],
    publications: ["adminPublicationsSection", "Publicações"],
    history: ["adminHistorySection", "Histórico"],
    settings: ["adminSettingsSection", "Configurações"]
  };

  function switchAdminTab(tab) {
    if (!adminPages[tab]) return;

    Object.entries(adminPages).forEach(([key, [id]]) => {
      $(id).hidden = key !== tab;
    });

    document.querySelectorAll("[data-admin-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.adminTab === tab);
    });

    $("dashboardPageTitle").textContent = adminPages[tab][1];

    if (tab === "dashboard") loadDashboard();
    if (tab === "events") loadAdminEvents();
    if (tab === "schedule") loadScheduleOptions();
    if (tab === "photos") loadAdminPhotos();
    if (tab === "publications") loadPublications();
    if (tab === "history") renderHistory();
  }

  async function openAdminPanel() {
    await loadAdminEvents();
    await loadDashboard();
    $("adminDialog").showModal();
    switchAdminTab("dashboard");
  }

  function goTo(tab) {
    if (tab === "eventForm") resetEventForm();
    switchAdminTab(tab);
  }

  // EVENTOS: LISTA, PESQUISA E FILTROS

  let adminEventsCache = [];

  async function loadAdminEvents() {
    try {
      initializeSupabase();

      const { data, error } = await db.from("eventos")
        .select("id,titulo,descricao,data_evento,imagem_capa,publicado,categoria,local,horario_inicio,destaque")
        .order("data_evento", { ascending: false });

      if (error) throw error;

      adminEventsCache = data || [];
      renderAdminEvents();
      updatePhotoEventOptions(adminEventsCache);
      updateScheduleEventOptions(adminEventsCache);
      updatePhotoFilterOptions(adminEventsCache);
    } catch (error) {
      console.error(error);
      $("adminEventsList").innerHTML = `<p class="admin-message error">${esc(error.message)}</p>`;
    }
  }

  function renderAdminEvents() {
    const search = ($("adminEventSearch")?.value || "").toLowerCase();
    const status = $("adminEventStatusFilter")?.value || "todos";

    const years = [...new Set(adminEventsCache.map(e => e.data_evento?.slice(0, 4)).filter(Boolean))].sort().reverse();

    const yearFilter = $("adminEventYearFilter");
    if (yearFilter) {
      const previous = yearFilter.value;
      yearFilter.innerHTML = `<option value="todos">Todos os anos</option>` +
        years.map(y => `<option value="${y}">${y}</option>`).join("");
      yearFilter.value = years.includes(previous) ? previous : "todos";
    }

    const list = adminEventsCache.filter(e => {
      const matchesSearch = `${e.titulo} ${e.categoria || ""}`.toLowerCase().includes(search);
      const matchesStatus = status === "todos" || (e.publicado ? "publicado" : "rascunho") === status;
      const matchesYear = yearFilter?.value === "todos" || (e.data_evento || "").startsWith(yearFilter?.value || "");
      return matchesSearch && matchesStatus && matchesYear;
    });

    $("adminEventsList").innerHTML = list.length ? list.map(event => `
      <article class="admin-event-row">
        <div class="admin-event-info">
          <strong>${esc(event.titulo)}</strong>
          <p>${formatDate(event.data_evento)} · ${esc(event.categoria || "Evento escolar")}</p>
          <span class="admin-status">${event.publicado ? "Publicado" : "Rascunho"}</span>
          ${event.destaque ? `<span class="admin-status">Destaque</span>` : ""}
        </div>
        <div class="admin-event-actions">
          <button class="button button-small" type="button" data-edit-event="${event.id}">Editar</button>
          <button class="button button-small" type="button" data-duplicate-event="${event.id}">Duplicar</button>
          <button class="button button-small danger-button" type="button" data-delete-event="${event.id}">Excluir</button>
        </div>
      </article>`).join("")
      : `<p class="empty-state">Nenhum evento encontrado.</p>`;
  }

  function updatePhotoEventOptions(list) {
    $("photoEventSelect").innerHTML = `<option value="">Selecione um evento</option>` +
      list.map(e => `<option value="${e.id}">${esc(e.titulo)}</option>`).join("");
  }

  function updateScheduleEventOptions(list) {
    $("scheduleEventSelect").innerHTML = `<option value="">Escolha um evento</option>` +
      list.map(e => `<option value="${e.id}">${esc(e.titulo)}</option>`).join("");
  }

  function updatePhotoFilterOptions(list) {
    $("adminPhotoEventFilter").innerHTML = `<option value="todos">Todos os eventos</option>` +
      list.map(e => `<option value="${e.id}">${esc(e.titulo)}</option>`).join("");
  }

  async function deleteEvent(id) {
    const event = adminEventsCache.find(e => String(e.id) === String(id));
    if (!event) return;

    if (!confirm(`Deseja realmente excluir "${event.titulo}"? Essa ação não poderá ser desfeita.`)) return;

    try {
      const { error } = await db.from("eventos").delete().eq("id", id);
      if (error) throw error;

      addHistory("Evento excluído", event.titulo);
      await loadAdminEvents();
      await loadEventsFromSupabase();
      await loadDashboard();
      alert("Evento excluído com sucesso.");
    } catch (error) {
      alert("Não foi possível excluir o evento: " + error.message);
    }
  }

  async function duplicateEvent(id) {
    const event = adminEventsCache.find(e => String(e.id) === String(id));
    if (!event) return;

    try {
      const values = {
        titulo: `${event.titulo} (cópia)`,
        descricao: event.descricao,
        data_evento: event.data_evento,
        categoria: event.categoria,
        local: event.local,
        horario_inicio: event.horario_inicio,
        publicado: false,
        destaque: false,
        criado_por: currentUser.id
      };

      const { data, error } = await db.from("eventos").insert(values).select("id").single();
      if (error) throw error;

      addHistory("Evento duplicado", event.titulo);
      await loadAdminEvents();
      await editEvent(data.id);
    } catch (error) {
      alert("Não foi possível duplicar: " + error.message);
    }
  }

  // CADASTRO E EDIÇÃO

  function resetEventForm() {
    $("eventForm").reset();
    $("eventId").value = "";
    $("adminFormTitle").textContent = "Cadastrar novo evento";
    $("eventSaveButton").textContent = "Salvar evento";
    currentCoverUrl = "";
    showMessage($("eventFormMessage"), "");
  }

  async function editEvent(id) {
    try {
      const { data, error } = await db.from("eventos").select("*").eq("id", id).single();
      if (error) throw error;

      $("eventId").value = data.id;
      $("eventTitle").value = data.titulo || "";
      $("eventDescription").value = data.descricao || "";
      $("eventDate").value = data.data_evento || "";
      $("eventTime").value = String(data.horario_inicio || "").slice(0, 5);
      $("eventCategory").value = data.categoria || "Evento escolar";
      $("eventLocation").value = data.local || "";
      $("eventFeatured").checked = Boolean(data.destaque);
      $("eventPublished").checked = Boolean(data.publicado);

      currentCoverUrl = data.imagem_capa || "";
      $("adminFormTitle").textContent = "Editar evento";
      $("eventSaveButton").textContent = "Salvar alterações";
      showMessage($("eventFormMessage"), "");
      switchAdminTab("eventForm");
    } catch (error) {
      alert("Não foi possível abrir o evento: " + error.message);
    }
  }

  async function uploadCover(file, eventId) {
    if (!file) return currentCoverUrl;
    if (!file.type.startsWith("image/")) throw new Error("A capa precisa ser uma imagem.");

    const extension = file.name.split(".").pop().toLowerCase();
    const path = `capas/${eventId}-${Date.now()}.${extension}`;

    const { error } = await db.storage.from(BUCKET).upload(path, file);
    if (error) throw error;
    return storagePublicUrl(path);
  }

  async function saveEvent(event) {
    event.preventDefault();

    const button = $("eventSaveButton");
    button.disabled = true;
    button.textContent = "Salvando…";
    showMessage($("eventFormMessage"), "");

    try {
      initializeSupabase();
      if (!currentUser) throw new Error("Sua sessão não está ativa. Entre novamente.");

      const id = $("eventId").value;
      const file = $("eventCover").files[0];

      const values = {
        titulo: $("eventTitle").value.trim(),
        descricao: $("eventDescription").value.trim(),
        data_evento: $("eventDate").value,
        categoria: $("eventCategory").value,
        local: $("eventLocation").value.trim() || SCHOOL,
        horario_inicio: $("eventTime").value || null,
        publicado: $("eventPublished").checked,
        destaque: $("eventFeatured").checked,
        atualizado_em: new Date().toISOString()
      };

      if (!values.titulo || !values.data_evento) {
        throw new Error("Preencha o título e a data do evento.");
      }

      let eventId = id;

      if (id) {
        const { error } = await db.from("eventos").update(values).eq("id", id);
        if (error) throw error;
      } else {
        values.criado_por = currentUser.id;
        const { data, error } = await db.from("eventos").insert(values).select("id").single();
        if (error) throw error;
        eventId = data.id;
      }

      if (file) {
        const coverUrl = await uploadCover(file, eventId);
        const { error } = await db.from("eventos")
          .update({ imagem_capa: coverUrl, atualizado_em: new Date().toISOString() })
          .eq("id", eventId);
        if (error) throw error;
      }

      addHistory(id ? "Evento atualizado" : "Evento criado", values.titulo);
      resetEventForm();
      await loadAdminEvents();
      await loadEventsFromSupabase();
      await loadDashboard();
      switchAdminTab("events");
      alert("Evento salvo com sucesso!");
    } catch (error) {
      console.error(error);
      showMessage($("eventFormMessage"), error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = $("eventId").value ? "Salvar alterações" : "Salvar evento";
    }
  }

  // DASHBOARD E ESTATÍSTICAS

  async function loadDashboard() {
    try {
      initializeSupabase();

      const { data, error } = await db.from("eventos")
        .select("id,titulo,data_evento,publicado,categoria")
        .order("data_evento", { ascending: true });

      if (error) throw error;

      const list = data || [];
      const published = list.filter(e => e.publicado);
      const drafts = list.filter(e => !e.publicado);

      const { count: photoCount, error: photoError } = await db
        .from("fotos_eventos")
        .select("*", { count: "exact", head: true });

      if (photoError) console.warn("Não foi possível contar as fotos:", photoError);

      $("statTotalEvents").textContent = list.length;
      $("statPublishedEvents").textContent = published.length;
      $("statDraftEvents").textContent = drafts.length;
      $("statTotalPhotos").textContent = photoCount ?? "—";

      const recent = list.slice().sort((a, b) => b.id - a.id).slice(0, 5);
      $("dashboardRecentEvents").innerHTML = recent.length ? recent.map(e => `
        <div class="dashboard-event-line">
          <div><strong>${esc(e.titulo)}</strong><small>${formatDate(e.data_evento)}</small></div>
          <span class="admin-status">${e.publicado ? "Publicado" : "Rascunho"}</span>
        </div>`).join("") : `<p class="empty-state">Nenhum evento cadastrado.</p>`;

      const upcoming = published.filter(e => e.data_evento >= todayISO()).slice(0, 5);
      $("dashboardUpcomingEvents").innerHTML = upcoming.length ? upcoming.map(e => `
        <div class="dashboard-event-line">
          <div><strong>${esc(e.titulo)}</strong><small>${formatDate(e.data_evento)}</small></div>
        </div>`).join("") : `<p class="empty-state">Nenhum evento futuro publicado.</p>`;
    } catch (error) {
      console.error("Erro no dashboard:", error);
    }
  }

  // PROGRAMAÇÃO DOS EVENTOS

  async function loadScheduleOptions() {
    await loadAdminEvents();
    const id = $("scheduleEventSelect").value;
    if (id) await selectScheduleEvent(id);
  }

  async function selectScheduleEvent(id) {
    const editor = $("scheduleEditor");
    if (!id) {
      editor.hidden = true;
      return;
    }

    try {
      const { data, error } = await db.from("programacao")
        .select("id,horario,atividade,responsavel,ordem")
        .eq("evento_id", id)
        .order("ordem", { ascending: true });

      if (error) throw error;

      scheduleItems = (data || []).map(item => ({
        id: item.id,
        horario: String(item.horario || "").slice(0, 5),
        atividade: item.atividade || "",
        responsavel: item.responsavel || ""
      }));

      editor.hidden = false;
      renderScheduleItems();
    } catch (error) {
      alert("Erro ao carregar programação: " + error.message);
    }
  }

  function renderScheduleItems() {
    const container = $("scheduleItemsList");

    container.innerHTML = scheduleItems.length ? scheduleItems.map((item, index) => `
      <div class="schedule-editor-row" data-schedule-index="${index}">
        <div class="schedule-editor-fields">
          <div><label>Horário</label><input type="time" data-schedule-field="horario" value="${esc(item.horario)}"></div>
          <div><label>Atividade</label><input type="text" data-schedule-field="atividade" value="${esc(item.atividade)}" placeholder="Nome da atividade"></div>
          <div><label>Responsável</label><input type="text" data-schedule-field="responsavel" value="${esc(item.responsavel)}" placeholder="Responsável"></div>
        </div>
        <div class="schedule-row-actions">
          <button type="button" class="button button-small" data-move-schedule="${index}" data-direction="-1" aria-label="Mover para cima">↑</button>
          <button type="button" class="button button-small" data-move-schedule="${index}" data-direction="1" aria-label="Mover para baixo">↓</button>
          <button type="button" class="button button-small danger-button" data-remove-schedule="${index}">Excluir</button>
        </div>
      </div>`).join("")
      : `<p class="empty-state">Nenhuma atividade adicionada. Use o botão para começar.</p>`;
  }

  function readScheduleInputs() {
    document.querySelectorAll("[data-schedule-index]").forEach(row => {
      const index = Number(row.dataset.scheduleIndex);
      row.querySelectorAll("[data-schedule-field]").forEach(input => {
        scheduleItems[index][input.dataset.scheduleField] = input.value;
      });
    });
  }

  function addScheduleItem() {
    readScheduleInputs();
    scheduleItems.push({ horario: "", atividade: "", responsavel: "" });
    renderScheduleItems();
  }

  async function saveSchedule() {
    const eventId = $("scheduleEventSelect").value;
    if (!eventId) {
      showMessage($("scheduleMessage"), "Selecione um evento.", true);
      return;
    }

    readScheduleInputs();

    const invalid = scheduleItems.some(item => !item.horario || !item.atividade.trim());
    if (invalid) {
      showMessage($("scheduleMessage"), "Preencha o horário e a atividade de cada item.", true);
      return;
    }

    const button = $("saveScheduleButton");
    button.disabled = true;

    try {
      const { error: deleteError } = await db.from("programacao").delete().eq("evento_id", eventId);
      if (deleteError) throw deleteError;

      if (scheduleItems.length) {
        const rows = scheduleItems.map((item, index) => ({
          evento_id: Number(eventId),
          horario: item.horario,
          atividade: item.atividade.trim(),
          responsavel: item.responsavel.trim() || null,
          ordem: index
        }));

        const { error } = await db.from("programacao").insert(rows);
        if (error) throw error;
      }

      addHistory("Programação atualizada", $("scheduleEventSelect").selectedOptions[0].textContent);
      showMessage($("scheduleMessage"), "Programação salva com sucesso!");
      await loadEventsFromSupabase();
    } catch (error) {
      showMessage($("scheduleMessage"), error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  // FOTOGRAFIAS

  async function uploadPhotos(event) {
    event.preventDefault();

    const button = $("photoUploadButton");
    const eventId = $("photoEventSelect").value;
    const files = Array.from($("eventPhotos").files || []);
    const caption = $("photoCaption").value.trim();

    if (!eventId || !files.length) {
      showMessage($("photoFormMessage"), "Selecione um evento e pelo menos uma fotografia.", true);
      return;
    }

    button.disabled = true;
    button.textContent = "Enviando…";

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} não é uma imagem.`);

        const extension = file.name.split(".").pop().toLowerCase();
        const path = `albuns/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

        const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await db.from("fotos_eventos").insert({
          evento_id: Number(eventId),
          caminho: path,
          legenda: caption || file.name
        });

        if (insertError) throw insertError;
      }

      $("photoForm").reset();
      addHistory("Fotografias enviadas", `${files.length} imagem(ns)`);
      showMessage($("photoFormMessage"), "Fotografias enviadas com sucesso!");
      await loadEventsFromSupabase();
      await loadAdminPhotos();
      await loadDashboard();
    } catch (error) {
      console.error(error);
      showMessage($("photoFormMessage"), error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Enviar fotografias";
    }
  }

  async function loadAdminPhotos() {
    try {
      const selected = $("adminPhotoEventFilter").value;

      let query = db.from("fotos_eventos")
        .select("id,evento_id,caminho,legenda,criado_em")
        .order("criado_em", { ascending: false });

      if (selected !== "todos") query = query.eq("evento_id", Number(selected));

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];

      $("adminPhotoList").innerHTML = list.length ? `
        <div class="admin-photo-grid">${list.map(photo => {
          const event = adminEventsCache.find(e => String(e.id) === String(photo.evento_id));
          const url = storagePublicUrl(photo.caminho);
          return `
            <article class="admin-photo-card">
              <img src="${esc(url)}" alt="${esc(photo.legenda || "Fotografia do evento")}">
              <div><strong>${esc(photo.legenda || "Sem legenda")}</strong>
              <small>${esc(event?.titulo || "Evento")}</small></div>
              <button class="button button-small danger-button" type="button" data-delete-photo="${photo.id}" data-photo-path="${esc(photo.caminho)}">Excluir foto</button>
            </article>`;
        }).join("")}</div>`
        : `<p class="empty-state">Nenhuma fotografia encontrada.</p>`;
    } catch (error) {
      $("adminPhotoList").innerHTML = `<p class="admin-message error">${esc(error.message)}</p>`;
    }
  }

  async function deletePhoto(id, path) {
    if (!confirm("Deseja excluir esta fotografia?")) return;

    try {
      const { error: rowError } = await db.from("fotos_eventos").delete().eq("id", id);
      if (rowError) throw rowError;

      const { error: storageError } = await db.storage.from(BUCKET).remove([path]);
      if (storageError) console.warn("Registro excluído, mas o arquivo não foi removido:", storageError);

      addHistory("Fotografia excluída", path);
      await loadAdminPhotos();
      await loadEventsFromSupabase();
      await loadDashboard();
    } catch (error) {
      alert("Não foi possível excluir a fotografia: " + error.message);
    }
  }

  // PUBLICAÇÕES

  async function loadPublications() {
    try {
      const { data, error } = await db.from("eventos")
        .select("id,titulo,data_evento,publicado,destaque")
        .order("data_evento", { ascending: false });

      if (error) throw error;

      const list = data || [];
      $("publicationPublishedCount").textContent = list.filter(e => e.publicado).length;
      $("publicationDraftCount").textContent = list.filter(e => !e.publicado).length;

      $("adminPublicationsList").innerHTML = list.length ? list.map(e => `
        <div class="admin-event-row">
          <div><strong>${esc(e.titulo)}</strong><p>${formatDate(e.data_evento)}</p>
          <span class="admin-status">${e.publicado ? "Publicado" : "Rascunho"}</span></div>
          <button type="button" class="button button-small" data-toggle-publication="${e.id}" data-published="${e.publicado}">
            ${e.publicado ? "Tirar do site" : "Publicar"}
          </button>
        </div>`).join("")
        : `<p class="empty-state">Nenhum evento cadastrado.</p>`;
    } catch (error) {
      $("adminPublicationsList").innerHTML = `<p class="admin-message error">${esc(error.message)}</p>`;
    }
  }

  async function togglePublication(id, published) {
    const next = !published;
    const { error } = await db.from("eventos")
      .update({ publicado: next, atualizado_em: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      alert("Não foi possível alterar a publicação: " + error.message);
      return;
    }

    addHistory(next ? "Evento publicado" : "Publicação retirada", `Evento #${id}`);
    await loadPublications();
    await loadAdminEvents();
    await loadEventsFromSupabase();
    await loadDashboard();
  }

  // TEMA E INTERFACE

  function setTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark", dark);
    $("themeIcon").textContent = dark ? "☀" : "☾";
    $("themeLabel").textContent = dark ? "Modo claro" : "Modo escuro";
    $("themeToggle").setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0b1220" : "#174ea6");
  }

  let initialTheme = "light";
  try {
    initialTheme = localStorage.getItem("role-na-escola-theme") || "light";
  } catch {}

  setTheme(initialTheme === "dark" ? "dark" : "light");

  $("themeToggle").addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("role-na-escola-theme", next);
    } catch {}
  });

  $("yearFilter").addEventListener("change", renderGallery);
  $("loginForm").addEventListener("submit", handleLogin);
  $("eventForm").addEventListener("submit", saveEvent);
  $("photoForm").addEventListener("submit", uploadPhotos);
  $("adminLogout").addEventListener("click", logout);
  $("settingsLogout").addEventListener("click", logout);

  $("eventCancelButton").addEventListener("click", () => {
    resetEventForm();
    switchAdminTab("events");
  });

  $("adminEventSearch").addEventListener("input", renderAdminEvents);
  $("adminEventStatusFilter").addEventListener("change", renderAdminEvents);
  $("adminEventYearFilter").addEventListener("change", renderAdminEvents);
  $("scheduleEventSelect").addEventListener("change", e => selectScheduleEvent(e.target.value));
  $("addScheduleItem").addEventListener("click", addScheduleItem);
  $("saveScheduleButton").addEventListener("click", saveSchedule);
  $("adminPhotoEventFilter").addEventListener("change", loadAdminPhotos);

  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => goTo(button.dataset.adminTab));
  });

  document.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-event]");
    if (opener) openEvent(opener.dataset.openEvent);

    const closer = event.target.closest("[data-close]");
    if (closer) $(closer.dataset.close).close();

    if (event.target.id === "teamLogin" || event.target.id === "footerLogin") {
      $("loginDialog").showModal();
    }

    const edit = event.target.closest("[data-edit-event]");
    if (edit) editEvent(edit.dataset.editEvent);

    const remove = event.target.closest("[data-delete-event]");
    if (remove) deleteEvent(remove.dataset.deleteEvent);

    const duplicate = event.target.closest("[data-duplicate-event]");
    if (duplicate) duplicateEvent(duplicate.dataset.duplicateEvent);

    const photoRemove = event.target.closest("[data-delete-photo]");
    if (photoRemove) deletePhoto(photoRemove.dataset.deletePhoto, photoRemove.dataset.photoPath);

    const publication = event.target.closest("[data-toggle-publication]");
    if (publication) togglePublication(publication.dataset.togglePublication, publication.dataset.published === "true");

    const action = event.target.closest("[data-admin-action]");
    if (action) {
      const target = action.dataset.adminAction;
      if (target === "new-event") goTo("eventForm");
      if (target === "photos") goTo("photos");
      if (target === "schedule") goTo("schedule");
      if (target === "public-site") window.open(window.location.href.split("#")[0], "_blank", "noopener");
    }

    const removeSchedule = event.target.closest("[data-remove-schedule]");
    if (removeSchedule) {
      readScheduleInputs();
      scheduleItems.splice(Number(removeSchedule.dataset.removeSchedule), 1);
      renderScheduleItems();
    }

    const moveSchedule = event.target.closest("[data-move-schedule]");
    if (moveSchedule) {
      readScheduleInputs();
      const index = Number(moveSchedule.dataset.moveSchedule);
      const direction = Number(moveSchedule.dataset.direction);
      const target = index + direction;
      if (target >= 0 && target < scheduleItems.length) {
        [scheduleItems[index], scheduleItems[target]] = [scheduleItems[target], scheduleItems[index]];
        renderScheduleItems();
      }
    }

    if (event.target.closest("#mainNav a")) {
      $("mainNav").classList.remove("open");
      $("menuToggle").setAttribute("aria-expanded", "false");
    }
  });

  $("menuToggle").addEventListener("click", () => {
    const nav = $("mainNav");
    const open = nav.classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(open));
  });

  // INICIALIZAÇÃO

  renderAll();
  loadEventsFromSupabase();
  restoreSession();
})();
