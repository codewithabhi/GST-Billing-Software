import { useEffect, useMemo, useState } from 'react';
import { Building2, MailPlus, ShieldCheck, UserRound, UserRoundPlus, UserX } from 'lucide-react';
import { createBusinessUser, deleteBusinessUser, getBusinessUsers, getAllProfiles, updateBusinessUser } from '../store';
import { toast } from './Toast';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff' };

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Business admin',
  staff: 'Staff',
};

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

function UserRow({ user, onChangeStatus, onChangeRole, onRemove }) {
  return (
    <tr>
      <td>
        <div className="team-user-cell">
          <span className="team-user-avatar"><UserRound size={16} /></span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
        </div>
      </td>
      <td>
        <select className="form-input team-select" value={user.role} onChange={e => onChangeRole(user, e.target.value)} aria-label={`Role for ${user.name}`}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </td>
      <td><StatusBadge status={user.status} /></td>
      <td className="team-actions">
        <button type="button" className="btn-secondary btn-small" onClick={() => onChangeStatus(user, user.status === 'suspended' ? 'active' : 'suspended')}>
          {user.status === 'suspended' ? 'Activate' : 'Suspend'}
        </button>
        <button type="button" className="icon-btn" title={`Remove ${user.name}`} onClick={() => onRemove(user)}>
          <UserX size={16} />
        </button>
      </td>
    </tr>
  );
}

function InviteForm({ businessId, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!businessId) return;
    setSaving(true);
    try {
      const user = await createBusinessUser({ ...form, businessId });
      onCreated(user);
      setForm(EMPTY_FORM);
      toast('Invitation created', 'success');
    } catch (error) {
      toast(error.message || 'Could not create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="team-invite-form" onSubmit={submit}>
      <div className="team-form-heading">
        <div className="team-icon"><MailPlus size={19} /></div>
        <div><h3>Invite a business user</h3><p>Give a team member access to this business.</p></div>
      </div>
      <label className="form-label">Name<input className="form-input" required value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Priya Sharma" /></label>
      <label className="form-label">Email<input type="email" className="form-input" required value={form.email} onChange={e => update('email', e.target.value)} placeholder="name@company.com" /></label>
      <label className="form-label">Temporary password<input type="password" className="form-input" required minLength={8} value={form.password} onChange={e => update('password', e.target.value)} placeholder="At least 8 characters" /><small className="field-hint">Share this securely; the user can sign in immediately.</small></label>
      <label className="form-label">Role<select className="form-input" value={form.role} onChange={e => update('role', e.target.value)}>{Object.entries(ROLE_LABELS).filter(([value]) => value !== 'owner').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</button>
    </form>
  );
}

export default function BusinessUsersView() {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedBusiness = useMemo(() => businesses.find(business => business.id === businessId), [businesses, businessId]);

  useEffect(() => {
    getAllProfiles()
      .then(profiles => {
        setBusinesses(profiles);
        setBusinessId(current => current || profiles[0]?.id || '');
      })
      .catch(error => toast(error.message || 'Could not load businesses', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!businessId) { setUsers([]); return; }
    setLoading(true);
    getBusinessUsers(businessId)
      .then(setUsers)
      .catch(error => toast(error.message || 'Could not load users', 'error'))
      .finally(() => setLoading(false));
  }, [businessId]);

  const changeUser = async (user, changes) => {
    try {
      const updated = await updateBusinessUser(user.id, changes);
      setUsers(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (error) { toast(error.message || 'Could not update user', 'error'); }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Remove ${user.name} from this business?`)) return;
    try {
      await deleteBusinessUser(user.id);
      setUsers(current => current.filter(item => item.id !== user.id));
      toast('User removed', 'success');
    } catch (error) { toast(error.message || 'Could not remove user', 'error'); }
  };

  if (!loading && businesses.length === 0) {
    return <section className="content-page team-page"><div className="empty-state"><Building2 size={36} /><h2>Create a business first</h2><p>Set up a business profile before inviting users.</p></div></section>;
  }

  return (
    <section className="content-page team-page">
      <header className="page-header team-page-header">
        <div><p className="eyebrow">Admin workspace</p><h1>Team &amp; access</h1><p>Manage the people who can work inside each business.</p></div>
        <label className="team-business-picker"><span>Business</span><select className="form-input" value={businessId} onChange={e => setBusinessId(e.target.value)} disabled={loading}>{businesses.map(business => <option key={business.id} value={business.id}>{business.businessName || 'Unnamed business'}</option>)}</select></label>
      </header>

      <div className="team-layout">
        <InviteForm businessId={businessId} onCreated={user => setUsers(current => [...current, user].sort((a, b) => a.name.localeCompare(b.name)))} />
        <div className="team-list-panel">
          <div className="team-list-heading"><div><h2>{selectedBusiness?.businessName || 'Business users'}</h2><p>{users.length} user{users.length === 1 ? '' : 's'} with access</p></div><ShieldCheck size={24} /></div>
          {loading ? <div className="view-loading">Loading users…</div> : users.length === 0 ? <div className="empty-state compact"><UserRoundPlus size={30} /><p>No users yet. Create the first invitation.</p></div> : (
            <div className="table-scroll"><table className="data-table team-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{users.map(user => <UserRow key={user.id} user={user} onChangeRole={(item, role) => changeUser(item, { role })} onChangeStatus={(item, status) => changeUser(item, { status })} onRemove={removeUser} />)}</tbody></table></div>
          )}
        </div>
      </div>
    </section>
  );
}
