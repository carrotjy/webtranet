import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 영어 문장 데이터 타입 정의
interface EnglishSentence {
  id: number;
  text: string;
  translation: string;
  lang: string;
}

const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  
  // 오늘의 영어 문장 상태
  const [todaySentence, setTodaySentence] = useState<EnglishSentence | null>(null);
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [sentenceError, setSentenceError] = useState<string | null>(null);

  const dashboardCards = [
    {
      title: '서비스 리포트',
      description: '현장 서비스 작업 내용을 관리합니다',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M9 7h-3a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-3"/>
          <path d="M9 15h3l8.5 -8.5a1.5 1.5 0 0 0 -3 -3l-8.5 8.5v3"/>
          <line x1="16" y1="5" x2="19" y2="8"/>
        </svg>
      ),
      link: '/service-reports',
      permission: 'service_report',
      color: 'bg-primary'
    },
    {
      title: '거래명세서',
      description: '서비스 비용 및 거래 내역을 관리합니다',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"/>
          <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4"/>
        </svg>
      ),
      link: '/transactions',
      permission: 'transaction',
      color: 'bg-success'
    },
    {
      title: '고객정보',
      description: '고객사 정보 및 연락처를 관리합니다',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <circle cx="12" cy="7" r="4"/>
          <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>
        </svg>
      ),
      link: '/customers',
      permission: 'customer',
      color: 'bg-info'
    },
    {
      title: '스페어파트',
      description: '부품 재고 및 가격 정보를 관리합니다',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z"/>
          <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
          <path d="M12 7l0 .01"/>
          <path d="M12 17l0 .01"/>
          <path d="M7 12l0 .01"/>
          <path d="M17 12l0 .01"/>
        </svg>
      ),
      link: '/spare-parts',
      permission: 'spare_parts',
      color: 'bg-warning'
    }
  ];

  // 백엔드를 통해 Tatoeba API에서 영어 문장 가져오기
  const fetchTodaysEnglishSentence = async () => {
    setSentenceLoading(true);
    setSentenceError(null);

    try {
      // 백엔드 API 호출
      const response = await fetch(
        'http://localhost:5000/api/tatoeba/random-sentence',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sentence');
      }

      const data = await response.json();

      if (data.success && data.sentence) {
        setTodaySentence({
          id: data.sentence.id,
          text: data.sentence.text,
          translation: data.sentence.translation,
          lang: data.sentence.lang
        });
      } else {
        // API 응답에 문장이 없으면 대체 문장 사용
        setTodaySentence({
          id: 0,
          text: "The journey of a thousand miles begins with one step.",
          translation: "천 리 길도 한 걸음부터 시작됩니다.",
          lang: "eng"
        });
      }
    } catch (error) {
      console.error('Error fetching English sentence:', error);
      setSentenceError('영어 문장을 불러오는데 실패했습니다.');

      // 오류 시 대체 문장 표시
      setTodaySentence({
        id: 0,
        text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        translation: "성공은 최종적인 것이 아니고, 실패는 치명적인 것이 아닙니다. 중요한 것은 계속할 수 있는 용기입니다.",
        lang: "eng"
      });
    } finally {
      setSentenceLoading(false);
    }
  };

  // 컴포넌트 마운트 시 영어 문장 가져오기
  useEffect(() => {
    fetchTodaysEnglishSentence();
  }, []);

  const availableCards = dashboardCards.filter(card => hasPermission(card.permission));

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">
              대시보드
            </h2>
            <div className="text-muted mt-1">
              안녕하세요, {user?.name}님! LVDK Webtranet 시스템에 오신 것을 환영합니다.
            </div>
          </div>
        </div>
      </div>
      
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            {/* 첫 번째 줄: 사용자 정보, 접근 권한, 시스템 정보 */}
            {/* 사용자 정보 카드 */}
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="subheader">사용자 정보</div>
                  </div>
                  <div className="d-flex align-items-baseline">
                    <div className="h1 mb-0 me-2">{user?.is_admin ? 'admin' : user?.name}</div>
                  </div>
                  <div className="text-muted">
                    <strong>부서:</strong> {user?.department}<br />
                    <strong>이메일:</strong> {user?.email}<br />
                    <strong>연락처:</strong> {user?.contact || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 권한 정보 카드 */}
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="subheader">접근 권한</div>
                  </div>
                  <div className="mt-2">
                    {user?.is_admin ? (
                      <span
                        className="badge me-1"
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e53e3e',
                          color: '#e53e3e'
                        }}
                      >
                        관리자
                      </span>
                    ) : (
                      <div className="d-flex gap-1 flex-wrap">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #4299e1',
                            color: '#4299e1',
                            filter: user?.service_report_access ? 'none' : 'blur(1.5px)',
                            opacity: user?.service_report_access ? 1 : 0.5
                          }}
                        >
                          리포트
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #dd6b20',
                            color: '#dd6b20',
                            filter: user?.customer_access ? 'none' : 'blur(1.5px)',
                            opacity: user?.customer_access ? 1 : 0.5
                          }}
                        >
                          고객
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #d53f8c',
                            color: '#d53f8c',
                            filter: user?.resource_access ? 'none' : 'blur(1.5px)',
                            opacity: user?.resource_access ? 1 : 0.5
                          }}
                        >
                          리소스
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #38a169',
                            color: '#38a169',
                            filter: user?.transaction_access ? 'none' : 'blur(1.5px)',
                            opacity: user?.transaction_access ? 1 : 0.5
                          }}
                        >
                          거래
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #805ad5',
                            color: '#805ad5',
                            filter: user?.spare_parts_access ? 'none' : 'blur(1.5px)',
                            opacity: user?.spare_parts_access ? 1 : 0.5
                          }}
                        >
                          부품
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 시스템 정보 카드 */}
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="subheader">시스템 정보</div>
                  </div>
                  <div className="h1 mb-0 me-2">LVDK Webtranet</div>
                  <div className="text-muted">
                      <span
                        className="badge me-1"
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #347bffff',
                          color: '#347bffff'
                        }}
                      >
                        v1.0 BETA
                      </span><br />
                    다섯 가지 섹션(리포트, 거래명세서, 고객정보, 스페어파트, 리소스)에 대한 CRUD 기능 지원
                  </div>
                </div>
              </div>
            </div>

            {/* 두 번째 줄: 오늘의 영어 한문장 (전체 너비) */}
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="subheader d-flex align-items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="m0 0h24v24H0z" fill="none"/>
                        <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/>
                        <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/>
                        <line x1="3" y1="6" x2="3" y2="19"/>
                        <line x1="12" y1="6" x2="12" y2="19"/>
                        <line x1="21" y1="6" x2="21" y2="19"/>
                      </svg>
                      오늘의 영어 한문장
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={fetchTodaysEnglishSentence}
                      disabled={sentenceLoading}
                      title="새 문장 가져오기"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="m0 0h24v24H0z" fill="none"/>
                        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/>
                        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
                      </svg>
                    </button>
                  </div>

                  {sentenceLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : sentenceError ? (
                    <div className="alert alert-warning mb-0">
                      <small>{sentenceError}</small>
                    </div>
                  ) : todaySentence ? (
                    <div>
                      <blockquote className="blockquote mb-2">
                        <p className="mb-2" style={{ fontSize: '1rem', lineHeight: '1.5', fontWeight: '500' }}>
                          "{todaySentence.text}"
                        </p>
                      </blockquote>
                      <div className="mb-3 ps-3" style={{ borderLeft: '3px solid #0d6efd' }}>
                        <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                          {todaySentence.translation}
                        </p>
                      </div>
                      <div className="text-muted small d-flex align-items-center justify-content-between">
                        <span>
                          출처: <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer" className="text-decoration-none">Tatoeba.org</a>
                        </span>
                        {todaySentence.id > 0 && (
                          <span>ID: {todaySentence.id}</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 세 번째 줄부터: 메뉴 카드들 */}
            {availableCards.map((card, index) => (
              <div key={index} className="col-12 col-md-6 col-lg-3">
                <div className="card dashboard-card">
                  <div className="card-body">
                    <div className={`avatar avatar-lg mb-3 ${card.color} text-white`}>
                      {card.icon}
                    </div>
                    <h3 className="card-title">{card.title}</h3>
                    <p className="text-muted">{card.description}</p>
                    <a href={card.link} className="btn btn-outline-primary">
                      바로가기
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {user?.is_admin && (
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card dashboard-card">
                  <div className="card-body">
                    <div className="avatar avatar-lg mb-3 bg-danger text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        <path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>
                      </svg>
                    </div>
                    <h3 className="card-title">사용자 관리</h3>
                    <p className="text-muted">직원 계정 및 권한을 관리합니다</p>
                    <a href="/user-management" className="btn btn-outline-primary">
                      바로가기
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;