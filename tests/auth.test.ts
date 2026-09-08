// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, loadUsers, login, logout, validateUsers } from '../src/auth';

const users = {
  users: [
    { id: 'student-001', username: 'student', password: 'sat123', displayName: 'Demo Student' },
    { id: 'disabled-001', username: 'disabled', password: 'secret', active: false },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => users,
  }));
});

describe('JSON authentication', () => {
  it('loads and validates editable user accounts', async () => {
    await expect(loadUsers('/users.json')).resolves.toEqual(users.users);
    expect(fetch).toHaveBeenCalledWith('/users.json');
    expect(validateUsers({ users: [{ id: 'a', username: 'a', password: 'b' }] })).toHaveLength(1);
  });

  it('rejects malformed account files', () => {
    expect(() => validateUsers({ users: [{ username: 'missing-id', password: 'x' }] })).toThrow('index 0');
    expect(() => validateUsers({ users: [{ id: 'a', username: 'same', password: 'x' }, { id: 'b', username: 'same', password: 'y' }] })).toThrow('unique');
  });

  it('requires an exact active username/password match and persists a safe session', async () => {
    await expect(login('student', 'sat123')).resolves.toEqual({
      id: 'student-001',
      username: 'student',
      displayName: 'Demo Student',
    });
    expect(getCurrentUser()).toEqual({
      id: 'student-001',
      username: 'student',
      displayName: 'Demo Student',
    });
    expect(localStorage.getItem('sat-math-lab-auth-v1')).not.toContain('sat123');
    await expect(login('Student', 'sat123')).resolves.toBeNull();
    await expect(login('student', ' sat123')).resolves.toBeNull();
    await expect(login('disabled', 'secret')).resolves.toBeNull();
  });

  it('clears the persisted session on logout', async () => {
    await login('student', 'sat123');
    logout();
    expect(getCurrentUser()).toBeNull();
  });
});
