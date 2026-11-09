import "dotenv/config";
import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const app = express();
const PORT = Number(process.env.PORT || 4100);
const SECRET = process.env.JWT_SECRET || "change-this-secret-before-deployment";
const DB_DIR = path.resolve(process.env.DATA_DIR || "./data");

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, "akiles.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

app.use(
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") || true,
	}),
);
app.use(express.json({ limit: "2mb" }));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discipline TEXT DEFAULT 'Boxing',
  weight_class TEXT DEFAULT '',
  location TEXT DEFAULT '',
  bio TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  log_date TEXT NOT NULL,
  duration INTEGER NOT NULL,
  sets INTEGER,
  reps INTEGER,
  rounds INTEGER,
  rpe REAL NOT NULL,
  notes TEXT DEFAULT '',
  completed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date
ON workouts(user_id, log_date);

CREATE TABLE IF NOT EXISTS coaches (
  id TEXT PRIMARY KEY,
  kyron_id TEXT UNIQUE,
  name TEXT NOT NULL,
  discipline TEXT NOT NULL,
  location TEXT DEFAULT '',
  experience INTEGER DEFAULT 0,
  bio TEXT DEFAULT '',
  specialties TEXT DEFAULT '',
  mode TEXT DEFAULT 'Hybrid',
  verified INTEGER DEFAULT 0,
  rate INTEGER DEFAULT 0,
  source TEXT DEFAULT 'local',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coach_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT DEFAULT '',
  goals TEXT DEFAULT '',
  mode TEXT DEFAULT 'In person',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  mode TEXT NOT NULL,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

type Authed = Request & { userId?: string };

function auth(req: Authed, res: Response, next: NextFunction) {
	const header = req.headers.authorization || "";

	try {
		if (!header.startsWith("Bearer ")) {
			throw new Error("Missing bearer token");
		}

		const payload = jwt.verify(header.slice(7), SECRET) as { sub?: string };

		if (!payload.sub) {
			throw new Error("Invalid token subject");
		}

		const existingUser = db
			.prepare("SELECT id FROM users WHERE id = ?")
			.get(payload.sub) as { id: string } | undefined;

		if (!existingUser) {
			return res.status(401).json({
				error: "Account not found in this database. Please register again.",
			});
		}

		req.userId = existingUser.id;
		next();
	} catch {
		return res.status(401).json({
			error: "Session expired or account not found. Please sign in again.",
		});
	}
}

function issue(userId: string) {
	return jwt.sign({ sub: userId }, SECRET, { expiresIn: "14d" });
}

type UserSummary = {
	id: string;
	name: string;
	email: string;
	profile: {
		discipline: string;
		weightClass: string;
		location: string;
		bio: string;
	};
};

function userSummary(id: string): UserSummary {
	const user = db
		.prepare("SELECT id, name, email FROM users WHERE id = ?")
		.get(id) as
		| {
				id: string;
				name: string;
				email: string;
		  }
		| undefined;

	if (!user) {
		throw new Error("Account not found. Please register again.");
	}

	const profile = db
		.prepare(
			`
    SELECT
      discipline,
      weight_class AS weightClass,
      location,
      bio
    FROM profiles
    WHERE user_id = ?
  `,
		)
		.get(id) as UserSummary["profile"] | undefined;

	return {
		...user,
		profile: profile || {
			discipline: "Boxing",
			weightClass: "",
			location: "",
			bio: "",
		},
	};
}

// Health check
app.get("/api/health", (_req, res) => {
	res.json({
		status: "ok",
		service: "akiles-athlete-api",
		database: "sqlite",
	});
});

// Registration
app.post("/api/auth/register", async (req, res) => {
	const { name, email, password } = req.body || {};

	if (
		typeof name !== "string" ||
		name.trim().length < 2 ||
		typeof email !== "string" ||
		!/^\S+@\S+\.\S+$/.test(email) ||
		typeof password !== "string" ||
		password.length < 8
	) {
		return res.status(400).json({
			error:
				"Enter your name, a valid email and a password of at least 8 characters.",
		});
	}

	try {
		const id = randomUUID();
		const hash = await bcrypt.hash(password, 12);

		db.prepare(
			"INSERT INTO users(id, name, email, password_hash) VALUES(?,?,?,?)",
		).run(id, name.trim(), email.toLowerCase(), hash);

		db.prepare("INSERT INTO profiles(user_id) VALUES(?)").run(id);

		return res.status(201).json({
			token: issue(id),
			user: userSummary(id),
		});
	} catch (e: any) {
		return res.status(409).json({
			error:
				e.code === "SQLITE_CONSTRAINT_UNIQUE"
					? "An account with this email already exists."
					: "Could not create account.",
		});
	}
});

// Login
app.post("/api/auth/login", async (req, res) => {
	const { email, password } = req.body || {};

	const user = db
		.prepare("SELECT * FROM users WHERE email = ?")
		.get(String(email || "").toLowerCase()) as any;

	if (
		!user ||
		!(await bcrypt.compare(String(password || ""), user.password_hash))
	) {
		return res.status(401).json({
			error: "Email or password is incorrect.",
		});
	}

	res.json({
		token: issue(user.id),
		user: userSummary(user.id),
	});
});

// Current authenticated user
app.get("/api/auth/me", auth, (req: Authed, res) => {
	const user = userSummary(req.userId!);
	res.json({ user });
});

// Profile
app.get("/api/profile", auth, (req: Authed, res) => {
	res.json({
		profile: userSummary(req.userId!).profile,
	});
});

app.put("/api/profile", auth, (req: Authed, res) => {
	const { name, discipline, weightClass, location, bio } = req.body || {};

	if (typeof name !== "string" || name.trim().length < 2) {
		return res.status(400).json({
			error: "Name must contain at least 2 characters.",
		});
	}

	db.prepare("UPDATE users SET name = ? WHERE id = ?").run(
		name.trim(),
		req.userId,
	);

	db.prepare(
		`
    UPDATE profiles
    SET discipline = ?,
        weight_class = ?,
        location = ?,
        bio = ?
    WHERE user_id = ?
  `,
	).run(
		String(discipline || "Boxing").slice(0, 60),
		String(weightClass || "").slice(0, 80),
		String(location || "").slice(0, 120),
		String(bio || "").slice(0, 1000),
		req.userId,
	);

	res.json({
		profile: userSummary(req.userId!).profile,
	});
});

// Workouts
app.get("/api/workouts", auth, (req: Authed, res) => {
	const rows = db
		.prepare(
			`
    SELECT
      id,
      title,
      category,
      log_date AS date,
      duration,
      sets,
      reps,
      rounds,
      rpe,
      notes,
      completed
    FROM workouts
    WHERE user_id = ?
    ORDER BY log_date DESC, created_at DESC
  `,
		)
		.all(req.userId);

	res.json({ workouts: rows });
});

app.post("/api/workouts", auth, async (req: Authed, res) => {
	const body = req.body || {};

	if (
		typeof body.title !== "string" ||
		!body.title.trim() ||
		typeof body.category !== "string" ||
		!/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
		!Number.isInteger(Number(body.duration)) ||
		Number(body.duration) < 1 ||
		Number(body.duration) > 600 ||
		!Number.isFinite(Number(body.rpe)) ||
		Number(body.rpe) < 1 ||
		Number(body.rpe) > 10
	) {
		return res.status(400).json({
			error:
				"Provide a title, discipline, valid date, duration and RPE from 1 to 10.",
		});
	}

	const id = randomUUID();

	db.prepare(
		`
    INSERT INTO workouts(
      id, user_id, title, category, log_date,
      duration, sets, reps, rounds, rpe, notes
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
  `,
	).run(
		id,
		req.userId,
		body.title.trim().slice(0, 120),
		body.category.slice(0, 60),
		body.date,
		Number(body.duration),
		body.sets ? Number(body.sets) : null,
		body.reps ? Number(body.reps) : null,
		body.rounds ? Number(body.rounds) : null,
		Number(body.rpe),
		String(body.notes || "").slice(0, 2000),
	);

	let kyronSyncStatus: "synced" | "not_connected" | "failed" = "not_connected";

	if (KYRON_URL && INTEGRATION_KEY) {
		try {
			const email = userSummary(req.userId!).email.toLowerCase();

			const result = await kyron(
				`/relationship?email=${encodeURIComponent(email)}`,
			);

			const relationship = result.relationship;

			if (relationship?.relationshipId && relationship?.athleteId) {
				await kyron("/workout-completions", {
					method: "POST",
					body: JSON.stringify({
						relationshipId: relationship.relationshipId,
						athleteId: relationship.athleteId,
						athleteEmail: email,
						workout: {
							id,
							title: body.title.trim(),
							category: body.category,
							date: body.date,
							duration: Number(body.duration),
							sets: body.sets ? Number(body.sets) : null,
							reps: body.reps ? Number(body.reps) : null,
							rounds: body.rounds ? Number(body.rounds) : null,
							rpe: Number(body.rpe),
							notes: String(body.notes || ""),
						},
					}),
				});

				kyronSyncStatus = "synced";
			} else {
				console.warn(
					`Workout ${id} saved locally, but no linked Kyron athlete was found.`,
				);
			}
		} catch (error) {
			kyronSyncStatus = "failed";

			console.error("Workout sync to Kyron failed:", error);
		}
	}

	return res.status(201).json({
		id,
		kyronSyncStatus,
	});
});

app.delete("/api/workouts/:id", auth, (req: Authed, res) => {
	const result = db
		.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?")
		.run(req.params.id, req.userId);

	if (!result.changes) {
		return res.status(404).json({
			error: "Workout not found.",
		});
	}

	res.json({ success: true });
});

// Kyron integration
const KYRON_URL = (process.env.KYRON_API_URL || "").replace(/\/$/, "");
const INTEGRATION_KEY = process.env.AKILES_INTEGRATION_KEY || "";


async function kyron(pathname: string, init: RequestInit = {}) {
	if (!KYRON_URL || !INTEGRATION_KEY) {
		throw new Error("Kyron integration is not configured.");
	}

	const response = await fetch(`${KYRON_URL}/api/integrations${pathname}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${INTEGRATION_KEY}`,
			...(init.headers || {}),
		},
	});

	const data: any = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data.error || `Kyron API returned ${response.status}.`);
	}

	return data;
}

