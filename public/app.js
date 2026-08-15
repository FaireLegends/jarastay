const $ = s => document.querySelector(s);

const api = async (url, opt = {}) => {
  const token = localStorage.getItem('js_token');

  opt.headers = {
    ...(opt.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opt.headers || {})
  };

  const r = await fetch(url, opt);

  if (r.status === 401) {
    localStorage.removeItem('js_token');
    location.hash = 'login';
  }

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(d.error || 'Erro');
  }

  return d;
};

const esc = s =>
  String(s ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));

/* =========================================================
   LOGIN
========================================================= */

function login() {
  document.querySelector('#app').innerHTML = `
    <div class="login">
      <form class="loginbox" id="login">

        <div class="logo" style="color:#14202b;margin:0 0 20px">
          <span class="mark">JS</span>JaraStay
        </div>

        <h1>Entrar</h1>
        <p class="muted">Gestão hoteleira em um só lugar.</p>

        <div class="field">
          <label>E-MAIL</label>
          <input
            id="em"
            type="email"
            required
            autocomplete="username"
            placeholder="seu@email.com"
          >
        </div>

        <div class="field">
          <label>SENHA</label>
          <input
            id="pw"
            type="password"
            required
            autocomplete="current-password"
            placeholder="Sua senha"
          >
        </div>

        <button class="btn primary" style="width:100%;margin-top:10px">
          Acessar
        </button>

        <p id="err" class="muted"></p>

        <div style="text-align:center;margin-top:20px">
          <span class="muted">Ainda não possui uma conta?</span>
          <button
            type="button"
            class="btn"
            onclick="location.hash='register'"
            style="margin-top:10px;width:100%"
          >
            Criar minha conta
          </button>
        </div>

      </form>
    </div>
  `;

  $('#login').onsubmit = async e => {
    e.preventDefault();

    const error = $('#err');
    error.textContent = 'Entrando...';

    try {
      const d = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('#em').value.trim(),
          password: $('#pw').value
        })
      });

      localStorage.setItem('js_token', d.token);

      location.hash = 'dashboard';

    } catch (x) {
      error.textContent = 'E-mail ou senha incorretos.';
    }
  };
}

/* =========================================================
   REGISTRO
========================================================= */

function register() {
  document.querySelector('#app').innerHTML = `
    <div class="login">
      <form class="loginbox" id="registerForm">

        <div class="logo" style="color:#14202b;margin:0 0 20px">
          <span class="mark">JS</span>JaraStay
        </div>

        <h1>Criar conta</h1>

        <p class="muted">
          Crie a conta do proprietário para começar a utilizar o JaraStay.
        </p>

        <div class="field">
          <label>SEU NOME</label>
          <input
            id="regName"
            type="text"
            required
            minlength="2"
            autocomplete="name"
            placeholder="Nome completo"
          >
        </div>

        <div class="field">
          <label>NOME DO HOTEL</label>
          <input
            id="regHotel"
            type="text"
            required
            minlength="2"
            autocomplete="organization"
            placeholder="Ex.: Hotel JaraStay"
          >
        </div>

        <div class="field">
          <label>E-MAIL</label>
          <input
            id="regEmail"
            type="email"
            required
            autocomplete="email"
            placeholder="seu@email.com"
          >
        </div>

        <div class="field">
          <label>SENHA</label>
          <input
            id="regPassword"
            type="password"
            required
            minlength="10"
            autocomplete="new-password"
            placeholder="Mínimo de 10 caracteres"
          >
        </div>

        <div class="field">
          <label>CONFIRMAR SENHA</label>
          <input
            id="regPassword2"
            type="password"
            required
            minlength="10"
            autocomplete="new-password"
            placeholder="Digite novamente"
          >
        </div>

        <button
          class="btn primary"
          style="width:100%;margin-top:10px"
          id="registerButton"
        >
          Criar conta
        </button>

        <p id="regErr" class="muted"></p>

        <div style="text-align:center;margin-top:20px">
          <span class="muted">Já possui uma conta?</span>

          <button
            type="button"
            class="btn"
            onclick="location.hash='login'"
            style="margin-top:10px;width:100%"
          >
            Voltar para login
          </button>
        </div>

      </form>
    </div>
  `;

  $('#registerForm').onsubmit = async e => {
    e.preventDefault();

    const name = $('#regName').value.trim();
    const hotelName = $('#regHotel').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    const password2 = $('#regPassword2').value;

    const error = $('#regErr');
    const button = $('#registerButton');

    error.textContent = '';

    if (name.length < 2) {
      error.textContent = 'Digite seu nome.';
      return;
    }

    if (hotelName.length < 2) {
      error.textContent = 'Digite o nome do hotel.';
      return;
    }

    if (password.length < 10) {
      error.textContent = 'A senha precisa ter pelo menos 10 caracteres.';
      return;
    }

    if (password !== password2) {
      error.textContent = 'As senhas não são iguais.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Criando conta...';

    try {
      const d = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          hotelName,
          email,
          password
        })
      });

      if (!d.token) {
        throw new Error('token_missing');
      }

      localStorage.setItem('js_token', d.token);

      location.hash = 'dashboard';

    } catch (x) {
      console.error(x);

      if (x.message === 'registration_failed') {
        error.textContent =
          'Não foi possível criar a conta. Esse e-mail pode já estar cadastrado.';
      } else {
        error.textContent =
          'Não foi possível criar a conta. Verifique os dados e tente novamente.';
      }

      button.disabled = false;
      button.textContent = 'Criar conta';
    }
  };
}

