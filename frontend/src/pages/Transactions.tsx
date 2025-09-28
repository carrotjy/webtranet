import React from 'react';

const Transactions: React.FC = () => {
  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">거래명세서</h2>
            <div className="text-muted mt-1">서비스 비용 및 거래 내역을 관리합니다</div>
          </div>
          <div className="col-auto ms-auto d-print-none">
            <div className="btn-list">
              <button className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                새 거래명세서 작성
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">거래명세서 목록</h3>
                </div>
                <div className="card-body">
                  <div className="text-center py-5">
                    <div className="empty">
                      <div className="empty-img">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3IDhWNUExIDEgMCAwIDAgMTYgNEg2QTIgMiAwIDAgMCA0IDZWMThBMiAyIDAgMCAwIDYgMjBIMTZBMSAxIDAgMCAwIDE3IDE5VjE2IiBzdHJva2U9IiM4Nzk0YTgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yMCAxMlYxNkg2QTIgMiAwIDAgMSA0IDE0VjIiIHN0cm9rZT0iIzg3OTRhOCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==" alt="" height="128" width="128" />
                      </div>
                      <p className="empty-title">거래명세서가 없습니다</p>
                      <p className="empty-subtitle text-muted">
                        첫 번째 거래명세서를 작성하거나 서비스 리포트에서 자동 생성해보세요.
                      </p>
                      <div className="empty-action">
                        <button className="btn btn-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          새 거래명세서 작성
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;