app.get("/api/coaches", auth, async (_req, res) => {
	try {
		const data = await kyron("/coaches");

		res.json({
			coaches: data.coaches || [],
			source: "kyron",
			integrationConfigured: true,
		});
	} catch (error) {
		res.json({
			coaches: [],
			source: "kyron-unavailable",
			integrationConfigured: false,
			integrationError:
				error instanceof Error ? error.message : "Kyron unavailable",
		});
	}
});

app.get("/api/onboarding/invitations", auth, async (req: Authed, res) => {
	try {
		const email = userSummary(req.userId!).email.toLowerCase();

		const data = await kyron(
			`/onboarding-invitations?email=${encodeURIComponent(email)}`,
		);

		res.json({
			invitations: data.invitations || [],
		});
	} catch (error) {
		res.json({
			invitations: [],
			integrationConfigured: false,
			integrationError:
				error instanceof Error ? error.message : "Could not load invitations.",
		});
	}
});

app.post(
	"/api/onboarding/invitations/:id/respond",
	auth,
	async (req: Authed, res) => {
		const decision = req.body?.decision;

		if (!["accepted", "declined"].includes(decision)) {
			return res.status(400).json({
				error: "Choose accept or decline.",
			});
		}

		try {
			const email = userSummary(req.userId!).email.toLowerCase();

			const data = await kyron(
				`/onboarding-invitations/${encodeURIComponent(req.params.id)}/respond`,
				{
					method: "POST",
					body: JSON.stringify({
						athleteEmail: email,
						decision,
					}),
				},
			);

			res.json(data);
		} catch (error) {
			res.status(502).json({
				error:
					error instanceof Error
						? error.message
						: "Could not respond to invitation.",
			});
		}
	},
);