/* =========================================================
   DASHBOARD
========================================================= */

async function dashboard() {
  const d = await api('/api/dashboard');

  return `
    <div class="top">

      <div>
        <h1>Visão geral</h1>

        <div class="muted">
          ${esc(d.property?.name || 'Seu hotel')}
          • operação em tempo real
        </div>
      </div>

      <button
        class="btn primary"
        onclick="openReservation()"
      >
        + Nova reserva
      </button>

    </div>

    <div class="cards">

      <div class="card metric">
        <span class="muted">Ocupação</span>

        <b>
          ${
            d.rooms?.total
              ? Math.round(
                  d.rooms.occupied /
                  d.rooms.total *
                  100
                )
              : 0
          }%
        </b>

        <span class="muted">
          ${d.rooms?.occupied || 0} quartos ocupados
        </span>
      </div>

      <div class="card metric">
        <span class="muted">Receita do mês</span>

        <b>
          R$
          ${Number(
            d.ledgerIncome || 0
          ).toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}
        </b>

        <span class="muted">
          Receitas lançadas
        </span>
      </div>

      <div class="card metric">
        <span class="muted">Check-ins hoje</span>

        <b>
          ${d.reservations?.arrivals || 0}
        </b>

        <span class="muted">
          Chegadas previstas
        </span>
      </div>

      <div class="card metric">
        <span class="muted">Governança</span>

        <b>
          ${d.housekeeping?.pending || 0}
        </b>

        <span class="muted">
          tarefas pendentes
        </span>
      </div>

    </div>

    <div class="grid">

      <div class="card">

        <div class="head">
          <span>Inventário</span>

          <span class="muted">
            ${d.rooms?.total || 0} unidades
          </span>
        </div>

        <div class="list">

          ${[
            ['Disponíveis', 'available'],
            ['Ocupados', 'occupied'],
            ['Limpeza', 'cleaning'],
            ['Manutenção', 'maintenance']
          ].map(x => `
            <div class="row">
              <span>${x[0]}</span>
              <b>${d.rooms?.[x[1]] || 0}</b>
            </div>
          `).join('')}

        </div>

      </div>

      <div class="card">

        <div class="head">
          <span>Hoje</span>
        </div>

        <div class="list">

          <div class="row">
            <span>Check-ins</span>
            <b>${d.reservations?.arrivals || 0}</b>
          </div>

          <div class="row">
            <span>Check-outs</span>
            <b>${d.reservations?.departures || 0}</b>
          </div>

          <div class="row">
            <span>Reservas ativas</span>
            <b>${d.reservations?.active || 0}</b>
          </div>

          <div class="row">
            <span>Hóspedes cadastrados</span>
            <b>${d.guests || 0}</b>
          </div>

        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   QUARTOS
========================================================= */

async function rooms() {
  const r = await api('/api/rooms');

  return `
    <div class="top">

      <div>
        <h1>Quartos</h1>
        <div class="muted">
          Inventário operacional
        </div>
      </div>

    </div>

    <div class="card">

      <div class="rooms">

        ${r.map(x => `
          <div class="room ${x.status}">

            <b>${esc(x.number)}</b>

            <div class="muted">
              ${esc(x.room_type)}
            </div>

            <div style="margin-top:9px">

              <select
                onchange="setRoom('${x.id}',this.value)"
              >

                <option
                  value="available"
                  ${x.status === 'available' ? 'selected' : ''}
                >
                  available
                </option>

                <option
                  value="occupied"
                  ${x.status === 'occupied' ? 'selected' : ''}
                >
                  occupied
                </option>

                <option
                  value="cleaning"
                  ${x.status === 'cleaning' ? 'selected' : ''}
                >
                  cleaning
                </option>

                <option
                  value="maintenance"
                  ${x.status === 'maintenance' ? 'selected' : ''}
                >
                  maintenance
                </option>

                <option
                  value="blocked"
                  ${x.status === 'blocked' ? 'selected' : ''}
                >
                  blocked
                </option>

              </select>

            </div>

          </div>
        `).join('')}

      </div>

    </div>
  `;
}

/* =========================================================
   RESERVAS
========================================================= */

async function reservations() {
  const r = await api('/api/reservations');

  return `
    <div class="top">

      <div>
        <h1>Reservas</h1>

        <div class="muted">
          Central de reservas
        </div>
      </div>

      <button
        class="btn primary"
        onclick="openReservation()"
      >
        + Nova reserva
      </button>

    </div>

    <div class="card">

      <div class="toolbar">

        <input
          class="search"
          id="rsearch"
          placeholder="Buscar..."
          oninput="loadReservations()"
        >

      </div>

      <div class="wrap">

        <table class="table">

          <thead>

            <tr>
              <th>Código</th>
              <th>Hóspede</th>
              <th>Quarto</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${r.map(x => `
              <tr>

                <td>
                  <b>${esc(x.confirmation_code)}</b>
                </td>

                <td>
                  ${esc(x.guest_name)}
                </td>

                <td>
                  ${esc(x.room_number || '—')}
                </td>

                <td>
                  ${x.check_in}
                </td>

                <td>
                  ${x.check_out}
                </td>

                <td>
                  R$
                  ${Number(x.total).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </td>

                <td>

                  <span class="pill ${
                    x.status === 'cancelled'
                      ? 'red'
                      : x.status === 'checked_in'
                        ? 'green'
                        : ''
                  }">

                    ${esc(x.status)}

                  </span>

                </td>

              </tr>
            `).join('')}

          </tbody>

        </table>

      </div>

    </div>
  `;
}

async function loadReservations() {
  const q = $('#rsearch')?.value || '';

  const r = await api(
    '/api/reservations?q=' +
    encodeURIComponent(q)
  );

  const body = $('.table tbody');

  if (!body) return;

  body.innerHTML = r.map(x => `
    <tr>

      <td>
        <b>${esc(x.confirmation_code)}</b>
      </td>

      <td>
        ${esc(x.guest_name)}
      </td>

      <td>
        ${esc(x.room_number || '—')}
      </td>

      <td>${x.check_in}</td>
      <td>${x.check_out}</td>

      <td>
        R$
        ${Number(x.total).toLocaleString('pt-BR', {
          minimumFractionDigits: 2
        })}
      </td>

      <td>
        <span class="pill">
          ${esc(x.status)}
        </span>
      </td>

    </tr>
  `).join('');
}

/* =========================================================
   HÓSPEDES
========================================================= */

async function guests() {
  const r = await api('/api/guests');

  return `
    <div class="top">

      <div>
        <h1>Hóspedes</h1>

        <div class="muted">
          CRM e cadastro
        </div>
      </div>

      <button
        class="btn primary"
        onclick="openGuest()"
      >
        + Novo hóspede
      </button>

    </div>

    <div class="card">

      <div class="wrap">

        <table class="table">

          <thead>

            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Marketing</th>
              <th>Criado</th>
            </tr>

          </thead>

          <tbody>

            ${r.map(x => `
              <tr>

                <td>
                  <b>${esc(x.full_name)}</b>
                </td>

                <td>
                  ${esc(x.email || '—')}
                </td>

                <td>
                  ${esc(x.phone || '—')}
                </td>

                <td>
                  ${x.marketing_opt_in ? 'Sim' : 'Não'}
                </td>

                <td>
                  ${new Date(
                    x.created_at
                  ).toLocaleDateString('pt-BR')}
                </td>

              </tr>
            `).join('')}

          </tbody>

        </table>

      </div>

    </div>
  `;
}

/* =========================================================
   GOVERNANÇA
========================================================= */

async function housekeeping() {
  const r = await api('/api/housekeeping');

  return `
    <div class="top">

      <div>
        <h1>Governança</h1>

        <div class="muted">
          Limpeza e manutenção
        </div>
      </div>

    </div>

    <div class="card">

      <div class="list">

        ${r.map(x => `
          <div class="row">

            <span>

              <b>
                Quarto ${esc(x.room_number || '—')}
              </b>

              <small
                class="muted"
                style="display:block"
              >
                ${esc(x.type)}
                •
                ${esc(x.priority)}
              </small>

            </span>

            <button
              class="btn"
              onclick="task(
                '${x.id}',
                '${x.status === 'completed'
                  ? 'pending'
                  : 'completed'}'
              )"
            >

              ${
                x.status === 'completed'
                  ? 'Reabrir'
                  : 'Concluir'
              }

            </button>

          </div>
        `).join('')}

      </div>

    </div>
  `;
}

/* =========================================================
   FINANCEIRO
========================================================= */

async function finance() {
  const r = await api('/api/finance/ledger');

  const income = r
    .filter(x => x.kind === 'income')
    .reduce((a, x) => a + Number(x.amount), 0);

  const expense = r
    .filter(x => x.kind === 'expense')
    .reduce((a, x) => a + Number(x.amount), 0);

  return `
    <div class="top">

      <div>
        <h1>Financeiro</h1>

        <div class="muted">
          Livro caixa e resultados
        </div>
      </div>

      <button
        class="btn primary"
        onclick="openFinance()"
      >
        + Lançamento
      </button>

    </div>

    <div class="cards">

      <div class="card metric">
        <span class="muted">Receitas</span>

        <b>
          R$
          ${income.toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}
        </b>
      </div>

      <div class="card metric">
        <span class="muted">Despesas</span>

        <b>
          R$
          ${expense.toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}
        </b>
      </div>

      <div class="card metric">
        <span class="muted">Resultado</span>

        <b>
          R$
          ${(income - expense).toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}
        </b>
      </div>

      <div class="card metric">
        <span class="muted">Lançamentos</span>

        <b>
          ${r.length}
        </b>
      </div>

    </div>

    <div
      class="card"
      style="margin-top:14px"
    >

      <div class="wrap">

        <table class="table">

          <thead>

            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>

          </thead>

          <tbody>

            ${r.map(x => `
              <tr>

                <td>
                  ${x.occurred_on}
                </td>

                <td>
                  ${esc(x.kind)}
                </td>

                <td>
                  ${esc(x.category)}
                </td>

                <td>
                  ${esc(x.description)}
                </td>

                <td>
                  R$
                  ${Number(x.amount).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </td>

              </tr>
            `).join('')}

          </tbody>

        </table>

      </div>

    </div>
  `;
}

/* =========================================================
   MODAL - HÓSPEDE
========================================================= */

function openGuest() {
  modal(`
    <h2>Novo hóspede</h2>

    <form class="form" id="gf">

      <div class="field full">
        <label>NOME COMPLETO</label>
        <input
          name="fullName"
          required
        >
      </div>

      <div class="field">
        <label>E-MAIL</label>
        <input
          name="email"
          type="email"
        >
      </div>

      <div class="field">
        <label>TELEFONE</label>
        <input
          name="phone"
        >
      </div>

    </form>

    <div class="modalfoot">

      <button
        class="btn"
        onclick="closeModal()"
      >
        Cancelar
      </button>

      <button
        class="btn primary"
        onclick="saveGuest()"
      >
        Salvar
      </button>

    </div>
  `);
}

async function saveGuest() {
  const f = new FormData($('#gf'));

  try {

    await api('/api/guests', {
      method: 'POST',
      body: JSON.stringify(
        Object.fromEntries(f)
      )
    });

    closeModal();
    navigate('guests');

  } catch (e) {
    alert(e.message);
  }
}

/* =========================================================
   QUARTOS
========================================================= */

async function setRoom(id, status) {
  try {

    await api('/api/rooms/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    navigate('rooms');

  } catch (e) {
    alert(e.message);
  }
}

/* =========================================================
   GOVERNANÇA
========================================================= */

async function task(id, status) {

  try {

    await api('/api/housekeeping/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    navigate('housekeeping');

  } catch (e) {
    alert(e.message);
  }
}

/* =========================================================
   FINANCEIRO
========================================================= */

function openFinance() {
  modal(`
    <h2>Lançamento financeiro</h2>

    <form class="form" id="ff">

      <div class="field">
        <label>TIPO</label>

        <select name="kind">
          <option value="income">
            Receita
          </option>

          <option value="expense">
            Despesa
          </option>
        </select>

      </div>

      <div class="field">
        <label>VALOR</label>

        <input
          name="amount"
          type="number"
          step=".01"
          required
        >
      </div>

      <div class="field">
        <label>CATEGORIA</label>

        <input
          name="category"
          required
        >
      </div>

      <div class="field">
        <label>DESCRIÇÃO</label>

        <input
          name="description"
          required
        >
      </div>

    </form>

    <div class="modalfoot">

      <button
        class="btn"
        onclick="closeModal()"
      >
        Cancelar
      </button>

      <button
        class="btn primary"
        onclick="saveFinance()"
      >
        Salvar
      </button>

    </div>
  `);
}

async function saveFinance() {
  const f = Object.fromEntries(
    new FormData($('#ff'))
  );

  try {

    await api('/api/finance/ledger', {
      method: 'POST',
      body: JSON.stringify(f)
    });

    closeModal();
    navigate('finance');

  } catch (e) {
    alert(e.message);
  }
}

/* =========================================================
   RESERVA
========================================================= */

async function openReservation() {

  const rooms = await api('/api/rooms');
  const guests = await api('/api/guests');
  const props = await api('/api/properties');

  const availableRooms =
    rooms.filter(
      r => r.status === 'available'
    );

  if (!guests.length) {
    alert(
      'Cadastre pelo menos um hóspede antes de criar uma reserva.'
    );

    return;
  }

  if (!availableRooms.length) {
    alert(
      'Não existem quartos disponíveis.'
    );

    return;
  }

  modal(`
    <h2>Nova reserva</h2>

    <form class="form" id="rf">

      <input
        type="hidden"
        name="propertyId"
        value="${props[0]?.id || ''}"
      >

      <div class="field full">

        <label>HÓSPEDE</label>

        <select
          name="guestId"
          required
        >

          ${guests.map(g => `
            <option value="${g.id}">
              ${esc(g.full_name)}
            </option>
          `).join('')}

        </select>

      </div>

      <div class="field">

        <label>QUARTO</label>

        <select
          name="roomId"
          required
        >

          ${availableRooms.map(r => `
            <option
              value="${r.id}"
              data-rate="${r.base_rate}"
            >
              ${esc(r.number)}
              •
              ${esc(r.room_type)}
              •
              R$ ${Number(r.base_rate).toFixed(2)}
            </option>
          `).join('')}

        </select>

      </div>

      <div class="field">

        <label>VALOR</label>

        <input
          name="rate"
          type="number"
          step=".01"
          value="${availableRooms[0]?.base_rate || 0}"
          required
        >

      </div>

      <div class="field">

        <label>CHECK-IN</label>

        <input
          name="checkIn"
          type="date"
          required
        >

      </div>

      <div class="field">

        <label>CHECK-OUT</label>

        <input
          name="checkOut"
          type="date"
          required
        >

      </div>

      <div class="field">

        <label>ADULTOS</label>

        <input
          name="adults"
          type="number"
          value="1"
          min="1"
        >

      </div>

    </form>

    <div class="modalfoot">

      <button
        class="btn"
        onclick="closeModal()"
      >
        Cancelar
      </button>

      <button
        class="btn primary"
        onclick="saveReservation()"
      >
        Criar
      </button>

    </div>
  `);

  $('#rf select[name="roomId"]').onchange = e => {

    $('#rf input[name="rate"]').value =
      e.target.selectedOptions[0]?.dataset.rate || 0;

  };
}

async function saveReservation() {

  const f = Object.fromEntries(
    new FormData($('#rf'))
  );

  try {

    await api('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(f)
    });

    closeModal();
    navigate('reservations');

  } catch (e) {
    alert(e.message);
  }
}

/* =========================================================
   MODAL
========================================================= */

function modal(html) {

  $('#modal')?.remove();

  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <div
        class="modal open"
        id="modal"
      >

        <div class="modalbox">

          <div class="head">
            ${html}
          </div>

        </div>

      </div>
    `
  );
}

