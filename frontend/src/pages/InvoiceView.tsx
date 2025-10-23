import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../services/api';

interface InvoiceItem {
  id: number;
  item_type: 'work' | 'travel' | 'parts' | 'nego';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  month?: number;
  day?: number;
  item_name?: string;
  part_number?: string;
}

interface InvoiceData {
  id: number;
  service_report_id?: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_address: string;
  issue_date: string;
  due_date?: string;
  work_subtotal: number;
  travel_subtotal: number;
  parts_subtotal: number;
  total_amount: number;
  vat_amount: number;
  grand_total: number;
  notes: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

const InvoiceView: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const fetchInvoice = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);
      const response = await invoiceAPI.getInvoiceById(parseInt(invoiceId));
      setInvoice(response.data);
    } catch (error) {
      console.error('거래명세표 조회 실패:', error);
      alert('거래명세표를 불러오는데 실패했습니다.');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="page page-center">
        <div className="container-tight py-4">
          <div className="text-center">
            <div className="mb-3">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
            <div className="text-muted mb-3">거래명세표를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  };

  if (!invoice) {
    return (
      <div className="page page-center">
        <div className="container-tight py-4">
          <div className="text-center">
            <h3>거래명세표를 찾을 수 없습니다.</h3>
            <Link to="/invoices" className="btn btn-primary mt-3">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Excel 양식 기반 거래명세표 페이지
  const InvoicePage = ({ type }: { type: 'customer' | 'supplier' }) => (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '15mm 10mm',
      backgroundColor: 'white',
      fontFamily: '"Malgun Gothic", "맑은 고딕", sans-serif',
      fontSize: '10pt',
      pageBreakAfter: type === 'customer' ? 'always' : 'auto',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* 전체를 감싸는 테두리 */}
      <div style={{
        border: '2px solid #000',
        padding: '5mm',
        minHeight: '260mm'
      }}>
        {/* 상단 헤더 영역 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60mm 1fr 40mm',
          marginBottom: '3mm',
          gap: '2mm'
        }}>
          {/* 작성일자 */}
          <div style={{
            border: '1px solid #000',
            padding: '3mm',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '9pt', marginBottom: '1mm' }}>작성일자</div>
            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
              {new Date(invoice.issue_date).toLocaleDateString('ko-KR')}
            </div>
          </div>

          {/* 제목 */}
          <div style={{
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h1 style={{
              fontSize: '24pt',
              fontWeight: 'bold',
              letterSpacing: '8mm',
              margin: 0
            }}>거래명세표</h1>
          </div>

          {/* 구분 (공급받는자용/공급자용) */}
          <div style={{
            border: '1px solid #000',
            padding: '3mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9pt'
          }}>
            ({type === 'customer' ? '공급받는자용' : '공급자용'})
          </div>
        </div>

        {/* 공급받는자/공급자 정보 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3mm',
          marginBottom: '5mm'
        }}>
          {/* 공급받는자 */}
          <div style={{ border: '1px solid #000' }}>
            <div style={{
              backgroundColor: '#e8e8e8',
              padding: '2mm',
              borderBottom: '1px solid #000',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              공급받는자
            </div>
            <div style={{ padding: '3mm' }}>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>회사명:</span> {invoice.customer_name}
              </div>
              <div style={{ marginBottom: '2mm', fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>주소:</span> {invoice.customer_address || '-'}
              </div>
              <div style={{ fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>연락처:</span> -
              </div>
            </div>
            {/* 합계금액 */}
            <div style={{
              marginTop: '3mm',
              padding: '5mm',
              borderTop: '2px solid #000',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '2mm' }}>
                합계금액
              </div>
              <div style={{
                fontSize: '18pt',
                fontWeight: 'bold',
                color: '#000',
                border: '2px solid #000',
                padding: '3mm',
                backgroundColor: '#f5f5f5'
              }}>
                ₩ {invoice.grand_total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 공급자 */}
          <div style={{ border: '1px solid #000' }}>
            <div style={{
              backgroundColor: '#e8e8e8',
              padding: '2mm',
              borderBottom: '1px solid #000',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              공급자
            </div>
            <div style={{ padding: '3mm' }}>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>회사명:</span> LVD Korea (유)
                <span style={{
                  marginLeft: '5mm',
                  border: '1px solid #000',
                  padding: '1mm 3mm',
                  fontSize: '9pt'
                }}>
                  인
                </span>
              </div>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>대표자:</span> 이동호
              </div>
              <div style={{ marginBottom: '2mm', fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>사업자등록번호:</span> 122-86-12760
              </div>
              <div style={{ marginBottom: '2mm', fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>주소:</span> 인천광역시 부평구 청천로 409-7
              </div>
              <div style={{ fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>전화:</span> 050-2345-7801
                <span style={{ marginLeft: '3mm', fontWeight: 'bold' }}>FAX:</span> 050-2345-7816
              </div>
            </div>
          </div>
        </div>

        {/* 항목 테이블 */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '9pt',
          marginBottom: '3mm'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8' }}>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '5%',
                fontWeight: 'bold'
              }}>월</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '5%',
                fontWeight: 'bold'
              }}>일</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '15%',
                fontWeight: 'bold'
              }}>품목</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '25%',
                fontWeight: 'bold'
              }}>규격</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '8%',
                fontWeight: 'bold'
              }}>수량</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '14%',
                fontWeight: 'bold'
              }}>단가</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '14%',
                fontWeight: 'bold'
              }}>공급가액</th>
              <th style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                width: '14%',
                fontWeight: 'bold'
              }}>부가세</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const vat = Math.round(item.total_price * 0.1);
              const isNego = item.item_type === 'nego' || item.item_name === 'NEGO';

              return (
                <tr key={index} style={{ color: isNego ? '#ff0000' : 'inherit' }}>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'center',
                    fontSize: '8pt'
                  }}>
                    {item.month || ''}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'center',
                    fontSize: '8pt'
                  }}>
                    {item.day || ''}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    fontSize: '8pt'
                  }}>
                    {item.item_name || (
                      item.item_type === 'work' ? '작업' :
                      item.item_type === 'travel' ? '출장' :
                      item.item_type === 'nego' ? 'NEGO' :
                      '부품'
                    )}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    fontSize: '8pt'
                  }}>
                    {item.part_number || item.description || ''}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'right',
                    fontSize: '8pt'
                  }}>
                    {item.quantity || ''}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'right',
                    fontSize: '8pt'
                  }}>
                    {item.unit_price ? item.unit_price.toLocaleString() : ''}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'right',
                    fontSize: '8pt',
                    fontWeight: isNego ? 'bold' : 'normal'
                  }}>
                    {item.total_price ? item.total_price.toLocaleString() : ''}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'right',
                    fontSize: '8pt'
                  }}>
                    {vat ? vat.toLocaleString() : ''}
                  </td>
                </tr>
              );
            })}

            {/* 빈 행 추가 (최소 30행) */}
            {Array.from({ length: Math.max(0, 30 - invoice.items.length) }).map((_, index) => (
              <tr key={`empty-${index}`}>
                <td style={{ border: '1px solid #000', padding: '2mm', height: '6mm' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
                <td style={{ border: '1px solid #000' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 하단 합계 영역 */}
        <div style={{ display: 'flex', gap: '3mm' }}>
          {/* 비고 */}
          <div style={{
            flex: 1,
            border: '1px solid #000',
            padding: '3mm',
            minHeight: '30mm'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>비고</div>
            <div style={{ fontSize: '9pt', whiteSpace: 'pre-wrap' }}>
              {invoice.notes || ''}
            </div>
          </div>

          {/* 합계 테이블 */}
          <div style={{ width: '80mm' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10pt'
            }}>
              <tbody>
                <tr>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: '#e8e8e8',
                    width: '40%'
                  }}>
                    공급가액
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'right',
                    fontWeight: 'bold'
                  }}>
                    {invoice.total_amount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: '#e8e8e8'
                  }}>
                    세액
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '2mm',
                    textAlign: 'right',
                    fontWeight: 'bold'
                  }}>
                    {invoice.vat_amount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{
                    border: '2px solid #000',
                    padding: '3mm',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '11pt',
                    backgroundColor: '#d0d0d0'
                  }}>
                    총합계
                  </td>
                  <td style={{
                    border: '2px solid #000',
                    padding: '3mm',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    fontSize: '13pt'
                  }}>
                    {invoice.grand_total.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="d-print-none">
        <div className="page-header">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">
                  거래명세표 #{invoice.invoice_number}
                </h2>
                <div className="text-muted mt-1">
                  발행일: {new Date(invoice.issue_date).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <div className="col-auto ms-auto">
                <div className="btn-list">
                  <Link to="/invoices" className="btn btn-ghost-secondary">
                    목록으로
                  </Link>
                  <Link to={`/invoices/${invoice.id}/edit`} className="btn btn-outline-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/>
                      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/>
                      <path d="M16 5l3 3"/>
                    </svg>
                    수정
                  </Link>
                  <button className="btn btn-primary" onClick={handlePrint}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <path d="M17 17h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h2"/>
                      <path d="M17 9v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4"/>
                      <rect x="7" y="13" width="10" height="8" rx="2"/>
                    </svg>
                    인쇄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl d-print-none" style={{ maxWidth: '100%' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center'
          }}>
            <InvoicePage type="customer" />
            <InvoicePage type="supplier" />
          </div>
        </div>

        {/* 인쇄 시에는 페이지 브레이크로 분리 */}
        <div className="d-none d-print-block">
          <InvoicePage type="customer" />
          <InvoicePage type="supplier" />
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .page-header,
          .d-print-none {
            display: none !important;
          }

          .d-print-block {
            display: block !important;
          }

          .page-body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .container-xl {
            max-width: none !important;
            padding: 0 !important;
          }
        }

        @media screen {
          .d-print-block {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default InvoiceView;
