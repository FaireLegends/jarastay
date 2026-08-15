import express from "express";
import pg from "pg";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const app = express();
const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Como este arquivo está em /src, o public fica em ../public
const PUBLIC_DIR = path.join(__dirname, "../public");

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET =
  process.env.JWT_SECRET || "jarastay-development-secret-change-me";

if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não foi configurada.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

app.disable("x-powered-by");

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
  })
);

/* =========================================================
   UTILIDADES
========================================================= */

function clean(value, max = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function normalizeEmail(value) {
  return clean(value, 254).toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);

  return [
    "scrypt",
    salt.toString("hex"),
    hash.toString("hex"),
  ].join(":");
}

function checkPassword(password, stored) {
  try {
    const parts = String(stored).split(":");

    if (parts.length !== 3) {
      return false;
    }

    const [, saltHex, hashHex] = parts;

    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");

    const calculated = crypto.scryptSync(password, salt, 64);

    return crypto.timingSafeEqual(calculated, storedHash);
  } catch {
    return false;
  }
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function createToken(payload) {
  const header = base64url(
    JSON.stringify({
      alg: "HS256",
      typ: "JWT",
    })
  );

  const now = Math.floor(Date.now() / 1000);

  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 60 * 60 * 24 * 7,
    })
  );

  const signature = base64url(
    crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest()
  );

  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = String(token).split(".");

    if (!header || !body || !signature) {
      return null;
    }

    const expected = base64url(
      crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${header}.${body}`)
        .digest()
    );

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    );

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.substring(7);
  }

  return null;
}

async function query(text, params = []) {
  return pool.query(text, params);
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function auth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
    });
  }

  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({
      error: "invalid_token",
    });
  }

  req.user = user;

  next();
}

function role(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "forbidden",
      });
    }

    next();
  };
}

/* =========================================================
   BANCO DE DADOS
========================================================= */

async function initializeDatabase() {
  console.log("Verificando banco de dados...");

  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS properties (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      address JSONB NOT NULL DEFAULT '{}'::jsonb,
      check_in TEXT DEFAULT '14:00',
      check_out TEXT DEFAULT '12:00',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS room_types (
      id BIGSERIAL PRIMARY KEY,
      property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      capacity INTEGER NOT NULL DEFAULT 2,
      base_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id BIGSERIAL PRIMARY KEY,
      property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      room_type_id BIGINT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
      number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS guests (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      country_code TEXT,
      document_last4 TEXT,
      notes TEXT DEFAULT '',
      marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      guest_id BIGINT NOT NULL REFERENCES guests(id),
      confirmation_code TEXT NOT NULL UNIQUE,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      adults INTEGER NOT NULL DEFAULT 1,
      children INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'confirmed',
      channel TEXT NOT NULL DEFAULT 'direct',
      currency TEXT NOT NULL DEFAULT 'BRL',
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax NUMERIC(12,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reservation_rooms (
      id BIGSERIAL PRIMARY KEY,
      reservation_id BIGINT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      room_id BIGINT NOT NULL REFERENCES rooms(id),
      rate NUMERIC(12,2) NOT NULL DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      property_id BIGINT,
      reservation_id BIGINT,
      kind TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS housekeeping_tasks (
      id BIGSERIAL PRIMARY KEY,
      property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      room_id BIGINT,
      type TEXT NOT NULL DEFAULT 'cleaning',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT '',
      assigned_to BIGINT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT,
      user_id BIGINT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id BIGINT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS users_email_idx
    ON users(email)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS properties_org_idx
    ON properties(organization_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS guests_org_idx
    ON guests(organization_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS reservations_org_idx
    ON reservations(organization_id)
  `);

  console.log("Banco de dados pronto.");
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/healthz", async (req, res) => {
  try {
    await query("SELECT 1");

    res.json({
      ok: true,
      service: "jarastay",
      database: true,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health error:", error);

    res.status(503).json({
      ok: false,
      database: false,
    });
  }
});

