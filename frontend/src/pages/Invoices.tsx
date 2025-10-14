import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Invoice {
  id: number;
  service_report_id?: number;
  invoice_number: string;
  customer_name: string;
  issue_date: string;
  total_amount: number;
  vat_amount: number;
  grand_total: number;
  created_at: string;
}

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [perPage, setPerPage] = useState(10);

  const fetchInvoices = async (page: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/invoices?page=${page}&per_page=${perPage}`);
      
      setInvoices(response.data.invoices || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.pages || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('거래명세표 목록 조회 실패:', error);
      alert('거래명세표 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchInvoices(page);
    }
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleDelete = async (invoiceId: number) => {
    if (!window.confirm('이 거래명세표를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`/invoices/${invoiceId}`);
      alert('거래명세표가 삭제되었습니다.');
      fetchInvoices(currentPage);
    } catch (error) {
      console.error('거래명세표 삭제 실패:', error);
      alert('거래명세표 삭제에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, [perPage]);

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="검색어를 입력하세요 (거래명세표번호, 고객명, 발행일)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute"
                  style={{
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    opacity: 0.6,
                    zIndex: 10,
                    color: '#dc3545'
                  }}
                  onClick={handleSearchClear}
                  title="검색어 지우기"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="col-auto d-print-none">
            <select
              className="form-select"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
              }}
            >
              <option value={5}>5개씩</option>
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
            </select>
          </div>
          <div className="col-auto ms-auto d-print-none">
            <div className="btn-list">
              <a href="/invoices/new" className="btn btn-primary d-none d-sm-inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                새로 만들기
              </a>
              <a href="/invoices/new" className="btn btn-primary d-sm-none btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">로딩 중...</span>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-4">
              <div className="empty">
                <div className="empty-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <rect x="3" y="4" width="18" height="16" rx="3"/>
                    <line x1="7" y1="8" x2="17" y2="8"/>
                    <line x1="7" y1="12" x2="17" y2="12"/>
                    <line x1="7" y1="16" x2="9" y2="16"/>
                  </svg>
                </div>
                <p className="empty-title">거래명세표가 없습니다</p>
                <p className="empty-subtitle text-muted">
                  서비스 리포트에서 거래명세표를 생성해보세요.
                </p>
                <div className="empty-action">
                  <Link to="/service-reports" className="btn btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    서비스 리포트 보기
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                      <table className="table table-vcenter table-striped">
                        <thead>
                          <tr>
                            <th>거래명세표 번호</th>
                            <th>고객명</th>
                            <th>발행일</th>
                            <th>공급가액</th>
                            <th>부가세</th>
                            <th>총합계</th>
                            <th>생성일</th>
                            <th className="w-1">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((invoice) => (
                            <tr key={invoice.id}>
                              <td data-label="거래명세표 번호">
                                <span className="text-muted fw-bold">
                                  {invoice.invoice_number}
                                </span>
                              </td>
                              <td data-label="고객명">
                                <div className="d-flex py-1 align-items-center">
                                  <div className="flex-fill">
                                    <div className="font-weight-medium">
                                      {invoice.customer_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td data-label="발행일">
                                {new Date(invoice.issue_date).toLocaleDateString()}
                              </td>
                              <td data-label="공급가액" className="text-end">
                                <span className="text-primary fw-bold">
                                  {invoice.total_amount.toLocaleString()}원
                                </span>
                              </td>
                              <td data-label="부가세" className="text-end">
                                <span className="text-muted">
                                  {invoice.vat_amount.toLocaleString()}원
                                </span>
                              </td>
                              <td data-label="총합계" className="text-end">
                                <span className="text-success fw-bold">
                                  {invoice.grand_total.toLocaleString()}원
                                </span>
                              </td>
                              <td data-label="생성일">
                                <span className="text-muted">
                                  {new Date(invoice.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  {(user?.transaction_access && (user?.transaction_read || user?.is_admin)) && (
                                    <Link
                                      to={`/invoices/${invoice.id}`}
                                      className="btn btn-sm btn-outline-primary"
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        padding: '0'
                                      }}
                                      title="보기"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                      </svg>
                                    </Link>
                                  )}
                                  {(user?.transaction_access && (user?.transaction_update || user?.is_admin)) && (
                                    <Link
                                      to={`/invoices/${invoice.id}/edit`}
                                      className="btn btn-sm btn-outline-secondary"
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        padding: '0'
                                      }}
                                      title="수정"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                    </Link>
                                  )}
                                  {(user?.transaction_access && (user?.transaction_delete || user?.is_admin)) && (
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        padding: '0'
                                      }}
                                      onClick={() => handleDelete(invoice.id)}
                                      title="삭제"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3,6 5,6 21,6"/>
                                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="d-flex align-items-center mt-3">
                      <p className="m-0 text-muted">
                        {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, total)} of {total} 거래명세표
                      </p>
                      <ul className="pagination m-0 ms-auto">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15,18 9,12 15,6"></polyline>
                            </svg>
                            이전
                          </button>
                        </li>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            다음
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;