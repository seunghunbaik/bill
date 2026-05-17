import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/user-not-found': '등록되지 않은 이메일입니다.',
  'auth/wrong-password': '비밀번호가 틀렸습니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 틀렸습니다.',
  'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
  'auth/operation-not-allowed': 'Firebase Console에서 이메일/비밀번호 로그인을 활성화해주세요.',
  'auth/network-request-failed': '네트워크 오류입니다. 인터넷 연결을 확인해주세요.',
  'auth/api-key-not-valid': 'Firebase API 키가 올바르지 않습니다. .env.local 설정을 확인해주세요.',
};

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(ERROR_MAP[err.code] ?? `오류: ${err.code ?? err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧾</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--green-dark)', margin: 0 }}>점심 정산</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            {mode === 'login' ? '계정에 로그인하세요' : '새 계정을 만드세요'}
          </p>
        </div>

        <div className="card">
          <div style={{
            display: 'flex', marginBottom: 20,
            borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--border)',
          }}>
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', border: 'none', transition: 'all .15s',
                  background: mode === m ? 'var(--green)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <form className="form" onSubmit={handleSubmit}>
            {error && <div className="error-box">⚠️ {error}</div>}
            <div className="field">
              <label>이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? '6자 이상 입력' : '비밀번호 입력'}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="btn btn-green"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
