/* ============================================================
   JARASTAY — HOTEL OS
   Frontend conectado à API real
   ============================================================ */

(() => {
  "use strict";

  const API = "/api";

  const state = {
    token: localStorage.getItem("jarastay_token") || "",
    user: null,
    properties: [],
    property: null,
    dashboard: null,
    rooms: [],
    guests: [],
    reservations: [],
    housekeeping: [],
    ledger: [],
    currentPage: "dashboard",
    loading: false
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const esc = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const money = value =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));

  const dateBR = value => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("pt-BR");
  };

  const today = () => new Date().toISOString().slice(0, 10);

  function toast(message, type = "success") {
    let box = $("#jsToast");

    if (!box) {
      box = document.createElement("div");
      box.id = "jsToast";
      box.className = "js-toast";
      document.body.appendChild(box);
    }

    box.className = `js-toast ${type}`;
    box.textContent = message;
    box.classList.add("show");

    clearTimeout(window.__jarastayToast);
    window.__jarastayToast = setTimeout(() => {
      box.classList.remove("show");
    }, 2800);
  }

  async function api(path, options = {}) {
    const config = {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {})
      }
    };

    if (state.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }

    if (config.body && typeof config.body !== "string" &&
        !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API}${path}`, config);

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) {
      logout(false);
      throw new Error("Sessão expirada.");
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `Erro HTTP ${response.status}`
      );
    }

    return data;
  }

  /* ============================================================
     ESTILOS DO FRONTEND
     ============================================================ */

  function injectStyles() {
    if ($("#jarastayRuntimeStyles")) return;

    const style = document.createElement("style");
    style.id = "jarastayRuntimeStyles";

    style.textContent = `
      :root {
        --js-bg:#f4f7fb;
        --js-panel:#ffffff;
        --js-dark:#0b1220;
        --js-dark2:#111c31;
        --js-blue:#2563eb;
        --js-blue2:#1d4ed8;
        --js-green:#10b981;
        --js-orange:#f59e0b;
        --js-red:#ef4444;
        --js-purple:#7c3aed;
        --js-text:#172033;
        --js-muted:#64748b;
        --js-line:#e5eaf1;
        --js-shadow:0 12px 35px rgba(15,23,42,.08);
        --js-radius:16px;
      }

      * {
        box-sizing:border-box;
      }

      body {
        margin:0;
        background:var(--js-bg);
        color:var(--js-text);
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,
          BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      button,input,select,textarea {
        font:inherit;
      }

      button {
        cursor:pointer;
      }

      .js-shell {
        min-height:100vh;
        display:flex;
      }

      .js-sidebar {
        width:255px;
        background:linear-gradient(180deg,#0b1220,#0a101c);
        color:white;
        position:fixed;
        left:0;
        top:0;
        bottom:0;
        z-index:50;
        display:flex;
        flex-direction:column;
        transition:.25s;
      }

      .js-brand {
        height:76px;
        display:flex;
        align-items:center;
        gap:11px;
        padding:0 20px;
        border-bottom:1px solid rgba(255,255,255,.08);
        font-weight:900;
        font-size:19px;
      }

      .js-logo {
        width:38px;
        height:38px;
        display:grid;
        place-items:center;
        border-radius:12px;
        background:linear-gradient(135deg,#38bdf8,#2563eb);
        box-shadow:0 8px 25px rgba(37,99,235,.35);
      }

      .js-sidebar small {
        color:#8190a8;
        display:block;
        padding:20px 20px 8px;
        font-size:10px;
        font-weight:800;
        letter-spacing:1px;
      }

      .js-nav {
        padding:0 10px;
        overflow:auto;
      }

      .js-nav button {
        width:100%;
        border:0;
        background:transparent;
        color:#aab7c9;
        padding:11px 13px;
        border-radius:11px;
        display:flex;
        align-items:center;
        gap:11px;
        text-align:left;
        margin:2px 0;
        font-weight:650;
        font-size:13px;
      }

      .js-nav button:hover,
      .js-nav button.active {
        background:#18263d;
        color:white;
      }

      .js-nav .ico {
        width:22px;
        text-align:center;
        font-size:16px;
      }

      .js-sidebar-footer {
        margin-top:auto;
        padding:15px;
        border-top:1px solid rgba(255,255,255,.08);
      }

      .js-user-mini {
        display:flex;
        align-items:center;
        gap:10px;
      }

      .js-avatar {
        width:37px;
        height:37px;
        border-radius:50%;
        display:grid;
        place-items:center;
        background:#243551;
        color:#fff;
        font-weight:800;
      }

      .js-user-mini strong {
        display:block;
        font-size:12px;
      }

      .js-user-mini span {
        display:block;
        color:#8090a7;
        font-size:10px;
        margin-top:2px;
      }

      .js-main {
        margin-left:255px;
        min-width:0;
        flex:1;
      }

      .js-topbar {
        height:76px;
        background:#fff;
        border-bottom:1px solid var(--js-line);
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:0 28px;
        position:sticky;
        top:0;
        z-index:30;
      }

      .js-title h1 {
        margin:0;
        font-size:20px;
        letter-spacing:-.5px;
      }

      .js-title p {
        margin:3px 0 0;
        color:var(--js-muted);
        font-size:11px;
      }

      .js-top-actions {
        display:flex;
        align-items:center;
        gap:8px;
      }

      .js-content {
        padding:26px;
        max-width:1700px;
        margin:auto;
      }

      .js-page {
        display:none;
      }

      .js-page.active {
        display:block;
      }

      .js-grid {
        display:grid;
        gap:16px;
      }

      .js-grid-4 {
        grid-template-columns:repeat(4,1fr);
      }

      .js-grid-3 {
        grid-template-columns:repeat(3,1fr);
      }

      .js-grid-2 {
        grid-template-columns:repeat(2,1fr);
      }

      .js-card {
        background:#fff;
        border:1px solid var(--js-line);
        border-radius:var(--js-radius);
        box-shadow:var(--js-shadow);
      }

      .js-card-body {
        padding:19px;
      }

      .js-kpi {
        padding:19px;
        position:relative;
        overflow:hidden;
      }

      .js-kpi:after {
        content:"";
        position:absolute;
        width:80px;
        height:80px;
        right:-35px;
        top:-35px;
        border-radius:50%;
        background:rgba(37,99,235,.06);
      }

      .js-kpi-label {
        color:var(--js-muted);
        font-size:11px;
        font-weight:750;
        text-transform:uppercase;
        letter-spacing:.5px;
      }

      .js-kpi-value {
        font-size:28px;
        font-weight:900;
        margin-top:9px;
        letter-spacing:-1px;
      }

      .js-kpi-meta {
        margin-top:7px;
        font-size:11px;
        color:var(--js-muted);
      }

      .js-section-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:14px;
      }

      .js-section-head h2 {
        font-size:15px;
        margin:0;
      }

      .js-btn {
        border:1px solid var(--js-line);
        background:#fff;
        color:var(--js-text);
        border-radius:10px;
        padding:9px 13px;
        font-weight:750;
        font-size:12px;
      }

      .js-btn:hover {
        background:#f8fafc;
      }

      .js-btn.primary {
        color:#fff;
        border-color:var(--js-blue);
        background:var(--js-blue);
      }

      .js-btn.primary:hover {
        background:var(--js-blue2);
      }

      .js-btn.danger {
        color:#fff;
        background:var(--js-red);
        border-color:var(--js-red);
      }

      .js-btn.ghost-dark {
        color:#fff;
        background:#16243b;
        border-color:#263955;
      }

      .js-actions {
        display:flex;
        gap:7px;
        flex-wrap:wrap;
      }

      .js-table-wrap {
        overflow:auto;
      }

      table {
        width:100%;
        border-collapse:collapse;
        min-width:650px;
      }

      th {
        text-align:left;
        padding:12px 15px;
        background:#f8fafc;
        color:#718096;
        font-size:10px;
        letter-spacing:.5px;
        text-transform:uppercase;
      }

      td {
        padding:14px 15px;
        border-top:1px solid #edf0f4;
        font-size:12px;
      }

      tr:hover td {
        background:#fbfdff;
      }

      .js-badge {
        display:inline-flex;
        align-items:center;
        padding:5px 8px;
        border-radius:999px;
        font-size:10px;
        font-weight:800;
      }

      .js-badge.green {
        background:#dcfce7;
        color:#166534;
      }

      .js-badge.blue {
        background:#dbeafe;
        color:#1e40af;
      }

      .js-badge.orange {
        background:#fef3c7;
        color:#92400e;
      }

      .js-badge.red {
        background:#fee2e2;
        color:#991b1b;
      }

      .js-badge.gray {
        background:#eef2f7;
        color:#475569;
      }

      .js-room-grid {
        display:grid;
        grid-template-columns:repeat(5,1fr);
        gap:11px;
      }

      .js-room {
        border:1px solid var(--js-line);
        border-radius:13px;
        padding:14px;
        background:#fff;
        min-height:120px;
        transition:.15s;
      }

      .js-room:hover {
        transform:translateY(-1px);
        box-shadow:var(--js-shadow);
      }

      .js-room-number {
        font-size:19px;
        font-weight:900;
      }

      .js-room-type {
        color:var(--js-muted);
        font-size:10px;
        margin-top:3px;
      }

      .js-room-status {
        margin-top:18px;
      }

      .js-search {
        width:100%;
        border:1px solid var(--js-line);
        border-radius:10px;
        padding:10px 12px;
        outline:none;
        background:#fff;
      }

      .js-search:focus,
      input:focus,
      select:focus,
      textarea:focus {
        border-color:#93c5fd;
        box-shadow:0 0 0 3px rgba(37,99,235,.08);
      }

      .js-toolbar {
        display:flex;
        gap:9px;
        align-items:center;
        flex-wrap:wrap;
        margin-bottom:15px;
      }

      .js-toolbar .js-search {
        max-width:320px;
      }

      .js-modal-bg {
        position:fixed;
        inset:0;
        background:rgba(2,8,23,.58);
        backdrop-filter:blur(5px);
        z-index:100;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      .js-modal-bg.open {
        display:flex;
      }

      .js-modal {
        width:min(720px,100%);
        max-height:90vh;
        overflow:auto;
        background:#fff;
        border-radius:18px;
        box-shadow:0 30px 80px rgba(0,0,0,.25);
      }

      .js-modal-head {
        padding:18px 20px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        border-bottom:1px solid var(--js-line);
      }

      .js-modal-head h3 {
        margin:0;
        font-size:16px;
      }

      .js-modal-body {
        padding:20px;
      }

      .js-modal-foot {
        padding:15px 20px;
        border-top:1px solid var(--js-line);
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }

      .js-form-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:13px;
      }

      .js-field {
        display:flex;
        flex-direction:column;
        gap:6px;
      }

      .js-field.full {
        grid-column:1/-1;
      }

      .js-field label {
        font-size:10px;
        font-weight:850;
        color:#64748b;
      }

      .js-field input,
      .js-field select,
      .js-field textarea {
        width:100%;
        border:1px solid var(--js-line);
        border-radius:10px;
        padding:10px 11px;
        outline:none;
        background:#fff;
      }

      .js-field textarea {
        min-height:90px;
        resize:vertical;
      }

      .js-empty {
        padding:40px 20px;
        text-align:center;
        color:var(--js-muted);
        font-size:12px;
      }

      .js-loading {
        padding:40px;
        text-align:center;
        color:var(--js-muted);
      }

      .js-toast {
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:300;
        background:#0b1220;
        color:#fff;
        border-radius:12px;
        padding:12px 16px;
        box-shadow:0 15px 40px rgba(0,0,0,.2);
        font-size:12px;
        font-weight:700;
        transform:translateY(20px);
        opacity:0;
        pointer-events:none;
        transition:.2s;
      }

      .js-toast.show {
        opacity:1;
        transform:none;
      }

      .js-toast.error {
        background:#991b1b;
      }

      .js-mobile-menu {
        display:none;
      }

      @media(max-width:1150px) {
        .js-grid-4 {
          grid-template-columns:repeat(2,1fr);
        }

        .js-room-grid {
          grid-template-columns:repeat(4,1fr);
        }
      }

      @media(max-width:850px) {
        .js-sidebar {
          transform:translateX(-100%);
        }

        .js-sidebar.open {
          transform:none;
        }

        .js-main {
          margin-left:0;
        }

        .js-mobile-menu {
          display:block;
          margin-right:10px;
        }

        .js-grid-3,
        .js-grid-2 {
          grid-template-columns:1fr;
        }

        .js-room-grid {
          grid-template-columns:repeat(3,1fr);
        }
      }

      @media(max-width:600px) {
        .js-content {
          padding:15px;
        }

        .js-topbar {
          padding:0 14px;
        }

        .js-grid-4 {
          grid-template-columns:1fr 1fr;
        }

        .js-room-grid {
          grid-template-columns:1fr 1fr;
        }

        .js-form-grid {
          grid-template-columns:1fr;
        }

        .js-field.full {
          grid-column:auto;
        }

        .js-title p {
          display:none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ============================================================
     ESTRUTURA
     ============================================================ */

  function shell() {
    const app = $("#app");

    if (!app) return;

    app.innerHTML = `
      <div class="js-shell">

        <aside class="js-sidebar" id="jsSidebar">

          <div class="js-brand">
            <div class="js-logo">JS</div>
            <span>JaraStay</span>
          </div>

          <small>OPERAÇÃO</small>

          <nav class="js-nav">
            ${navButton("dashboard", "⌂", "Dashboard")}
            ${navButton("reservas", "▣", "Reservas")}
            ${navButton("quartos", "▦", "Mapa de quartos")}
            ${navButton("hospedes", "♙", "Hóspedes")}
            ${navButton("governanca", "✓", "Governança")}
          </nav>

          <small>GESTÃO</small>

          <nav class="js-nav">
            ${navButton("financeiro", "R$", "Financeiro")}
            ${navButton("crm", "♡", "CRM & Fidelidade")}
            ${navButton("relatorios", "◫", "Relatórios")}
            ${navButton("auditoria", "⌁", "Auditoria")}
          </nav>

          <div class="js-sidebar-footer">
            <div class="js-user-mini">
              <div class="js-avatar" id="jsAvatar">JS</div>
              <div>
                <strong id="jsUserName">Usuário</strong>
                <span id="jsUserRole">Hotel</span>
              </div>
            </div>

            <button
              class="js-btn ghost-dark"
              style="width:100%;margin-top:12px"
              id="jsLogout">
              Sair
            </button>
          </div>

        </aside>

        <main class="js-main">

          <header class="js-topbar">
            <div style="display:flex;align-items:center">
              <button
                class="js-btn js-mobile-menu"
                id="jsMobileMenu">
                ☰
              </button>

              <div class="js-title">
                <h1 id="jsPageTitle">Dashboard</h1>
                <p id="jsPageSubtitle">Visão geral da operação</p>
              </div>
            </div>

            <div class="js-top-actions">
              <button class="js-btn" id="jsRefresh">↻ Atualizar</button>
              <button
                class="js-btn primary"
                id="jsNewReservation">
                + Reserva
              </button>
            </div>
          </header>

          <div class="js-content">

            <section id="page-dashboard" class="js-page active"></section>
            <section id="page-reservas" class="js-page"></section>
            <section id="page-quartos" class="js-page"></section>
            <section id="page-hospedes" class="js-page"></section>
            <section id="page-governanca" class="js-page"></section>
            <section id="page-financeiro" class="js-page"></section>
            <section id="page-crm" class="js-page"></section>
            <section id="page-relatorios" class="js-page"></section>
            <section id="page-auditoria" class="js-page"></section>

          </div>
        </main>
      </div>

      <div class="js-modal-bg" id="jsModal">
        <div class="js-modal">
          <div class="js-modal-head">
            <h3 id="jsModalTitle">JaraStay</h3>
            <button class="js-btn" id="jsModalClose">✕</button>
          </div>
          <div class="js-modal-body" id="jsModalBody"></div>
          <div class="js-modal-foot" id="jsModalFoot"></div>
        </div>
      </div>
    `;

    $("#jsLogout").onclick = () => logout(true);
    $("#jsMobileMenu").onclick = () =>
      $("#jsSidebar").classList.toggle("open");

    $("#jsRefresh").onclick = async () => {
      await loadCurrentPage(true);
      toast("Dados atualizados");
    };

    $("#jsNewReservation").onclick = openReservationModal;

    $("#jsModalClose").onclick = closeModal;

    $("#jsModal").onclick = e => {
      if (e.target.id === "jsModal") closeModal();
    };

    $$(".js-nav button").forEach(button => {
      button.onclick = () => navigate(button.dataset.page);
    });
  }

  function navButton(id, icon, text) {
    return `
      <button data-page="${id}" class="${id === "dashboard" ? "active" : ""}">
        <span class="ico">${icon}</span>
        <span>${text}</span>
      </button>
    `;
  }

  /* ============================================================
     AUTENTICAÇÃO
     ============================================================ */

  function logout(showMessage = true) {
    state.token = "";
    state.user = null;
    localStorage.removeItem("jarastay_token");

    if (showMessage) toast("Sessão encerrada");

    setTimeout(() => {
      window.location.reload();
    }, showMessage ? 350 : 0);
  }

  async function bootstrap() {
    injectStyles();

    if (!state.token) {
      renderLoginRequired();
      return;
    }

    try {
      const me = await api("/me");
      state.user = me.user;

      shell();

      $("#jsUserName").textContent =
        state.user.name || state.user.email || "Usuário";

      $("#jsUserRole").textContent =
        state.user.role || "Usuário";

      $("#jsAvatar").textContent =
        String(state.user.name || "JS")
          .slice(0, 2)
          .toUpperCase();

      await loadProperties();
      await navigate("dashboard");

    } catch (error) {
      console.error(error);
      renderLoginRequired();
    }
  }

  function renderLoginRequired() {
    const app = $("#app");

    app.innerHTML = `
      <div style="
        min-height:100vh;
        display:grid;
        place-items:center;
        background:#0b1220;
        padding:20px">

        <div style="
          background:white;
          width:min(420px,100%);
          border-radius:20px;
          padding:30px;
          text-align:center">

          <div class="js-logo" style="margin:auto">JS</div>

          <h1 style="margin:18px 0 7px">JaraStay</h1>

          <p style="color:#64748b;font-size:13px">
            Sua sessão não está disponível.
          </p>

          <button
            class="js-btn primary"
            style="width:100%;margin-top:12px"
            onclick="location.reload()">
            Voltar para login
          </button>

        </div>
      </div>
    `;
  }

  /* ============================================================
     DADOS
     ============================================================ */

  async function loadProperties() {
    state.properties = await api("/properties");
    state.property = state.properties[0] || null;
  }

  async function loadDashboard() {
    state.dashboard = await api("/dashboard");
  }

  async function loadRooms() {
    state.rooms = await api("/rooms");
  }

  async function loadGuests(query = "") {
    state.guests = await api(
      `/guests${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
  }

  async function loadReservations(query = "") {
    state.reservations = await api(
      `/reservations${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
  }

  async function loadHousekeeping() {
    state.housekeeping = await api("/housekeeping");
  }

  async function loadLedger() {
    state.ledger = await api("/finance/ledger");
  }

  /* ============================================================
     NAVEGAÇÃO
     ============================================================ */

  const pageNames = {
    dashboard: ["Dashboard", "Visão geral da operação"],
    reservas: ["Reservas", "Central de reservas"],
    quartos: ["Mapa de quartos", "Status operacional em tempo real"],
    hospedes: ["Hóspedes", "Clientes e histórico"],
    governanca: ["Governança", "Limpeza, manutenção e operação"],
    financeiro: ["Financeiro", "Receitas, despesas e lançamentos"],
    crm: ["CRM & Fidelidade", "Relacionamento e oportunidades"],
    relatorios: ["Relatórios", "Indicadores e desempenho"],
    auditoria: ["Auditoria", "Registro das atividades do sistema"]
  };

  async function navigate(page) {
    state.currentPage = page;

    $$(".js-page").forEach(x =>
      x.classList.toggle("active", x.id === `page-${page}`)
    );

    $$(".js-nav button").forEach(x =>
      x.classList.toggle("active", x.dataset.page === page)
    );

    const [title, subtitle] = pageNames[page] || [page, ""];

    $("#jsPageTitle").textContent = title;
    $("#jsPageSubtitle").textContent = subtitle;

    $("#jsSidebar").classList.remove("open");

    await loadCurrentPage(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadCurrentPage(force = false) {
    try {
      if (state.currentPage === "dashboard") {
        await loadDashboard();
        renderDashboard();
      }

      if (state.currentPage === "reservas") {
        await loadReservations();
        renderReservations();
      }

      if (state.currentPage === "quartos") {
        await loadRooms();
        renderRooms();
      }

      if (state.currentPage === "hospedes") {
        await loadGuests();
        renderGuests();
      }

      if (state.currentPage === "governanca") {
        await loadHousekeeping();
        renderHousekeeping();
      }

      if (state.currentPage === "financeiro") {
        await loadLedger();
        renderFinance();
      }

      if (state.currentPage === "crm") {
        await loadGuests();
        renderCRM();
      }

      if (state.currentPage === "relatorios") {
        await loadDashboard();
        await loadReservations();
        renderReports();
      }

      if (state.currentPage === "auditoria") {
        renderAudit();
      }

    } catch (error) {
      console.error(error);
      toast(error.message || "Não foi possível carregar os dados.", "error");
    }
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */

  function renderDashboard() {
    const d = state.dashboard || {};
    const rooms = d.rooms || {};
    const reservations = d.reservations || {};
    const housekeeping = d.housekeeping || {};

    const totalRooms = Number(rooms.total || 0);
    const occupied = Number(rooms.occupied || 0);
    const occupancy = totalRooms
      ? Math.round((occupied / totalRooms) * 100)
      : 0;

    $("#page-dashboard").innerHTML = `
      <div class="js-grid js-grid-4">

        ${kpi("Ocupação", `${occupancy}%`,
          `${occupied} de ${totalRooms} quartos ocupados`)}

        ${kpi("Receita do mês", money(
          reservations.revenue || d.ledgerIncome || 0
        ), "Receita registrada")}

        ${kpi("Chegadas hoje",
          reservations.arrivals || 0,
          "Check-ins previstos")}

        ${kpi("Saídas hoje",
          reservations.departures || 0,
          "Check-outs previstos")}

      </div>

      <div style="height:16px"></div>

      <div class="js-grid js-grid-3">

        <div class="js-card">
          <div class="js-card-body">
            <div class="js-section-head">
              <h2>Status da operação</h2>
              <button class="js-btn"
                onclick="window.JaraStay.navigate('quartos')">
                Ver quartos
              </button>
            </div>

            ${progressRow("Ocupados", occupied, totalRooms, "blue")}
            ${progressRow(
              "Disponíveis",
              rooms.available || 0,
              totalRooms,
              "green"
            )}
            ${progressRow(
              "Limpeza",
              rooms.cleaning || 0,
              totalRooms,
              "orange"
            )}
            ${progressRow(
              "Manutenção",
              rooms.maintenance || 0,
              totalRooms,
              "red"
            )}
          </div>
        </div>

        <div class="js-card">
          <div class="js-card-body">
            <div class="js-section-head">
              <h2>Hoje</h2>
            </div>

            <div style="display:grid;gap:13px">
              ${metricLine(
                "Reservas ativas",
                reservations.active || 0
              )}

              ${metricLine(
                "Chegadas",
                reservations.arrivals || 0
              )}

              ${metricLine(
                "Saídas",
                reservations.departures || 0
              )}

              ${metricLine(
                "Hóspedes cadastrados",
                d.guests || 0
              )}

              ${metricLine(
                "Tarefas pendentes",
                housekeeping.pending || 0
              )}
            </div>
          </div>
        </div>

        <div class="js-card">
          <div class="js-card-body">
            <div class="js-section-head">
              <h2>Ações rápidas</h2>
            </div>

            <div style="display:grid;gap:8px">
              <button class="js-btn primary"
                onclick="window.JaraStay.openReservationModal()">
                + Nova reserva
              </button>

              <button class="js-btn"
                onclick="window.JaraStay.openGuestModal()">
                + Novo hóspede
              </button>

              <button class="js-btn"
                onclick="window.JaraStay.navigate('governanca')">
                Governança
              </button>

              <button class="js-btn"
                onclick="window.JaraStay.navigate('financeiro')">
                Financeiro
              </button>
            </div>
          </div>
        </div>

      </div>

      <div style="height:16px"></div>

      <div class="js-card">
        <div class="js-card-body">
          <div class="js-section-head">
            <h2>Visão executiva</h2>
            <span class="js-badge blue">JaraStay OS</span>
          </div>

          <div class="js-grid js-grid-4">
            ${metricLine("Quartos totais", totalRooms)}
            ${metricLine("Disponíveis", rooms.available || 0)}
            ${metricLine("Hóspedes", d.guests || 0)}
            ${metricLine("Governança hoje", housekeeping.total || 0)}
          </div>
        </div>
      </div>
    `;
  }

  function kpi(label, value, meta) {
    return `
      <div class="js-card js-kpi">
        <div class="js-kpi-label">${esc(label)}</div>
        <div class="js-kpi-value">${esc(value)}</div>
        <div class="js-kpi-meta">${esc(meta)}</div>
      </div>
    `;
  }

  function metricLine(label, value) {
    return `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px">

        <span style="
          color:#64748b;
          font-size:11px">
          ${esc(label)}
        </span>

        <strong style="font-size:13px">
          ${esc(value)}
        </strong>
      </div>
    `;
  }

  function progressRow(label, value, total, color) {
    const pct = total
      ? Math.min(100, Math.round((Number(value) / total) * 100))
      : 0;

    return `
      <div style="margin:16px 0">
        <div style="
          display:flex;
          justify-content:space-between;
          font-size:11px;
          margin-bottom:6px">

          <span>${esc(label)}</span>
          <strong>${esc(value)}</strong>
        </div>

        <div style="
          height:7px;
          background:#edf2f7;
          border-radius:20px;
          overflow:hidden">

          <div style="
            width:${pct}%;
            height:100%;
            background:var(--js-${color});
            border-radius:20px">
          </div>
        </div>
      </div>
    `;
  }

  /* ============================================================
     RESERVAS
     ============================================================ */

  function renderReservations() {
    $("#page-reservas").innerHTML = `
      <div class="js-card">
        <div class="js-card-body">

          <div class="js-section-head">
            <div>
              <h2>Central de reservas</h2>
              <div style="
                color:#64748b;
                font-size:11px;
                margin-top:4px">
                ${state.reservations.length} registros carregados
              </div>
            </div>

            <button class="js-btn primary"
              onclick="window.JaraStay.openReservationModal()">
              + Nova reserva
            </button>
          </div>

          <div class="js-toolbar">
            <input
              id="reservationSearch"
              class="js-search"
              placeholder="Buscar hóspede, código ou quarto...">

            <button class="js-btn"
              id="reservationSearchBtn">
              Buscar
            </button>
          </div>

          <div class="js-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Confirmação</th>
                  <th>Hóspede</th>
                  <th>Quarto</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                ${
                  state.reservations.length
                    ? state.reservations.map(reservationRow).join("")
                    : `
                      <tr>
                        <td colspan="8">
                          <div class="js-empty">
                            Nenhuma reserva encontrada.
                          </div>
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    $("#reservationSearchBtn").onclick = async () => {
      const q = $("#reservationSearch").value.trim();
      await loadReservations(q);
      renderReservations();
    };
  }

  function reservationRow(r) {
    return `
      <tr>
        <td>
          <strong>${esc(r.confirmation_code)}</strong>
        </td>

        <td>${esc(r.guest_name || "—")}</td>

        <td>
          ${esc(r.room_number || "Não atribuído")}
        </td>

        <td>${dateBR(r.check_in)}</td>

        <td>${dateBR(r.check_out)}</td>

        <td>
          ${statusBadge(r.status)}
        </td>

        <td>
          <strong>${money(r.total)}</strong>
        </td>

        <td>
          <div class="js-actions">
            ${
              !["cancelled", "checked_out", "no_show"].includes(r.status)
                ? `
                  <button
                    class="js-btn"
                    onclick="window.JaraStay.reservationStatus(
                      '${esc(r.id)}',
                      'checked_in'
                    )">
                    Check-in
                  </button>

                  <button
                    class="js-btn"
                    onclick="window.JaraStay.reservationStatus(
                      '${esc(r.id)}',
                      'checked_out'
                    )">
                    Check-out
                  </button>

                  <button
                    class="js-btn"
                    onclick="window.JaraStay.reservationStatus(
                      '${esc(r.id)}',
                      'cancelled'
                    )">
                    Cancelar
                  </button>
                `
                : ""
            }
          </div>
        </td>
      </tr>
    `;
  }

  function statusBadge(status) {
    const map = {
      hold: ["orange", "Pendente"],
      confirmed: ["blue", "Confirmada"],
      checked_in: ["green", "Hospedado"],
      checked_out: ["gray", "Finalizada"],
      cancelled: ["red", "Cancelada"],
      no_show: ["red", "No-show"]
    };

    const [color, label] =
      map[status] || ["gray", status || "—"];

    return `
      <span class="js-badge ${color}">
        ${esc(label)}
      </span>
    `;
  }

  async function reservationStatus(id, status) {
    try {
      await api(`/reservations/${id}/status`, {
        method: "PATCH",
        body: { status }
      });

      toast("Reserva atualizada");
      await loadReservations();
      renderReservations();

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     QUARTOS
     ============================================================ */

  function renderRooms() {
    const groups = {
      available: ["green", "Livre"],
      occupied: ["blue", "Ocupado"],
      cleaning: ["orange", "Limpeza"],
      maintenance: ["red", "Manutenção"],
      blocked: ["gray", "Bloqueado"]
    };

    $("#page-quartos").innerHTML = `
      <div class="js-card">
        <div class="js-card-body">

          <div class="js-section-head">
            <div>
              <h2>Mapa operacional</h2>
              <div style="
                color:#64748b;
                font-size:11px;
                margin-top:4px">
                ${state.rooms.length} quartos
              </div>
            </div>

            <button class="js-btn"
              onclick="window.JaraStay.loadCurrentPage(true)">
              ↻ Atualizar
            </button>
          </div>

          <div class="js-room-grid">
            ${
              state.rooms.length
                ? state.rooms.map(room => {
                    const [color, label] =
                      groups[room.status] ||
                      ["gray", room.status];

                    return `
                      <div class="js-room">

                        <div class="js-room-number">
                          ${esc(room.number)}
                        </div>

                        <div class="js-room-type">
                          ${esc(room.room_type || "Quarto")}
                          • ${esc(room.capacity || 0)} hóspedes
                        </div>

                        <div class="js-room-status">
                          <span class="js-badge ${color}">
                            ${esc(label)}
                          </span>
                        </div>

                        <div style="
                          display:flex;
                          justify-content:space-between;
                          align-items:center;
                          margin-top:12px">

                          <small style="color:#64748b">
                            ${money(room.base_rate)}
                          </small>

                          <button
                            class="js-btn"
                            onclick="window.JaraStay.openRoomStatus(
                              '${esc(room.id)}',
                              '${esc(room.number)}',
                              '${esc(room.status)}'
                            )">
                            Status
                          </button>
                        </div>
                      </div>
                    `;
                  }).join("")
                : `
                  <div class="js-empty"
                    style="grid-column:1/-1">
                    Nenhum quarto cadastrado.
                  </div>
                `
            }
          </div>
        </div>
      </div>
    `;
  }

  function openRoomStatus(id, number, current) {
    openModal(
      `Quarto ${number}`,
      `
        <div class="js-form-grid">
          <div class="js-field full">
            <label>STATUS</label>

            <select id="roomStatus">
              ${[
                ["available", "Livre"],
                ["occupied", "Ocupado"],
                ["cleaning", "Limpeza"],
                ["maintenance", "Manutenção"],
                ["blocked", "Bloqueado"]
              ].map(([v, t]) => `
                <option value="${v}" ${current === v ? "selected" : ""}>
                  ${t}
                </option>
              `).join("")}
            </select>
          </div>
        </div>
      `,
      `
        <button class="js-btn" onclick="window.JaraStay.closeModal()">
          Cancelar
        </button>

        <button
          class="js-btn primary"
          onclick="window.JaraStay.saveRoomStatus('${esc(id)}')">
          Salvar
        </button>
      `
    );
  }

  async function saveRoomStatus(id) {
    try {
      const status = $("#roomStatus").value;

      await api(`/rooms/${id}`, {
        method: "PATCH",
        body: { status }
      });

      closeModal();
      toast("Status do quarto atualizado");

      await loadRooms();
      renderRooms();

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     HÓSPEDES
     ============================================================ */

  function renderGuests() {
    $("#page-hospedes").innerHTML = `
      <div class="js-card">
        <div class="js-card-body">

          <div class="js-section-head">
            <div>
              <h2>Base de hóspedes</h2>
              <div style="
                color:#64748b;
                font-size:11px;
                margin-top:4px">
                ${state.guests.length} hóspedes
              </div>
            </div>

            <button class="js-btn primary"
              onclick="window.JaraStay.openGuestModal()">
              + Novo hóspede
            </button>
          </div>

          <div class="js-toolbar">
            <input
              id="guestSearch"
              class="js-search"
              placeholder="Buscar por nome, e-mail ou telefone...">

            <button
              class="js-btn"
              onclick="window.JaraStay.searchGuests()">
              Buscar
            </button>
          </div>

          <div class="js-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hóspede</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>País</th>
                  <th>Criado</th>
                </tr>
              </thead>

              <tbody>
                ${
                  state.guests.length
                    ? state.guests.map(g => `
                      <tr>
                        <td>
                          <strong>${esc(g.full_name)}</strong>
                        </td>
                        <td>${esc(g.email || "—")}</td>
                        <td>${esc(g.phone || "—")}</td>
                        <td>${esc(g.country_code || "—")}</td>
                        <td>${dateBR(g.created_at)}</td>
                      </tr>
                    `).join("")
                    : `
                      <tr>
                        <td colspan="5">
                          <div class="js-empty">
                            Nenhum hóspede encontrado.
                          </div>
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  async function searchGuests() {
    try {
      const q = $("#guestSearch").value.trim();
      await loadGuests(q);
      renderGuests();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     GOVERNANÇA
     ============================================================ */

  function renderHousekeeping() {
    $("#page-governanca").innerHTML = `
      <div class="js-card">
        <div class="js-card-body">

          <div class="js-section-head">
            <div>
              <h2>Governança</h2>
              <div style="
                color:#64748b;
                font-size:11px;
                margin-top:4px">
                ${state.housekeeping.length} tarefas
              </div>
            </div>

            <button class="js-btn primary"
              onclick="window.JaraStay.openHousekeepingModal()">
              + Nova tarefa
            </button>
          </div>

          <div class="js-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quarto</th>
                  <th>Tipo</th>
                  <th>Prioridade</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Criada</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                ${
                  state.housekeeping.length
                    ? state.housekeeping.map(h => `
                      <tr>
                        <td>
                          <strong>
                            ${esc(h.room_number || "Área geral")}
                          </strong>
                        </td>

                        <td>${esc(h.type)}</td>

                        <td>${esc(h.priority)}</td>

                        <td>${esc(h.assignee || "Não atribuído")}</td>

                        <td>
                          ${statusBadgeHousekeeping(h.status)}
                        </td>

                        <td>${dateBR(h.created_at)}</td>

                        <td>
                          ${
                            h.status !== "completed"
                              ? `
                                <button
                                  class="js-btn"
                                  onclick="window.JaraStay.completeHousekeeping(
                                    '${esc(h.id)}'
                                  )">
                                  Concluir
                                </button>
                              `
                              : ""
                          }
                        </td>
                      </tr>
                    `).join("")
                    : `
                      <tr>
                        <td colspan="7">
                          <div class="js-empty">
                            Nenhuma tarefa cadastrada.
                          </div>
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function statusBadgeHousekeeping(status) {
    const map = {
      pending: ["orange", "Pendente"],
      in_progress: ["blue", "Em andamento"],
      completed: ["green", "Concluída"]
    };

    const [color, label] =
      map[status] || ["gray", status || "—"];

    return `<span class="js-badge ${color}">${esc(label)}</span>`;
  }

  async function completeHousekeeping(id) {
    try {
      await api(`/housekeeping/${id}`, {
        method: "PATCH",
        body: { status: "completed" }
      });

      toast("Tarefa concluída");
      await loadHousekeeping();
      renderHousekeeping();

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     FINANCEIRO
     ============================================================ */

  function renderFinance() {
    const totalIncome = state.ledger
      .filter(x => x.kind === "income")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const totalExpense = state.ledger
      .filter(x => x.kind === "expense")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);

    const balance = totalIncome - totalExpense;

    $("#page-financeiro").innerHTML = `
      <div class="js-grid js-grid-3">

        ${kpi("Receitas", money(totalIncome), "Lançamentos")}
        ${kpi("Despesas", money(totalExpense), "Lançamentos")}
        ${kpi("Saldo", money(balance), "Resultado")}

      </div>

      <div style="height:16px"></div>

      <div class="js-card">
        <div class="js-card-body">

          <div class="js-section-head">
            <h2>Livro financeiro</h2>

            <button class="js-btn primary"
              onclick="window.JaraStay.openFinanceModal()">
              + Lançamento
            </button>
          </div>

          <div class="js-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>

              <tbody>
                ${
                  state.ledger.length
                    ? state.ledger.map(x => `
                      <tr>
                        <td>${dateBR(x.occurred_on)}</td>
                        <td>${esc(x.description || "—")}</td>
                        <td>${esc(x.category || "—")}</td>
                        <td>
                          ${x.kind === "income"
                            ? '<span class="js-badge green">Receita</span>'
                            : '<span class="js-badge red">Despesa</span>'}
                        </td>
                        <td>
                          <strong>
                            ${money(x.amount)}
                          </strong>
                        </td>
                      </tr>
                    `).join("")
                    : `
                      <tr>
                        <td colspan="5">
                          <div class="js-empty">
                            Nenhum lançamento.
                          </div>
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;
  }

  /* ============================================================
     CRM
     ============================================================ */

  function renderCRM() {
    const total = state.guests.length;

    $("#page-crm").innerHTML = `
      <div class="js-grid js-grid-4">

        ${kpi("Base ativa", total, "Hóspedes cadastrados")}
        ${kpi("Relacionamento", "CRM", "Central de hóspedes")}
        ${kpi("Fidelidade", "Ativo", "Estrutura pronta")}
        ${kpi("Marketing", "Direto", "Venda direta")}

      </div>

      <div style="height:16px"></div>

      <div class="js-grid js-grid-2">

        <div class="js-card">
          <div class="js-card-body">

            <div class="js-section-head">
              <h2>Segmentação</h2>
            </div>

            <div style="display:grid;gap:9px">
              ${crmAction("Hóspedes recorrentes", "Clientes que já retornaram")}
              ${crmAction("Hóspedes inativos", "Oportunidades de retorno")}
              ${crmAction("Corporativo", "Perfil empresarial")}
              ${crmAction("VIP", "Clientes estratégicos")}
            </div>

          </div>
        </div>

        <div class="js-card">
          <div class="js-card-body">

            <div class="js-section-head">
              <h2>Próxima evolução</h2>
            </div>

            <p style="
              color:#64748b;
              font-size:12px;
              line-height:1.7">
              O módulo está preparado para receber campanhas,
              fidelidade, segmentos e automações conectadas
              diretamente à base real de hóspedes.
            </p>

          </div>
        </div>

      </div>
    `;
  }

  function crmAction(title, text) {
    return `
      <button class="js-btn"
        style="text-align:left;padding:13px">
        <strong style="display:block">${esc(title)}</strong>
        <span style="
          display:block;
          color:#64748b;
          font-size:10px;
          margin-top:3px">
          ${esc(text)}
        </span>
      </button>
    `;
  }

  /* ============================================================
     RELATÓRIOS
     ============================================================ */

  function renderReports() {
    const d = state.dashboard || {};
    const reservations = state.reservations || [];

    const revenue = reservations.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    const confirmed = reservations.filter(
      r => ["confirmed", "checked_in", "checked_out"].includes(r.status)
    ).length;

    const cancelled = reservations.filter(
      r => r.status === "cancelled"
    ).length;

    $("#page-relatorios").innerHTML = `
      <div class="js-grid js-grid-4">

        ${kpi("Reservas analisadas", reservations.length, "Base atual")}
        ${kpi("Receita", money(revenue), "Reservas")}
        ${kpi("Confirmadas", confirmed, "Reservas válidas")}
        ${kpi("Canceladas", cancelled, "Reservas canceladas")}

      </div>

      <div style="height:16px"></div>

      <div class="js-card">
        <div class="js-card-body">

          <div class="js-section-head">
            <h2>Relatório executivo</h2>

            <div class="js-actions">
              <button class="js-btn"
                onclick="window.JaraStay.exportReservations()">
                Exportar CSV
              </button>

              <button class="js-btn primary"
                onclick="window.JaraStay.exportExecutiveReport()">
                Relatório executivo
              </button>
            </div>
          </div>

          <div class="js-grid js-grid-3">
            ${metricLine(
              "Ocupação atual",
              `${occupancyFromDashboard(d)}%`
            )}

            ${metricLine(
              "Hóspedes",
              d.guests || 0
            )}

            ${metricLine(
              "Quartos",
              d.rooms?.total || 0
            )}
          </div>

        </div>
      </div>
    `;
  }

  function occupancyFromDashboard(d) {
    const total = Number(d.rooms?.total || 0);
    const occupied = Number(d.rooms?.occupied || 0);

    return total
      ? Math.round((occupied / total) * 100)
      : 0;
  }

  async function exportReservations() {
    try {
      const response = await fetch(
        `${API}/export/reservations.csv`,
        {
          headers: {
            Authorization: `Bearer ${state.token}`
          }
        }
      );

      if (!response.ok) throw new Error("Falha na exportação.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "jarastay-reservas.csv";
      a.click();

      URL.revokeObjectURL(url);

      toast("CSV exportado");

    } catch (error) {
      toast(error.message, "error");
    }
  }

  function exportExecutiveReport() {
    const d = state.dashboard || {};

    const text = [
      "JARASTAY — RELATÓRIO EXECUTIVO",
      "",
      `Data: ${new Date().toLocaleString("pt-BR")}`,
      "",
      `Ocupação: ${occupancyFromDashboard(d)}%`,
      `Quartos: ${d.rooms?.total || 0}`,
      `Ocupados: ${d.rooms?.occupied || 0}`,
      `Disponíveis: ${d.rooms?.available || 0}`,
      `Chegadas: ${d.reservations?.arrivals || 0}`,
      `Saídas: ${d.reservations?.departures || 0}`,
      `Hóspedes: ${d.guests || 0}`,
      `Receita: ${money(d.reservations?.revenue || 0)}`
    ].join("\n");

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "jarastay-relatorio-executivo.txt";
    a.click();

    URL.revokeObjectURL(url);

    toast("Relatório gerado");
  }

  /* ============================================================
     AUDITORIA
     ============================================================ */

  async function renderAudit() {
    const page = $("#page-auditoria");

    page.innerHTML = `
      <div class="js-card">
        <div class="js-card-body">
          <div class="js-loading">
            Carregando auditoria...
          </div>
        </div>
      </div>
    `;

    try {
      const logs = await api("/audit");

      page.innerHTML = `
        <div class="js-card">
          <div class="js-card-body">

            <div class="js-section-head">
              <h2>Auditoria</h2>
              <span class="js-badge gray">
                ${logs.length} registros
              </span>
            </div>

            <div class="js-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>ID</th>
                    <th>IP</th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    logs.length
                      ? logs.map(log => `
                        <tr>
                          <td>${dateBR(log.created_at)}</td>
                          <td>${esc(log.action)}</td>
                          <td>${esc(log.entity)}</td>
                          <td>${esc(log.entity_id)}</td>
                          <td>${esc(log.ip || "—")}</td>
                        </tr>
                      `).join("")
                      : `
                        <tr>
                          <td colspan="5">
                            <div class="js-empty">
                              Nenhum registro.
                            </div>
                          </td>
                        </tr>
                      `
                  }
                </tbody>
              </table>
            </div>

          </div>
        </div>
      `;

    } catch (error) {
      page.innerHTML = `
        <div class="js-card">
          <div class="js-card-body">
            <div class="js-empty">
              Não foi possível carregar a auditoria.
            </div>
          </div>
        </div>
      `;
    }
  }

  /* ============================================================
     MODAL — RESERVA
     ============================================================ */

  async function openReservationModal() {
    try {
      if (!state.rooms.length) await loadRooms();
      if (!state.guests.length) await loadGuests();

      const availableRooms =
        state.rooms.filter(r => r.status === "available");

      openModal(
        "Nova reserva",
        `
          <div class="js-form-grid">

            <div class="js-field full">
              <label>HÓSPEDE</label>

              <select id="reservationGuest">
                <option value="">Selecione...</option>

                ${state.guests.map(g => `
                  <option value="${esc(g.id)}">
                    ${esc(g.full_name)}
                    ${g.email ? ` — ${esc(g.email)}` : ""}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="js-field">
              <label>CHECK-IN</label>
              <input
                id="reservationCheckIn"
                type="date"
                value="${today()}">
            </div>

            <div class="js-field">
              <label>CHECK-OUT</label>
              <input
                id="reservationCheckOut"
                type="date"
                value="${futureDate(1)}">
            </div>

            <div class="js-field">
              <label>QUARTO</label>

              <select id="reservationRoom">
                <option value="">Selecione...</option>

                ${availableRooms.map(r => `
                  <option value="${esc(r.id)}">
                    ${esc(r.number)}
                    • ${esc(r.room_type)}
                    • ${money(r.base_rate)}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="js-field">
              <label>VALOR DA HOSPEDAGEM</label>
              <input
                id="reservationRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00">
            </div>

            <div class="js-field">
              <label>ADULTOS</label>
              <input
                id="reservationAdults"
                type="number"
                min="1"
                value="1">
            </div>

            <div class="js-field">
              <label>CRIANÇAS</label>
              <input
                id="reservationChildren"
                type="number"
                min="0"
                value="0">
            </div>

            <div class="js-field">
              <label>CANAL</label>

              <select id="reservationChannel">
                <option value="direct">Direto</option>
                <option value="website">Site</option>
                <option value="phone">Telefone</option>
                <option value="walk_in">Balcão</option>
                <option value="ota">OTA</option>
                <option value="corporate">Corporativo</option>
              </select>
            </div>

            <div class="js-field full">
              <label>OBSERVAÇÕES</label>
              <textarea id="reservationNotes"></textarea>
            </div>

          </div>
        `,
        `
          <button class="js-btn"
            onclick="window.JaraStay.closeModal()">
            Cancelar
          </button>

          <button class="js-btn primary"
            onclick="window.JaraStay.createReservation()">
            Criar reserva
          </button>
        `
      );

    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function createReservation() {
    try {
      const propertyId = state.property?.id;
      const guestId = $("#reservationGuest").value;
      const roomId = $("#reservationRoom").value;
      const checkIn = $("#reservationCheckIn").value;
      const checkOut = $("#reservationCheckOut").value;

      if (!propertyId) {
        throw new Error("Nenhuma propriedade configurada.");
      }

      if (!guestId) {
        throw new Error("Selecione um hóspede.");
      }

      if (!roomId) {
        throw new Error("Selecione um quarto.");
      }

      if (!checkIn || !checkOut) {
        throw new Error("Informe check-in e check-out.");
      }

      const rate = Number(
        $("#reservationRate").value || 0
      );

      await api("/reservations", {
        method: "POST",
        body: {
          propertyId,
          roomId,
          guestId,
          checkIn,
          checkOut,
          adults: Number($("#reservationAdults").value || 1),
          children: Number($("#reservationChildren").value || 0),
          rate,
          tax: 0,
          channel: $("#reservationChannel").value,
          notes: $("#reservationNotes").value
        }
      });

      closeModal();
      toast("Reserva criada com sucesso");

      await loadReservations();

      if (state.currentPage === "reservas") {
        renderReservations();
      }

      await loadDashboard();

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     MODAL — HÓSPEDE
     ============================================================ */

  function openGuestModal() {
    openModal(
      "Novo hóspede",
      `
        <div class="js-form-grid">

          <div class="js-field full">
            <label>NOME COMPLETO</label>
            <input id="guestName">
          </div>

          <div class="js-field">
            <label>E-MAIL</label>
            <input id="guestEmail" type="email">
          </div>

          <div class="js-field">
            <label>TELEFONE</label>
            <input id="guestPhone">
          </div>

          <div class="js-field">
            <label>CÓDIGO DO PAÍS</label>
            <input id="guestCountry" value="BR">
          </div>

          <div class="js-field">
            <label>ÚLTIMOS 4 DO DOCUMENTO</label>
            <input id="guestDocument" maxlength="4">
          </div>

          <div class="js-field full">
            <label>OBSERVAÇÕES</label>
            <textarea id="guestNotes"></textarea>
          </div>

          <div class="js-field full">
            <label>
              <input
                id="guestMarketing"
                type="checkbox"
                style="width:auto">
              Aceita comunicações de marketing
            </label>
          </div>

        </div>
      `,
      `
        <button class="js-btn"
          onclick="window.JaraStay.closeModal()">
          Cancelar
        </button>

        <button class="js-btn primary"
          onclick="window.JaraStay.createGuest()">
          Salvar hóspede
        </button>
      `
    );
  }

  async function createGuest() {
    try {
      const name = $("#guestName").value.trim();

      if (name.length < 2) {
        throw new Error("Informe o nome do hóspede.");
      }

      await api("/guests", {
        method: "POST",
        body: {
          fullName: name,
          email: $("#guestEmail").value,
          phone: $("#guestPhone").value,
          countryCode: $("#guestCountry").value,
          documentLast4: $("#guestDocument").value,
          notes: $("#guestNotes").value,
          marketingOptIn: $("#guestMarketing").checked
        }
      });

      closeModal();
      toast("Hóspede cadastrado");

      await loadGuests();

      if (state.currentPage === "hospedes") {
        renderGuests();
      }

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     MODAL — GOVERNANÇA
     ============================================================ */

  function openHousekeepingModal() {
    openModal(
      "Nova tarefa de governança",
      `
        <div class="js-form-grid">

          <div class="js-field">
            <label>QUARTO</label>

            <select id="houseRoom">
              <option value="">Área geral</option>

              ${state.rooms.map(r => `
                <option value="${esc(r.id)}">
                  ${esc(r.number)} • ${esc(r.room_type)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="js-field">
            <label>TIPO</label>

            <select id="houseType">
              <option value="cleaning">Limpeza</option>
              <option value="inspection">Inspeção</option>
              <option value="maintenance">Manutenção</option>
              <option value="lost_found">Achados e perdidos</option>
            </select>
          </div>

          <div class="js-field">
            <label>PRIORIDADE</label>

            <select id="housePriority">
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div class="js-field full">
            <label>OBSERVAÇÕES</label>
            <textarea id="houseNotes"></textarea>
          </div>

        </div>
      `,
      `
        <button class="js-btn"
          onclick="window.JaraStay.closeModal()">
          Cancelar
        </button>

        <button class="js-btn primary"
          onclick="window.JaraStay.createHousekeeping()">
          Criar tarefa
        </button>
      `
    );
  }

  async function createHousekeeping() {
    try {
      if (!state.property?.id) {
        throw new Error("Nenhuma propriedade configurada.");
      }

      await api("/housekeeping", {
        method: "POST",
        body: {
          propertyId: state.property.id,
          roomId: $("#houseRoom").value || null,
          type: $("#houseType").value,
          priority: $("#housePriority").value,
          notes: $("#houseNotes").value
        }
      });

      closeModal();
      toast("Tarefa criada");

      await loadHousekeeping();
      renderHousekeeping();

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     MODAL — FINANCEIRO
     ============================================================ */

  function openFinanceModal() {
    openModal(
      "Novo lançamento financeiro",
      `
        <div class="js-form-grid">

          <div class="js-field full">
            <label>DESCRIÇÃO</label>
            <input id="financeDescription">
          </div>

          <div class="js-field">
            <label>VALOR</label>
            <input
              id="financeAmount"
              type="number"
              min="0"
              step="0.01">
          </div>

          <div class="js-field">
            <label>TIPO</label>

            <select id="financeKind">
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>

          <div class="js-field">
            <label>CATEGORIA</label>
            <input
              id="financeCategory"
              placeholder="Hospedagem, energia...">
          </div>

          <div class="js-field">
            <label>DATA</label>
            <input
              id="financeDate"
              type="date"
              value="${today()}">
          </div>

        </div>
      `,
      `
        <button class="js-btn"
          onclick="window.JaraStay.closeModal()">
          Cancelar
        </button>

        <button class="js-btn primary"
          onclick="window.JaraStay.createFinance()">
          Salvar lançamento
        </button>
      `
    );
  }

  async function createFinance() {
    try {
      const amount = Number($("#financeAmount").value);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um valor válido.");
      }

      await api("/finance/ledger", {
        method: "POST",
        body: {
          propertyId: state.property?.id || null,
          kind: $("#financeKind").value,
          category: $("#financeCategory").value,
          description: $("#financeDescription").value,
          amount,
          occurredOn: $("#financeDate").value
        }
      });

      closeModal();
      toast("Lançamento salvo");

      await loadLedger();
      renderFinance();

    } catch (error) {
      toast(error.message, "error");
    }
  }

  /* ============================================================
     UTILITÁRIOS
     ============================================================ */

  function futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function openModal(title, body, footer) {
    $("#jsModalTitle").textContent = title;
    $("#jsModalBody").innerHTML = body;
    $("#jsModalFoot").innerHTML = footer || "";
    $("#jsModal").classList.add("open");
  }

  function closeModal() {
    $("#jsModal").classList.remove("open");
  }

  /* ============================================================
     API PÚBLICA PARA EVENTOS INLINE
     ============================================================ */

  window.JaraStay = {
    navigate,
    loadCurrentPage,
    openReservationModal,
    createReservation,
    reservationStatus,
    openRoomStatus,
    saveRoomStatus,
    openGuestModal,
    createGuest,
    searchGuests,
    openHousekeepingModal,
    createHousekeeping,
    completeHousekeeping,
    openFinanceModal,
    createFinance,
    closeModal,
    exportReservations,
    exportExecutiveReport
  };

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */

  document.addEventListener("DOMContentLoaded", bootstrap);

})();
