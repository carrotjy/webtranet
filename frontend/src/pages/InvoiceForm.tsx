import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Customer {
  id: number;
  company_name: string;
  contact_person: string;
  address: string;
  phone: string;
  email: string;
}

interface InvoiceItem {
  id?: number;
  item_type: 'work' | 'travel' | 'parts';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceData {
  id?: number;
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
}

const InvoiceForm: React.FC = () => {
  const params = useParams<{ serviceReportId?: string; invoiceId?: string }>();
  const serviceReportId = params.serviceReportId;
  const invoiceId = params.invoiceId;
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 고객 검색 관련 상태
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoice_number: '',
    customer_id: 0,
    customer_name: '',
    customer_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    work_subtotal: 0,
    travel_subtotal: 0,
    parts_subtotal: 0,
    total_amount: 0,
    vat_amount: 0,
    grand_total: 0,
    notes: '',
    items: []
  });

  // 기존 인보이스 로드
  const loadExistingInvoice = async () => {
    if (!invoiceId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoiceData(response.data);
    } catch (error) {
      console.error('거래명세표 로드 실패:', error);
      alert('거래명세표를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 서비스 리포트 기반 거래명세표 생성
  const createInvoiceFromServiceReport = async () => {
    if (!serviceReportId) return;
    
    try {
      setLoading(true);
      const response = await api.post(`/invoices/from-service-report/${serviceReportId}`);
      
      if (response.data.invoice_id) {
        // 생성된 거래명세표 조회
        const invoiceResponse = await api.get(`/invoices/${response.data.invoice_id}`);
        setInvoiceData(invoiceResponse.data);
      }
    } catch (error) {
      console.error('거래명세표 생성 실패:', error);
      alert('거래명세표 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 거래명세표 저장
  const saveInvoice = async () => {
    // 필수 필드 검증
    if (!invoiceData.customer_id || !invoiceData.customer_name.trim()) {
      alert('고객 정보를 입력해주세요.');
      return;
    }

    if (!invoiceData.issue_date) {
      alert('발행일을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      
      if (invoiceData.id) {
        // 수정
        await api.put(`/invoices/${invoiceData.id}`, invoiceData);
        alert('거래명세표가 수정되었습니다.');
      } else {
        // 새로 생성
        const response = await api.post('/invoices', invoiceData);
        alert('거래명세표가 생성되었습니다.');
      }
      
      // 목록으로 이동
      navigate('/invoices');
    } catch (error) {
      console.error('거래명세표 저장 실패:', error);
      alert('거래명세표 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 항목 수정
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoiceData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // 총가격 자동 계산
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setInvoiceData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    calculateTotals(updatedItems);
  };

  // 합계 계산
  const calculateTotals = (items: InvoiceItem[]) => {
    let workSubtotal = 0;
    let travelSubtotal = 0;
    let partsSubtotal = 0;

    items.forEach(item => {
      switch (item.item_type) {
        case 'work':
          workSubtotal += item.total_price;
          break;
        case 'travel':
          travelSubtotal += item.total_price;
          break;
        case 'parts':
          partsSubtotal += item.total_price;
          break;
      }
    });

    const totalAmount = workSubtotal + travelSubtotal + partsSubtotal;
    const vatAmount = Math.round(totalAmount * 0.1);
    const grandTotal = totalAmount + vatAmount;

    setInvoiceData(prev => ({
      ...prev,
      work_subtotal: workSubtotal,
      travel_subtotal: travelSubtotal,
      parts_subtotal: partsSubtotal,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      grand_total: grandTotal
    }));
  };

  // 새 항목 추가
  const addItem = (itemType: 'work' | 'travel' | 'parts') => {
    const newItem: InvoiceItem = {
      item_type: itemType,
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    };
    
    const updatedItems = [...invoiceData.items, newItem];
    setInvoiceData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    calculateTotals(updatedItems);
  };

  // 항목 삭제
  const removeItem = (index: number) => {
    const updatedItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    calculateTotals(updatedItems);
  };

  // 고객 검색 함수
  const searchCustomers = async (searchTerm: string) => {
    if (searchTerm.length < 1) {
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
      return;
    }

    try {
      console.log('searchCustomers: API 호출 시작, 검색어:', searchTerm);
      const response = await api.get('/customers');
      console.log('searchCustomers: API 응답:', response.data);
      
      const allCustomers = response.data?.customers || response.data || [];
      console.log('searchCustomers: 전체 고객 수:', allCustomers.length);
      
      const filteredCustomers = allCustomers.filter((customer: Customer) =>
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('searchCustomers: 필터링된 고객 수:', filteredCustomers.length);
      
      setCustomerSearchResults(filteredCustomers);
      setShowCustomerSearch(true);
    } catch (error) {
      console.error('고객 검색 실패:', error);
    }
  };

  // 전체 고객 리스트 표시
  const showAllCustomers = async () => {
    try {
      console.log('showAllCustomers: API 호출 시작');
      const response = await api.get('/customers');
      console.log('showAllCustomers: API 응답:', response.data);
      
      const allCustomers = response.data?.customers || response.data || [];
      console.log('showAllCustomers: 추출된 고객 수:', allCustomers.length);
      
      // 임시 테스트: 하드코딩된 데이터 추가
      if (allCustomers.length === 0) {
        console.log('showAllCustomers: 고객 데이터가 없어서 테스트 데이터 사용');
        const testCustomers = [
          { id: 1, company_name: '테스트회사1', contact_person: '김담당', address: '서울시', phone: '010-1234-5678', email: 'test1@test.com' },
          { id: 2, company_name: '테스트회사2', contact_person: '이담당', address: '부산시', phone: '010-2345-6789', email: 'test2@test.com' }
        ];
        setCustomerSearchResults(testCustomers);
      } else {
        setCustomerSearchResults(allCustomers);
      }
      
      setShowCustomerSearch(true);
    } catch (error) {
      console.error('고객 목록 조회 실패:', error);
      // 에러 시에도 테스트 데이터 표시
      const testCustomers = [
        { id: 1, company_name: '테스트회사1', contact_person: '김담당', address: '서울시', phone: '010-1234-5678', email: 'test1@test.com' },
        { id: 2, company_name: '테스트회사2', contact_person: '이담당', address: '부산시', phone: '010-2345-6789', email: 'test2@test.com' }
      ];
      setCustomerSearchResults(testCustomers);
      setShowCustomerSearch(true);
    }
  };

  // 고객 선택
  const handleSelectCustomer = (customer: Customer) => {
    setInvoiceData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.company_name,
      customer_address: customer.address
    }));
    setShowCustomerSearch(false);
  };

  useEffect(() => {
    if (invoiceId) {
      // 기존 인보이스 수정
      loadExistingInvoice();
    } else if (serviceReportId) {
      // 서비스 리포트 기반 신규 생성
      createInvoiceFromServiceReport();
    }
  }, [serviceReportId, invoiceId]);

  if (loading) {
    return (
      <div className="page-body">
        <div className="container-xl">
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">로딩 중...</span>
            </div>
            <p className="mt-3">거래명세표를 생성하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle">거래명세표</div>
            <h2 className="page-title">
              {invoiceData.id ? '거래명세표 수정' : '거래명세표 작성'}
            </h2>
          </div>
          <div className="col-auto ms-auto d-print-none">
            <div className="btn-list">
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate(-1)}
              >
                취소
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveInvoice}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          <div className="row justify-content-center">
            <div className="col-12">
              
              {/* 거래명세표 양식 */}
              <div className="card">
                <div className="card-body p-0">
                  
                  {/* 첫 번째 페이지 - 공급받는자용 */}
                  <div style={{ 
                    border: '2px solid #000', 
                    backgroundColor: '#ffffff',
                    minHeight: '842px', // A4 높이
                    width: '100%',
                    maxWidth: '595px', // A4 너비
                    margin: '0 auto 20px auto',
                    fontFamily: '"Malgun Gothic", sans-serif',
                    pageBreakAfter: 'always'
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
                        <div style={{ textAlign: 'center' }}>
                          <input
                            type="date"
                            value={invoiceData.issue_date}
                            onChange={(e) => setInvoiceData(prev => ({
                              ...prev,
                              issue_date: e.target.value
                            }))}
                            style={{
                              border: 'none',
                              fontSize: '10px',
                              textAlign: 'center',
                              width: '100%'
                            }}
                          />
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
                          <div style={{ marginBottom: '4px', position: 'relative' }}>
                            <input
                              type="text"
                              value={invoiceData.customer_name}
                              onChange={(e) => {
                                const value = e.target.value;
                                setInvoiceData(prev => ({
                                  ...prev,
                                  customer_name: value
                                }));
                                if (value.length >= 1) {
                                  searchCustomers(value);
                                } else {
                                  setCustomerSearchResults([]);
                                  setShowCustomerSearch(false);
                                }
                              }}
                              onFocus={(e) => {
                                const value = e.target.value;
                                if (value.length >= 1) {
                                  searchCustomers(value);
                                } else {
                                  showAllCustomers();
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => setShowCustomerSearch(false), 200);
                              }}
                              placeholder="상호명을 입력하여 검색..."
                              style={{
                                border: '1px solid #000',
                                width: '150px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                            {showCustomerSearch && customerSearchResults.length > 0 && (
                              <div 
                                className="position-absolute"
                                style={{
                                  zIndex: 1000,
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  width: '250px',
                                  marginTop: '20px'
                                }}
                              >
                                {customerSearchResults.map((customer) => (
                                  <div
                                    key={customer.id}
                                    className="p-2 cursor-pointer hover:bg-light"
                                    style={{
                                      borderBottom: '1px solid #eee',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleSelectCustomer(customer)}
                                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                                  >
                                    <strong style={{ fontSize: '11px' }}>{customer.company_name}</strong>
                                    <div style={{ fontSize: '9px', color: '#666' }}>
                                      {customer.contact_person} | {customer.phone}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>사업장주소: </span>
                            <input
                              type="text"
                              value={invoiceData.customer_address}
                              onChange={(e) => setInvoiceData(prev => ({
                                ...prev,
                                customer_address: e.target.value
                              }))}
                              style={{
                                border: '1px solid #000',
                                width: '200px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                              placeholder="주소"
                            />
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>전화번호: </span>
                            <input
                              type="text"
                              placeholder="TEL: 055-338-5456  FAX: 055-338-5566"
                              style={{
                                border: '1px solid #000',
                                width: '220px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                          </div>
                          <div style={{ 
                            marginTop: '8px',
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            padding: '4px',
                            border: '2px solid #000'
                          }}>
                            합계금액: ₩{invoiceData.grand_total.toLocaleString()}
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
                            <input
                              type="text"
                              defaultValue="LVD Korea (유)"
                              style={{
                                border: '1px solid #000',
                                width: '100px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                            <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>대표: </span>
                            <input
                              type="text"
                              defaultValue="이동호"
                              style={{
                                border: '1px solid #000',
                                width: '60px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                            <span style={{ marginLeft: '10px', fontSize: '12px', border: '1px solid #000', padding: '2px 6px' }}>
                              인
                            </span>
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>등록번호: </span>
                            <input
                              type="text"
                              defaultValue="122-86-12760"
                              style={{
                                border: '1px solid #000',
                                width: '120px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>사업장주소: </span>
                            <input
                              type="text"
                              defaultValue="인천광역시 부평구 청천로 409-7"
                              style={{
                                border: '1px solid #000',
                                width: '200px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>전화번호: </span>
                            <input
                              type="text"
                              defaultValue="050-2345-7801  FAX: 050-2345-7816"
                              style={{
                                border: '1px solid #000',
                                width: '220px',
                                fontSize: '11px',
                                padding: '2px'
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    </table>

                    {/* 항목 테이블 */}
                    <div style={{ borderBottom: '2px solid #000' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '12px'
                      }}>
                        <thead>
                          <tr>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              width: '10%'
                            }}>번호</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              width: '40%'
                            }}>품목</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              width: '15%'
                            }}>수량</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              width: '15%'
                            }}>단가</th>
                            <th style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              width: '15%'
                            }}>금액</th>
                            <th className="d-print-none" style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              width: '5%'
                            }}>삭제</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceData.items.map((item, index) => (
                            <tr key={index}>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '6px', 
                                textAlign: 'center'
                              }}>
                                {index + 1}
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '6px'
                              }}>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  style={{
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    width: '100%',
                                    fontSize: '12px'
                                  }}
                                />
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '6px'
                              }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  style={{
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    width: '100%',
                                    textAlign: 'right',
                                    fontSize: '12px'
                                  }}
                                />
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '6px'
                              }}>
                                <input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, 'unit_price', parseInt(e.target.value) || 0)}
                                  style={{
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    width: '100%',
                                    textAlign: 'right',
                                    fontSize: '12px'
                                  }}
                                />
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '6px',
                                textAlign: 'right',
                                fontWeight: 'bold'
                              }}>
                                {item.total_price.toLocaleString()}
                              </td>
                              <td className="d-print-none" style={{ 
                                border: '1px solid #000', 
                                padding: '6px',
                                textAlign: 'center'
                              }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeItem(index)}
                                  title="항목 삭제"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-sm" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          
                          {/* 빈 행들 추가 */}
                          {Array.from({ length: Math.max(0, 10 - invoiceData.items.length) }).map((_, index) => (
                            <tr key={`empty-${index}`}>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '6px', 
                                textAlign: 'center',
                                height: '30px'
                              }}>
                                {invoiceData.items.length + index + 1}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                              <td className="d-print-none" style={{ border: '1px solid #000', padding: '6px' }}></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 항목 추가 버튼들 (인쇄시 숨김) */}
                    <div className="d-print-none" style={{ 
                      padding: '10px', 
                      borderBottom: '2px solid #000',
                      backgroundColor: '#f8f9fa'
                    }}>
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => addItem('work')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-sm me-1" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          작업시간 추가
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info"
                          onClick={() => addItem('travel')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-sm me-1" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          이동시간 추가
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => addItem('parts')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-sm me-1" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          부품 추가
                        </button>
                      </div>
                    </div>

                    {/* 하단 합계 */}
                    <div style={{ display: 'flex' }}>
                      
                      {/* 왼쪽 - 비고 */}
                      <div style={{ 
                        flex: '1', 
                        borderRight: '2px solid #000',
                        padding: '10px'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
                          비고
                        </div>
                        <textarea
                          value={invoiceData.notes}
                          onChange={(e) => setInvoiceData(prev => ({
                            ...prev,
                            notes: e.target.value
                          }))}
                          style={{
                            border: '1px solid #ccc',
                            width: '100%',
                            height: '100px',
                            padding: '5px',
                            fontSize: '12px',
                            resize: 'none'
                          }}
                          placeholder="특이사항이나 비고를 입력하세요..."
                        />
                      </div>

                      {/* 오른쪽 - 합계 */}
                      <div style={{ 
                        width: '200px',
                        padding: '10px'
                      }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '14px'
                        }}>
                          <tbody>
                            <tr>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}>
                                합계
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                textAlign: 'right',
                                fontWeight: 'bold'
                              }}>
                                {invoiceData.total_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                backgroundColor: '#f8f9fa',
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}>
                                부가세
                              </td>
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '8px',
                                textAlign: 'right',
                                fontWeight: 'bold'
                              }}>
                                {invoiceData.vat_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ 
                                border: '2px solid #000', 
                                padding: '8px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                fontSize: '16px'
                              }}>
                                총합계
                              </td>
                              <td style={{ 
                                border: '2px solid #000', 
                                padding: '8px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                fontSize: '16px'
                              }}>
                                {invoiceData.grand_total.toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* 두 번째 페이지 - 공급자용 (동일한 내용) */}
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
                          {invoiceData.issue_date}
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

                    {/* 동일한 내용 복사 (읽기 전용) */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                      
                      {/* 왼쪽 - 공급받는자 정보 */}
                      <div style={{ 
                        width: '50%', 
                        borderRight: '1px solid #000',
                        padding: '8px'
                      }}>
                        <div style={{ 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          marginBottom: '8px',
                          padding: '4px',
                          backgroundColor: '#f0f0f0'
                        }}>
                          공급받는자
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '50px', fontSize: '11px', fontWeight: 'bold' }}>상호:</span>
                          <span style={{ fontSize: '11px' }}>{invoiceData.customer_name}</span>
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '50px', fontSize: '11px', fontWeight: 'bold' }}>주소:</span>
                          <span style={{ fontSize: '11px' }}>{invoiceData.customer_address}</span>
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '50px', fontSize: '11px', fontWeight: 'bold' }}>연락처:</span>
                          <span style={{ fontSize: '11px' }}>TEL: 000-0000-0000  FAX: 000-0000-0000</span>
                        </div>
                        
                        <div style={{ 
                          marginTop: '10px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          padding: '6px',
                          border: '1px solid #000'
                        }}>
                          합계금액: ₩{invoiceData.grand_total.toLocaleString()}
                        </div>
                      </div>

                      {/* 오른쪽 - 공급자 정보 */}
                      <div style={{ 
                        width: '50%',
                        padding: '8px'
                      }}>
                        <div style={{ 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          marginBottom: '8px',
                          padding: '4px',
                          backgroundColor: '#f0f0f0'
                        }}>
                          공급자
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '40px', fontSize: '11px', fontWeight: 'bold' }}>상호:</span>
                          <span style={{ fontSize: '11px' }}>LVD Korea (유)</span>
                          <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 'bold' }}>대표:</span>
                          <span style={{ fontSize: '11px', marginLeft: '5px' }}>이동호</span>
                          <span style={{ marginLeft: '20px', fontSize: '10px', border: '1px solid #000', padding: '2px' }}>
                            [인]
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '60px', fontSize: '11px', fontWeight: 'bold' }}>등록번호:</span>
                          <span style={{ fontSize: '11px' }}>122-86-12760</span>
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '40px', fontSize: '11px', fontWeight: 'bold' }}>주소:</span>
                          <span style={{ fontSize: '11px' }}>인천광역시 부평구 청천로 409-7</span>
                        </div>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ display: 'inline-block', width: '40px', fontSize: '11px', fontWeight: 'bold' }}>연락처:</span>
                          <span style={{ fontSize: '11px' }}>050-2345-7801  FAX: 050-2345-7816</span>
                        </div>
                      </div>
                    </div>

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
                          {invoiceData.items.map((item, index) => (
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
                          {[...Array(Math.max(0, 10 - invoiceData.items.length))].map((_, index) => (
                            <tr key={`empty-${index}`}>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', height: '30px' }}>
                                {invoiceData.items.length + index + 1}
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
                          {invoiceData.notes}
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
                                {invoiceData.total_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>
                                세액
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                                {invoiceData.vat_amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '2px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center', fontSize: '16px' }}>
                                총합계
                              </td>
                              <td style={{ border: '2px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                                {invoiceData.grand_total.toLocaleString()}
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
    </div>
  );
};

export default InvoiceForm;