import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';

const Layout: React.FC = () => {
  const { user, logout, hasPermission, isAdmin } = useAuth();
  const location = useLocation();
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // 유효성 검사
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setTimeout(() => {
          setShowPasswordModal(false);
          resetPasswordForm();
        }, 2000);
      } else {
        setPasswordError(data.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      setPasswordError('서버와 통신 중 오류가 발생했습니다.');
    }
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isAdminDropdownOpen && !target.closest('.admin-dropdown')) {
        setIsAdminDropdownOpen(false);
      }
      if (isUserDropdownOpen && !target.closest('.user-dropdown')) {
        setIsUserDropdownOpen(false);
      }
      // 모바일 메뉴 외부 클릭 시 닫기
      if (isMobileMenuOpen && !target.closest('#navbar-menu') && !target.closest('.navbar-toggler')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isAdminDropdownOpen, isUserDropdownOpen, isMobileMenuOpen]);

  return (
    <div className="page">
      {/* 헤더 */}
      <header className="navbar navbar-expand-md navbar-light d-print-none">
        <div className="container-xl">
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <h1 className="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
            <Link to="/dashboard">
              <span className="text-primary fw-bold">Webtranet</span>
            </Link>
          </h1>
          
          <div className="navbar-nav flex-row order-md-last">
            <div className="nav-item dropdown user-dropdown">
              <button 
                type="button"
                className="nav-link d-flex lh-1 text-reset p-0 btn btn-link border-0"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <div className="d-xl-block">
                  <div>{user?.is_admin ? 'admin' : user?.name}</div>
                  <div className="mt-1 small text-muted">{user?.department}</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="icon ms-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="m0 0h24v24H0z" fill="none"/>
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              {isUserDropdownOpen && (
                <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow show" style={{ position: 'absolute', right: 0, top: '100%' }}>
                  <div className="dropdown-header">
                    <strong>{user?.name}</strong>
                    <div className="text-muted">{user?.email}</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      setShowPasswordModal(true);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="m0 0h24v24H0z" fill="none"/>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <circle cx="12" cy="16" r="1" />
                      <path d="M8 11v-4a4 4 0 0 1 8 0v4" />
                    </svg>
                    비밀번호 변경
                  </button>
                  {user?.name === '인종현' && (
                    <Link
                      className="dropdown-item"
                      to="/jsharp"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="m0 0h24v24H0z" fill="none"/>
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <path d="M9 7h6M9 12h6M9 17h6" />
                      </svg>
                      J#
                    </Link>
                  )}
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="m0 0h24v24H0z" fill="none"/>
                      <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
                      <path d="M7 12h14l-3 -3m0 6l3 -3" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 사이드바 네비게이션 */}
      <div className="navbar-expand-md">
        <div className={`navbar-collapse ${isMobileMenuOpen ? 'show' : 'collapse'}`} id="navbar-menu">
          <div className="navbar navbar-light">
            <div className="container-xl">
              <ul className="navbar-nav flex-row flex-wrap justify-content-center justify-content-sm-start">
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="nav-link-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <rect x="4" y="4" width="6" height="8" rx="1"/>
                        <rect x="4" y="16" width="6" height="4" rx="1"/>
                        <rect x="14" y="4" width="6" height="4" rx="1"/>
                        <rect x="14" y="12" width="6" height="8" rx="1"/>
                      </svg>
                    </span>
                    <span className="nav-link-title d-none d-sm-inline">대시보드</span>
                  </Link>
                </li>

                {hasPermission('service_report_access') && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive('/service-reports') ? 'active' : ''}`}
                      to="/service-reports"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="nav-link-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                          <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
                          <line x1="9" y1="9" x2="10" y2="9"/>
                          <line x1="9" y1="13" x2="15" y2="13"/>
                          <line x1="9" y1="17" x2="15" y2="17"/>
                        </svg>
                      </span>
                      <span className="nav-link-title d-none d-sm-inline">서비스 리포트</span>
                    </Link>
                  </li>
                )}

                {hasPermission('customer_access') && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive('/customers') ? 'active' : ''}`}
                      to="/customers"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="nav-link-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <circle cx="12" cy="7" r="4"/>
                          <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>
                        </svg>
                      </span>
                      <span className="nav-link-title d-none d-sm-inline">고객정보</span>
                    </Link>
                  </li>
                )}

                {hasPermission('resource_access') && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive('/resource-management') ? 'active' : ''}`}
                      to="/resource-management"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="nav-link-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <rect x="9" y="8" width="6" height="8" rx="1"/>
                          <circle cx="12" cy="5" r="1"/>
                          <circle cx="6" cy="12" r="1"/>
                          <circle cx="18" cy="12" r="1"/>
                        </svg>
                      </span>
                      <span className="nav-link-title d-none d-sm-inline">리소스</span>
                    </Link>
                  </li>
                )}

                {hasPermission('transaction_access') && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive('/invoices') ? 'active' : ''}`}
                      to="/invoices"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="nav-link-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <rect x="3" y="4" width="18" height="16" rx="3"/>
                          <line x1="7" y1="8" x2="17" y2="8"/>
                          <line x1="7" y1="12" x2="17" y2="12"/>
                          <line x1="7" y1="16" x2="9" y2="16"/>
                        </svg>
                      </span>
                      <span className="nav-link-title d-none d-sm-inline">거래명세표</span>
                    </Link>
                  </li>
                )}

                {hasPermission('spare_parts_access') && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive('/spare-parts') ? 'active' : ''}`}
                      to="/spare-parts"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="nav-link-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <rect x="4" y="4" width="6" height="6" rx="1"/>
                          <rect x="14" y="4" width="6" height="6" rx="1"/>
                          <rect x="4" y="14" width="6" height="6" rx="1"/>
                          <rect x="14" y="14" width="6" height="6" rx="1"/>
                        </svg>
                      </span>
                      <span className="nav-link-title d-none d-sm-inline">스페어파트</span>
                    </Link>
                  </li>
                )}
                
                {isAdmin() && (
                  <li className="nav-item dropdown admin-dropdown">
                    <a 
                      className={`nav-link dropdown-toggle ${isActive('/admin') ? 'active' : ''}`} 
                      href="#" 
                      role="button" 
                      aria-expanded={isAdminDropdownOpen}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsAdminDropdownOpen(!isAdminDropdownOpen);
                      }}
                    >
                      <span className="nav-link-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </span>
                      <span className="nav-link-title d-none d-sm-inline">관리자</span>
                    </a>
                    {isAdminDropdownOpen && (
                      <div 
                        className="dropdown-menu show"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          right: 'auto',
                          zIndex: 1000,
                          minWidth: '220px',
                          marginTop: '0.25rem',
                          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                          border: '1px solid rgba(0, 0, 0, 0.15)',
                          borderRadius: '0.375rem'
                        }}
                      >
                        <div className="dropdown-menu-columns">
                          <div className="dropdown-menu-column">
                            <Link
                              className="dropdown-item"
                              to="/user-management"
                              onClick={() => {
                                setIsAdminDropdownOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <span className="nav-link-icon d-md-none d-lg-inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                  <circle cx="9" cy="7" r="4"/>
                                  <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                  <path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>
                                </svg>
                              </span>
                              사용자 관리
                            </Link>
                            <Link
                              className="dropdown-item"
                              to="/admin/service-reports"
                              onClick={() => {
                                setIsAdminDropdownOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <span className="nav-link-icon d-md-none d-lg-inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                  <path d="M9 7h-3a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-3"/>
                                  <path d="M9 15h3l8.5 -8.5a1.5 1.5 0 0 0 -3 -3l-8.5 8.5v3"/>
                                  <line x1="16" y1="5" x2="19" y2="8"/>
                                </svg>
                              </span>
                              서비스리포트 설정
                            </Link>
                            <Link
                              className="dropdown-item"
                              to="/admin/resource-settings"
                              onClick={() => {
                                setIsAdminDropdownOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <span className="nav-link-icon d-md-none d-lg-inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                  <rect x="4" y="4" width="6" height="6" rx="1"/>
                                  <rect x="14" y="4" width="6" height="6" rx="1"/>
                                  <rect x="4" y="14" width="6" height="6" rx="1"/>
                                  <rect x="14" y="14" width="6" height="6" rx="1"/>
                                  <circle cx="7" cy="7" r="1"/>
                                  <circle cx="17" cy="7" r="1"/>
                                  <circle cx="7" cy="17" r="1"/>
                                  <circle cx="17" cy="17" r="1"/>
                                </svg>
                              </span>
                              리소스 설정
                            </Link>
                            <Link
                              className="dropdown-item"
                              to="/admin/invoices"
                              onClick={() => {
                                setIsAdminDropdownOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <span className="nav-link-icon d-md-none d-lg-inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                  <rect x="7" y="9" width="14" height="10" rx="2"/>
                                  <circle cx="14" cy="14" r="2"/>
                                  <path d="M17 9v-2a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v6a2 2 0 0 0 2 2h2"/>
                                </svg>
                              </span>
                              거래명세표 설정
                            </Link>
                            <Link
                              className="dropdown-item"
                              to="/admin/spare-parts"
                              onClick={() => {
                                setIsAdminDropdownOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <span className="nav-link-icon d-md-none d-lg-inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                  <rect x="4" y="4" width="6" height="6" rx="1"/>
                                  <rect x="14" y="4" width="6" height="6" rx="1"/>
                                  <rect x="4" y="14" width="6" height="6" rx="1"/>
                                  <rect x="17" y="17" width="3" height="3" rx=".5"/>
                                </svg>
                              </span>
                              스페어파트 설정
                            </Link>
                          </div>
                          <div className="dropend dropend-submenu-secondary">
                            <Link
                              className="dropdown-item"
                              to="/admin/system-settings"
                              onClick={() => {
                                setIsAdminDropdownOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <span className="nav-link-icon d-md-none d-lg-inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                  <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/>
                                  <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
                                </svg>
                              </span>
                              시스템 설정
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <main className="page-wrapper">
        <Outlet />
      </main>

      <Footer />

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false);
              resetPasswordForm();
            }
          }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">비밀번호 변경</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetPasswordForm();
                  }}
                ></button>
              </div>
              <form onSubmit={handlePasswordChange}>
                <div className="modal-body">
                  {passwordError && (
                    <div className="alert alert-danger" role="alert">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="alert alert-success" role="alert">
                      {passwordSuccess}
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label">현재 비밀번호 <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="현재 비밀번호를 입력하세요"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">새 비밀번호 <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">새 비밀번호 확인 <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="새 비밀번호를 다시 입력하세요"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowPasswordModal(false);
                      resetPasswordForm();
                    }}
                  >
                    취소
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    비밀번호 변경
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;