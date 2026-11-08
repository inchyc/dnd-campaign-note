import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { ROOT, getEnv } from "./config";
import { Campaign, getCampaign, getStorage } from "./campaigns";
import type { Storage } from "./storage";

export type Role = "scribe" | "player";

export interface HubUser {
  id: string;
  name: string; // real player name, e.g. "Travis"
  character: string; // e.g. "Cedric"
  role: Role;
  hash?: string;
  characterNotes?: string[]; // vault-relative paths of this player's character note(s)
}

export interface UsersFile {
  users: HubUser[];
}

export interface Session {
  campaign: string;
  userId: string;
  role: Role;
  exp: number;
}

const COOKIE = "hub_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

// ---------- secrets & hashing ----------

let cachedSecret: string | null = null;
function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = getEnv("HUB_SECRET");
  if (fromEnv) return (cachedSecret = fromEnv);
  // Local fallback: a random secret kept in the project root (not inside the synced vault).
  const file = path.join(ROOT, ".hub-secret");
  try {
    cachedSecret = fs.readFileSync(file, "utf-8").trim();
  } catch {
    cachedSecret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, cachedSecret, "utf-8");
  }
  return cachedSecret;
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored?: string): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const test = crypto.scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return expected.length === test.length && crypto.timingSafeEqual(expected, test);
}

// ---------- users file (stored in the vault's hidden .hub folder so it syncs) ----------

const USERS_PATH = ".hub/users.json";

export async function loadUsers(storage: Storage): Promise<HubUser[]> {
  if (!(await storage.exists(USERS_PATH))) return [];
  try {
    const parsed = JSON.parse(await storage.read(USERS_PATH)) as UsersFile;
    return parsed.users || [];
  } catch {
    return [];
  }
}

export async function saveUsers(storage: Storage, users: HubUser[]) {
  await storage.write(USERS_PATH, JSON.stringify({ users }, null, 2));
}

export function publicUser(u: HubUser) {
  return { id: u.id, name: u.name, character: u.character, role: u.role };
}

// ---------- signed session cookie ----------

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function makeToken(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token?: string): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!s.exp || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export async function setSessionCookie(s: Omit<Session, "exp">) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken({ ...s, exp: Date.now() + SESSION_MS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && getEnv("HUB_INSECURE_COOKIES") !== "1",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// ---------- request context ----------

export interface Ctx {
  campaign: Campaign;
  storage: Storage;
  user: HubUser;
  isScribe: boolean;
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

/** Resolves the logged-in user for an API call or throws a 401. */
export async function requireCtx(opts?: { scribe?: boolean }): Promise<Ctx> {
  const jar = await cookies();
  const session = readToken(jar.get(COOKIE)?.value);
  if (!session) throw new HttpError(401, "Not signed in");
  const campaign = getCampaign(session.campaign);
  if (!campaign) throw new HttpError(401, "Unknown campaign");
  const storage = getStorage(campaign);
  const users = await loadUsers(storage);
  const user = users.find((u) => u.id === session.userId);
  if (!user) throw new HttpError(401, "Unknown user");
  const isScribe = user.role === "scribe";
  if (opts?.scribe && !isScribe) throw new HttpError(403, "Scribe only");
  return { campaign, storage, user, isScribe };
}

/** Wraps a route handler so thrown HttpErrors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e: any) {
      if (e instanceof HttpError) {
        return Response.json({ success: false, error: e.message, ...(e.extra || {}) }, { status: e.status });
      }
      console.error(e);
      return Response.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
  };
}

// ---------- simple login throttling ----------

const attempts = new Map<string, { n: number; reset: number }>();
export function throttle(key: string, max = 6, windowMs = 60_000) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.reset < now) {
    attempts.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  a.n++;
  if (a.n > max) throw new HttpError(429, "Too many attempts. Wait a minute and try again.");
}
