/* =========================================================
   JARASTAY - APP.JS
   Login + Registro + Painel real
========================================================= */

(() => {
  "use strict";

  const TOKEN_KEY = "jarastay_token";

  /* =======================================================
     UTILIDADES
  ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const money = value =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const token = () =>
    localStorage.getItem(TOKEN_KEY);

  const saveToken = value => {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("jarastay_user");
    location.hash = "login";
    render();
  };

  /* =======================================================
     API
  ======================================================= */

  async function api(url, options = {}) {

    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const currentToken = token();

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers
      });
    } catch (error) {
      throw new Error(
        "Não foi possível conectar ao servidor."
      );
    }

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
      }

      throw new Error(
        data.error ||
        data.message ||
        `Erro ${response.status}`
      );
    }

    return data;
  }

  /* =======================================================
     ESTILO DA ÁREA DE AUTENTICAÇÃO
  ======================================================= */

  function authStyle() {

    if (document.getElementById("jarastay-auth-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "jarastay-auth-style";

    style.textContent = `
      .js-auth-page {
        min-height:100vh;
        min-height:100dvh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:
          radial-gradient(
            circle at top left,
            rgba(37,99,235,.10),
            transparent 35%
          ),
          #f5f7fa;
      }

      .js-auth-card {
        width:100%;
        max-width:430px;
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:22px;
        padding:30px;
        box-shadow:0 20px 60px rgba(15,23,42,.10);
      }

      .js-logo {
        display:flex;
        align-items:center;
        gap:10px;
        font-size:22px;
        font-weight:800;
        margin-bottom:25px;
      }

      .js-logo-mark {
        width:42px;
        height:42px;
        border-radius:12px;
        display:grid;
        place-items:center;
        background:#111827;
        color:#fff;
        font-size:14px;
        font-weight:900;
      }

      .js-auth-card h1 {
        margin:0 0 7px;
        font-size:28px;
        color:#111827;
      }

      .js-auth-subtitle {
        margin:0 0 25px;
        color:#6b7280;
        line-height:1.5;
      }

      .js-field {
        margin-bottom:15px;
      }

      .js-field label {
        display:block;
        font-size:11px;
        font-weight:800;
        letter-spacing:.04em;
        margin-bottom:7px;
        color:#374151;
      }

      .js-field input {
        width:100%;
        box-sizing:border-box;
        border:1px solid #d7dce3;
        border-radius:11px;
        padding:13px 14px;
        font-size:15px;
        outline:none;
        background:#fff;
      }

      .js-field input:focus {
        border-color:#2563eb;
        box-shadow:0 0 0 3px rgba(37,99,235,.10);
      }

      .js-main-button {
        width:100%;
        border:0;
        border-radius:11px;
        padding:14px;
        font-size:15px;
        font-weight:800;
        cursor:pointer;
        background:#111827;
        color:#fff;
        margin-top:5px;
      }

      .js-main-button:disabled {
        opacity:.6;
        cursor:wait;
      }

      .js-secondary-button {
        width:100%;
        border:1px solid #d7dce3;
        border-radius:11px;
        padding:13px;
        font-size:14px;
        font-weight:700;
        cursor:pointer;
        background:#fff;
        color:#111827;
        margin-top:10px;
      }

      .js-auth-error {
        min-height:20px;
        margin:12px 0 0;
        color:#b91c1c;
        font-size:13px;
        line-height:1.4;
      }

      .js-auth-success {
        color:#047857;
      }

      .js-auth-footer {
        text-align:center;
        margin-top:20px;
        color:#6b7280;
        font-size:13px;
      }

      .js-link {
        border:0;
        background:none;
        color:#2563eb;
        font-weight:800;
        cursor:pointer;
        padding:0;
      }

      .js-password-help {
        color:#6b7280;
        font-size:11px;
        margin-top:6px;
      }

      .js-loading {
        min-height:100vh;
        min-height:100dvh;
        display:grid;
        place-items:center;
        font-family:system-ui,sans-serif;
        color:#6b7280;
      }

      .js-dashboard {
        min-height:100vh;
        min-height:100dvh;
        background:#f5f7fa;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      .js-dashboard-top {
        background:#111827;
        color:#fff;
        padding:18px 20px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:15px;
        position:sticky;
        top:0;
        z-index:20;
      }

      .js-dashboard-brand {
        display:flex;
        align-items:center;
        gap:10px;
        font-weight:800;
      }

      .js-dashboard-mark {
        width:36px;
        height:36px;
        border-radius:10px;
        background:#fff;
        color:#111827;
        display:grid;
        place-items:center;
        font-size:12px;
        font-weight:900;
      }

      .js-dashboard-user {
        display:flex;
        align-items:center;
        gap:10px;
      }

      .js-logout {
        border:1px solid rgba(255,255,255,.25);
        background:transparent;
        color:#fff;
        border-radius:9px;
        padding:8px 12px;
        cursor:pointer;
      }

      .js-dashboard-body {
        max-width:1250px;
        margin:auto;
        padding:24px;
      }

      .js-welcome {
        margin-bottom:22px;
      }

      .js-welcome h1 {
        margin:0 0 5px;
        color:#111827;
      }

      .js-welcome p {
        margin:0;
        color:#6b7280;
      }

      .js-menu {
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:14px;
      }

      .js-menu-card {
        border:1px solid #e5e7eb;
        background:#fff;
        border-radius:16px;
        padding:20px;
        text-align:left;
        cursor:pointer;
        transition:.15s;
      }

      .js-menu-card:hover {
        transform:translateY(-2px);
        box-shadow:0 10px 30px rgba(15,23,42,.08);
      }

      .js-menu-icon {
        width:42px;
        height:42px;
        border-radius:11px;
        background:#eef2ff;
        display:grid;
        place-items:center;
        margin-bottom:12px;
        font-weight:900;
        color:#3730a3;
      }

      .js-menu-card h3 {
        margin:0 0 5px;
        color:#111827;
      }

      .js-menu-card p {
        margin:0;
        color:#6b7280;
        font-size:13px;
        line-height:1.4;
      }

      .js-panel {
        margin-top:20px;
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:20px;
      }

      .js-panel h2 {
        margin-top:0;
      }

      .js-stats {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:12px;
      }

      .js-stat {
        padding:18px;
        border:1px solid #e5e7eb;
        border-radius:14px;
      }

      .js-stat span {
        display:block;
        color:#6b7280;
        font-size:12px;
      }

      .js-stat strong {
        display:block;
        font-size:24px;
        margin-top:6px;
        color:#111827;
      }

      .js-back {
        border:1px solid #d7dce3;
        background:#fff;
        padding:10px 14px;
        border-radius:9px;
        cursor:pointer;
        margin-bottom:15px;
        font-weight:700;
      }

      .js-list {
        display:grid;
        gap:8px;
      }

      .js-list-item {
        display:flex;
        justify-content:space-between;
        gap:10px;
        padding:13px;
        border:1px solid #e5e7eb;
        border-radius:10px;
      }

      @media(max-width:800px) {
        .js-menu {
          grid-template-columns:1fr 1fr;
        }

        .js-stats {
          grid-template-columns:1fr 1fr;
        }
      }

      @media(max-width:520px) {
        .js-auth-card {
          padding:22px;
        }

        .js-dashboard-body {
          padding:16px;
        }

        .js-menu {
          grid-template-columns:1fr;
        }

        .js-stats {
          grid-template-columns:1fr 1fr;
        }

        .js-dashboard-user span {
          display:none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     LOGIN
  ======================================================= */

  function renderLogin() {

    authStyle();

    const app = document.getElementById("app");

    if (!app) return;

    app.innerHTML = `
      <div class="js-auth-page">

        <div class="js-auth-card">

          <div class="js-logo">
            <div class="js-logo-mark">JS</div>
            <span>JaraStay</span>
          </div>

          <h1>Entrar</h1>

          <p class="js-auth-subtitle">
            Acesse o painel de gestão do seu hotel.
          </p>

          <form id="loginForm">

            <div class="js-field">
              <label>E-MAIL</label>
              <input
                id="loginEmail"
                type="email"
                autocomplete="email"
                placeholder="seu@email.com"
                required
              >
            </div>

            <div class="js-field">
              <label>SENHA</label>
              <input
                id="loginPassword"
                type="password"
                autocomplete="current-password"
                placeholder="Sua senha"
                required
              >
            </div>

            <button
              id="loginButton"
              class="js-main-button"
              type="submit"
            >
              Entrar no JaraStay
            </button>

            <p
              id="loginError"
              class="js-auth-error"
            ></p>

          </form>

          <div class="js-auth-footer">

            Ainda não possui uma conta?

            <button
              type="button"
              id="goRegister"
              class="js-link"
            >
              Criar conta
            </button>

          </div>

        </div>

      </div>
    `;

    $("#goRegister").addEventListener(
      "click",
      () => {
        location.hash = "register";
        render();
      }
    );

    $("#loginForm").addEventListener(
      "submit",
      handleLogin
    );
  }

  /* =======================================================
     LOGIN - API
  ======================================================= */

  async function handleLogin(event) {

    event.preventDefault();

    const button = $("#loginButton");
    const error = $("#loginError");

    const email =
      $("#loginEmail").value.trim();

    const password =
      $("#loginPassword").value;

    error.textContent = "";

    button.disabled = true;
    button.textContent = "Entrando...";

    try {

      const data = await api(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      if (!data.token) {
        throw new Error(
          "O servidor não retornou um token de acesso."
        );
      }

      saveToken(data.token);

      if (data.user) {
        localStorage.setItem(
          "jarastay_user",
          JSON.stringify(data.user)
        );
      }

      location.hash = "dashboard";

      render();

    } catch (errorObject) {

      console.error(errorObject);

      error.textContent =
        errorObject.message ||
        "Não foi possível entrar.";

      button.disabled = false;
      button.textContent =
        "Entrar no JaraStay";
    }
  }

  /* =======================================================
     REGISTRO
  ======================================================= */

  function renderRegister() {

    authStyle();

    const app = document.getElementById("app");

    if (!app) return;

    app.innerHTML = `
      <div class="js-auth-page">

        <div class="js-auth-card">

          <div class="js-logo">
            <div class="js-logo-mark">JS</div>
            <span>JaraStay</span>
          </div>

          <h1>Criar sua conta</h1>

          <p class="js-auth-subtitle">
            Crie a conta do proprietário e cadastre seu hotel.
          </p>

          <form id="registerForm">

            <div class="js-field">
              <label>SEU NOME</label>

              <input
                id="registerName"
                type="text"
                autocomplete="name"
                placeholder="Nome completo"
                required
              >
            </div>

            <div class="js-field">
              <label>NOME DO HOTEL</label>

              <input
                id="registerHotel"
                type="text"
                autocomplete="organization"
                placeholder="Ex.: Hotel Central"
                required
              >
            </div>

            <div class="js-field">
              <label>E-MAIL</label>

              <input
                id="registerEmail"
                type="email"
                autocomplete="email"
                placeholder="seu@email.com"
                required
              >
            </div>

            <div class="js-field">
              <label>SENHA</label>

              <input
                id="registerPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Mínimo de 10 caracteres"
                minlength="10"
                required
              >

              <div class="js-password-help">
                Use pelo menos 10 caracteres.
              </div>
            </div>

            <div class="js-field">
              <label>CONFIRMAR SENHA</label>

              <input
                id="registerPasswordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="Digite a senha novamente"
                minlength="10"
                required
              >
            </div>

            <button
              id="registerButton"
              class="js-main-button"
              type="submit"
            >
              Criar conta e entrar
            </button>

            <p
              id="registerError"
              class="js-auth-error"
            ></p>

          </form>

          <button
            type="button"
            id="goLogin"
            class="js-secondary-button"
          >
            Voltar para o login
          </button>

        </div>

      </div>
    `;

    $("#goLogin").addEventListener(
      "click",
      () => {
        location.hash = "login";
        render();
      }
    );

    $("#registerForm").addEventListener(
      "submit",
      handleRegister
    );
  }

  /* =======================================================
     REGISTRO - API
  ======================================================= */

  async function handleRegister(event) {

    event.preventDefault();

    const button =
      $("#registerButton");

    const error =
      $("#registerError");

    const name =
      $("#registerName").value.trim();

    const hotelName =
      $("#registerHotel").value.trim();

    const email =
      $("#registerEmail").value.trim();

    const password =
      $("#registerPassword").value;

    const confirmation =
      $("#registerPasswordConfirm").value;

    error.textContent = "";

    if (name.length < 2) {
      error.textContent =
        "Digite seu nome completo.";

      return;
    }

    if (hotelName.length < 2) {
      error.textContent =
        "Digite o nome do hotel.";

      return;
    }

    if (password.length < 10) {
      error.textContent =
        "A senha precisa ter pelo menos 10 caracteres.";

      return;
    }

    if (password !== confirmation) {
      error.textContent =
        "As senhas não são iguais.";

      return;
    }

    button.disabled = true;
    button.textContent =
      "Criando sua conta...";

    try {

      const data = await api(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            hotelName,
            email,
            password
          })
        }
      );

      if (!data.token) {
        throw new Error(
          "A conta foi processada, mas o servidor não retornou o token de acesso."
        );
      }

      saveToken(data.token);

      if (data.user) {
        localStorage.setItem(
          "jarastay_user",
          JSON.stringify(data.user)
        );
      }

      location.hash = "dashboard";

      render();

    } catch (errorObject) {

      console.error(
        "Erro no cadastro:",
        errorObject
      );

      error.textContent =
        errorObject.message ||
        "Não foi possível criar a conta.";

      button.disabled = false;

      button.textContent =
        "Criar conta e entrar";
    }
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  async function renderDashboard() {

    const app =
      document.getElementById("app");

    const user =
      JSON.parse(
        localStorage.getItem(
          "jarastay_user"
        ) || "null"
      );

    const userName =
      user?.name ||
      user?.full_name ||
      "Administrador";

    app.innerHTML = `
      <div class="js-dashboard">

        <header class="js-dashboard-top">

          <div class="js-dashboard-brand">

            <div class="js-dashboard-mark">
              JS
            </div>

            <div>
              JaraStay
              <small style="
                display:block;
                opacity:.6;
                font-size:9px;
              ">
                HOTEL OPERATING SYSTEM
              </small>
            </div>

          </div>

          <div class="js-dashboard-user">

            <span>
              ${escapeHtml(userName)}
            </span>

            <button
              id="logoutButton"
              class="js-logout"
            >
              Sair
            </button>

          </div>

        </header>

        <main class="js-dashboard-body">

          <div class="js-welcome">

            <h1>
              Olá, ${escapeHtml(userName)}.
            </h1>

            <p>
              Bem-vindo ao painel do JaraStay.
            </p>

          </div>

          <div
            id="dashboardContent"
          >
            <div class="js-loading">
              Carregando dados do hotel...
            </div>
          </div>

        </main>

      </div>
    `;

    $("#logoutButton").addEventListener(
      "click",
      logout
    );

    await loadDashboardData();
  }

  /* =======================================================
     DADOS DO DASHBOARD
  ======================================================= */

  async function loadDashboardData() {

    const container =
      $("#dashboardContent");

    try {

      const data =
        await api("/api/dashboard");

      const rooms =
        data.rooms || {};

      const reservations =
        data.reservations || {};

      container.innerHTML = `

        <div class="js-stats">

          <div class="js-stat">
            <span>Ocupação</span>

            <strong>
              ${
                rooms.total
                  ? Math.round(
                      (
                        Number(rooms.occupied || 0) /
                        Number(rooms.total)
                      ) * 100
                    )
                  : 0
              }%
            </strong>
          </div>

          <div class="js-stat">
            <span>Quartos</span>

            <strong>
              ${rooms.total || 0}
            </strong>
          </div>

          <div class="js-stat">
            <span>Check-ins hoje</span>

            <strong>
              ${reservations.arrivals || 0}
            </strong>
          </div>

          <div class="js-stat">
            <span>Reservas ativas</span>

            <strong>
              ${reservations.active || 0}
            </strong>
          </div>

        </div>

        ${dashboardMenu()}

      `;

      bindDashboardMenu();

    } catch (errorObject) {

      console.error(
        "Dashboard:",
        errorObject
      );

      container.innerHTML = `

        <div class="js-panel">

          <h2>
            JaraStay
          </h2>

          <p style="color:#6b7280">
            Sua conta foi criada e o login está funcionando.
          </p>

          <p style="
            color:#b45309;
            font-size:13px;
          ">
            O painel foi carregado, mas a API de
            dashboard ainda não respondeu.
          </p>

          ${dashboardMenu()}

        </div>

      `;

      bindDashboardMenu();
    }
  }

  /* =======================================================
     MENU REAL
  ======================================================= */

  function dashboardMenu() {

    return `

      <div class="js-menu" style="margin-top:20px">

        <button
          class="js-menu-card"
          data-module="reservas"
        >
          <div class="js-menu-icon">
            R
          </div>

          <h3>Reservas</h3>

          <p>
            Gerencie reservas, check-ins e check-outs.
          </p>
        </button>

        <button
          class="js-menu-card"
          data-module="quartos"
        >
          <div class="js-menu-icon">
            Q
          </div>

          <h3>Quartos</h3>

          <p>
            Veja disponibilidade e ocupação.
          </p>
        </button>

        <button
          class="js-menu-card"
          data-module="hospedes"
        >
          <div class="js-menu-icon">
            H
          </div>

          <h3>Hóspedes</h3>

          <p>
            Cadastro e relacionamento com hóspedes.
          </p>
        </button>

        <button
          class="js-menu-card"
          data-module="governanca"
        >
          <div class="js-menu-icon">
            G
          </div>

          <h3>Governança</h3>

          <p>
            Limpeza, manutenção e tarefas.
          </p>
        </button>

        <button
          class="js-menu-card"
          data-module="financeiro"
        >
          <div class="js-menu-icon">
            R$
          </div>

          <h3>Financeiro</h3>

          <p>
            Receitas, despesas e resultados.
          </p>
        </button>

        <button
          class="js-menu-card"
          data-module="config"
        >
          <div class="js-menu-icon">
            ⚙
          </div>

          <h3>Configurações</h3>

          <p>
            Configurações da operação.
          </p>
        </button>

      </div>
    `;
  }

  function bindDashboardMenu() {

    document
      .querySelectorAll("[data-module]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const module =
              button.dataset.module;

            openModule(module);
          }
        );

      });
  }

  /* =======================================================
     MÓDULOS
  ======================================================= */

  async function openModule(module) {

    const container =
      $("#dashboardContent");

    const names = {
      reservas: "Reservas",
      quartos: "Quartos",
      hospedes: "Hóspedes",
      governanca: "Governança",
      financeiro: "Financeiro",
      config: "Configurações"
    };

    container.innerHTML = `

      <div class="js-panel">

        <button
          id="backDashboard"
          class="js-back"
        >
          ← Voltar
        </button>

        <h2>
          ${escapeHtml(names[module] || module)}
        </h2>

        <div id="moduleContent">
          Carregando...
        </div>

      </div>
    `;

    $("#backDashboard").addEventListener(
      "click",
      loadDashboardData
    );

    try {

      if (module === "reservas") {
        await loadReservations();
        return;
      }

      if (module === "quartos") {
        await loadRooms();
        return;
      }

      if (module === "hospedes") {
        await loadGuests();
        return;
      }

      if (module === "governanca") {
        await loadHousekeeping();
        return;
      }

      if (module === "financeiro") {
        await loadFinance();
        return;
      }

      $("#moduleContent").innerHTML = `
        <p style="color:#6b7280">
          Configurações do hotel.
        </p>
      `;

    } catch (errorObject) {

      $("#moduleContent").innerHTML = `
        <p style="color:#b91c1c">
          ${escapeHtml(errorObject.message)}
        </p>
      `;
    }
  }

  /* =======================================================
     RESERVAS
  ======================================================= */

  async function loadReservations() {

    const data =
      await api("/api/reservations");

    const list =
      Array.isArray(data)
        ? data
        : data.reservations || [];

    $("#moduleContent").innerHTML = `

      <div class="js-list">

        ${
          list.length
            ? list.map(item => `
                <div class="js-list-item">

                  <div>
                    <strong>
                      ${escapeHtml(
                        item.guest_name ||
                        item.guestName ||
                        "Hóspede"
                      )}
                    </strong>

                    <small style="
                      display:block;
                      color:#6b7280;
                    ">
                      Quarto ${
                        escapeHtml(
                          item.room_number ||
                          item.roomNumber ||
                          "—"
                        )
                      }
                    </small>
                  </div>

                  <strong>
                    ${money(item.total)}
                  </strong>

                </div>
              `).join("")
            : `
              <p style="color:#6b7280">
                Nenhuma reserva cadastrada.
              </p>
            `
        }

      </div>
    `;
  }

  /* =======================================================
     QUARTOS
  ======================================================= */

  async function loadRooms() {

    const data =
      await api("/api/rooms");

    const list =
      Array.isArray(data)
        ? data
        : data.rooms || [];

    $("#moduleContent").innerHTML = `

      <div class="js-list">

        ${
          list.length
            ? list.map(room => `
                <div class="js-list-item">

                  <div>
                    <strong>
                      Quarto ${escapeHtml(room.number)}
                    </strong>

                    <small style="
                      display:block;
                      color:#6b7280;
                    ">
                      ${escapeHtml(
                        room.room_type ||
                        room.type ||
                        "Quarto"
                      )}
                    </small>
                  </div>

                  <strong>
                    ${escapeHtml(room.status || "—")}
                  </strong>

                </div>
              `).join("")
            : `
              <p style="color:#6b7280">
                Nenhum quarto cadastrado.
              </p>
            `
        }

      </div>
    `;
  }

  /* =======================================================
     HÓSPEDES
  ======================================================= */

  async function loadGuests() {

    const data =
      await api("/api/guests");

    const list =
      Array.isArray(data)
        ? data
        : data.guests || [];

    $("#moduleContent").innerHTML = `

      <div class="js-list">

        ${
          list.length
            ? list.map(guest => `
                <div class="js-list-item">

                  <div>
                    <strong>
                      ${escapeHtml(
                        guest.full_name ||
                        guest.name ||
                        "Hóspede"
                      )}
                    </strong>

                    <small style="
                      display:block;
                      color:#6b7280;
                    ">
                      ${escapeHtml(
                        guest.email ||
                        guest.phone ||
                        "Sem contato"
                      )}
                    </small>
                  </div>

                </div>
              `).join("")
            : `
              <p style="color:#6b7280">
                Nenhum hóspede cadastrado.
              </p>
            `
        }

      </div>
    `;
  }

  /* =======================================================
     GOVERNANÇA
  ======================================================= */

  async function loadHousekeeping() {

    const data =
      await api("/api/housekeeping");

    const list =
      Array.isArray(data)
        ? data
        : data.tasks || [];

    $("#moduleContent").innerHTML = `

      <div class="js-list">

        ${
          list.length
            ? list.map(task => `
                <div class="js-list-item">

                  <div>
                    <strong>
                      Quarto ${
                        escapeHtml(
                          task.room_number ||
                          task.room ||
                          "—"
                        )
                      }
                    </strong>

                    <small style="
                      display:block;
                      color:#6b7280;
                    ">
                      ${escapeHtml(
                        task.type ||
                        task.description ||
                        "Tarefa"
                      )}
                    </small>
                  </div>

                  <strong>
                    ${escapeHtml(task.status || "—")}
                  </strong>

                </div>
              `).join("")
            : `
              <p style="color:#6b7280">
                Nenhuma tarefa cadastrada.
              </p>
            `
        }

      </div>
    `;
  }

  /* =======================================================
     FINANCEIRO
  ======================================================= */

  async function loadFinance() {

    const data =
      await api("/api/finance/ledger");

    const list =
      Array.isArray(data)
        ? data
        : data.ledger || [];

    $("#moduleContent").innerHTML = `

      <div class="js-list">

        ${
          list.length
            ? list.map(item => `
                <div class="js-list-item">

                  <div>
                    <strong>
                      ${escapeHtml(
                        item.description ||
                        item.category ||
                        "Lançamento"
                      )}
                    </strong>

                    <small style="
                      display:block;
                      color:#6b7280;
                    ">
                      ${escapeHtml(
                        item.kind ||
                        "movimentação"
                      )}
                    </small>
                  </div>

                  <strong>
                    ${money(item.amount)}
                  </strong>

                </div>
              `).join("")
            : `
              <p style="color:#6b7280">
                Nenhum lançamento financeiro.
              </p>
            `
        }

      </div>
    `;
  }

  /* =======================================================
     RENDER PRINCIPAL
  ======================================================= */

  async function render() {

    const app =
      document.getElementById("app");

    if (!app) {
      console.error(
        "JaraStay: #app não encontrado."
      );
      return;
    }

    if (!token()) {

      if (
        location.hash !== "#register" &&
        location.hash !== "#login"
      ) {
        location.hash = "login";
      }

      if (
        location.hash === "#register"
      ) {
        renderRegister();
      } else {
        renderLogin();
      }

      return;
    }

    location.hash = "dashboard";

    await renderDashboard();
  }

  /* =======================================================
     NAVEGAÇÃO POR HASH
  ======================================================= */

  window.addEventListener(
    "hashchange",
    () => render()
  );

  /* =======================================================
     INÍCIO
  ======================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      render
    );

  } else {

    render();

  }

})();
