
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const BUCKET = "fotos-eventos";
  const SCHOOL = "Colégio de Tempo Integral Filomena Pereira Rodrigues";

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const formatDate = (date) => {
    if (!date) return "Data a confirmar";
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
  };

  const monthName = (date) => date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
    : "";

  const photoPlaceholder = (title) =>
    `<div class="featured-placeholder"><span>ROLÊ NA ESCOLA<br><br>${esc(title).slice(0, 70)}</span></div>`;

  const safeUrl = (value) => {
    try {
      const u = new URL(value);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  };

  const demoEvents = [
    {
      id: "biomas-bahia-2026",
      titulo: "Biomas da Bahia — O que sobrará para o futuro?",
      descricao: "Evento escolar dedicado à reflexão sobre os biomas da Bahia, a preservação ambiental e o futuro. Confira a programação completa das atividades.",
      categoria: "Meio ambiente",
      data: "2026-10-30",
      horario_inicio: "08:00",
      local: SCHOOL,
      imagem_capa: "",
      estado: "publicado",
      destaque: true,
      cronograma: [
        { horario: "08:00", atividade: "Abertura oficial — Jéssica" },
        { horario: "08:10", atividade: "Fala da diretoria — Bia" },
        { horario: "08:20", atividade: "Fala dos estudantes — Says Havalos" },
        { horario: "08:30", atividade: "Palestra — Biólogo Ermersson Douglas" },
        { horario: "09:10", atividade: "Intervalo" },
        { horario: "09:30", atividade: "Fim do intervalo" },
        { horario: "09:30", atividade: "Palestra — Químico Eldo Gomes" },
        { horario: "10:00", atividade: "Desfile com matérias recicláveis — 2° B" },
        { horario: "10:20", atividade: "Abertura das salas temáticas — Yasmin" },
        { horario: "11:05", atividade: "Exposição de materiais matemáticos recicláveis — 3° A" },
        { horario: "11:20", atividade: "Sala temática: queimadas — 3° B" },
        { horario: "11:35", atividade: "Jogos matemáticos — 1° A com Edineia" },
        { horario: "11:50", atividade: "Jogos matemáticos — 2° A com Edineia" },
        { horario: "11:50", atividade: "Exposição de maquetes químicas — 2° B, com Bonifácio" },
        { horario: "11:50", atividade: "Paródia — 2° A, com Eliene" },
        { horario: "12:00", atividade: "Intervalo" },
        { horario: "13:00", atividade: "Fim do intervalo" },
        { horario: "13:00", atividade: "Oficina de fotografia — Natan" },
        { horario: "13:00", atividade: "Oficina de bem-estar / meio ambiente / Sabonete artesanal — responsável a confirmar" }
      ],
      fotografias: []
    },
    {
      id: "demo-ist",
      titulo: "Conversa sobre doenças sexualmente transmissíveis",
      descricao: "Registro de uma atividade educativa dedicada à prevenção das infecções sexualmente transmissíveis (ISTs), à conscientização sobre saúde sexual, à importância da informação confiável e às formas de prevenção.",
      categoria: "Saúde e conscientização",
      data: null,
      horario_inicio: null,
      local: SCHOOL,
      imagem_capa: "",
      estado: "publicado",
      destaque: true,
      cronograma: [],
      fotografias: []
    },
    {
      id: "demo-vape",
      titulo: "Os malefícios do uso do cigarro eletrônico",
      descricao: "Registro de uma atividade educativa sobre os riscos associados ao uso de cigarros eletrônicos, seus possíveis impactos na saúde, a dependência de nicotina e a importância da prevenção e da conscientização entre os jovens.",
      categoria: "Saúde e conscientização",
      data: null,
      horario_inicio: null,
      local: SCHOOL,
      imagem_capa: "",
      estado: "publicado",
      destaque: false,
      cronograma: [],
      fotografias: []
    }
  ];

  let events = [...demoEvents];
  let db = null;
  let currentUser = null;
  let currentCoverUrl = "";

  // --------------------------------------------------
  // SUPABASE
  // --------------------------------------------------

  function initializeSupabase() {
    if (db) return db;

    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_KEY
    ) {
      throw new Error("A configuração do Supabase não foi encontrada. Confira o arquivo supabase-config.js.");
    }

    db = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_KEY
    );

    return db;
  }

  function storagePublicUrl(path) {
    if (!path) return "";
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  async function loadPhotosForEvents(eventList) {
    const ids = eventList
      .map(e => Number(e.id))
      .filter(Number.isFinite);

    if (!ids.length) return;

    const { data, error } = await db
      .from("fotos_eventos")
      .select("id,evento_id,caminho,legenda,criado_em")
      .in("evento_id", ids);

    if (error) {
      console.error("Não foi possível carregar os álbuns:", error);
      return;
    }

    for (const event of eventList) {
      if (!Number.isFinite(Number(event.id))) continue;

      event.fotografias = (data || [])
        .filter(photo => String(photo.evento_id) === String(event.id))
        .map(photo => ({
          id: photo.id,
          caminho: photo.caminho,
          url: storagePublicUrl(photo.caminho),
          alt: photo.legenda || event.titulo
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

      const loadedEvents = [];

      for (const row of data || []) {
        const previous = demoEvents.find(
          e => e.titulo.trim().toLowerCase() === row.titulo.trim().toLowerCase()
        );

        const { data: agenda, error: agendaError } = await db
          .from("programacao")
          .select("id,evento_id,horario,atividade,responsavel,ordem")
          .eq("evento_id", row.id)
          .order("ordem", { ascending: true });

        if (agendaError) throw agendaError;

        const databaseSchedule = (agenda || []).map(item => ({
          horario: String(item.horario || "").slice(0, 5),
          atividade: item.responsavel
            ? `${item.atividade} — ${item.responsavel}`
            : item.atividade
        }));

        loadedEvents.push({
          id: String(row.id),
          titulo: row.titulo,
          descricao: row.descricao || previous?.descricao || "",
          categoria: row.categoria || previous?.categoria || "Evento escolar",
          data: row.data_evento,
          horario_inicio: String(row.horario_inicio || "").slice(0, 5) ||
            databaseSchedule[0]?.horario ||
            previous?.horario_inicio ||
            null,
          local: row.local || previous?.local || SCHOOL,
          imagem_capa: row.imagem_capa || previous?.imagem_capa || "",
          estado: row.publicado ? "publicado" : "rascunho",
          destaque: row.destaque ?? previous?.destaque ?? false,
          cronograma: databaseSchedule.length
            ? databaseSchedule
            : (previous?.cronograma || []),
          fotografias: []
        });
      }

      for (const demo of demoEvents) {
        const alreadyExists = loadedEvents.some(
          e => e.titulo.trim().toLowerCase() === demo.titulo.trim().toLowerCase()
        );

        if (!alreadyExists) loadedEvents.push({ ...demo });
      }

      await loadPhotosForEvents(loadedEvents);

      events = loadedEvents;
      renderAll();

      console.log("Eventos carregados:", events);

    } catch (error) {
      console.error("Erro ao carregar eventos do Supabase:", error);
      events = [...demoEvents];
      renderAll();
    }
  }

  function renderAll() {
    renderFeatured();
    renderAgenda();
    renderGallery();
  }

  // --------------------------------------------------
  // EXIBIÇÃO PÚBLICA
  // --------------------------------------------------

  function coverMarkup(event) {
    const url = safeUrl(event.imagem_capa);
    if (url) {
      return `<img src="${esc(url)}" alt="Imagem de ${esc(event.titulo)}" loading="lazy">`;
    }
    return photoPlaceholder(event.titulo);
  }

  function publicEvents() {
    return events.filter(e => e.estado === "publicado");
  }

  function selectFeatured() {
    const list = publicEvents();
    const today = todayISO();
    const todays = list.filter(e => e.data === today);

    if (todays.length) {
      return {
        event: todays.find(e => e.destaque) || todays[0],
        label: "Acontecendo hoje"
      };
    }

    const upcoming = list
      .filter(e => e.data && e.data > today)
      .sort((a, b) => a.data.localeCompare(b.data));

    if (upcoming.length) {
      return { event: upcoming[0], label: "Próximo evento" };
    }

    const dated = list
      .filter(e => e.data)
      .sort((a, b) => b.data.localeCompare(a.data));

    return {
      event: list.find(e => e.destaque) || dated[0] || list[0],
      label: "Registro em destaque"
    };
  }

  function renderFeatured() {
    const selected = selectFeatured();

    if (!selected) {
      $("featuredEvent").innerHTML =
        `<div class="empty-state">Ainda não há eventos publicados.</div>`;
      return;
    }

    const e = selected.event;

    $("featuredEvent").innerHTML = `
      <article class="featured-card">
        <div class="featured-art">${coverMarkup(e)}</div>
        <div class="featured-content">
          <span class="pill">${esc(selected.label)}</span>
          <h3>${esc(e.titulo)}</h3>
          <p>${esc(e.descricao)}</p>
          <div class="meta-row">
            <span>◷ ${formatDate(e.data)}</span>
            <span>⌖ ${esc(e.local || "Local a confirmar")}</span>
          </div>
          <button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">
            Ver cobertura <span>→</span>
          </button>
        </div>
      </article>`;
  }

  function renderAgenda() {
    const today = todayISO();

    const upcoming = publicEvents()
      .filter(e => e.data && e.data >= today)
      .sort((a, b) =>
        a.data.localeCompare(b.data) ||
        (a.horario_inicio || "").localeCompare(b.horario_inicio || "")
      );

    if (!upcoming.length) {
      $("nextEvent").innerHTML = `
        <div class="empty-state">
          <strong>Nenhum evento futuro cadastrado ainda.</strong><br>
          Quando a equipe confirmar uma data, o próximo evento e o cronograma aparecerão automaticamente aqui.
        </div>`;
      $("otherUpcoming").innerHTML = "";
      return;
    }

    const e = upcoming[0];
    const agenda = Array.isArray(e.cronograma) ? e.cronograma : [];

    const timeline = agenda.length
      ? agenda.slice()
          .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""))
          .map(item => `
            <li>
              <time>${esc(item.horario || "Horário a confirmar")}</time>
              <p>${esc(item.atividade || "Atividade a confirmar")}</p>
            </li>
          `).join("")
      : `
        <li>
          <time>${esc(e.horario_inicio || "Horário a confirmar")}</time>
          <p>${esc(e.titulo)}</p>
        </li>`;

    $("nextEvent").innerHTML = `
      <article class="next-event-card">
        <div class="next-main">
          <span class="pill">${e.data === today ? "Acontecendo hoje" : "Próximo compromisso"}</span>
          <h3>${esc(e.titulo)}</h3>
          <p>${esc(e.descricao)}</p>
          <div class="event-facts">
            <span class="fact">▣ ${formatDate(e.data)}</span>
            <span class="fact">◷ ${esc(e.horario_inicio || "Horário a confirmar")}</span>
            <span class="fact">⌖ ${esc(e.local || "Local a confirmar")}</span>
          </div>
          <button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">
            Ver detalhes <span>→</span>
          </button>
        </div>
        <aside class="timeline-panel">
          <h4>⌁ Cronograma do evento</h4>
          <ol class="timeline">${timeline}</ol>
        </aside>
      </article>`;

    $("otherUpcoming").innerHTML = upcoming.slice(1).map(item => `
      <article class="upcoming-row">
        <div class="date-box">
          <strong>${item.data.slice(8, 10)}</strong>
          <span>${monthName(item.data)}</span>
        </div>
        <div>
          <h4>${esc(item.titulo)}</h4>
          <p>${formatDate(item.data)} · ${esc(item.horario_inicio || "Horário a confirmar")}</p>
        </div>
      </article>
    `).join("");
  }

  function renderGallery() {
    const previous = $("yearFilter").value;

    const years = [...new Set(
      publicEvents()
        .map(e => e.data ? e.data.slice(0, 4) : null)
        .filter(Boolean)
    )].sort().reverse();

    $("yearFilter").innerHTML =
      `<option value="todos">Todos os anos</option>` +
      years.map(y => `<option value="${y}">${y}</option>`).join("");

    $("yearFilter").value = years.includes(previous) ? previous : "todos";

    const chosen = $("yearFilter").value;

    const list = publicEvents().filter(e =>
      chosen === "todos" || (e.data || "").startsWith(chosen)
    );

    $("eventGrid").innerHTML = list.length
      ? list.map(e => `
          <article class="event-card">
            <div class="event-art">${coverMarkup(e)}</div>
            <div class="event-body">
              <span class="pill">${esc(e.categoria || "Evento escolar")}</span>
              <h3>${esc(e.titulo)}</h3>
              <p>${esc(e.descricao.length > 125 ? e.descricao.slice(0, 125) + "…" : e.descricao)}</p>
              <div class="event-date">▣ ${formatDate(e.data)}</div>
              <button class="button button-primary button-small" type="button" data-open-event="${esc(e.id)}">
                Ver cobertura <span>→</span>
              </button>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state">Nenhum evento encontrado para este filtro.</div>`;
  }

  async function openEvent(id) {
    const e = events.find(item => String(item.id) === String(id));
    if (!e) return;

    const photos = Array.isArray(e.fotografias) ? e.fotografias : [];

    const photoHtml = photos.length
      ? `<div class="modal-photos">${photos.map(p => {
          const u = safeUrl(p.url);
          return u
            ? `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(p.alt || e.titulo)}" loading="lazy"></a>`
            : "";
        }).join("")}</div>`
      : `<p>As fotografias deste evento serão adicionadas pela equipe.</p>`;

    const timeline = Array.isArray(e.cronograma) && e.cronograma.length
      ? `<h3>Cronograma</h3><ol class="timeline">${e.cronograma.map(x => `
          <li>
            <time>${esc(x.horario || "A confirmar")}</time>
            <p>${esc(x.atividade || "Atividade")}</p>
          </li>
        `).join("")}</ol>`
      : "";

    $("eventDetails").innerHTML = `
      <span class="pill">${esc(e.categoria || "Evento escolar")}</span>
      <h2>${esc(e.titulo)}</h2>
      <p>▣ ${formatDate(e.data)}　⌖ ${esc(e.local || "Local a confirmar")}</p>
      ${safeUrl(e.imagem_capa)
        ? `<img class="modal-cover" src="${esc(safeUrl(e.imagem_capa))}" alt="${esc(e.titulo)}">`
        : ""}
      <p>${esc(e.descricao)}</p>
      ${timeline}
      <h3>Álbum fotográfico</h3>
      ${photoHtml}`;

    $("eventDialog").showModal();
  }

  // --------------------------------------------------
  // LOGIN E AUTORIZAÇÃO DO ADMINISTRADOR
  // --------------------------------------------------

  function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("success", !isError && Boolean(message));
  }

  async function checkAdministrator(user) {
    const { data, error } = await db
      .from("administradores")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;
    const button = $("loginSubmit");

    showMessage($("loginError"), "");
    button.disabled = true;
    button.textContent = "Verificando…";

    try {
      initializeSupabase();

      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;
      const authorized = await checkAdministrator(user);

      if (!authorized) {
        await db.auth.signOut();
        throw new Error("Esta conta não tem autorização de administrador.");
      }

      currentUser = user;
      $("loginDialog").close();
      $("loginForm").reset();

      await loadAdminEvents();
      $("adminDialog").showModal();

    } catch (error) {
      console.error("Erro no login:", error);
      showMessage(
        $("loginError"),
        error.message || "Não foi possível entrar. Confira seus dados.",
        true
      );
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

      const authorized = await checkAdministrator(user);

      if (authorized) {
        currentUser = user;
      } else {
        await db.auth.signOut();
      }
    } catch (error) {
      console.warn("Não foi possível restaurar a sessão:", error);
    }
  }

  async function logout() {
    try {
      if (db) await db.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    currentUser = null;
    $("adminDialog").close();
    $("loginDialog").close();
    $("loginForm").reset();
  }

  // --------------------------------------------------
  // PAINEL ADMINISTRATIVO
  // --------------------------------------------------

  function switchAdminTab(tab) {
    const sections = {
      events: "adminEventsSection",
      eventForm: "adminEventFormSection",
      photos: "adminPhotosSection"
    };

    Object.entries(sections).forEach(([key, id]) => {
      $(id).hidden = key !== tab;
    });

    document.querySelectorAll("[data-admin-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.adminTab === tab);
    });
  }

  async function loadAdminEvents() {
    try {
      initializeSupabase();

      const { data, error } = await db
        .from("eventos")
        .select("id,titulo,descricao,data_evento,imagem_capa,publicado,categoria,local,horario_inicio,destaque")
        .order("data_evento", { ascending: false });

      if (error) throw error;

      renderAdminEvents(data || []);
      updatePhotoEventOptions(data || []);

    } catch (error) {
      console.error("Erro ao carregar painel:", error);
      $("adminEventsList").innerHTML =
        `<p class="admin-message error">${esc(error.message)}</p>`;
    }
  }

  function renderAdminEvents(list) {
    if (!list.length) {
      $("adminEventsList").innerHTML =
        `<p class="empty-state">Ainda não há eventos cadastrados no banco de dados.</p>`;
      return;
    }

    $("adminEventsList").innerHTML = list.map(event => `
      <article class="admin-event-row">
        <div>
          <strong>${esc(event.titulo)}</strong>
          <p>${formatDate(event.data_evento)} · ${esc(event.categoria || "Evento escolar")}</p>
          <span class="admin-status">${event.publicado ? "Publicado" : "Rascunho"}</span>
        </div>
        <button class="button button-small" type="button" data-edit-event="${event.id}">
          Editar
        </button>
      </article>
    `).join("");
  }

  function updatePhotoEventOptions(list) {
    $("photoEventSelect").innerHTML =
      `<option value="">Selecione um evento</option>` +
      list.map(event => `
        <option value="${event.id}">${esc(event.titulo)}</option>
      `).join("");
  }

  function resetEventForm() {
    $("eventForm").reset();
    $("eventId").value = "";
    $("adminFormTitle").textContent = "Cadastrar evento";
    $("eventSaveButton").textContent = "Salvar evento";
    currentCoverUrl = "";
    showMessage($("eventFormMessage"), "");
  }

  async function editEvent(id) {
    try {
      const { data, error } = await db
        .from("eventos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      $("eventId").value = data.id;
      $("eventTitle").value = data.titulo || "";
      $("eventDescription").value = data.descricao || "";
      $("eventDate").value = data.data_evento || "";
      $("eventTime").value = String(data.horario_inicio || "").slice(0, 5);
      $("eventCategory").value = data.categoria || "";
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

    if (!file.type.startsWith("image/")) {
      throw new Error("O arquivo da capa precisa ser uma imagem.");
    }

    const extension = file.name.split(".").pop().toLowerCase();
    const path = `capas/${eventId}-${Date.now()}.${extension}`;

    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

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

      if (!currentUser) {
        throw new Error("Sua sessão não está ativa. Entre novamente.");
      }

      const id = $("eventId").value;
      const file = $("eventCover").files[0];

      const values = {
        titulo: $("eventTitle").value.trim(),
        descricao: $("eventDescription").value.trim(),
        data_evento: $("eventDate").value,
        categoria: $("eventCategory").value.trim() || "Evento escolar",
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
        const { error } = await db
          .from("eventos")
          .update(values)
          .eq("id", id);

        if (error) throw error;
      } else {
        values.criado_por = currentUser.id;

        const { data, error } = await db
          .from("eventos")
          .insert(values)
          .select("id")
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      if (file) {
        const coverUrl = await uploadCover(file, eventId);

        const { error } = await db
          .from("eventos")
          .update({
            imagem_capa: coverUrl,
            atualizado_em: new Date().toISOString()
          })
          .eq("id", eventId);

        if (error) throw error;
      }

      showMessage($("eventFormMessage"), "Evento salvo com sucesso!");
      resetEventForm();

      await loadAdminEvents();
      await loadEventsFromSupabase();
      switchAdminTab("events");

    } catch (error) {
      console.error("Erro ao salvar evento:", error);
      showMessage($("eventFormMessage"), error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = $("eventId").value
        ? "Salvar alterações"
        : "Salvar evento";
    }
  }

  // --------------------------------------------------
  // ENVIO DE FOTOS PARA O ÁLBUM
  // --------------------------------------------------

  async function uploadPhotos(event) {
    event.preventDefault();

    const button = $("photoUploadButton");
    const eventId = $("photoEventSelect").value;
    const files = Array.from($("eventPhotos").files || []);
    const caption = $("photoCaption").value.trim();

    showMessage($("photoFormMessage"), "");

    if (!eventId || !files.length) {
      showMessage($("photoFormMessage"), "Selecione um evento e pelo menos uma foto.", true);
      return;
    }

    button.disabled = true;
    button.textContent = "Enviando fotos…";

    try {
      initializeSupabase();

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`O arquivo ${file.name} não é uma imagem.`);
        }

        const extension = file.name.split(".").pop().toLowerCase();
        const path = `albuns/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

        const { error: uploadError } = await db.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { error: insertError } = await db
          .from("fotos_eventos")
          .insert({
            evento_id: Number(eventId),
            caminho: path,
            legenda: caption || file.name
          });

        if (insertError) throw insertError;
      }

      $("photoForm").reset();
      showMessage($("photoFormMessage"), "Fotos enviadas com sucesso!");

      await loadEventsFromSupabase();
      await loadAdminEvents();

    } catch (error) {
      console.error("Erro ao enviar fotos:", error);
      showMessage($("photoFormMessage"), error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Enviar fotos";
    }
  }

  // --------------------------------------------------
  // TEMA E EVENTOS DE INTERFACE
  // --------------------------------------------------

  function setTheme(theme) {
    const dark = theme === "dark";

    document.body.classList.toggle("dark", dark);
    $("themeIcon").textContent = dark ? "☀" : "☾";
    $("themeLabel").textContent = dark ? "Modo claro" : "Modo escuro";
    $("themeToggle").setAttribute(
      "aria-label",
      dark ? "Ativar modo claro" : "Ativar modo escuro"
    );

    document.querySelector('meta[name="theme-color"]')
      .setAttribute("content", dark ? "#0b1220" : "#174ea6");
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

  $("menuToggle").addEventListener("click", () => {
    const nav = $("mainNav");
    const open = nav.classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(open));
  });

  $("loginForm").addEventListener("submit", handleLogin);
  $("eventForm").addEventListener("submit", saveEvent);
  $("photoForm").addEventListener("submit", uploadPhotos);
  $("adminLogout").addEventListener("click", logout);

  $("eventCancelButton").addEventListener("click", () => {
    resetEventForm();
    switchAdminTab("events");
  });

  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.adminTab === "eventForm") resetEventForm();
      switchAdminTab(button.dataset.adminTab);
    });
  });

  document.addEventListener("click", event => {
    const opener = event.target.closest("[data-open-event]");
    if (opener) openEvent(opener.dataset.openEvent);

    const closer = event.target.closest("[data-close]");
    if (closer) $(closer.dataset.close).close();

    if (event.target.id === "teamLogin" || event.target.id === "footerLogin") {
      $("loginDialog").showModal();
    }

    const editButton = event.target.closest("[data-edit-event]");
    if (editButton) editEvent(editButton.dataset.editEvent);

    if (event.target.closest("#mainNav a")) {
      $("mainNav").classList.remove("open");
      $("menuToggle").setAttribute("aria-expanded", "false");
    }
  });

  // --------------------------------------------------
  // INICIALIZAÇÃO
  // --------------------------------------------------

  renderAll();

  loadEventsFromSupabase();
  restoreSession();
})();
