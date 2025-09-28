import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();

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
              안녕하세요, {user?.name}님! Webtranet 서비스 관리 시스템에 오신 것을 환영합니다.
            </div>
          </div>
        </div>
      </div>
      
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            {/* 사용자 정보 카드 */}
            <div className="col-12 col-md-6 col-lg-4">
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
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="subheader">접근 권한</div>
                  </div>
                  <div className="mt-2">
                    {user?.is_admin ? (
                      <span className="badge bg-success me-1">관리자</span>
                    ) : (
                      <>
                        {user?.service_report_access && <span className="badge bg-primary me-1">서비스리포트</span>}
                        {user?.transaction_access && <span className="badge bg-success me-1">거래명세서</span>}
                        {user?.customer_access && <span className="badge bg-info me-1">고객정보</span>}
                        {user?.spare_parts_access && <span className="badge bg-warning me-1">스페어파트</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 시스템 정보 카드 */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="subheader">시스템 정보</div>
                  </div>
                  <div className="h1 mb-0 me-2">Webtranet</div>
                  <div className="text-muted">
                    산업용 공작기계<br />
                    서비스 관리 시스템<br />
                    v1.0.0
                  </div>
                </div>
              </div>
            </div>

            {/* 메뉴 카드들 */}
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