function closeModal() {
  $('#modal')?.remove();
}

/* =========================================================
   NAVEGAÇÃO
========================================================= */

async function navigate(page) {

  const views = {
    dashboard,
    rooms,
    reservations,
    guests,
    housekeeping,
    finance
  };

  if (!views[page]) {
    page = 'dashboard';
  }

  try {

    document.querySelector('#view').innerHTML =
      await views[page]();

    document
      .querySelectorAll('.nav button')
      .forEach(b => {
        b.classList.toggle(
          'on',
          b.dataset.page === page
        );
      });

    location.hash = page;

  } catch (e) {

    console.error(e);

    document.querySelector('#view').innerHTML = `
      <div class="card">

        <h2>Erro ao carregar</h2>

        <p class="muted">
          Não foi possível carregar esta seção.
        </p>

        <button
          class="btn primary"
          onclick="navigate('dashboard')"
        >
          Voltar
        </button>

      </div>
    `;
  }
}

/* =========================================================
   APP PRINCIPAL
========================================================= */

async function app() {

  const hash =
    location.hash.slice(1) || 'dashboard';

  if (hash === 'register') {
    register();
    return;
  }

  if (!localStorage.getItem('js_token')) {
    login();
    return;
  }

  document.querySelector('#app').innerHTML = `
    <div class="shell">

      <aside class="side">

        <div class="logo">
          <span class="mark">JS</span>
          JaraStay
        </div>

        <nav class="nav">

          <button data-page="dashboard">
            Visão geral
          </button>

          <button data-page="reservations">
            Reservas
          </button>

          <button data-page="rooms">
            Quartos
          </button>

          <button data-page="guests">
            Hóspedes
          </button>

          <button data-page="housekeeping">
            Governança
          </button>

          <button data-page="finance">
            Financeiro
          </button>

        </nav>

        <button
          class="btn"
          style="
            position:absolute;
            bottom:20px;
            left:14px;
            right:14px
          "
          onclick="
            localStorage.removeItem('js_token');
            location.hash='login';
            location.reload();
          "
        >
          Sair
        </button>

      </aside>

      <main class="main">

        <header>

          <b>Hotel OS</b>

          <span class="muted">
            Produção • protegido
          </span>

        </header>

        <section
          class="content"
          id="view"
        ></section>

      </main>

    </div>
  `;

  document
    .querySelectorAll('.nav button')
    .forEach(b => {
      b.onclick = () =>
        navigate(b.dataset.page);
    });

  await navigate(hash);
}

/* =========================================================
   HASH
========================================================= */

window.addEventListener(
  'hashchange',
  () => {

    const hash =
      location.hash.slice(1);

    if (hash === 'login') {
      login();
      return;
    }

    if (hash === 'register') {
      register();
      return;
    }

    if (localStorage.getItem('js_token')) {
      navigate(hash || 'dashboard');
    }

  }
);

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

app();
