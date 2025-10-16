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
  }

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

  // 렌더링할 공급받는자용/공급자용 페이지 컴포넌트
  const InvoicePage = ({ type }: { type: 'recipient' | 'supplier' }) => (
    <div style={{
      border: '2px solid #000',
      backgroundColor: '#ffffff',
      width: '210mm',  // A4 width
      minHeight: '297mm', // A4 height
      margin: '0 auto',
      padding: '10mm',
      fontFamily: '"Malgun Gothic", "맑은 고딕", sans-serif',
      pageBreakAfter: type === 'recipient' ? 'always' : 'auto',
      boxSizing: 'border-box'
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #000', marginBottom: '5mm' }}>
        <div style={{
          width: '30mm',
          border: '1px solid #000',
          padding: '3mm',
          fontSize: '11pt',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>거래일자</div>
          <div style={{ fontSize: '10pt' }}>
            {new Date(invoice.issue_date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\./g, '.').replace(/\s/g, '')}
          </div>
        </div>

        <div style={{
          flex: 1,
          textAlign: 'center',
          padding: '5mm 0',
          fontSize: '20pt',
          fontWeight: 'bold',
          letterSpacing: '5mm'
        }}>
          거래명세표
        </div>

        <div style={{
          width: '30mm',
          border: '1px solid #000',
          padding: '3mm',
          fontSize: '10pt',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          ({type === 'recipient' ? '공급받는자용' : '공급자용'})
        </div>
      </div>

      {/* 공급자/공급받는자 정보 */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '10pt',
        marginBottom: '5mm'
      }}>
        <tbody>
          <tr>
            <td style={{
              border: '1px solid #000',
              padding: '3mm',
              textAlign: 'center',
              fontWeight: 'bold',
              width: '15%',
              backgroundColor: '#f0f0f0'
            }}>
              공급받는자
            </td>
            <td style={{ border: '1px solid #000', padding: '3mm', width: '35%' }}>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>상호: </span>
                <span>{invoice.customer_name}</span>
              </div>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>주소: </span>
                <span style={{ fontSize: '9pt' }}>{invoice.customer_address}</span>
              </div>
              <div style={{
                marginTop: '3mm',
                textAlign: 'center',
                fontSize: '14pt',
                fontWeight: 'bold',
                padding: '2mm',
                border: '2px solid #000'
              }}>
                합계금액: ₩{invoice.grand_total.toLocaleString()}
              </div>
            </td>
            <td style={{
              border: '1px solid #000',
              padding: '3mm',
              textAlign: 'center',
              fontWeight: 'bold',
              width: '15%',
              backgroundColor: '#f0f0f0'
            }}>
              공급자
            </td>
            <td style={{ border: '1px solid #000', padding: '3mm', width: '35%' }}>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>상호: </span>
                <span>LVD Korea (유)</span>
                <span style={{ marginLeft: '3mm', fontWeight: 'bold' }}>대표: </span>
                <span>이동호</span>
                <span style={{
                  marginLeft: '3mm',
                  fontSize: '9pt',
                  border: '1px solid #000',
                  padding: '1mm 2mm'
                }}>
                  인
                </span>
              </div>
              <div style={{ marginBottom: '2mm' }}>
                <span style={{ fontWeight: 'bold' }}>등록번호: </span>
                <span>122-86-12760</span>
              </div>
              <div style={{ marginBottom: '2mm', fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>주소: </span>
                <span>인천광역시 부평구 청천로 409-7</span>
              </div>
              <div style={{ fontSize: '9pt' }}>
                <span style={{ fontWeight: 'bold' }}>연락처: </span>
                <span>050-2345-7801 FAX: 050-2345-7816</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 항목 테이블 */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '10pt',
        marginBottom: '5mm'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '6%'
            }}>번호</th>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '8%'
            }}>월/일</th>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '12%'
            }}>품목</th>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '30%'
            }}>규격</th>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '10%'
            }}>수량</th>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '14%'
            }}>단가</th>
            <th style={{
              border: '1px solid #000',
              padding: '2mm',
              textAlign: 'center',
              width: '20%'
            }}>금액</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center'
              }}>
                {index + 1}
              </td>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                fontSize: '9pt'
              }}>
                {item.month && item.day ? `${item.month}/${item.day}` : ''}
              </td>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                fontSize: '9pt'
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
                fontSize: '9pt'
              }}>
                {item.description}
                {item.part_number && (
                  <span style={{ color: '#666', marginLeft: '2mm' }}>
                    ({item.part_number})
                  </span>
                )}
              </td>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'right'
              }}>
                {item.quantity}
              </td>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'right'
              }}>
                {item.unit_price.toLocaleString()}
              </td>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'right',
                fontWeight: item.item_type === 'nego' ? 'bold' : 'normal',
                color: item.item_type === 'nego' ? '#d9534f' : 'inherit'
              }}>
                {item.total_price.toLocaleString()}
              </td>
            </tr>
          ))}

          {/* 빈 행 추가 (최소 10행) */}
          {Array.from({ length: Math.max(0, 10 - invoice.items.length) }).map((_, index) => (
            <tr key={`empty-${index}`}>
              <td style={{
                border: '1px solid #000',
                padding: '2mm',
                textAlign: 'center',
                height: '8mm'
              }}>
                {invoice.items.length + index + 1}
              </td>
              <td style={{ border: '1px solid #000' }}></td>
              <td style={{ border: '1px solid #000' }}></td>
              <td style={{ border: '1px solid #000' }}></td>
              <td style={{ border: '1px solid #000' }}></td>
              <td style={{ border: '1px solid #000' }}></td>
              <td style={{ border: '1px solid #000' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 하단 비고 및 합계 */}
      <div style={{ display: 'flex', minHeight: '40mm' }}>
        {/* 비고 */}
        <div style={{
          flex: 1,
          border: '1px solid #000',
          borderRight: 'none',
          padding: '3mm'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '2mm' }}>
            비고
          </div>
          <div style={{
            fontSize: '9pt',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap'
          }}>
            {invoice.notes || '특이사항 없음'}
          </div>
        </div>

        {/* 합계 */}
        <div style={{ width: '50mm' }}>
          <table style={{
            width: '100%',
            height: '100%',
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
                  backgroundColor: '#f0f0f0'
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
                  backgroundColor: '#f0f0f0'
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
                  fontSize: '12pt',
                  backgroundColor: '#e0e0e0'
                }}>
                  총합계
                </td>
                <td style={{
                  border: '2px solid #000',
                  padding: '3mm',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  fontSize: '14pt',
                  color: '#0066cc'
                }}>
                  {invoice.grand_total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
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
        <div className="container-xl d-print-none">
          <div className="row justify-content-center" style={{ gap: '20px' }}>
            <InvoicePage type="recipient" />
            <InvoicePage type="supplier" />
          </div>
        </div>

        {/* 인쇄 시에는 페이지 브레이크로 분리 */}
        <div className="d-none d-print-block">
          <InvoicePage type="recipient" />
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
