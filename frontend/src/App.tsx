import { useEffect, useMemo, useRef, useState } from "react";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	CalendarDays,
	Check,
	ChevronRight,
	Clock3,
	Dumbbell,
	Film,
	Flame,
	Goal,
	LayoutDashboard,
	LogOut,
	Menu,
	Plus,
	Search,
	Settings,
	ShieldCheck,
	UserRound,
	Users,
	Video,
	Weight,
	X,
	Upload,
	Play,
	Trash2,
	Send,
	CircleCheck,
	CircleDashed,
	Trophy,
	Bell,
	BookOpen,
	Timer,
	MapPin,
	Star,
} from "lucide-react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
const API = import.meta.env.VITE_API_URL || "http://localhost:4100/api";
type Workout = {
	id: string;
	title: string;
	category: string;
	date: string;
	duration: number;
	sets?: number;
	reps?: number;
	rounds?: number;
	rpe: number;
	notes: string;
	completed: boolean;
	source_key?: string | null;
};
type CoachNote = {
	id: string;
	athleteId: string;
	message: string;
	createdAt: string;
};
type Coach = {
	id: string;
	name: string;
	discipline: string;
	location: string;
	experience: number;
	bio: string;
	specialties: string;
	mode: string;
	verified: boolean;
	rate: number;
	phone?: string;
	email?: string;
	website?: string;
};
type User = { id: string; name: string; email: string };
type Request = {
	id: string;
	coachId: string;
	coachName: string;
	status: string;
	message: string;
	createdAt: string;
};
const nav = [
	["dashboard", "The Citadel", LayoutDashboard],
	["training", "The Forge", Dumbbell],
	["videos", "The Chronicle", Film],
	["coaches", "The Mentors", Users],
	["onboarding", "Onboarding", Bell],
	["statistics", "The Ascension", BarChart3],
	["profile", "Athlete Profile", UserRound],
] as const;
const dateToday = () => new Date().toISOString().slice(0, 10);
class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}
async function request(
	path: string,
	options: RequestInit = {},
	token?: string,
) {
	const res = await fetch(`${API}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers || {}),
		},
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new ApiError(
			data.error || `Request failed (${res.status})`,
			res.status,
		);
	return data;
}
function App() {
	const [token, setToken] = useState(
		localStorage.getItem("akiles_token") || "",
	);
	const [user, setUser] = useState<User | null>(null);
	const [page, setPage] = useState<string>("dashboard");
	const [workouts, setWorkouts] = useState<Workout[]>([]);
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [invitations, setInvitations] = useState<any[]>([]);
	const [relationship, setRelationship] = useState<any | null>(null);
	const [feedback, setFeedback] = useState<any[]>([]);
	const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
	const [profile, setProfile] = useState<any>({
		name: "",
		email: "",
		discipline: "Boxing",
		weightClass: "",
		location: "",
		bio: "",
	});
	const [loading, setLoading] = useState(false);
	const [notice, setNotice] = useState("");
	const [error, setError] = useState("");
	const [showWorkout, setShowWorkout] = useState(false);
	const [query, setQuery] = useState("");
	const [mobileNav, setMobileNav] = useState(false);
	const flash = (s: string) => {
		setNotice(s);
		setTimeout(() => setNotice(""), 3500);
	};
	const load = async (t = token) => {
		if (!t) return;
		setLoading(true);
		try {
			const me = await request("/auth/me", {}, t);
			if (
				!me?.user ||
				typeof me.user.name !== "string" ||
				!me.user.name.trim()
			) {
				throw new Error("Account not found. Please sign in again.");
			}
			setUser(me.user);
			setProfile(
				me.user.profile || {
					name: me.user.name,
					email: me.user.email,
					discipline: "Boxing",
					weightClass: "",
					location: "",
					bio: "",
				},
			);
			const results = await Promise.allSettled([
				request("/workouts", {}, t),
				request("/coaches", {}, t),
				request("/onboarding/invitations", {}, t),
				request("/relationship", {}, t),
				request("/feedback", {}, t),
				request("/coach-notes", {}, t),
			]);
			const [w, c, i, rel, f, n] = results;
			if (w.status === "fulfilled") {
				setWorkouts(w.value.workouts || []);
				if (w.value.syncStatus === "failed" && w.value.syncError) {
					setError(`Kyron workout sync failed: ${w.value.syncError}`);
				}
				if (w.value.syncStatus === "not_configured") {
					setError(
						"Kyron workout sync is not configured on the Akiles backend. Check KYRON_API_URL and AKILES_INTEGRATION_KEY.",
					);
				}
			}
			if (c.status === "fulfilled") setCoaches(c.value.coaches || []);
			if (i.status === "fulfilled") setInvitations(i.value.invitations || []);
			if (rel.status === "fulfilled")
				setRelationship(rel.value.relationship || null);
			if (f.status === "fulfilled") setFeedback(f.value.feedback || []);
			if (n.status === "fulfilled") setCoachNotes(n.value.notes || []);
			if (results.some((r) => r.status === "rejected")) {
				const noteFailure = n.status === "rejected";
				setError(
					noteFailure
						? `Coach notes could not load: ${(n.reason as Error)?.message || "Check the Akiles-to-Kyron integration."}`
						: "Some Akiles features could not load. Your account is still signed in.",
				);
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : "Could not load account";
			setError(message);
			if (/401|session|account not found|sign in again/i.test(message)) {
				localStorage.removeItem("akiles_token");
				setToken("");
				setUser(null);
			}
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		if (token) void load(token);
	}, []);
	useEffect(() => {
		if (!token) return;
		const timer = window.setInterval(() => {
			void load(token);
		}, 30000);
		return () => window.clearInterval(timer);
	}, [token]);
	const saveToken = (t: string) => {
		localStorage.setItem("akiles_token", t);
		setToken(t);
		void load(t);
	};
	const logout = () => {
		localStorage.removeItem("akiles_token");
		setToken("");
		setUser(null);
		setWorkouts([]);
	};
	const pendingInvitation = invitations.find((i) => i.status === "pending");
	const activeCoach = relationship
		? coaches.find((c) => c.id === relationship.coachId) || {
				id: relationship.coachId,
				name: relationship.coachName,
				discipline: "Combat Sports",
				experience: 0,
			}
		: undefined;
	const totals = useMemo(
		() => ({
			hours:
				Math.round((workouts.reduce((s, w) => s + w.duration, 0) / 60) * 10) /
				10,
			sessions: workouts.length,
			rounds: workouts.reduce((s, w) => s + (w.rounds || 0), 0),
			days: new Set(workouts.map((w) => w.date)).size,
		}),
		[workouts],
	);
	const filteredCoaches = coaches.filter((c) =>
		`${c.name} ${c.discipline} ${c.location} ${c.specialties}`
			.toLowerCase()
			.includes(query.toLowerCase()),
	);
	if (!token || !user) return <Auth onAuth={saveToken} />;
	const addWorkout = async (form: any) => {
		try {
			await request(
				"/workouts",
				{ method: "POST", body: JSON.stringify(form) },
				token,
			);
			await load();
			setShowWorkout(false);
			flash("Training session recorded.");
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<div className="app-shell">
			<aside className={`sidebar ${mobileNav ? "open" : ""}`}>
				<div className="brand">
					<div className="brand-mark">
						<img src="/Akiles_logo.png" />
					</div>
					<div>
						<div className="brand-name">AKILES</div>
						<div className="brand-subtitle">ATHLETE • THE ARENA</div>
					</div>
					<button className="close-nav" onClick={() => setMobileNav(false)}>
						<X />
					</button>
				</div>
				<div className="nav-caption">ATHLETE COMMAND</div>
				<nav>
					{nav.map(([id, label, Icon]) => (
						<button
							key={id}
							className={`nav-item ${page === id ? "active" : ""}`}
							onClick={() => {
								setPage(id);
								setMobileNav(false);
							}}
						>
							<Icon size={17} />
							<span>{label}</span>
							{id === "onboarding" && pendingInvitation && (
								<i className="nav-dot" />
							)}
						</button>
					))}
				</nav>
				<div className="sidebar-bottom">
					<div className="sidebar-rule" />
					<div className="user-mini">
						<div className="avatar">
							{(user.name || "A").slice(0, 1).toUpperCase()}
						</div>
						<div className="user-mini-copy">
							<b>{user.name || "Athlete"}</b>
							<span>{profile.discipline || "Athlete"}</span>
						</div>
						<button title="Sign out" onClick={logout}>
							<LogOut size={16} />
						</button>
					</div>
					<div className="version">ARETÉ PERFORMANCE ECOSYSTEM</div>
				</div>
			</aside>
			<main className="main">
				<header className="topbar">
					<button className="mobile-menu" onClick={() => setMobileNav(true)}>
						<Menu />
					</button>
					<div className="crumb">
						AKILES <span>/</span>{" "}
						{nav.find((n) => n[0] === page)?.[1].toUpperCase()}
					</div>
					<div className="top-actions">
						<span className="live-indicator">
							<i /> PERSONAL TRAINING LOG
						</span>
						<button className="icon-button" onClick={() => setPage("profile")}>
							<Settings size={17} />
						</button>
						<div className="top-avatar">
							{(user.name || "A").slice(0, 1).toUpperCase()}
						</div>
					</div>
				</header>
				<div className="content">
					{notice && (
						<div className="toast">
							<Check size={16} />
							{notice}
						</div>
					)}
					{error && (
						<div className="error-banner">
							<span>{error}</span>
							<button onClick={() => setError("")}>
								<X size={15} />
							</button>
						</div>
					)}
					{loading && <div className="loading-line" />}
					{page === "dashboard" && (
						<Dashboard
							user={user}
							totals={totals}
							workouts={workouts}
							activeCoach={activeCoach}
							pending={pendingInvitation}
							onNavigate={setPage}
							feedback={feedback}
							coachNotes={coachNotes}
						/>
					)}
					{page === "training" && (
						<Training
							workouts={workouts}
							onAdd={() => setShowWorkout(true)}
							onDelete={async (id: string) => {
								await request(`/workouts/${id}`, { method: "DELETE" }, token);
								await load();
								flash("Workout removed.");
							}}
						/>
					)}
					{page === "videos" && (
						<VideoLibrary token={token} workouts={workouts} flash={flash} />
					)}
					{page === "coaches" && (
						<Coaches
							coaches={filteredCoaches}
							query={query}
							setQuery={setQuery}
							relationship={relationship}
						/>
					)}
					{page === "onboarding" && (
						<Onboarding
							invitations={invitations}
							onRespond={async (id: string, decision: string) => {
								await request(
									`/onboarding/invitations/${id}/respond`,
									{ method: "POST", body: JSON.stringify({ decision }) },
									token,
								);
								await load();
								flash(
									decision === "accepted"
										? "Coach relationship activated."
										: "Invitation declined.",
								);
							}}
						/>
					)}

					{page === "statistics" && (
						<Statistics workouts={workouts} totals={totals} />
					)}
					{page === "profile" && (
						<Profile
							profile={profile}
							onSave={async (p: any) => {
								await request(
									"/profile",
									{ method: "PUT", body: JSON.stringify(p) },
									token,
								);
								await load();
								flash("Athlete profile saved.");
							}}
						/>
					)}
				</div>
			</main>
			{showWorkout && (
				<WorkoutModal
					onClose={() => setShowWorkout(false)}
					onSave={addWorkout}
				/>
			)}
		</div>
	);
}
function Auth({ onAuth }: { onAuth: (t: string) => void }) {
	const [mode, setMode] = useState<"login" | "register">("register");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const submit = async (e: any) => {
		e.preventDefault();
		setBusy(true);
		setError("");
		try {
			const data = await request(`/auth/${mode}`, {
				method: "POST",
				body: JSON.stringify({ name, email, password }),
			});
			onAuth(data.token);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	};
	return (
		<div className="auth-screen">
			<div className="auth-art">
				<div className="auth-brand">
					<div className="brand-mark">
						<img src="/Akiles_logo.png" />
					</div>
					<div>
						<div className="brand-name">AKILES</div>
						<div className="brand-subtitle">ATHLETE • THE ARENA</div>
					</div>
				</div>
				<div className="auth-quote">
					<div className="eyebrow gold">DISCIPLINE IS THE DIFFERENCE</div>
					<h1>
						FORGED
						<br />
						<em>IN THE</em>
						<br />
						ARENA.
					</h1>
					<p>
						Every round has a purpose. Every session leaves a mark. Build the
						athlete you came here to become.
					</p>
					<div className="greek-rule">
						<span>ΑΡΕΤΗ</span>
					</div>
				</div>
				<div className="auth-foot">
					AN ATHLETE OPERATING SYSTEM <span>EST. MMXXVI</span>
				</div>
			</div>
			<div className="auth-panel">
				<div className="auth-form-wrap">
					<div className="eyebrow">YOUR JOURNEY STARTS HERE</div>
					<h2>{mode === "register" ? "Claim your arena." : "Welcome back."}</h2>
					<p className="muted">
						{mode === "register"
							? "Create your athlete account and take ownership of your progress."
							: "Sign in to continue your training journey."}
					</p>
					<div className="auth-tabs">
						<button
							className={mode === "register" ? "selected" : ""}
							onClick={() => setMode("register")}
						>
							CREATE ACCOUNT
						</button>
						<button
							className={mode === "login" ? "selected" : ""}
							onClick={() => setMode("login")}
						>
							SIGN IN
						</button>
					</div>
					<form onSubmit={submit}>
						{mode === "register" && (
							<label>
								FULL NAME
								<input
									required
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your name"
								/>
							</label>
						)}
						<label>
							EMAIL ADDRESS
							<input
								required
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
							/>
						</label>
						<label>
							PASSWORD
							<input
								required
								minLength={8}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="At least 8 characters"
							/>
						</label>
						{error && <div className="error-banner">{error}</div>}
						<button className="gold-button full" disabled={busy}>
							{busy
								? "PLEASE WAIT…"
								: mode === "register"
									? "CREATE ATHLETE ACCOUNT"
									: "ENTER AKILES"}
							<ChevronRight size={17} />
						</button>
					</form>
					<div className="auth-note">
						<ShieldCheck size={15} /> Your training records are yours. Videos
						stay on this device unless you choose to share them.
					</div>
				</div>
			</div>
		</div>
	);
}
function PageHead({
	eyebrow,
	title,
	desc,
	action,
}: {
	eyebrow: string;
	title: string;
	desc: string;
	action?: any;
}) {
	return (
		<div className="page-head">
			<div>
				<div className="eyebrow">{eyebrow}</div>
				<h1>{title}</h1>
				<p>{desc}</p>
			</div>
			{action}
		</div>
	);
}
function Stat({
	label,
	value,
	unit,
	icon: Icon,
	delta,
}: {
	label: string;
	value: string | number;
	unit?: string;
	icon: any;
	delta?: string;
}) {
	return (
		<div className="stat-card">
			<div className="stat-top">
				<span>{label}</span>
				<Icon size={17} />
			</div>
			<div className="stat-value">
				{value}
				<small>{unit}</small>
			</div>
			{delta && (
				<div className="stat-delta">
					<ArrowUpRight size={13} />
					{delta}
				</div>
			)}
		</div>
	);
}
function Dashboard({
	user,
	totals,
	workouts,
	activeCoach,
	pending,
	onNavigate,
	feedback,
	coachNotes,
}: any) {
	const latest = [...workouts]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 4);
	return (
		<>
			<PageHead
				eyebrow="THE CITADEL / ATHLETE OVERVIEW"
				title={`Rise, ${(user.name || "Athlete").split(" ")[0]}.`}
				desc="Your arena. Your discipline. Your progress."
				action={
					<div className="date-chip">
						<CalendarDays size={15} />
						{new Date().toLocaleDateString("en-IN", {
							weekday: "short",
							day: "2-digit",
							month: "short",
							year: "numeric",
						})}
					</div>
				}
			/>
			<div className="hero-panel">
				<div className="hero-copy">
					<div className="eyebrow gold">THE WORK DOES NOT LIE</div>
					<h2>
						Earn your
						<br />
						<em>next level.</em>
					</h2>
					<p>
						Consistency is built one session at a time. Log your work, study
						your progress, and keep moving forward.
					</p>
					<button
						className="gold-button"
						onClick={() => onNavigate("training")}
					>
						LOG A SESSION <ChevronRight size={16} />
					</button>
				</div>
				<div className="hero-emblem">
					<div className="emblem-ring">
						<div className="emblem-inner">
							<span>Α</span>
							<small>ARETÉ</small>
						</div>
					</div>
					<div className="hero-coordinates">
						DISCIPLINE • COURAGE • EXCELLENCE
					</div>
				</div>
			</div>
			<div className="stats-grid">
				<Stat
					label="TRAINING HOURS"
					value={totals.hours}
					unit="hrs"
					icon={Clock3}
				/>
				<Stat label="SESSIONS LOGGED" value={totals.sessions} icon={Dumbbell} />
				<Stat label="ROUNDS COMPLETED" value={totals.rounds} icon={Activity} />
				<Stat label="ACTIVE DAYS" value={totals.days} icon={Flame} />
			</div>
			<div className="dashboard-columns">
				<section className="panel">
					<div className="panel-head">
						<div>
							<div className="eyebrow">YOUR RECORD</div>
							<h3>Recent training</h3>
						</div>
						<button
							className="text-button"
							onClick={() => onNavigate("training")}
						>
							VIEW ALL <ChevronRight size={14} />
						</button>
					</div>
					{latest.length ? (
						latest.map((w) => (
							<div className="workout-row" key={w.id}>
								<div className="workout-icon">
									<Dumbbell size={17} />
								</div>
								<div className="workout-info">
									<b>{w.title}</b>
									<span>
										{w.category} ·{" "}
										{new Date(w.date + "T00:00:00").toLocaleDateString()}
									</span>
								</div>
								<div className="workout-duration">{w.duration} min</div>
							</div>
						))
					) : (
						<Empty
							icon={Dumbbell}
							title="Your record starts here"
							text="Log your first session to start building your training history."
							action="LOG FIRST SESSION"
							onClick={() => onNavigate("training")}
						/>
					)}
				</section>
				<section className="panel coach-panel">
					<div className="panel-head">
						<div>
							<div className="eyebrow">YOUR CORNER</div>
							<h3>Coach relationship</h3>
						</div>
						<Users size={18} />
					</div>
					{activeCoach ? (
						<div className="coach-state">
							<div className="coach-avatar">
								{activeCoach.name
									.split(" ")
									.map((x: string) => x[0])
									.join("")
									.slice(0, 2)}
							</div>
							<h4>{activeCoach.name}</h4>
							<p>
								{activeCoach.discipline} · {activeCoach.experience} years
								experience
							</p>
							<span className="pill active-pill">
								<Check size={12} /> ACTIVE COACH
							</span>
							<button
								className="secondary-button"
								onClick={() => onNavigate("coaches")}
							>
								VIEW COACH PROFILE
							</button>
						</div>
					) : pending ? (
						<div className="pending-state">
							<div className="pending-icon">
								<Clock3 />
							</div>
							<h4>Onboarding invitation received</h4>
							<p>
								Your coach has invited you to connect. Review and accept the
								invitation in Onboarding to activate your relationship.
							</p>
							<span className="pill pending-pill">AWAITING ACCEPTANCE</span>
						</div>
					) : (
						<div className="no-coach">
							<div className="no-coach-symbol">✥</div>
							<h4>Find your corner team.</h4>
							<p>
								Connect with a verified coach to receive tailored training,
								feedback and guidance.
							</p>
							<button
								className="gold-button"
								onClick={() => onNavigate("coaches")}
							>
								DISCOVER COACHES <ChevronRight size={15} />
							</button>
						</div>
					)}
				</section>
			</div>
			<section className="panel feedback-panel">
				<div className="panel-head">
					<div>
						<div className="eyebrow">YOUR COACH / TRAINING NOTES</div>
						<h3>Notes from your coach</h3>
					</div>
					<BookOpen size={18} />
				</div>
				{coachNotes?.length ? (
					coachNotes.slice(0, 5).map((n: any) => (
						<div className="feedback-item" key={n.id}>
							<p style={{ whiteSpace: "pre-wrap" }}>{n.message}</p>
							<span>{new Date(n.createdAt).toLocaleString()}</span>
						</div>
					))
				) : (
					<div className="empty-inline">
						Your coach's notes will appear here when shared through Kyron.
					</div>
				)}
			</section>
			<section className="panel feedback-panel">
				<div className="panel-head">
					<div>
						<div className="eyebrow">WORDS FROM YOUR CORNER</div>
						<h3>Coach feedback</h3>
					</div>
					<BookOpen size={18} />
				</div>
				{feedback.length ? (
					feedback.slice(0, 2).map((f: any) => (
						<div className="feedback-item" key={f.id}>
							<p>“{f.message}”</p>
							<span>
								{f.coachName} · {new Date(f.createdAt).toLocaleDateString()}
							</span>
						</div>
					))
				) : (
					<div className="empty-inline">
						Coach feedback and training notes will appear here when shared with
						you.
					</div>
				)}
			</section>
		</>
	);
}
function Empty({ icon: Icon, title, text, action, onClick }: any) {
	return (
		<div className="empty-state">
			<div className="empty-icon">
				<Icon size={22} />
			</div>
			<h4>{title}</h4>
			<p>{text}</p>
			{action && (
				<button className="secondary-button" onClick={onClick}>
					{action}
				</button>
			)}
		</div>
	);
}
function Training({ workouts, onAdd, onDelete }: any) {
	return (
		<>
			<PageHead
				eyebrow="THE FORGE / TRAINING LOG"
				title="The work."
				desc="Record every session. Measure what matters. Leave nothing to guesswork."
				action={
					<button className="gold-button" onClick={onAdd}>
						<Plus size={16} /> LOG WORKOUT
					</button>
				}
			/>
			<div className="training-summary">
				<div>
					<span>SESSIONS</span>
					<b>{workouts.length}</b>
				</div>
				<div>
					<span>TOTAL MINUTES</span>
					<b>{workouts.reduce((s: number, w: Workout) => s + w.duration, 0)}</b>
				</div>
				<div>
					<span>TOTAL ROUNDS</span>
					<b>
						{workouts.reduce((s: number, w: Workout) => s + (w.rounds || 0), 0)}
					</b>
				</div>
			</div>
			<section className="panel">
				<div className="panel-head">
					<div>
						<div className="eyebrow">TRAINING HISTORY</div>
						<h3>All sessions</h3>
					</div>
					<span className="pill">{workouts.length} RECORDS</span>
				</div>
				{workouts.length ? (
					<div className="table-wrap">
						<table>
							<thead>
								<tr>
									<th>SESSION</th>
									<th>DATE</th>
									<th>DURATION</th>
									<th>VOLUME</th>
									<th>INTENSITY</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{[...workouts]
									.sort((a: Workout, b: Workout) =>
										b.date.localeCompare(a.date),
									)
									.map((w: Workout) => (
										<tr key={w.id}>
											<td>
												<b>{w.title}</b>
												<small>
													{w.category}
													{w.source_key?.startsWith("kyron:")
														? " · COACH ASSIGNED"
														: ""}
												</small>
											</td>
											<td>
												{new Date(w.date + "T00:00:00").toLocaleDateString()}
											</td>
											<td>{w.duration} min</td>
											<td>
												{w.rounds
													? `${w.rounds} rounds`
													: w.sets
														? `${w.sets} × ${w.reps || 0}`
														: "—"}
											</td>
											<td>
												<span className="intensity">RPE {w.rpe}/10</span>
											</td>
											<td>
												<button
													className="icon-button danger"
													onClick={() => onDelete(w.id)}
													title="Delete workout"
												>
													<Trash2 size={15} />
												</button>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				) : (
					<Empty
						icon={Dumbbell}
						title="No sessions recorded"
						text="Your training history will appear here once you log your first workout."
						action="LOG WORKOUT"
						onClick={onAdd}
					/>
				)}
			</section>
		</>
	);
}
function WorkoutModal({ onClose, onSave }: any) {
	const [f, setF] = useState<any>({
		title: "",
		category: "Boxing",
		date: dateToday(),
		duration: 60,
		sets: "",
		reps: "",
		rounds: "",
		rpe: 6,
		notes: "",
	});
	const change = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
	return (
		<Modal
			title="Record your work"
			eyebrow="THE FORGE / NEW SESSION"
			onClose={onClose}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onSave({
						...f,
						duration: Number(f.duration),
						rpe: Number(f.rpe),
						sets: f.sets ? Number(f.sets) : null,
						reps: f.reps ? Number(f.reps) : null,
						rounds: f.rounds ? Number(f.rounds) : null,
					});
				}}
			>
				<div className="form-grid">
					<label className="wide">
						SESSION TITLE
						<input
							required
							value={f.title}
							onChange={(e) => change("title", e.target.value)}
							placeholder="e.g. Technical sparring"
						/>
					</label>
					<label>
						DISCIPLINE
						<select
							value={f.category}
							onChange={(e) => change("category", e.target.value)}
						>
							{[
								"Boxing",
								"Kickboxing",
								"Muay Thai",
								"MMA",
								"Wrestling",
								"Strength & Conditioning",
								"Mobility",
								"Cardio",
								"Other",
							].map((x) => (
								<option>{x}</option>
							))}
						</select>
					</label>
					<label>
						DATE
						<input
							type="date"
							required
							value={f.date}
							onChange={(e) => change("date", e.target.value)}
						/>
					</label>
					<label>
						DURATION (MINUTES)
						<input
							type="number"
							min="1"
							max="600"
							required
							value={f.duration}
							onChange={(e) => change("duration", e.target.value)}
						/>
					</label>
					<label>
						ROUNDS
						<input
							type="number"
							min="0"
							value={f.rounds}
							onChange={(e) => change("rounds", e.target.value)}
							placeholder="Optional"
						/>
					</label>
					<label>
						SETS
						<input
							type="number"
							min="0"
							value={f.sets}
							onChange={(e) => change("sets", e.target.value)}
							placeholder="Optional"
						/>
					</label>
					<label>
						REPS
						<input
							type="number"
							min="0"
							value={f.reps}
							onChange={(e) => change("reps", e.target.value)}
							placeholder="Optional"
						/>
					</label>
					<label className="wide">
						INTENSITY — RPE {f.rpe}/10
						<input
							type="range"
							min="1"
							max="10"
							value={f.rpe}
							onChange={(e) => change("rpe", e.target.value)}
						/>
					</label>
					<label className="wide">
						SESSION NOTES
						<textarea
							rows={3}
							value={f.notes}
							onChange={(e) => change("notes", e.target.value)}
							placeholder="What went well? What needs work?"
						/>
					</label>
				</div>
				<div className="modal-actions">
					<button type="button" className="secondary-button" onClick={onClose}>
						CANCEL
					</button>
					<button className="gold-button">
						SAVE SESSION <Check size={15} />
					</button>
				</div>
			</form>
		</Modal>
	);
}
function Modal({ title, eyebrow, children, onClose }: any) {
	return (
		<div
			className="modal-backdrop"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="modal">
				<div className="modal-head">
					<div>
						<div className="eyebrow">{eyebrow}</div>
						<h2>{title}</h2>
					</div>
					<button className="icon-button" onClick={onClose}>
						<X />
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}
function VideoLibrary({ token, workouts, flash }: any) {
	const [items, setItems] = useState<any[]>([]);
	const [selected, setSelected] = useState<any>(null);
	const [category, setCategory] = useState("All");
	const input = useRef<HTMLInputElement>(null);
	useEffect(() => {
		void listVideos().then(setItems);
	}, []);
	const add = async (files: FileList | null) => {
		if (!files) return;
		for (const file of Array.from(files)) {
			if (!file.type.startsWith("video/")) continue;
			const id = crypto.randomUUID();
			await saveVideo({
				id,
				name: file.name,
				type: file.type,
				size: file.size,
				createdAt: new Date().toISOString(),
				blob: file,
				category: "Uncategorised",
			});
		}
		setItems(await listVideos());
		flash("Video saved locally on this device.");
	};
	const remove = async (id: string) => {
		await deleteVideo(id);
		setItems(await listVideos());
		setSelected(null);
		flash("Local video deleted.");
	};
	const shown = items.filter(
		(v) => category === "All" || v.category === category,
	);
	return (
		<>
			<PageHead
				eyebrow="THE CHRONICLE / PRIVATE VIDEO LIBRARY"
				title="Study the craft."
				desc="Keep your training footage close. Your videos are stored locally on this device and are never uploaded by default."
				action={
					<>
						<input
							ref={input}
							type="file"
							accept="video/*"
							multiple
							hidden
							onChange={(e) => void add(e.target.files)}
						/>
						<button
							className="gold-button"
							onClick={() => input.current?.click()}
						>
							<Upload size={16} /> ADD FOOTAGE
						</button>
					</>
				}
			/>
			<div className="privacy-note">
				<ShieldCheck size={17} />
				<div>
					<b>PRIVATE BY DESIGN</b>
					<span>
						Video files stay in this browser on this device. Clearing browser
						storage may permanently remove them. They are not visible to your
						coach unless you explicitly share them through a future supported
						sharing flow.
					</span>
				</div>
			</div>
			<div className="filter-row">
				{[
					"All",
					"Uncategorised",
					"Technique",
					"Sparring",
					"Competition",
					"Conditioning",
				].map((c) => (
					<button
						className={`filter-chip ${category === c ? "selected" : ""}`}
						onClick={() => setCategory(c)}
					>
						{c}
					</button>
				))}
			</div>
			{shown.length ? (
				<div className="video-grid">
					{shown.map((v) => (
						<div className="video-card" key={v.id}>
							<button className="video-preview" onClick={() => setSelected(v)}>
								<Video size={28} />
								<span>
									<Play size={14} fill="currentColor" /> PLAY
								</span>
							</button>
							<div className="video-card-body">
								<b>{v.name}</b>
								<small>
									{(v.size / 1024 / 1024).toFixed(1)} MB ·{" "}
									{new Date(v.createdAt).toLocaleDateString()}
								</small>
								<div className="video-card-actions">
									<select
										value={v.category}
										onChange={async (e) => {
											await updateVideo({ ...v, category: e.target.value });
											setItems(await listVideos());
										}}
									>
										{[
											"Uncategorised",
											"Technique",
											"Sparring",
											"Competition",
											"Conditioning",
										].map((x) => (
											<option>{x}</option>
										))}
									</select>
									<button
										className="icon-button danger"
										onClick={() => void remove(v.id)}
									>
										<Trash2 size={15} />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<Empty
					icon={Film}
					title="Your chronicle is empty"
					text="Add footage from your device to review technique, movement and progress. Files remain local."
					action="ADD FOOTAGE"
					onClick={() => input.current?.click()}
				/>
			)}
			{selected && (
				<VideoPlayer item={selected} onClose={() => setSelected(null)} />
			)}
		</>
	);
}
function VideoPlayer({ item, onClose }: any) {
	const [url, setUrl] = useState("");
	useEffect(() => {
		let u = "";
		void getVideo(item.id).then((v) => {
			if (v) {
				u = URL.createObjectURL(v.blob);
				setUrl(u);
			}
		});
		return () => {
			if (u) URL.revokeObjectURL(u);
		};
	}, [item]);
	return (
		<Modal title={item.name} eyebrow="LOCAL PLAYBACK" onClose={onClose}>
			{url ? (
				<video className="video-player" controls autoPlay src={url} />
			) : (
				<p>Loading video…</p>
			)}
		</Modal>
	);
}
const DB_NAME = "akiles-private-videos";
function openVideoDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const r = indexedDB.open(DB_NAME, 1);
		r.onupgradeneeded = () =>
			r.result.createObjectStore("videos", { keyPath: "id" });
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
}
async function saveVideo(v: any) {
	const db = await openVideoDb();
	return new Promise<void>((resolve, reject) => {
		const t = db.transaction("videos", "readwrite");
		t.objectStore("videos").put(v);
		t.oncomplete = () => resolve();
		t.onerror = () => reject(t.error);
	});
}
async function listVideos(): Promise<any[]> {
	const db = await openVideoDb();
	return new Promise((resolve, reject) => {
		const r = db.transaction("videos").objectStore("videos").getAll();
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
}
async function getVideo(id: string): Promise<any> {
	const db = await openVideoDb();
	return new Promise((resolve, reject) => {
		const r = db.transaction("videos").objectStore("videos").get(id);
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
}
async function deleteVideo(id: string) {
	const db = await openVideoDb();
	return new Promise<void>((resolve, reject) => {
		const t = db.transaction("videos", "readwrite");
		t.objectStore("videos").delete(id);
		t.oncomplete = () => resolve();
		t.onerror = () => reject(t.error);
	});
}
async function updateVideo(v: any) {
	const db = await openVideoDb();
	return new Promise<void>((resolve, reject) => {
		const t = db.transaction("videos", "readwrite");
		t.objectStore("videos").put(v);
		t.oncomplete = () => resolve();
		t.onerror = () => reject(t.error);
	});
}
function Coaches({ coaches, query, setQuery, relationship }: any) {
	return (
		<>
			<PageHead
				eyebrow="THE MENTORS / KYRON COACH DIRECTORY"
				title="Find your corner."
				desc="Explore verified Kyron coaches. Contact your chosen coach directly to discuss training and payment; onboarding begins when your coach invites you through Kyron."
			/>
			<div className="integration-banner">
				<ShieldCheck size={18} />
				<div>
					<b>KYRON COACH NETWORK</b>
					<span>
						Coach profiles and contact details are provided by Kyron. Athlete
						onboarding invitations are initiated by coaches in Kyron.
					</span>
				</div>
				<span className="integration-status">
					{coaches.length ? "CONNECTED" : "NOT CONNECTED"}
				</span>
			</div>
			<div className="search-box">
				<Search size={17} />
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by coach, discipline, location or speciality…"
				/>
			</div>
			{relationship && (
				<div className="request-banner active-request">
					<Check />
					<div>
						<b>Your coaching relationship is active</b>
						<span>
							{relationship.coachName} is connected to your Akiles account
							through Kyron.
						</span>
					</div>
					<span className="pill active-pill">ACTIVE</span>
				</div>
			)}
			{coaches.length ? (
				<div className="coach-grid">
					{coaches.map((c: Coach) => (
						<div className="coach-card-large" key={c.id}>
							<div className="coach-card-top">
								<div className="coach-avatar large">
									{c.name
										.split(" ")
										.map((x) => x[0])
										.join("")
										.slice(0, 2)}
								</div>
								<span className="verified">
									<ShieldCheck size={13} /> VERIFIED
								</span>
							</div>
							<h3>{c.name}</h3>
							<div className="coach-discipline">{c.discipline}</div>
							<p>{c.bio}</p>
							<div className="coach-meta">
								<span>
									<MapPin size={13} />
									{c.location || "Location not listed"}
								</span>
								<span>
									<Trophy size={13} />
									{c.experience} years
								</span>
							</div>
							<div className="specialties">
								{c.specialties
									?.split(",")
									.filter(Boolean)
									.map((s: string) => (
										<i key={s}>{s.trim()}</i>
									))}
							</div>
							<div className="coach-card-bottom">
								<b>{c.rate ? `₹${c.rate}/session` : "Rate on request"}</b>
								<div>
									{c.phone && (
										<a className="secondary-button" href={`tel:${c.phone}`}>
											CALL
										</a>
									)}
									{c.email && (
										<a className="gold-button" href={`mailto:${c.email}`}>
											EMAIL
										</a>
									)}
									{c.website && (
										<a
											className="secondary-button"
											href={c.website}
											target="_blank"
											rel="noreferrer"
										>
											WEBSITE
										</a>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<Empty
					icon={Users}
					title="Coach directory unavailable"
					text="Akiles could not retrieve verified coach profiles from Kyron. Check the Kyron API URL and integration key; no sample coaches are shown."
				/>
			)}
		</>
	);
}
function Onboarding({ invitations, onRespond }: any) {
	const pending = invitations.filter((i: any) => i.status === "pending");
	const history = invitations.filter((i: any) => i.status !== "pending");
	return (
		<>
			<PageHead
				eyebrow="COACH RELATIONSHIP / KYRON INVITATIONS"
				title="Your corner starts here."
				desc="Your coach sends an onboarding invitation from Kyron after you have agreed on coaching and payment directly."
			/>
			{pending.length ? (
				pending.map((i: any) => (
					<section className="panel" key={i.id}>
						<div className="panel-head">
							<div>
								<div className="eyebrow">ONBOARDING INVITATION</div>
								<h3>{i.coachName}</h3>
							</div>
							<span className="pill pending-pill">
								AWAITING YOUR ACCEPTANCE
							</span>
						</div>
						<p className="muted">
							{i.message ||
								"Your coach has invited you to connect your athlete account with Kyron Coach."}
						</p>
						<div className="modal-actions">
							<button
								className="secondary-button"
								onClick={() => onRespond(i.id, "declined")}
							>
								DECLINE
							</button>
							<button
								className="gold-button"
								onClick={() => onRespond(i.id, "accepted")}
							>
								ACCEPT ONBOARDING <Check size={15} />
							</button>
						</div>
					</section>
				))
			) : (
				<Empty
					icon={Bell}
					title="No onboarding invitations"
					text="Once you have contacted a coach and completed your arrangements, your coach can invite you from Kyron. The invitation will appear here."
				/>
			)}
			{history.length > 0 && (
				<section className="panel">
					<div className="panel-head">
						<div>
							<div className="eyebrow">INVITATION HISTORY</div>
							<h3>Previous invitations</h3>
						</div>
					</div>
					{history.map((i: any) => (
						<div className="workout-row" key={i.id}>
							<div className="workout-info">
								<b>{i.coachName}</b>
								<span>
									{new Date(i.createdAt).toLocaleDateString()} · {i.status}
								</span>
							</div>
							<span
								className={`pill ${i.status === "accepted" ? "active-pill" : ""}`}
							>
								{i.status.toUpperCase()}
							</span>
						</div>
					))}
				</section>
			)}
		</>
	);
}
function Statistics({ workouts, totals }: any) {
	const days = Array.from({ length: 7 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - (6 - i));
		const key = d.toISOString().slice(0, 10);
		return {
			day: d.toLocaleDateString("en", { weekday: "short" }),
			minutes: workouts
				.filter((w: Workout) => w.date === key)
				.reduce((s: number, w: Workout) => s + w.duration, 0),
		};
	});
	const categories = Object.entries(
		workouts.reduce(
			(o: any, w: Workout) => ({
				...o,
				[w.category]: (o[w.category] || 0) + 1,
			}),
			{},
		),
	).sort((a: any, b: any) => b[1] - a[1]);
	const avg = workouts.length
		? Math.round(
				(workouts.reduce((s: number, w: Workout) => s + w.rpe, 0) /
					workouts.length) *
					10,
			) / 10
		: 0;
	return (
		<>
			<PageHead
				eyebrow="THE ASCENSION / PERFORMANCE RECORD"
				title="Progress, measured."
				desc="Your statistics are calculated from your recorded training sessions. No estimated or fabricated performance metrics."
			/>
			<div className="stats-grid">
				<Stat
					label="TOTAL HOURS"
					value={totals.hours}
					unit="hrs"
					icon={Clock3}
				/>
				<Stat label="SESSIONS" value={totals.sessions} icon={Dumbbell} />
				<Stat label="ROUNDS" value={totals.rounds} icon={Activity} />
				<Stat label="AVERAGE RPE" value={avg || "—"} unit="/10" icon={Flame} />
			</div>
			<div className="dashboard-columns">
				<section className="panel chart-panel">
					<div className="panel-head">
						<div>
							<div className="eyebrow">LAST SEVEN DAYS</div>
							<h3>Training volume</h3>
						</div>
						<span className="pill">MINUTES</span>
					</div>
					{workouts.length ? (
						<ResponsiveContainer width="100%" height={260}>
							<AreaChart data={days}>
								<defs>
									<linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#b99a55" stopOpacity={0.35} />
										<stop offset="95%" stopColor="#b99a55" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="#e8e5dd"
								/>
								<XAxis dataKey="day" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} />
								<Tooltip />
								<Area
									type="monotone"
									dataKey="minutes"
									stroke="#a88945"
									strokeWidth={2.5}
									fill="url(#goldFill)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<Empty
							icon={BarChart3}
							title="No training data yet"
							text="Log sessions to see your training volume trend."
						/>
					)}
				</section>
				<section className="panel">
					<div className="panel-head">
						<div>
							<div className="eyebrow">DISCIPLINE BREAKDOWN</div>
							<h3>Where you train</h3>
						</div>
						<Goal size={18} />
					</div>
					{categories.length ? (
						categories.map(([name, count]: any) => (
							<div className="category-bar">
								<div>
									<b>{name}</b>
									<span>{count} sessions</span>
								</div>
								<div className="bar-track">
									<i style={{ width: `${(count / workouts.length) * 100}%` }} />
								</div>
							</div>
						))
					) : (
						<div className="empty-inline">
							Your discipline breakdown will appear after your first session.
						</div>
					)}
				</section>
			</div>
		</>
	);
}
function Profile({ profile, onSave }: any) {
	const [f, setF] = useState(profile);
	useEffect(() => setF(profile), [profile]);
	const change = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));
	return (
		<>
			<PageHead
				eyebrow="ATHLETE PROFILE / IDENTITY"
				title="Know your craft."
				desc="Keep your athlete profile current. This information helps coaches understand your background and goals."
			/>
			<section className="panel profile-panel">
				<div className="panel-head">
					<div>
						<div className="eyebrow">PERSONAL RECORD</div>
						<h3>Athlete details</h3>
					</div>
					<UserRound size={18} />
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSave(f);
					}}
				>
					<div className="form-grid">
						<label>
							FULL NAME
							<input
								required
								value={f.name || ""}
								onChange={(e) => change("name", e.target.value)}
							/>
						</label>
						<label>
							EMAIL
							<input disabled value={f.email || ""} />
						</label>
						<label>
							PRIMARY DISCIPLINE
							<select
								value={f.discipline || "Boxing"}
								onChange={(e) => change("discipline", e.target.value)}
							>
								{[
									"Boxing",
									"Kickboxing",
									"Muay Thai",
									"MMA",
									"Wrestling",
									"Other",
								].map((x) => (
									<option>{x}</option>
								))}
							</select>
						</label>
						<label>
							WEIGHT CLASS
							<input
								value={f.weightClass || ""}
								onChange={(e) => change("weightClass", e.target.value)}
								placeholder="e.g. Welterweight"
							/>
						</label>
						<label className="wide">
							TRAINING LOCATION
							<input
								value={f.location || ""}
								onChange={(e) => change("location", e.target.value)}
								placeholder="City / preferred training area"
							/>
						</label>
						<label className="wide">
							ATHLETE BIO
							<textarea
								rows={4}
								value={f.bio || ""}
								onChange={(e) => change("bio", e.target.value)}
								placeholder="Your experience, goals and background…"
							/>
						</label>
					</div>
					<div className="modal-actions">
						<button className="gold-button">
							SAVE PROFILE <Check size={15} />
						</button>
					</div>
				</form>
			</section>
			<div className="privacy-note">
				<ShieldCheck size={17} />
				<div>
					<b>YOUR DATA, YOUR CONTROL</b>
					<span>
						Your profile and workout records are stored in your Akiles account
						database. Your private video library remains in this browser's local
						storage.
					</span>
				</div>
			</div>
		</>
	);
}
export default App;