app.get("/api/relationship", auth, async (req: Authed, res) => {
	try {
		const email = userSummary(req.userId!).email.toLowerCase();

		const data = await kyron(
			`/relationship?email=${encodeURIComponent(email)}`,
		);

		res.json(data);
	} catch (error) {
		res.json({
			relationship: null,
			integrationConfigured: false,
			integrationError:
				error instanceof Error ? error.message : "Could not load relationship.",
		});
	}
});

// Assigned training sessions from Kyron
app.get("/api/assigned-workouts", auth, async (req: Authed, res) => {
  try {
    const email = userSummary(req.userId!).email.toLowerCase();

    const data = await kyron(
      `/assigned-workouts?email=${encodeURIComponent(email)}`,
    );

    res.json({
      workouts: Array.isArray(data.workouts) ? data.workouts : [],
    });
  } catch (error) {
    console.error("Could not load Kyron assigned workouts:", error);

    res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Could not load assigned workouts.",
    });
  }
});
// Feedback
app.get("/api/feedback", auth, (req: Authed, res) => {
	const feedback = db
		.prepare(
			`
    SELECT
      id,
      coach_id AS coachId,
      coach_name AS coachName,
      message,
      created_at AS createdAt
    FROM feedback
    WHERE user_id = ?
    ORDER BY created_at DESC
  `,
		)
		.all(req.userId);

	res.json({ feedback });
});

app.listen(PORT, () => {
	console.log(`Akiles Athlete API listening on http://localhost:${PORT}`);
});
