import React from 'react';
import { useNavigate } from 'react-router-dom';
import YTDSummaryCard from '../components/YTDSummaryCard';

const YTDSummaryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      <div className="container-xl">
        <div className="page-header d-print-none">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-ghost-secondary me-3"
                  onClick={() => navigate(-1)}
                  title="뒤로 가기"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <line x1="5" y1="12" x2="11" y2="18"/>
                    <line x1="5" y1="12" x2="11" y2="6"/>
                  </svg>
                  뒤로
                </button>
                <h2 className="page-title mb-0">YTD 요약</h2>
              </div>
              <div className="text-muted mt-1">Invoice Code별 월별/분기별 비용 집계 (Work/Travel/Parts)</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <rect x="4" y="4" width="6" height="8" rx="1"/>
                  <rect x="4" y="16" width="6" height="4" rx="1"/>
                  <rect x="14" y="12" width="6" height="8" rx="1"/>
                  <rect x="14" y="4" width="6" height="4" rx="1"/>
                </svg>
                대시보드
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            <YTDSummaryCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default YTDSummaryPage;