/* =========================================================
   REGISTRO
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  const name = clean(req.body.name, 120);
  const hotelName = clean(req.body.hotelName, 120);
  const em = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (name.length < 2) {
    return res.status(400).json({
      error: "name_required",
      message: "Informe seu nome.",
    });
  }

  if (!em.includes("@") || !em.includes(".")) {
    return res.status(400).json({
      error: "invalid_email",
      message: "Informe um e-mail válido.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "password_too_short",
      message: "A senha precisa ter pelo menos 8 caracteres.",
    });
  }

  const finalHotelName = hotelName || "Meu Hotel";

  const slug =
    finalHotelName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    crypto.randomBytes(3).toString("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verifica e-mail antes de tentar criar
    const existing = await client.query(
      "SELECT id FROM users WHERE email=$1 LIMIT 1",
      [em]
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "email_exists",
        message: "Este e-mail já possui uma conta.",
      });
    }

    const organizationResult = await client.query(
      `
      INSERT INTO organizations(name, slug)
      VALUES($1, $2)
      RETURNING id, name, slug, created_at
      `,
      [finalHotelName, slug]
    );

    const organization = organizationResult.rows[0];

    const passwordHash = hashPassword(password);

    const userResult = await client.query(
      `
      INSERT INTO users(
        organization_id,
        name,
        email,
        password_hash,
        role
      )
      VALUES($1, $2, $3, $4, 'owner')
      RETURNING id, name, email, role
      `,
      [
        organization.id,
        name,
        em,
        passwordHash,
      ]
    );

    const user = userResult.rows[0];

    const propertyResult = await client.query(
      `
      INSERT INTO properties(
        organization_id,
        name,
        slug,
        address
      )
      VALUES($1, $2, $3, $4)
      RETURNING id, name, slug
      `,
      [
        organization.id,
        finalHotelName,
        slug,
        JSON.stringify({
          country: "BR",
        }),
      ]
    );

    const property = propertyResult.rows[0];

    // Cria estrutura inicial do hotel
    const roomTypeResult = await client.query(
      `
      INSERT INTO room_types(
        property_id,
        name,
        description,
        capacity,
        base_rate
      )
      VALUES($1, 'Standard', 'Quarto padrão', 2, 0)
      RETURNING id
      `,
      [property.id]
    );

    await client.query(
      `
      INSERT INTO rooms(
        property_id,
        room_type_id,
        number,
        status
      )
      VALUES($1, $2, '101', 'available')
      `,
      [
        property.id,
        roomTypeResult.rows[0].id,
      ]
    );

    await client.query("COMMIT");

    const token = createToken({
      id: user.id,
      org: organization.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    console.log(
      `Nova conta criada: ${user.email} / organização ${organization.name}`
    );

    return res.status(201).json({
      success: true,
      token,
      user,
      organization,
      property,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("REGISTRATION ERROR:");
    console.error(error);

    // Agora o frontend receberá uma explicação útil
    return res.status(500).json({
      error: "registration_failed",
      message:
        process.env.NODE_ENV === "production"
          ? "Não foi possível criar a conta. Verifique o banco de dados."
          : error.message,
      detail:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.detail,
      code:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.code,
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const em = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!em || !password) {
      return res.status(400).json({
        error: "missing_credentials",
        message: "Informe e-mail e senha.",
      });
    }

    const result = await query(
      `
      SELECT
        id,
        organization_id,
        name,
        email,
        password_hash,
        role
      FROM users
      WHERE email=$1
        AND active=true
      LIMIT 1
      `,
      [em]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "E-mail ou senha incorretos.",
      });
    }

    const user = result.rows[0];

    if (!checkPassword(password, user.password_hash)) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "E-mail ou senha incorretos.",
      });
    }

    const token = createToken({
      id: user.id,
      org: user.organization_id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      error: "login_failed",
    });
  }
});

/* =========================================================
   USUÁRIO ATUAL
========================================================= */

