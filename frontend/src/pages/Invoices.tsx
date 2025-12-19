import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoiceAPI, serviceReportAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

interface Invoice {
  id: number;
  service_report_id?: number;
  invoice_number: string;
  customer_name: string;
  fax_number?: string;
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
  invoice_code?: string;
  invoice_description?: string;
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

  // Fax sending states - 비활성화됨 (팩스번호 복사 기능으로 대체)
  // const [showFaxModal, setShowFaxModal] = useState(false);
  // const [faxInvoice, setFaxInvoice] = useState<Invoice | null>(null);
  // const [faxNumber, setFaxNumber] = useState<string | null>(null);
  // const [faxSending, setFaxSending] = useState(false);
  // const [faxProgress, setFaxProgress] = useState(0);
  // Bulk download selections
  const [selectedExcelIds, setSelectedExcelIds] = useState<number[]>([]);
  const [selectedPdfIds, setSelectedPdfIds] = useState<number[]>([]);
  const [excelSelectAll, setExcelSelectAll] = useState(false);
  const [pdfSelectAll, setPdfSelectAll] = useState(false);

  // Service Report Modal
  const [showServiceReportModal, setShowServiceReportModal] = useState(false);
  const [selectedServiceReportId, setSelectedServiceReportId] = useState<number | null>(null);
  const [serviceReportData, setServiceReportData] = useState<any>(null);
  const [loadingServiceReport, setLoadingServiceReport] = useState(false);

  const fetchInvoices = async (page: number) => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getInvoices({ page, per_page: perPage });

      console.log('Invoice API 응답:', response.data);
      console.log('첫 번째 invoice:', response.data.invoices?.[0]);

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

  const handleDownloadExcel = async (customerName: string) => {
    try {
      const filename = `거래명세서(${customerName}).xlsx`;
      const excelUrl = `/api/invoice-excel/${encodeURIComponent(customerName)}/${encodeURIComponent(filename)}`;

      // fetch를 사용하여 파일 다운로드
      const response = await fetch(excelUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Excel 파일 다운로드에 실패했습니다.');
        return;
      }

      // Blob으로 변환하여 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Excel 다운로드 오류:', error);
      alert('Excel 파일 다운로드에 실패했습니다.');
    }
  };

  const handleDownloadPDF = async (customerName: string, invoiceNumber: string) => {
    try {
      const filename = `거래명세서(${customerName})-${invoiceNumber}.pdf`;
      const pdfUrl = `/api/invoice-pdf/${encodeURIComponent(customerName)}/${encodeURIComponent(filename)}`;

      // fetch를 사용하여 파일 다운로드
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'PDF 파일 다운로드에 실패했습니다.');
        return;
      }

