import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

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
  has_excel?: boolean;
  has_pdf?: boolean;
  is_locked?: number;
  locked_by?: number;
  locked_at?: string;
  bill_status?: string;
  bill_issued_at?: string;
  bill_issued_by?: number;
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
      const response = await invoiceAPI.getInvoices({ page, per_page: perPage });

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

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchInvoices(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchInvoices(currentPage + 1);
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
      await invoiceAPI.deleteInvoice(invoiceId);
      alert('거래명세표가 삭제되었습니다.');
      fetchInvoices(currentPage);
    } catch (error) {
      console.error('거래명세표 삭제 실패:', error);
      alert('거래명세표 삭제에 실패했습니다.');
    }
  };

  const handleGenerateExcel = async (invoiceId: number, customerName: string) => {
    try {
      setLoading(true);
      const response = await invoiceAPI.generateExcel(invoiceId);

      if (response.data.success) {
        alert('Excel 파일이 성공적으로 생성되었습니다.');

        // Refresh the invoice list to update file status
        await fetchInvoices(currentPage);

        // Excel 파일 다운로드
        const excelUrl = `${window.location.origin}${response.data.excel_url}`;
        window.open(excelUrl, '_blank');
      } else {
        alert(`Excel 생성 실패: ${response.data.error}`);
      }
    } catch (error: any) {
      console.error('Excel 생성 실패:', error);
      alert(`Excel 생성에 실패했습니다: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewExcel = (customerName: string) => {
    // Excel 파일 보기
    const excelUrl = `/api/invoice-excel/${customerName}/거래명세서(${customerName}).xlsx`;
    window.open(excelUrl, '_blank');
  };

  const handleViewPDF = (customerName: string) => {
    // PDF 파일 보기
    const pdfUrl = `/api/invoice-pdf/${customerName}/거래명세서(${customerName}).pdf`;
    window.open(pdfUrl, '_blank');
  };

  const handleLockToggle = async (invoice: Invoice) => {
    if (!invoice.id) return;

    const confirmMessage = invoice.is_locked
      ? '명세서 잠금을 해제하시겠습니까?'
      : '명세서를 잠금 처리하시겠습니까?\n잠금 후에는 수정할 수 없습니다.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const endpoint = invoice.is_locked
        ? `/api/invoices/${invoice.id}/unlock`
        : `/api/invoices/${invoice.id}/lock`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        await fetchInvoices(currentPage);
      } else {
        alert(data.error || '처리 실패');
      }
    } catch (error: any) {
      console.error('잠금 처리 실패:', error);
      alert(`처리에 실패했습니다: ${error.message}`);
    }
  };

  const handleIssueBill = async (invoiceId: number, currentStatus?: string) => {
    const isIssued = currentStatus === 'issued';

    const confirmMessage = isIssued
      ? '계산서 발행을 취소하시겠습니까?\n미발행 상태로 변경됩니다.'
      : '계산서 발행 완료 처리하시겠습니까?\n발행 완료 시 자동으로 잠금 처리됩니다.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const endpoint = isIssued
        ? `/api/invoices/${invoiceId}/cancel-bill`
        : `/api/invoices/${invoiceId}/issue-bill`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        await fetchInvoices(currentPage);
      } else {
        alert(data.error || '계산서 발행 처리 실패');
      }
    } catch (error: any) {
      console.error('계산서 발행 처리 실패:', error);
      alert(`처리에 실패했습니다: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, [perPage]);

  // 검색 필터링
  const filteredInvoices = searchTerm
    ? invoices.filter(invoice =>
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.issue_date?.includes(searchTerm)
      )
    : invoices;

  return (
    <>
      <style>
        {`
          /* 홀수 행 배경색 */
          .table tbody tr:nth-child(odd) {
            background-color: #ffffff;
          }

          /* 짝수 행 배경색 */
          .table tbody tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          /* 모든 행에 hover 효과 적용 */
          .table tbody tr:hover {
            background-color: #e3f2fd !important;
            transition: background-color 0.15s ease-in-out;
          }
        `}
      </style>
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
          ) : filteredInvoices.length === 0 ? (
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
                      <table className="table table-vcenter">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'center' }}>거래명세표 번호</th>
                            <th style={{ textAlign: 'center' }}>고객명</th>
                            <th style={{ textAlign: 'center' }}>발행일</th>
                            <th style={{ textAlign: 'right' }}>총합계</th>
                            <th style={{ textAlign: 'center' }} className="w-1">계산서 발행</th>
                            <th style={{ textAlign: 'center' }} className="w-1">잠금 상태</th>
                            <th style={{ textAlign: 'center' }} className="w-1">파일보기</th>
                            <th style={{ textAlign: 'center' }} className="w-1">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInvoices.map((invoice) => (
                            <tr key={invoice.id}>
                              <td data-label="거래명세표 번호"  style={{ textAlign: 'center' }}>
                                <span className="text-muted fw-bold">
                                  {invoice.invoice_number}
                                </span>
                              </td>
                              <td data-label="고객명" style={{ textAlign: 'center' }}>
                                <div className="d-flex py-1 align-items-center">
                                  <div className="flex-fill">
                                    <div className="font-weight-medium">
                                      {invoice.customer_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td data-label="발행일" style={{ textAlign: 'center' }}>
                                {new Date(invoice.issue_date).toLocaleDateString()}
                              </td>
                              <td data-label="총합계" className="text-end">
                                <span className="fw-bold" style={{ color: '#0054a6' }}>
                                  {invoice.grand_total.toLocaleString()}원
                                </span>
                              </td>
                              <td data-label="계산서 발행" className="text-center">
                                {((user as any)?.transaction_bill_view !== false) && (
                                  invoice.bill_status === 'issued' ? (
                                    <span
                                      onClick={() => handleIssueBill(invoice.id, invoice.bill_status)}
                                      className="badge bg-success"
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        color: '#ffffff'
                                      }}
                                      title={`발행일시: ${invoice.bill_issued_at ? new Date(invoice.bill_issued_at).toLocaleString('ko-KR') : '-'}\n클릭하여 미발행으로 변경`}
                                    >
                                      발행완료
                                    </span>
                                  ) : (
                                    <span
                                      onClick={() => handleIssueBill(invoice.id, invoice.bill_status)}
                                      className="badge bg-warning"
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        color: '#ffffff'
                                      }}
                                      title="클릭하여 발행 완료 처리"
                                    >
                                      미발행
                                    </span>
                                  )
                                )}
                              </td>
                              <td data-label="잠금 상태" className="text-center">
                                <div className="d-flex justify-content-center">
                                  {((user as any)?.transaction_lock !== false) && (
                                    invoice.is_locked ? (
                                      <button
                                        onClick={() => handleLockToggle(invoice)}
                                        className="btn btn-sm btn-warning"
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '32px',
                                          height: '32px',
                                          padding: '0'
                                        }}
                                        title="잠금 해제"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleLockToggle(invoice)}
                                        className="btn btn-sm btn-outline-success"
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '32px',
                                          height: '32px',
                                          padding: '0'
                                        }}
                                        title="잠금"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                        </svg>
                                      </button>
                                    )
                                  )}
                                </div>
                              </td>
                              <td data-label="파일보기" className="text-center">
                                <div className="d-flex gap-1 justify-content-center">
                                  {invoice.has_excel !== false ? (
                                    <span
                                      onClick={() => handleViewExcel(invoice.customer_name)}
                                      className="badge"
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        backgroundColor: '#ffffffff',
                                        border: '1px solid #009714ff',
                                        color: '#00ac17d2'
                                      }}
                                      title="Excel 파일 보기"
                                    >
                                      .xlsx
                                    </span>
                                  ) : (
                                    <span
                                      className="badge bg-secondary"
                                      style={{
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        opacity: 0.5,
                                        backgroundColor: '#ffffffff',
                                        border: '1px solid #009714ff',
                                        color: '#ffffffff'
                                      }}
                                      title="Excel 파일 없음"
                                    >
                                      N/A
                                    </span>
                                  )}
                                  {invoice.has_pdf !== false ? (
                                    <span
                                      onClick={() => handleViewPDF(invoice.customer_name)}
                                      className="badge"
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        backgroundColor: '#ffffffff',
                                        border: '1px solid #ff0000ff',
                                        color: '#ff0000ff'
                                      }}
                                      title="PDF 파일 보기"
                                    >
                                      .pdf
                                    </span>
                                  ) : (
                                    <span
                                      className="badge bg-secondary"
                                      style={{
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        opacity: 0.5,
                                        backgroundColor: '#ffffffff',
                                        border: '1px solid #ff0000ff',
                                        color: '#ffffffff'
                                      }}
                                      title="PDF 파일 없음"
                                    >
                                      N/A
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="d-flex gap-1 justify-content-center">
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
                                  {(user as any)?.transaction_excel_export && (
                                    <button
                                      onClick={() => handleGenerateExcel(invoice.id, invoice.customer_name)}
                                      className="btn btn-sm btn-excel-generate"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        padding: '0',
                                        // backgroundColor: '#ffffff',
                                        border: '1px solid #198754',
                                        color: '#198754',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#198754';
                                        e.currentTarget.style.color = '#ffffff';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                        e.currentTarget.style.color = '#198754';
                                      }}
                                      title="Excel/PDF 생성"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="12" y1="18" x2="12" y2="12"/>
                                        <line x1="9" y1="15" x2="15" y2="15"/>
                                      </svg>
                                    </button>
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

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={perPage}
                    onPageChange={handlePageChange}
                    onPreviousPage={handlePreviousPage}
                    onNextPage={handleNextPage}
                  />
                </>
              )}
        </div>
      </div>
      </div>
    </>
  );
};

export default Invoices;