app.get("/api/me", auth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        o.id organization_id,
        o.name organization_name,
        o.slug organization_slug
      FROM users u
      JOIN organizations o
        ON o.id=u.organization_id
      WHERE u.id=$1
      `,
      [req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "user_not_found",
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "internal_error",
    });
  }
});

/* =========================================================
   PROPRIEDADES
========================================================= */

app.get("/api/properties", auth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM properties
      WHERE organization_id=$1
        AND active=true
      ORDER BY name
      `,
      [req.user.org]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "properties_failed",
    });
  }
});

/* =========================================================
   DASHBOARD
========================================================= */

app.get("/api/dashboard", auth, async (req, res) => {
  try {
    const propertyResult = await query(
      `
      SELECT id, name
      FROM properties
      WHERE organization_id=$1
        AND active=true
      ORDER BY name
      LIMIT 1
      `,
      [req.user.org]
    );

    if (!propertyResult.rowCount) {
      return res.json({
        property: null,
        rooms: {
          total: 0,
          occupied: 0,
          available: 0,
          cleaning: 0,
          maintenance: 0,
        },
        reservations: {
          active: 0,
          arrivals: 0,
          departures: 0,
          revenue: 0,
        },
        guests: 0,
        ledgerIncome: 0,
      });
    }

    const property = propertyResult.rows[0];

    const rooms = await query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER(
          WHERE status='occupied'
        )::int AS occupied,
        COUNT(*) FILTER(
          WHERE status='available'
        )::int AS available,
        COUNT(*) FILTER(
          WHERE status='cleaning'
        )::int AS cleaning,
        COUNT(*) FILTER(
          WHERE status='maintenance'
        )::int AS maintenance
      FROM rooms
      WHERE property_id=$1
        AND active=true
      `,
      [property.id]
    );

    const reservations = await query(
      `
      SELECT
        COUNT(*) FILTER(
          WHERE status NOT IN(
            'cancelled',
            'checked_out',
            'no_show'
          )
        )::int AS active,

        COUNT(*) FILTER(
          WHERE check_in=CURRENT_DATE
          AND status IN('confirmed','hold')
        )::int AS arrivals,

        COUNT(*) FILTER(
          WHERE check_out=CURRENT_DATE
          AND status IN('confirmed','checked_in')
        )::int AS departures,

        COALESCE(
          SUM(total) FILTER(
            WHERE created_at >= date_trunc('month', NOW())
          ),
          0
        ) AS revenue

      FROM reservations
      WHERE property_id=$1
      `,
      [property.id]
    );

    const guests = await query(
      `
      SELECT COUNT(*)::int AS total
      FROM guests
      WHERE organization_id=$1
      `,
      [req.user.org]
    );

    const ledger = await query(
      `
      SELECT COALESCE(SUM(amount),0) AS total
      FROM ledger_entries
      WHERE organization_id=$1
        AND kind='income'
        AND occurred_on >= date_trunc('month', CURRENT_DATE)
      `,
      [req.user.org]
    );

    res.json({
      property,
      rooms: rooms.rows[0],
      reservations: reservations.rows[0],
      guests: Number(guests.rows[0].total),
      ledgerIncome: Number(ledger.rows[0].total),
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    res.status(500).json({
      error: "dashboard_failed",
    });
  }
});

/* =========================================================
   QUARTOS
========================================================= */

app.get("/api/rooms", auth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        r.*,
        rt.name AS room_type,
        rt.capacity,
        rt.base_rate
      FROM rooms r
      JOIN room_types rt
        ON rt.id=r.room_type_id
      JOIN properties p
        ON p.id=r.property_id
      WHERE p.organization_id=$1
        AND r.active=true
      ORDER BY p.name, r.number
      `,
      [req.user.org]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "rooms_failed",
    });
  }
});

app.patch("/api/rooms/:id", auth, async (req, res) => {
  try {
    const allowed = [
      "available",
      "occupied",
      "cleaning",
      "maintenance",
      "blocked",
    ];

    const status = clean(req.body.status, 30);

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: "invalid_status",
      });
    }

    const result = await query(
      `
      UPDATE rooms
      SET status=$1
      WHERE id=$2
        AND property_id IN(
          SELECT id
          FROM properties
          WHERE organization_id=$3
        )
      RETURNING *
      `,
      [status, req.params.id, req.user.org]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "not_found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "room_update_failed",
    });
  }
});

