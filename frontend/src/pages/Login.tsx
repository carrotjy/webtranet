import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempted, setLoginAttempted] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // 로그인 성공 시에만 대시보드로 이동 (에러가 없고, 로그인 시도 후에만)
  useEffect(() => {
    if (user && !error && loginAttempted) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, error, loginAttempted]);

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    // 에러 초기화
    setError('');
    setLoading(true);
    setLoginAttempted(true);

    try {
      // 이메일을 소문자로 변환하여 로그인
      await login(email.toLowerCase().trim(), password);
      // 성공하면 useEffect에서 자동으로 navigate됨
    } catch (err: any) {
      const errorMessage = err.message || '로그인에 실패했습니다.';
      setError(errorMessage);
      setLoading(false);
      // 로그인 실패했으므로 loginAttempted를 false로 설정하여 navigate 방지
      setLoginAttempted(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="page page-center">
      <div className="container-tight py-4">
        <div className="text-center mb-4">
          <h1 className="h2 text-primary">LVD Korea Webtranet</h1>
          <p className="text-muted">v1.0 BETA</p>
        </div>
        
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">로그인</h2>
            
            {error && error.trim() !== '' && (
              <div className="alert alert-danger alert-dismissible mb-3" role="alert" style={{ position: 'relative' }}>
                <div className="d-flex align-items-start">
                  <div className="me-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <circle cx="12" cy="12" r="9"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div className="flex-grow-1">
                    <strong>{error}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setError('');
                  }}
                  aria-label="Close"
                  style={{ position: 'absolute', right: '10px', top: '10px' }}
                ></button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label">이메일</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="mb-2">
                <label className="form-label">비밀번호</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <div className="form-footer">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      로그인 중...
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;