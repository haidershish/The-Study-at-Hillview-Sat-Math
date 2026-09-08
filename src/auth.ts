export type UserAccount = {
  id: string;
  username: string;
  password: string;
  displayName?: string;
  active?: boolean;
};

export type SessionUser = Pick<UserAccount, 'id' | 'username'> & {
  displayName?: string;
};

const SESSION_KEY = 'sat-math-lab-auth-v1';
const DEFAULT_USERS_URL = '/users.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseUser(value: unknown, index: number): UserAccount {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.username !== 'string'
    || typeof value.password !== 'string'
    || (value.displayName !== undefined && typeof value.displayName !== 'string')
    || (value.active !== undefined && typeof value.active !== 'boolean')) {
    throw new Error(`Invalid user account at index ${index}`);
  }

  return {
    id: value.id,
    username: value.username,
    password: value.password,
    ...(value.displayName === undefined ? {} : { displayName: value.displayName }),
    ...(value.active === undefined ? {} : { active: value.active }),
  };
}

export function validateUsers(value: unknown): UserAccount[] {
  if (!isRecord(value) || !Array.isArray(value.users)) {
    throw new Error('Invalid users file: expected a users array');
  }

  const users = value.users.map(parseUser);
  if (new Set(users.map((user) => user.username)).size !== users.length) {
    throw new Error('Invalid users file: usernames must be unique');
  }
  return users;
}

export async function loadUsers(url = DEFAULT_USERS_URL): Promise<UserAccount[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load users (${response.status})`);
  return validateUsers(await response.json());
}

function toSessionUser(user: UserAccount): SessionUser {
  return {
    id: user.id,
    username: user.username,
    ...(user.displayName === undefined ? {} : { displayName: user.displayName }),
  };
}

export function authenticate(
  users: UserAccount[],
  username: string,
  password: string,
): SessionUser | null {
  const account = users.find((user) => user.active !== false
    && user.username === username
    && user.password === password);
  return account ? toSessionUser(account) : null;
}

export function saveSession(user: SessionUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export async function login(
  username: string,
  password: string,
  usersUrl = DEFAULT_USERS_URL,
): Promise<SessionUser | null> {
  // ponytail: plaintext passwords are intentionally local-demo-only; use a server-side
  // password hash before exposing this app to an untrusted network.
  const users = await loadUsers(usersUrl);
  const user = authenticate(users, username, password);
  if (!user) return null;
  saveSession(user);
  return user;
}

export function getCurrentUser(): SessionUser | null {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return null;

  try {
    const value: unknown = JSON.parse(saved);
    if (!isRecord(value)
      || typeof value.id !== 'string'
      || typeof value.username !== 'string'
      || (value.displayName !== undefined && typeof value.displayName !== 'string')) {
      throw new Error('Invalid saved session');
    }
    return {
      id: value.id,
      username: value.username,
      ...(value.displayName === undefined ? {} : { displayName: value.displayName }),
    };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function loadSession(): SessionUser | null {
  return getCurrentUser();
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