/* =========================================================
   HÓSPEDES
========================================================= */

app.get("/api/guests", auth, async (req, res) => {
  try {
    const term = clean(req.query.q, 100);

    const result = await query(
      `
      SELECT *
      FROM guests
      WHERE organization_id=$1
        AND (
          $2=''
          OR full_name ILIKE $3
          OR email ILIKE $3
          OR phone ILIKE $3
        )
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [
        req.user.org,
        term,
        `%${term}%`,
      ]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "guests_failed",
    });
  }
});

app.post("/api/guests", auth, async (req, res) => {
  try {
    const name = clean(req.body.fullName, 160);

    if (name.length < 2) {
      return res.status(400).json({
        error: "name_required",
      });
    }

    const result = await query(
      `
      INSERT INTO guests(
        organization_id,
        full_name,
        email,
        phone,
        country_code,
        document_last4,
        notes,
        marketing_opt_in
      )
      VALUES(
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *
      `,
      [
        req.user.org,
        name,
        normalizeEmail(req.body.email) || null,
        clean(req.body.phone, 40) || null,
        clean(req.body.countryCode, 8) || null,
        clean(req.body.documentLast4, 4) || null,
        clean(req.body.notes, 1000),
        Boolean(req.body.marketingOptIn),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "guest_create_failed",
    });
  }
});

/* =========================================================
   RESERVAS
========================================================= */

app.get("/api/reservations", auth, async (req, res) => {
  try {
    const term = clean(req.query.q, 100);

    const result = await query(
      `
      SELECT
        r.*,
        g.full_name AS guest_name,
        rm.number AS room_number,
        rt.name AS room_type
      FROM reservations r
      JOIN guests g
        ON g.id=r.guest_id
      LEFT JOIN reservation_rooms rr
        ON rr.reservation_id=r.id
      LEFT JOIN rooms rm
        ON rm.id=rr.room_id
      LEFT JOIN room_types rt
        ON rt.id=rm.room_type_id
      WHERE r.organization_id=$1
        AND (
          $2=''
          OR g.full_name ILIKE $3
          OR r.confirmation_code ILIKE $3
          OR rm.number ILIKE $3
        )
      ORDER BY r.check_in DESC, r.created_at DESC
      LIMIT 250
      `,
      [
        req.user.org,
        term,
        `%${term}%`,
      ]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "reservations_failed",
    });
  }
});

/* =========================================================
   HOUSEKEEPING
========================================================= */

app.get("/api/housekeeping", auth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        h.*,
        rm.number AS room_number,
        u.name AS assignee
      FROM housekeeping_tasks h
      LEFT JOIN rooms rm
        ON rm.id=h.room_id
      LEFT JOIN users u
        ON u.id=h.assigned_to
      JOIN properties p
        ON p.id=h.property_id
      WHERE p.organization_id=$1
      ORDER BY h.created_at DESC
      LIMIT 250
      `,
      [req.user.org]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "housekeeping_failed",
    });
  }
});

/* =========================================================
   FINANCEIRO
========================================================= */

app.get("/api/finance/ledger", auth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM ledger_entries
      WHERE organization_id=$1
      ORDER BY occurred_on DESC, created_at DESC
      LIMIT 500
      `,
      [req.user.org]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "finance_failed",
    });
  }
});

/* =========================================================
   PÁGINA PRINCIPAL
========================================================= */

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/* =========================================================
   ERROS
========================================================= */

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    error: "internal_error",
  });
});

/* =========================================================
   START
========================================================= */

async function start() {
  try {
    await initializeDatabase();

    await query("SELECT 1");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`JaraStay online na porta ${PORT}`);
      console.log(`Public: ${PUBLIC_DIR}`);
    });
  } catch (error) {
    console.error("FALHA AO INICIAR JARASTAY");
    console.error(error);

    process.exit(1);
  }
}

start();
