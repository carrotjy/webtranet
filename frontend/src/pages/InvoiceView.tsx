import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

interface InvoiceItem {
  id: number;
  item_type: 'work' | 'travel' | 'parts';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceData {
  id: number;
  service_report_id?: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_address: string;
  issue_date: string;
  due_date: string;
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
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const fetchInvoice = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data);
    } catch (error) {
      console.error('거래명세표 조회 실패:', error);
      alert('거래명세표를 불러오는데 실패했습니다.');
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
      <div className="page-body">
        <div className="container-xl">
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">로딩 중...</span>
            </div>
            <p className="mt-3">거래명세표를 불러오고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page-body">
        <div className="container-xl">
          <div className="text-center py-5">
            <h3>거래명세표를 찾을 수 없습니다.</h3>
            <Link to="/invoices" className="btn btn-primary mt-3">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header d-print-none">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="page-pretitle">거래명세표</div>
              <h2 className="page-title">거래명세표 상세보기</h2>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <Link 
                  to="/invoices"
                  className="btn btn-outline-secondary"
                >
                  목록으로
                </Link>
                <Link 
                  to={`/invoices/${invoice.id}/edit`}
                  className="btn btn-outline-primary"
                >
                  수정
                </Link>
                <button 
                  className="btn btn-primary"
                  onClick={handlePrint}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
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

      <div className="page-body">
        <div className="container-xl">
          <div className="row justify-content-center">
            <div className="col-12">
              
              {/* 첫 번째 페이지 - 공급받는자용 */}
              <div className="card">
                <div className="card-body p-0">
                  
                  <div style={{ 
                    border: '2px solid #000', 
                    backgroundColor: '#ffffff',
                    minHeight: '842px', // A4 높이
                    width: '100%',
                    maxWidth: '595px', // A4 너비
                    margin: '0 auto',
                    fontFamily: '"Malgun Gothic", sans-serif'
                  }}>
                    
                    {/* 상단 헤더 */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                      {/* 좌측 작성일자 */}
                      <div style={{ 
                        width: '120px',
                        border: '1px solid #000',
                        padding: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px' }}>
                          거래일자
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '10px' }}>
                          {new Date(invoice.issue_date).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      
                      {/* 중앙 제목 */}
                      <div style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '15px',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        letterSpacing: '3px'
                      }}>
                        거래명세표
                      </div>
                      
                      {/* 우측 구분 */}
                      <div style={{ 
                        width: '120px',
                        border: '1px solid #000',
                        padding: '8px',
                        fontSize: '11px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        (공급받는자용)
                      </div>
                    </div>

                    {/* 공급받는자/공급자 정보 테이블 */}
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '11px',
                      marginBottom: '0'
                    }}>
                      <tr>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          width: '15%'
                        }}>공급받는자</td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          width: '35%'
                        }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>상호(법인명): </span>
                            <span>{invoice.customer_name}</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>사업장주소: </span>
                            <span>{invoice.customer_address}</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>전화번호: </span>
                            <span>TEL: 055-338-5456  FAX: 055-338-5566</span>
                          </div>
                          <div style={{ 
                            marginTop: '8px',
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            padding: '4px',
                            border: '2px solid #000'
                          }}>
                            합계금액: ₩{invoice.grand_total.toLocaleString()}
                          </div>
                        </td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          width: '15%'
                        }}>공급자</td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          width: '35%'
                        }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>상호(법인명): </span>
                            <span>LVD Korea (유)</span>
                            <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>대표: </span>
                            <span>이동호</span>
                            <span style={{ marginLeft: '10px', fontSize: '12px', border: '1px solid #000', padding: '2px 6px' }}>
                              인
                            </span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>등록번호: </span>
                            <span>122-86-12760</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>사업장주소: </span>
                            <span>인천광역시 부평구 청천로 409-7</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>전화번호: </span>
                            <span>050-2345-7801  FAX: 050-2345-7816</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    {/* 항목 테이블 */}
                    <div style={{ borderBottom: '2px solid #000' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '13px'
                      }}>
                        <thead>
                          <tr>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '10px', 
                              textAlign: 'center',
                              width: '8%',
                              fontWeight: 'bold'
                            }}>번호</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '10px', 
                              textAlign: 'center',
                              width: '42%',
                              fontWeight: 'bold'
                            }}>품목</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '10px', 
                              textAlign: 'center',
                              width: '15%',
                              fontWeight: 'bold'
                            }}>수량</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '10px', 
                              textAlign: 'center',
                              width: '15%',
                              fontWeight: 'bold'
                            }}>단가</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '10px', 
                              textAlign: 'center',
                              width: '20%',
                              fontWeight: 'bold'
                            }}>금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item, index) => (
                            <tr key={index}>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px', 
                                textAlign: 'center' 
                              }}>
                                {index + 1}
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px' 
                              }}>
                                {item.description}
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                textAlign: 'right'
                              }}>
                                {item.quantity}
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                textAlign: 'right'
                              }}>
                                {item.unit_price.toLocaleString()}
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                textAlign: 'right',
                                fontWeight: 'bold'
                              }}>
                                {item.total_price.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          
                          {/* 빈 행 추가 (최소 10행 보장) */}
                          {[...Array(Math.max(0, 10 - invoice.items.length))].map((_, index) => (
                            <tr key={`empty-${index}`}>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px', 
                                textAlign: 'center',
                                height: '32px'
                              }}>
                                {invoice.items.length + index + 1}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 하단 합계 */}
                    <div style={{ display: 'flex', minHeight: '200px' }}>
                      
                      {/* 왼쪽 - 비고 */}
                      <div style={{ 
                        flex: '1', 
                        borderRight: '2px solid #000',
                        padding: '15px'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>
                          비고
                        </div>
                        <div style={{
                          fontSize: '13px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {invoice.notes || '특이사항 없음'}
                        </div>
                      </div>

                      {/* 오른쪽 - 합계 */}
                      <div style={{ 
                        width: '220px',
                        padding: '15px'
                      }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '15px'
                        }}>
                          <tbody>
                            <tr>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '12px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                width: '40%'
                              }}>
                                공급가액
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '12px',
                                textAlign: 'right',
                                fontWeight: 'bold'
                              }}>
                                {invoice.total_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '12px',
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}>
                                세액
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '12px',
                                textAlign: 'right',
                                fontWeight: 'bold'
                              }}>
                                {invoice.vat_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ 
                                border: '2px solid #000', 
                                padding: '15px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                fontSize: '16px'
                              }}>
                                총합계
                              </td>
                              <td style={{ 
                                border: '2px solid #000', 
                                padding: '15px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                fontSize: '18px'
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
              </div>

              {/* 두 번째 페이지 - 공급자용 */}
              <div className="card mt-4">
                <div className="card-body p-0">
                  
                  <div style={{ 
                    border: '2px solid #000', 
                    backgroundColor: '#ffffff',
                    minHeight: '842px',
                    width: '100%',
                    maxWidth: '595px',
                    margin: '0 auto',
                    fontFamily: '"Malgun Gothic", sans-serif',
                    pageBreakBefore: 'always'
                  }}>
                    
                    {/* 상단 헤더 */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                      {/* 좌측 작성일자 */}
                      <div style={{ 
                        width: '120px',
                        border: '1px solid #000',
                        padding: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px' }}>
                          거래일자
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '10px' }}>
                          {new Date(invoice.issue_date).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      
                      {/* 중앙 제목 */}
                      <div style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '15px',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        letterSpacing: '3px'
                      }}>
                        거래명세표
                      </div>
                      
                      {/* 우측 구분 */}
                      <div style={{ 
                        width: '120px',
                        border: '1px solid #000',
                        padding: '8px',
                        fontSize: '11px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        (공급자용)
                      </div>
                    </div>

                    {/* 공급받는자/공급자 정보 테이블 */}
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '11px',
                      marginBottom: '0'
                    }}>
                      <tr>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          width: '15%'
                        }}>공급받는자</td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          width: '35%'
                        }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>상호(법인명): </span>
                            <span>{invoice.customer_name}</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>사업장주소: </span>
                            <span>{invoice.customer_address}</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>전화번호: </span>
                            <span>TEL: 055-338-5456  FAX: 055-338-5566</span>
                          </div>
                          <div style={{ 
                            marginTop: '8px',
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            padding: '4px',
                            border: '2px solid #000'
                          }}>
                            합계금액: ₩{invoice.grand_total.toLocaleString()}
                          </div>
                        </td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          width: '15%'
                        }}>공급자</td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '6px',
                          width: '35%'
                        }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>상호(법인명): </span>
                            <span>LVD Korea (유)</span>
                            <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>대표: </span>
                            <span>이동호</span>
                            <span style={{ marginLeft: '10px', fontSize: '12px', border: '1px solid #000', padding: '2px 6px' }}>
                              인
                            </span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>등록번호: </span>
                            <span>122-86-12760</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>사업장주소: </span>
                            <span>인천광역시 부평구 청천로 409-7</span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>전화번호: </span>
                            <span>050-2345-7801  FAX: 050-2345-7816</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    {/* 항목 테이블 - 읽기 전용 */}
                    <div style={{ borderBottom: '2px solid #000' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '12px'
                      }}>
                        <thead>
                          <tr>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '10%' }}>번호</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '40%' }}>품목</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '15%' }}>수량</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '15%' }}>단가</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '20%' }}>금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item, index) => (
                            <tr key={index}>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                                {index + 1}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}>
                                {item.description}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>
                                {item.quantity}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>
                                {item.unit_price.toLocaleString()}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                                {item.total_price.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          {/* 빈 행들 */}
                          {[...Array(Math.max(0, 10 - invoice.items.length))].map((_, index) => (
                            <tr key={`empty-${index}`}>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', height: '30px' }}>
                                {invoice.items.length + index + 1}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 하단 합계 - 읽기 전용 */}
                    <div style={{ display: 'flex' }}>
                      <div style={{ flex: '1', borderRight: '2px solid #000', padding: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
                          비고
                        </div>
                        <div style={{ fontSize: '12px', minHeight: '60px' }}>
                          {invoice.notes || '특이사항 없음'}
                        </div>
                      </div>
                      
                      <div style={{ width: '200px', padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>
                                공급가액
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                                {invoice.total_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>
                                세액
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                                {invoice.vat_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '2px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center', fontSize: '16px' }}>
                                총합계
                              </td>
                              <td style={{ border: '2px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                                {invoice.grand_total.toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          .page-header,
          .btn,
          .card {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .page-body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .container-xl {
            max-width: none !important;
            padding: 0 !important;
          }
          
          .card-body {
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
};

export default InvoiceView;