      // Blob으로 변환하여 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('PDF 다운로드 오류:', error);
      alert('PDF 파일 다운로드에 실패했습니다.');
    }
  };

  const handleViewPDF = (customerName: string, invoiceNumber: string) => {
    // PDF 파일 새 창에서 보기
    const filename = `거래명세서(${customerName})-${invoiceNumber}.pdf`;
    // 개발 환경에서는 직접 백엔드 포트로, 프로덕션에서는 상대 경로 사용
    const backendUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000'
      : '';
    const pdfUrl = `${backendUrl}/api/invoice-pdf/${encodeURIComponent(customerName)}/${encodeURIComponent(filename)}`;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const handleViewServiceReport = async (serviceReportId: number) => {
    try {
      setLoadingServiceReport(true);
      setSelectedServiceReportId(serviceReportId);

      console.log('서비스 리포트 조회 시작:', serviceReportId);
      const response = await serviceReportAPI.getServiceReportById(serviceReportId);
      console.log('서비스 리포트 응답:', response);
      console.log('서비스 리포트 데이터:', response.data);
      // API 응답이 {report: {...}} 형태이므로 report 객체를 추출
      setServiceReportData(response.data.report || response.data);
      setShowServiceReportModal(true);
    } catch (error) {
      console.error('서비스 리포트 조회 실패:', error);
      alert('서비스 리포트를 불러오는데 실패했습니다.');
    } finally {
      setLoadingServiceReport(false);
    }
  };

  const toggleSelectExcel = (id: number) => {
    setSelectedExcelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectPdf = (id: number) => {
    setSelectedPdfIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAllExcel = () => {
    if (excelSelectAll) {
      // Deselect all
      setSelectedExcelIds([]);
      setExcelSelectAll(false);
    } else {
      // Select all Excel files that exist
      const excelIds = filteredInvoices
        .filter(inv => inv.has_excel !== false)
        .map(inv => inv.id);
      setSelectedExcelIds(excelIds);
      setExcelSelectAll(true);
    }
  };

  const handleSelectAllPdf = () => {
    if (pdfSelectAll) {
      // Deselect all
      setSelectedPdfIds([]);
      setPdfSelectAll(false);
    } else {
      // Select all PDF files that exist
      const pdfIds = filteredInvoices
        .filter(inv => inv.has_pdf !== false)
        .map(inv => inv.id);
      setSelectedPdfIds(pdfIds);
      setPdfSelectAll(true);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedExcelIds.length === 0 && selectedPdfIds.length === 0) {
      alert('먼저 다운로드할 파일을 선택하세요.');
      return;
    }

    try {
      setLoading(true);

      // 백엔드 API로 ZIP 다운로드 요청
      const response = await fetch('/api/invoices/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          excel_ids: selectedExcelIds,
          pdf_ids: selectedPdfIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'ZIP 파일 생성에 실패했습니다.');
        return;
      }

      // ZIP 파일을 Blob으로 변환하여 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 파일명은 응답 헤더에서 가져오거나 기본값 사용
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '거래명세서_일괄다운로드.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 선택 해제
      setSelectedExcelIds([]);
      setSelectedPdfIds([]);

      alert('ZIP 파일 다운로드가 완료되었습니다.');
    } catch (error: any) {
      console.error('일괄 다운로드 오류:', error);
      alert('일괄 다운로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 팩스 전송 기능 - 비활성화됨 (팩스번호 복사 기능으로 대체)
  /*
  const handleSendFax = async (invoice: Invoice) => {
    setFaxInvoice(invoice);
    setFaxProgress(0);

    // 팩스번호 조회
    try {
      const response = await fetch(`/api/fax/number/${encodeURIComponent(invoice.customer_name)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (data.success && data.fax_number) {
        setFaxNumber(data.fax_number);
      } else {
        setFaxNumber(null);
      }
    } catch (error) {
      console.error('팩스번호 조회 실패:', error);
      setFaxNumber(null);
    }

    setShowFaxModal(true);
  };

  const confirmSendFax = async () => {
    if (!faxInvoice || !faxNumber) return;

    setFaxSending(true);

    try {
      // Send fax request (PDF will be opened automatically)
      const response = await fetch('/api/fax/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          invoice_id: faxInvoice.id,
          customer_name: faxInvoice.customer_name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '팩스 앱 열기에 실패했습니다.');
      }

      // 팩스 앱 이름 추출 (서버에서 받은 메시지 사용)
      const appMessage = data.message || '팩스 앱이 열렸습니다.';

      // Copy fax number to clipboard
      try {
        await navigator.clipboard.writeText(faxNumber);
        alert(`${appMessage}\n\n팩스번호: ${faxNumber}\n\n팩스번호가 클립보드에 복사되었습니다.\n팩스 앱에서 Ctrl+V로 붙여넣고 전송 버튼을 눌러주세요.`);
      } catch (err) {
        alert(`${appMessage}\n\n팩스번호: ${faxNumber}\n\n팩스 앱에서 이 번호를 입력하고 전송 버튼을 눌러주세요.`);
      }

      setShowFaxModal(false);
      setFaxInvoice(null);
      setFaxNumber(null);
    } catch (error: any) {
      console.error('팩스 준비 실패:', error);
      alert(error.message || '팩스 앱 열기에 실패했습니다.');
    } finally {
      setFaxSending(false);
    }
  };
  */

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
                            <th style={{ textAlign: 'center' }}>팩스번호</th>
                            <th style={{ textAlign: 'center' }}>발행일</th>
                            <th style={{ textAlign: 'center', width: '40px' }}>SR</th>
                            <th style={{ textAlign: 'center' }}>Invoice Code</th>
                            <th style={{ textAlign: 'right' }}>총합계</th>
                            <th style={{ textAlign: 'center' }} className="w-1">계산서 발행</th>
                            <th style={{ textAlign: 'center' }} className="w-1">잠금 상태</th>
                            <th style={{ textAlign: 'center' }} className="w-1">
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <span>Excel 파일</span>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={handleSelectAllExcel}
                                  style={{
                                    color: excelSelectAll ? '#ffffff' : '#28a745',
                                    fontSize: '1.5rem',
                                    padding: '2px 2px',
                                    lineHeight: '1'
                                  }}
                                  title={excelSelectAll ? 'Excel 선택 해제' : 'Excel 전체 선택'}
                                >
                                  {excelSelectAll ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20" height="20">
                                      <g fill="#40c057" fillRule="nonzero">
                                        <g transform="scale(5.12,5.12)">
                                          <path d="M7,2c-2.80078,0 -5,2.19922 -5,5v27c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-24.1875l-2,2.1875v22c0,1.69922 -1.30078,3 -3,3h-27c-1.69922,0 -3,-1.30078 -3,-3v-27c0,-1.69922 1.30078,-3 3,-3h26.40625l1.6875,-1.90625c-0.39844,0 -0.69531,-0.09375 -1.09375,-0.09375zM36.25,5.34375l-17.3125,19.25l-8.28125,-7.34375l-1.3125,1.5l9,8l0.75,0.65625l0.65625,-0.75l18,-20zM41,11v2h2c1.69922,0 3,1.30078 3,3v27c0,1.69922 -1.30078,3 -3,3h-27c-1.69922,0 -3,-1.30078 -3,-3v-2h-2v2c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-27c0,-2.80078 -2.19922,-5 -5,-5z" />
                                        </g>
                                      </g>
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20" height="20">
                                      <g fill="#40c057" fillRule="nonzero">
                                        <g transform="scale(5.12,5.12)">
                                          <path d="M7,2c-2.80078,0 -5,2.19922 -5,5v27c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-27c0,-0.5 -0.08594,-1 -0.1875,-1.5l-19.71875,21.90625l-9.6875,-8.71875l1.28125,-1.5l8.3125,7.3125l18.6875,-20.8125c-0.89844,-1 -2.1875,-1.6875 -3.6875,-1.6875zM41,11v24c0,3.30078 -2.69922,6 -6,6h-24v2c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-27c0,-2.80078 -2.19922,-5 -5,-5z" />
                                        </g>
                                      </g>
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </th>
                            <th style={{ textAlign: 'center' }} className="w-1">
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>PDF 파일</span>

                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={handleSelectAllPdf}
                                  style={{
                                    fontSize: '1.5rem',
                                    padding: '2px 2px',
                                    lineHeight: '1'
                                  }}
                                  title={pdfSelectAll ? 'PDF 선택 해제' : 'PDF 전체 선택'}
                                >
                                  {pdfSelectAll ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20" height="20">
                                      <g fill="#dc3545" fillRule="nonzero">
                                        <g transform="scale(5.12,5.12)">
                                          <path d="M7,2c-2.80078,0 -5,2.19922 -5,5v27c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-24.1875l-2,2.1875v22c0,1.69922 -1.30078,3 -3,3h-27c-1.69922,0 -3,-1.30078 -3,-3v-27c0,-1.69922 1.30078,-3 3,-3h26.40625l1.6875,-1.90625c-0.39844,0 -0.69531,-0.09375 -1.09375,-0.09375zM36.25,5.34375l-17.3125,19.25l-8.28125,-7.34375l-1.3125,1.5l9,8l0.75,0.65625l0.65625,-0.75l18,-20zM41,11v2h2c1.69922,0 3,1.30078 3,3v27c0,1.69922 -1.30078,3 -3,3h-27c-1.69922,0 -3,-1.30078 -3,-3v-2h-2v2c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-27c0,-2.80078 -2.19922,-5 -5,-5z" />
                                        </g>
                                      </g>
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20" height="20">
                                      <g fill="#dc3545" fillRule="nonzero">
                                        <g transform="scale(5.12,5.12)">
                                          <path d="M7,2c-2.80078,0 -5,2.19922 -5,5v27c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-27c0,-0.5 -0.08594,-1 -0.1875,-1.5l-19.71875,21.90625l-9.6875,-8.71875l1.28125,-1.5l8.3125,7.3125l18.6875,-20.8125c-0.89844,-1 -2.1875,-1.6875 -3.6875,-1.6875zM41,11v24c0,3.30078 -2.69922,6 -6,6h-24v2c0,2.80078 2.19922,5 5,5h27c2.80078,0 5,-2.19922 5,-5v-27c0,-2.80078 -2.19922,-5 -5,-5z" />
                                        </g>
                                      </g>
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </th>
                            <th style={{ textAlign: 'center' }} className="w-1">
                              <div style={{textAlign: 'left'}}>
                              <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={handleBulkDownload}
                                    disabled={selectedExcelIds.length === 0 && selectedPdfIds.length === 0}
                                    title="선택된 파일 일괄다운로드"
                                  >
                                    일괄다운로드
                                  </button>
                                  </div>
                                  작업
                            </th>
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
                              <td data-label="팩스번호" style={{ textAlign: 'center' }}>
                                {invoice.fax_number ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => {
                                      if (invoice.fax_number) {
                                        navigator.clipboard.writeText(invoice.fax_number);
                                        alert(`팩스번호가 복사되었습니다: ${invoice.fax_number}`);
                                      }
                                    }}
                                    title="클릭하여 팩스번호 복사"
                                  >
                                    {invoice.fax_number}
                                  </button>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td data-label="발행일" style={{ textAlign: 'center' }}>
                                {new Date(invoice.issue_date).toLocaleDateString()}
                              </td>
                              <td data-label="SR" style={{ textAlign: 'center' }}>
                                {invoice.service_report_id ? (
                                  <button
                                    className="btn btn-sm btn-ghost-primary"
                                    onClick={() => handleViewServiceReport(invoice.service_report_id!)}
                                    disabled={loadingServiceReport}
                                    title="서비스 리포트 보기"
                                    style={{
                                      padding: '4px 8px',
                                      minWidth: 'auto'
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                      <polyline points="14 2 14 8 20 8"></polyline>
                                      <line x1="12" y1="18" x2="12" y2="12"></line>
                                      <line x1="9" y1="15" x2="15" y2="15"></line>
                                    </svg>
                                  </button>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td data-label="Invoice Code" style={{ textAlign: 'center' }}>
                                {invoice.invoice_code || '-'}
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
                              <td data-label="Excel 파일" className="text-center" >
                                {invoice.has_excel !== false ? (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedExcelIds.includes(invoice.id)}
                                      onChange={() => toggleSelectExcel(invoice.id)}
                                    />
                                    <span
                                      onClick={() => handleDownloadExcel(invoice.customer_name)}
                                      className="badge"
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        backgroundColor: '#ffffffff',
                                        border: '1px solid #009714ff',
                                        color: '#00ac17d2'
                                      }}
                                      title="Excel 파일 다운로드"
                                    >
                                      .xlsx
                                    </span>
                                  </label>
                                ) : (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
                                    <input type="checkbox" disabled />
                                    <span className="badge bg-secondary" style={{ color: '#ffffff', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }} title="Excel 파일 없음">N/A</span>
                                  </label>
                                )}
                              </td>
                              <td data-label="PDF 파일" className="text-center">
                                {invoice.has_pdf !== false ? (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedPdfIds.includes(invoice.id)}
                                      onChange={() => toggleSelectPdf(invoice.id)}
                                    />
                                    <span
                                      onClick={() => handleDownloadPDF(invoice.customer_name, invoice.invoice_number)}
                                      className="badge"
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.5rem',
                                        backgroundColor: '#ffffffff',
                                        border: '1px solid #ff0000ff',
                                        color: '#ff0000ff'
                                      }}
                                      title="PDF 파일 다운로드"
                                    >
                                      .pdf
                                    </span>
                                  </label>
                                ) : (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.5}}>
                                    <input type="checkbox" disabled />
                                    <span className="badge bg-secondary" style={{ color: '#ffffff', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }} title="PDF 파일 없음">N/A</span>
                                  </label>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="d-flex gap-1 justify-content-center">
                                  {(user?.transaction_access && (user?.transaction_read || user?.is_admin)) && (
                                    <>
                                      {/* 상세보기 버튼: PDF 파일을 새 창에서 보기 */}
                                      {invoice.has_pdf !== false ? (
                                        <button
                                          onClick={() => handleViewPDF(invoice.customer_name, invoice.invoice_number)}
                                          className="btn btn-sm btn-outline-info"
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            padding: '0'
                                          }}
                                          title="상세보기 (PDF)"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                          </svg>
                                        </button>
                                      ) : (
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
                                          disabled
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            padding: '0',
                                            opacity: 0.5
                                          }}
                                          title="PDF 파일 없음"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                          </svg>
                                        </button>
                                      )}
                                    </>
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
                                        backgroundColor: 'transparent',
                                        border: '1px solid #198754',
                                        color: '#198754',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#198754';
                                        e.currentTarget.style.color = '#ffffff';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
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
                                  {/* Fax Button - 비활성화됨 (팩스번호 컬럼에서 복사 기능 사용) */}
                                  {/* <button
                                    className="btn btn-sm btn-outline-info"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '32px',
                                      height: '32px',
                                      padding: '0'
                                    }}
                                    onClick={() => handleSendFax(invoice)}
                                    disabled={invoice.has_pdf === false}
                                    title={invoice.has_pdf === false ? 'PDF 파일이 생성되지 않았습니다' : '팩스 전송'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                                    </svg>
                                  </button> */}
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

      {/* Fax Sending Modal - 비활성화됨 (팩스번호 복사 기능으로 대체) */}
      {/*
      {showFaxModal && faxInvoice && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          data-bs-backdrop="static"
          data-bs-keyboard="false"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-printer me-2"></i>
                  팩스 전송
                </h5>
                {!faxSending && (
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowFaxModal(false);
                      setFaxInvoice(null);
                    }}
                  ></button>
                )}
              </div>
              <div className="modal-body text-center">
                <p>팩스 앱을 열고 팩스 전송을 준비하시겠습니까?</p>
                <div className="alert alert-info">
                  <strong>거래명세표 번호:</strong> {faxInvoice.invoice_number}<br />
                  <strong>고객명:</strong> {faxInvoice.customer_name}<br />
                  <strong>팩스번호:</strong> {faxNumber ? faxNumber : <span className="text-danger">등록된 팩스번호 없음</span>}
                </div>
                {!faxNumber && (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    팩스번호가 등록되지 않았습니다. 고객 정보에서 팩스번호를 먼저 등록해주세요.
                  </div>
                )}
                {faxNumber && !faxSending && (
                  <div className="alert alert-success">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>사용 방법:</strong><br />
                    1. "전송 준비" 버튼 클릭<br />
                    2. 팩스 앱이 자동으로 열립니다<br />
                    3. 팩스번호가 클립보드에 복사됩니다<br />
                    4. 팩스 앱에서 Ctrl+V로 번호 붙여넣기<br />
                    5. 전송 버튼 클릭
                  </div>
                )}

                {faxSending && (
                  <div className="mt-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">준비 중...</span>
                    </div>
                    <p className="mt-3 text-muted">팩스 앱을 여는 중...</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {!faxSending ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowFaxModal(false);
                        setFaxInvoice(null);
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={confirmSendFax}
                      disabled={!faxNumber}
                    >
                      <i className="bi bi-printer me-2"></i>
                      전송 준비
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-secondary" disabled>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    준비 중...
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      */}

      {/* 서비스 리포트 상세 모달 */}
      {showServiceReportModal && (
        <>
          <div
            className="modal fade show"
            style={{display: 'block', zIndex: 1050}}
            onClick={(e) => {
              // 모달 배경 클릭시 닫기
              if (e.target === e.currentTarget) {
                setShowServiceReportModal(false);
                setServiceReportData(null);
              }
            }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">서비스 리포트 상세 보기</h5>
                  <div className="ms-auto">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        setShowServiceReportModal(false);
                        setServiceReportData(null);
                        setSelectedServiceReportId(null);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="modal-body">
                  {loadingServiceReport ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">로딩 중...</span>
                      </div>
                      <div className="mt-3">서비스 리포트를 불러오는 중...</div>
                    </div>
                  ) : serviceReportData ? (
                    <>
                      {/* 기본 정보 - 표 형태 */}
                      <div className="mb-4">
                    <h5 className="mb-3">기본 정보</h5>
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <tbody>
                          <tr>
                            <td className="bg-light fw-bold" style={{width: '120px'}}>서비스 날짜</td>
                            <td className="bg-white" style={{width: '150px'}}>
                              {serviceReportData.service_date ? new Date(serviceReportData.service_date).toLocaleDateString('ko-KR') : '-'}
                            </td>
                            <td className="bg-light fw-bold" style={{width: '100px'}}>서비스담당</td>
                            <td className="bg-white" style={{width: '120px'}}>{serviceReportData.technician_name || '-'}</td>
                          </tr>
                          <tr>
                            <td className="bg-light fw-bold">고객명</td>
                            <td className="bg-white" colSpan={3}>{serviceReportData.customer_name || '-'}</td>
                          </tr>
                          <tr>
                            <td className="bg-light fw-bold">Model</td>
                            <td className="bg-white">{serviceReportData.machine_model || serviceReportData.equipment_model || '-'}</td>
                            <td className="bg-light fw-bold">SN</td>
                            <td className="bg-white">{serviceReportData.machine_serial || serviceReportData.equipment_serial || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 작업 내용 정보 - 표 형태 */}
                  <div className="mb-4">
                    <h5 className="mb-3">작업 내용</h5>
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <tbody>
                          <tr>
                            <td className="bg-light fw-bold" style={{width: '150px', verticalAlign: 'top'}}>Job Description</td>
                            <td className="bg-white">
                              <div style={{minHeight: '80px', whiteSpace: 'pre-wrap', padding: '8px 0'}}>
                                {serviceReportData.problem_description || serviceReportData.symptom || '-'}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="bg-light fw-bold" style={{verticalAlign: 'top'}}>처리 내용</td>
                            <td className="bg-white">
                              <div style={{minHeight: '100px', whiteSpace: 'pre-wrap', padding: '8px 0'}}>
                                {serviceReportData.solution_description || serviceReportData.details || serviceReportData.work_description || '-'}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 사용부품 내역 */}
                  {serviceReportData.parts && serviceReportData.parts.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">사용부품 내역</h5>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>부품명</th>
                              <th>부품번호</th>
                              <th>수량</th>
                              <th>단가</th>
                              <th>총액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serviceReportData.parts.map((part: any, index: number) => (
                              <tr key={index}>
                                <td className="bg-white">{part.part_name || '-'}</td>
                                <td className="bg-white">{part.part_number || '-'}</td>
                                <td className="bg-white text-center">{part.quantity || '-'}</td>
                                <td className="bg-white text-end">{typeof part.unit_price === 'number' ? part.unit_price.toLocaleString() : '0'}</td>
                                <td className="bg-white text-end fw-bold">{typeof part.total_price === 'number' ? part.total_price.toLocaleString() : '0'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 시간 기록부 (테이블 형태) */}
                  {serviceReportData.time_records && serviceReportData.time_records.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">작업/이동 시간 기록부</h5>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center" style={{width: '100px'}}>날짜</th>
                              <th className="text-center" style={{width: '90px'}}>출발시간</th>
                              <th className="text-center" style={{width: '90px'}}>작업시작</th>
                              <th className="text-center" style={{width: '90px'}}>작업종료</th>
                              <th className="text-center" style={{width: '90px'}}>이동종료</th>
                              <th className="text-center" style={{width: '100px'}}>식사시간<br/><small>(작업)</small></th>
                              <th className="text-center" style={{width: '100px'}}>식사시간<br/><small>(이동)</small></th>
                              <th className="text-center text-primary" style={{width: '90px'}}>작업시간</th>
                              <th className="text-center text-primary" style={{width: '90px'}}>이동시간</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serviceReportData.time_records.map((record: any, index: number) => (
                              <tr key={index}>
                                <td className="bg-white text-center">{record.date || record.work_date ? new Date(record.date || record.work_date).toLocaleDateString('ko-KR') : '-'}</td>
                                <td className="bg-white text-center">{record.departure_time || '-'}</td>
                                <td className="bg-white text-center">{record.work_start_time || '-'}</td>
                                <td className="bg-white text-center">{record.work_end_time || '-'}</td>
                                <td className="bg-white text-center">{record.travel_end_time || '-'}</td>
                                <td className="bg-white text-center">{record.work_meal_time || '-'}</td>
                                <td className="bg-white text-center">{record.travel_meal_time || '-'}</td>
                                <td className="bg-white text-center text-primary fw-bold">
                                  {record.calculated_work_time || '-'}
                                </td>
                                <td className="bg-white text-center text-primary fw-bold">
                                  {record.calculated_travel_time || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <p>서비스 리포트 데이터를 불러올 수 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{zIndex: 1040}}></div>
        </>
      )}
    </>
  );
};

export default Invoices;