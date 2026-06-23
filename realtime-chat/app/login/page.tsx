'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';
import { MessageSquare, Mail, Lock, User as UserIcon, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
    <path
      fill="#EA4335"
      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"
    />
    <path
      fill="#34A853"
      d="M16.04 15.345c-1.07.728-2.455 1.164-4.04 1.164-2.927 0-5.41-1.982-6.29-4.654L1.656 14.97C3.662 18.973 7.79 21.73 12 21.73c2.945 0 5.618-1.018 7.636-2.782l-3.596-3.603z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.273c0-.818-.082-1.609-.227-2.373H12v4.51h6.445c-.277 1.455-1.09 2.69-2.327 3.527l3.595 3.6c2.1-1.936 3.442-4.79 3.442-8.528z"
    />
    <path
      fill="#FBBC05"
      d="M5.71 11.836a7.03 7.03 0 0 1 0-2.07L1.683 6.65A11.905 11.905 0 0 0 0 12c0 1.936.464 3.764 1.282 5.39l4.428-3.554z"
    />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

export default function LoginPage() {
  const { user, loading, signIn, signUp, verifyEmail, signInWithOAuth } = useAuth();
  const router = useRouter();

  // Navigation redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/chat');
    }
  }, [user, loading, router]);

  // UI modes: 'login' | 'signup' | 'verify'
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse-slow">Entering Lets Ping...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || 'Login failed. Please check your credentials.');
      } else {
        router.push('/chat');
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);

    try {
      const { data, error } = await signUp(email, password, name);
      if (error) {
        setErrorMsg(error.message || 'Registration failed.');
      } else if (data?.requireEmailVerification) {
        setSuccessMsg('A 6-digit verification code has been sent to your email.');
        setMode('verify');
      } else {
        setSuccessMsg('Registration successful! Please log in.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);

    try {
      const { data, error } = await verifyEmail(email, otp);
      if (error) {
        setErrorMsg(error.message || 'Verification failed. Please double-check your code.');
      } else {
        setSuccessMsg('Email verified successfully! Logging you in...');
        setTimeout(() => {
          router.push('/chat');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErrorMsg(error.message || `Failed to sign in with ${provider}.`);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred during OAuth sign in.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <style>{`
        .oauth-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          text-transform: uppercase;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted, #52525b);
          letter-spacing: 0.08em;
          width: 100%;
        }

        .oauth-divider::before,
        .oauth-divider::after {
          content: "";
          flex: 1;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .oauth-divider::before {
          margin-right: 12px;
        }

        .oauth-divider::after {
          margin-left: 12px;
        }

        .oauth-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
          width: 100%;
        }

        .btn-oauth {
          height: 44px;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
          color: var(--text-primary, #f4f4f5);
          border-radius: var(--radius-md, 12px);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .btn-oauth:hover {
          background-color: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .btn-oauth:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <div className="auth-card glass-panel animate-fade">
        <div className="auth-header">
          <div className="w-12 h-12 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 mx-auto border border-indigo-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="auth-title">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'verify' && 'Verify your email'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' && 'Sign in to access your real-time chats'}
            {mode === 'signup' && 'Sign up to connect with other users'}
            {mode === 'verify' && `We sent a code to ${email}`}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl mb-5 animate-fade">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl mb-5 animate-fade">
            {successMsg}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-container">
                <Mail className="left-icon" />
                <input
                  type="email"
                  className="input-field"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-container has-right-icon">
                <Lock className="left-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={formLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="right-icon-btn"
                  disabled={formLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={formLoading}>
              {formLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="oauth-divider">or continue with</div>
            <div className="oauth-buttons">
              <button
                type="button"
                className="btn-oauth"
                onClick={() => handleOAuthSignIn('google')}
                disabled={formLoading}
              >
                <GoogleIcon className="w-4 h-4" />
                Google
              </button>
              <button
                type="button"
                className="btn-oauth"
                onClick={() => handleOAuthSignIn('github')}
                disabled={formLoading}
              >
                <GithubIcon className="w-4 h-4" />
                GitHub
              </button>
            </div>

            <div className="form-links">
              New to Lets Ping?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                disabled={formLoading}
              >
                Create an account
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <div className="input-container">
                <UserIcon className="left-icon" />
                <input
                  type="text"
                  className="input-field"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-container">
                <Mail className="left-icon" />
                <input
                  type="email"
                  className="input-field"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-container has-right-icon">
                <Lock className="left-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={formLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="right-icon-btn"
                  disabled={formLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={formLoading}>
              {formLoading ? 'Creating account...' : 'Create Account'}
            </button>

            <div className="oauth-divider">or continue with</div>
            <div className="oauth-buttons">
              <button
                type="button"
                className="btn-oauth"
                onClick={() => handleOAuthSignIn('google')}
                disabled={formLoading}
              >
                <GoogleIcon className="w-4 h-4" />
                Google
              </button>
              <button
                type="button"
                className="btn-oauth"
                onClick={() => handleOAuthSignIn('github')}
                disabled={formLoading}
              >
                <GithubIcon className="w-4 h-4" />
                GitHub
              </button>
            </div>

            <div className="form-links">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                disabled={formLoading}
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <div className="input-container">
                <ShieldCheck className="left-icon" />
                <input
                  type="text"
                  maxLength={6}
                  className="input-field tracking-[0.3em] font-mono text-center text-lg"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={formLoading}
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={formLoading}>
              {formLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="form-links">
              Incorrect email?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                disabled={formLoading}
              >
                Go back to Signup
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
