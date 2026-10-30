import { useEffect, useState } from 'react';
import { Building2, LockKeyhole, LogIn, UserRoundPlus } from 'lucide-react';
import { bootstrapAuth, getAuthStatus, loginAuth } from '../store';

const EMPTY_LOGIN = { email: '', password: '' };
const EMPTY_SETUP = { name: '', email: '', password: '', businessName: '' };

function saveSession(result) {
  localStorage.setItem('gst_auth_token', result.token);
  if (result.business?.id) localStorage.setItem('gst_activeBusinessId', result.business.id);
  else if (result.memberships?.[0]?.businessId) localStorage.setItem('gst_activeBusinessId', result.memberships[0].businessId);
  localStorage.setItem('gst_auth_user', JSON.stringify(result.user));
  if (result.memberships) {
    localStorage.setItem('gst_auth_memberships', JSON.stringify(result.memberships));
    const activeBusinessId = result.business?.id || result.memberships[0]?.businessId;
    const membership = result.memberships.find(item => item.businessId === activeBusinessId) || result.memberships[0];
    if (membership?.role) localStorage.setItem('gst_auth_role', membership.role);
  }
}

function AuthCard({ needsSetup, onAuthenticated }) {
  const [mode, setMode] = useState(needsSetup ? 'setup' : 'login');
  const [form, setForm] = useState(needsSetup ? EMPTY_SETUP : EMPTY_LOGIN);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isSetup = mode === 'setup';

  useEffect(() => {
    setMode(needsSetup ? 'setup' : 'login');
    setForm(needsSetup ? EMPTY_SETUP : EMPTY_LOGIN);
  }, [needsSetup]);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = isSetup ? await bootstrapAuth(form) : await loginAuth(form);
      saveSession(result);
      onAuthenticated(result);
    } catch (err) {
      setError(err.message || 'Unable to authenticate');
    } finally { setSaving(false); }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-logo"><Building2 size={25} /></span><div><h1>GST Billing</h1><p>Secure business workspace</p></div></div>
        <div className="auth-heading"><span className="auth-heading-icon">{isSetup ? <UserRoundPlus size={20} /> : <LockKeyhole size={20} />}</span><div><h2>{isSetup ? 'Create your admin account' : 'Welcome back'}</h2><p>{isSetup ? 'Set up the owner account and your first business.' : 'Sign in to continue to your business.'}</p></div></div>
        <form onSubmit={submit} className="auth-form">
          {isSetup && <label className="form-label">Your name<input className="form-input" required value={form.name} onChange={e => update('name', e.target.value)} autoComplete="name" /></label>}
          {isSetup && <label className="form-label">Business name<input className="form-input" required value={form.businessName} onChange={e => update('businessName', e.target.value)} autoComplete="organization" /></label>}
          <label className="form-label">Email<input type="email" className="form-input" required value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></label>
          <label className="form-label">Password<input type="password" className="form-input" required minLength={8} value={form.password} onChange={e => update('password', e.target.value)} autoComplete={isSetup ? 'new-password' : 'current-password'} />{isSetup && <small className="field-hint">Use at least 8 characters.</small>}</label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn-primary auth-submit" type="submit" disabled={saving}>{saving ? 'Please wait…' : isSetup ? 'Create account' : <><LogIn size={17} /> Sign in</>}</button>
        </form>
        {!needsSetup && <button type="button" className="auth-mode-toggle" onClick={() => { setMode(isSetup ? 'login' : 'setup'); setForm(isSetup ? EMPTY_LOGIN : EMPTY_SETUP); setError(''); }}>{isSetup ? 'Back to sign in' : 'First time here? Create admin account'}</button>}
      </section>
    </main>
  );
}

export default function AuthGate({ children }) {
  const [state, setState] = useState({ loading: true, needsSetup: false, authenticated: false });

  useEffect(() => {
    getAuthStatus()
      .then(result => {
        if (result.authenticated && result.memberships?.[0]?.businessId && !localStorage.getItem('gst_activeBusinessId')) localStorage.setItem('gst_activeBusinessId', result.memberships[0].businessId);
        if (result.authenticated && result.memberships) {
          localStorage.setItem('gst_auth_memberships', JSON.stringify(result.memberships));
          const activeBusinessId = localStorage.getItem('gst_activeBusinessId') || result.memberships[0]?.businessId;
          const membership = result.memberships.find(item => item.businessId === activeBusinessId) || result.memberships[0];
          if (membership?.role) localStorage.setItem('gst_auth_role', membership.role);
        }
        setState({ loading: false, ...result });
      })
      .catch(() => setState({ loading: false, needsSetup: false, authenticated: false }));
  }, []);

  if (state.loading) return <div className="auth-loading">Checking secure workspace…</div>;
  if (!state.authenticated) return <AuthCard needsSetup={state.needsSetup} onAuthenticated={result => setState({ loading: false, authenticated: true, ...result })} />;
  return children;
}
