import { useEffect, useState } from 'react';
import { api } from '../../api';

const emptyForm = { username: '', password: '', name: '', role: 'CASHIER' };

export default function CashiersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setUsers(await api.getUsers());
  }

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createUser({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
      });
      setForm(emptyForm);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateField(user, field, value) {
    setError('');
    try {
      await api.updateUser(user.id, { ...user, [field]: value });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetPassword(user) {
    const password = window.prompt(`New password for ${user.name}:`);
    if (!password) return;
    setError('');
    try {
      await api.updateUser(user.id, { ...user, password });
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`Delete cashier account "${user.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.deleteUser(user.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      <h2>Add Cashier / Admin</h2>
      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Full name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input placeholder="Username" required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          <option value="CASHIER">Cashier</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button className="btn btn-primary" type="submit" disabled={busy}>Add</button>
      </form>

      <h2>Accounts</h2>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={!u.active ? 'row-inactive' : ''}>
              <td>
                <input
                  defaultValue={u.name} style={{ width: 130 }}
                  onBlur={(e) => e.target.value.trim() !== u.name && updateField(u, 'name', e.target.value.trim())}
                />
              </td>
              <td>{u.username}</td>
              <td>
                <select value={u.role} onChange={(e) => updateField(u, 'role', e.target.value)} disabled={u.id === currentUser.id}>
                  <option value="CASHIER">Cashier</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </td>
              <td>{u.active ? 'Active' : 'Disabled'}</td>
              <td className="table-actions">
                <button className="btn" onClick={() => resetPassword(u)}>Reset Password</button>
                {u.id !== currentUser.id && (
                  <>
                    {u.active
                      ? <button className="btn btn-danger" onClick={() => updateField(u, 'active', false)}>Disable</button>
                      : <button className="btn" onClick={() => updateField(u, 'active', true)}>Enable</button>}
                    <button className="btn btn-danger" onClick={() => removeUser(u)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
