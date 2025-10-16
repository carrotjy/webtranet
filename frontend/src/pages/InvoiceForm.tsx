import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI, customerAPI, sparePartsAPI } from '../services/api';
import api from '../services/api';

interface InvoiceLineItem {
  id: string;
  month: number;
  day: number;
  item_name: string;
  specification: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  part_number?: string;
  isHeader?: boolean;
  isServiceCost?: boolean;
  isPartsCost?: boolean;
}

interface Customer {
  id: number;
  company_name: string;
  address: string;
  contact_person: string;
  phone: string;
}

interface InvoiceRates {
  work_rate: number;
  travel_rate: number;
}

const InvoiceForm: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 기본 정보
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // 고객 목록 및 검색
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // 요율 정보
  const [rates, setRates] = useState<InvoiceRates>({ work_rate: 50000, travel_rate: 30000 });

  // 거래명세서 항목
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [serviceCostCounter, setServiceCostCounter] = useState(0);
  const [partsCostCounter, setPartsCostCounter] = useState(0);

  // 부품 검색 자동완성
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [activePartSearchId, setActivePartSearchId] = useState<string | null>(null);

  // 부품 추가 모달
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [modalPartNumber, setModalPartNumber] = useState('');
  const [modalPartName, setModalPartName] = useState('');
  const [modalPartQuantity, setModalPartQuantity] = useState(1);
  const [modalPartUnitPrice, setModalPartUnitPrice] = useState(0);
  const [modalPartSearchResults, setModalPartSearchResults] = useState<any[]>([]);
  const [marginRate, setMarginRate] = useState(20); // 기본 마진율 20%

  // 고객 목록 로드
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await customerAPI.getCustomers();
        setCustomers(response.data.customers || []);
      } catch (error) {
        console.error('고객 목록 로드 실패:', error);
      }
    };

    fetchCustomers();
  }, []);

  // 요율 정보 로드
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await api.get('/api/admin/invoice-rates');
        if (response.data) {
          setRates({
            work_rate: response.data.work_rate || 50000,
            travel_rate: response.data.travel_rate || 30000
          });
        }
      } catch (error) {
        console.error('요율 정보 로드 실패:', error);
      }
    };

    fetchRates();
  }, []);

  // 마진율 정보 로드
  useEffect(() => {
    const fetchMarginRate = async () => {
      try {
        const response = await api.get('/api/admin/spare-part-settings');
        if (response.data && response.data.success && response.data.data) {
          setMarginRate(response.data.data.marginRate || 20);
        }
      } catch (error) {
        console.error('마진율 정보 로드 실패:', error);
        // 에러 발생 시 기본값 20% 사용
      }
    };

    fetchMarginRate();
  }, []);

  // 기존 거래명세서 로드 (수정 모드)
  useEffect(() => {
    if (invoiceId) {
      const fetchInvoice = async () => {
        try {
          setLoading(true);
          const response = await invoiceAPI.getInvoiceById(parseInt(invoiceId));
          const invoice = response.data;

          setCustomerId(invoice.customer_id);
          setCustomerName(invoice.customer_name);
          setCustomerAddress(invoice.customer_address);
          setIssueDate(invoice.issue_date);
          setNotes(invoice.notes || '');

          // 항목 변환
          const items: InvoiceLineItem[] = invoice.items.map((item: any) => ({
            id: `item-${item.id}`,
            month: item.month || 0,
            day: item.day || 0,
            item_name: item.item_name || item.description,
            specification: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            part_number: item.part_number || ''
          }));

          setLineItems(items);
        } catch (error) {
          console.error('거래명세서 로드 실패:', error);
          alert('거래명세서를 불러오는데 실패했습니다.');
          navigate('/invoices');
        } finally {
          setLoading(false);
        }
      };

      fetchInvoice();
    }
  }, [invoiceId]);

  // 고객 선택
  const handleCustomerSelect = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.company_name);
    setCustomerAddress(customer.address);
    setCustomerSearchTerm(customer.company_name);
    setShowCustomerDropdown(false);
  };

  // 고객 검색 필터링
  const filteredCustomers = customers.filter(c =>
    c.company_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // +서비스비용추가 버튼 클릭
  const addServiceCost = () => {
    // 전체 헤더 개수를 기준으로 번호 매기기
    const headerCount = lineItems.filter(item => item.isHeader).length + 1;

    const baseId = `service-${Date.now()}`;

    // 오늘 날짜 가져오기
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const newItems: InvoiceLineItem[] = [
      // 1번째 줄: 헤더 (월/일 입력 + "N. 서비스비용")
      {
        id: `${baseId}-header`,
        month: currentMonth,
        day: currentDay,
        item_name: `${headerCount}. 서비스비용`,
        specification: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
        isHeader: true,
        isServiceCost: true
      },
      // 2번째 줄: 작업시간
      {
        id: `${baseId}-work`,
        month: currentMonth,
        day: currentDay,
        item_name: '작업시간',
        specification: '1인 × 1시간',
        quantity: 0,
        unit_price: rates.work_rate,
        total_price: 0,
        isServiceCost: true
      },
      // 3번째 줄: 이동시간
      {
        id: `${baseId}-travel`,
        month: currentMonth,
        day: currentDay,
        item_name: '이동시간',
        specification: '1시간',
        quantity: 0,
        unit_price: rates.travel_rate,
        total_price: 0,
        isServiceCost: true
      }
    ];

    setLineItems(prev => [...prev, ...newItems]);
  };

  // +부품비용추가 버튼 클릭 - 모달 열기
  const addPartsCost = () => {
    setModalPartNumber('');
    setModalPartName('');
    setModalPartQuantity(1);
    setModalPartUnitPrice(0);
    setModalPartSearchResults([]);
    setShowPartsModal(true);
  };

  // 모달에서 부품번호 검색
  const handleModalPartSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) {
      setModalPartSearchResults([]);
      return;
    }

    try {
      const response = await sparePartsAPI.searchPartByNumber(searchTerm);
      if (response.data && response.data.spare_parts) {
        setModalPartSearchResults(response.data.spare_parts);
      }
    } catch (error) {
      console.error('부품 검색 실패:', error);
      setModalPartSearchResults([]);
    }
  };

  // 모달에서 부품 선택
  const handleModalPartSelect = (part: any) => {
    setModalPartNumber(part.part_number);
    setModalPartName(part.part_name);
    setModalPartUnitPrice(part.charge_price || 0);
    setModalPartSearchResults([]);
  };

  // 모달에서 부품 추가 확정
  const confirmAddPart = () => {
    if (!modalPartName) {
      alert('부품명을 입력해주세요.');
      return;
    }

    if (modalPartQuantity <= 0) {
      alert('수량은 1 이상이어야 합니다.');
      return;
    }

    // 부품번호가 없고 단가만 입력된 경우 마진율 적용
    let finalUnitPrice = modalPartUnitPrice;
    if (!modalPartNumber && modalPartUnitPrice > 0) {
      finalUnitPrice = Math.round(modalPartUnitPrice * (1 + marginRate / 100));
    }

    // 전체 헤더 개수를 기준으로 번호 매기기
    const headerCount = lineItems.filter(item => item.isHeader).length + 1;
    const baseId = `parts-${Date.now()}`;

    // 오늘 날짜 가져오기
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const newItems: InvoiceLineItem[] = [
      // 1번째 줄: 헤더 (월/일 입력 + "N. 부품비용")
      {
        id: `${baseId}-header`,
        month: currentMonth,
        day: currentDay,
        item_name: `${headerCount}. 부품비용`,
        specification: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
        isHeader: true,
        isPartsCost: true
      },
      // 2번째 줄: 부품 입력
      {
        id: `${baseId}-part`,
        month: currentMonth,
        day: currentDay,
        item_name: modalPartName,
        specification: modalPartName,
        quantity: modalPartQuantity,
        unit_price: finalUnitPrice,
        total_price: modalPartQuantity * finalUnitPrice,
        part_number: modalPartNumber,
        isPartsCost: true
      }
    ];

    setLineItems(prev => [...prev, ...newItems]);
    setShowPartsModal(false);
  };

  // 항목 업데이트
  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // 수량이나 단가가 변경되면 합계 자동 계산
        if (field === 'quantity' || field === 'unit_price') {
          const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
          const price = field === 'unit_price' ? parseFloat(value) || 0 : item.unit_price;
          updated.total_price = Math.round(qty * price);
        }

        // 헤더 행의 월/일이 변경되면 하위 항목에도 적용
        if (item.isHeader && (field === 'month' || field === 'day')) {
          const headerIndex = prev.findIndex(i => i.id === id);
          const groupItems = [];

          // 같은 그룹의 하위 항목들 찾기
          for (let i = headerIndex + 1; i < prev.length; i++) {
            if (prev[i].isHeader) break;
            groupItems.push(i);
          }

          // 하위 항목들의 월/일도 업데이트
          const updatedItems = [...prev];
          updatedItems[headerIndex] = updated;
          groupItems.forEach(idx => {
            updatedItems[idx] = { ...updatedItems[idx], [field]: value };
          });

          return updatedItems[prev.indexOf(item)];
        }

        return updated;
      }
      return item;
    }));
  };

  // 부품 검색 (실시간 자동완성 - 규격 필드)
  const handlePartSearch = async (id: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) {
      setPartSearchResults([]);
      setActivePartSearchId(null);
      return;
    }

    try {
      const response = await sparePartsAPI.searchPartByNumber(searchTerm);
      if (response.data && response.data.spare_parts) {
        setPartSearchResults(response.data.spare_parts);
        setActivePartSearchId(id);
      }
    } catch (error) {
      console.error('부품 검색 실패:', error);
      setPartSearchResults([]);
    }
  };

  // 부품 선택
  const handlePartSelect = (itemId: string, part: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          part_number: part.part_number,
          item_name: part.part_name,
          specification: part.part_name,  // 규격에 부품명만 표시
          unit_price: part.charge_price || 0,
          total_price: Math.round((part.charge_price || 0) * item.quantity)
        };
      }
      return item;
    }));

    setPartSearchResults([]);
    setActivePartSearchId(null);
  };

  // 항목 삭제
  const removeLineItem = (id: string) => {
    setLineItems(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;

      const item = prev[index];

      // 헤더 삭제 시 하위 항목도 모두 삭제
      if (item.isHeader) {
        const toRemove = [id];
        for (let i = index + 1; i < prev.length; i++) {
          if (prev[i].isHeader) break;
          toRemove.push(prev[i].id);
        }
        return prev.filter(item => !toRemove.includes(item.id));
      }

      // 일반 항목 삭제
      return prev.filter(item => item.id !== id);
    });
  };

  // 합계 계산
  const calculateTotals = () => {
    const total_amount = lineItems
      .filter(item => !item.isHeader)
      .reduce((sum, item) => sum + item.total_price, 0);

    const vat_amount = Math.round(total_amount * 0.1);
    const grand_total = total_amount + vat_amount;

    return { total_amount, vat_amount, grand_total };
  };

  // 저장
  const handleSave = async () => {
    if (!customerId || !customerName || !customerAddress) {
      alert('고객 정보를 모두 입력해주세요.');
      return;
    }

    if (lineItems.length === 0) {
      alert('최소 1개 이상의 항목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const { total_amount, vat_amount, grand_total } = calculateTotals();

      // item_type 판단
      const dbItems = lineItems
        .filter(item => !item.isHeader)
        .map(item => {
          let item_type = 'parts';

          if (item.item_name.includes('작업')) {
            item_type = 'work';
          } else if (item.item_name.includes('이동') || item.item_name.includes('출장')) {
            item_type = 'travel';
          }

          return {
            item_type,
            description: item.specification || item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            month: item.month || null,
            day: item.day || null,
            item_name: item.item_name,
            part_number: item.part_number || ''
          };
        });

      const invoiceData = {
        customer_id: customerId,
        customer_name: customerName,
        customer_address: customerAddress,
        issue_date: issueDate,
        work_subtotal: dbItems.filter(i => i.item_type === 'work').reduce((s, i) => s + i.total_price, 0),
        travel_subtotal: dbItems.filter(i => i.item_type === 'travel').reduce((s, i) => s + i.total_price, 0),
        parts_subtotal: dbItems.filter(i => i.item_type === 'parts').reduce((s, i) => s + i.total_price, 0),
        total_amount,
        vat_amount,
        grand_total,
        notes,
        items: dbItems
      };

      if (invoiceId) {
        // 수정
        await invoiceAPI.updateInvoice(parseInt(invoiceId), invoiceData);
        alert('거래명세서가 수정되었습니다.');
      } else {
        // 신규 생성
        const createResponse = await invoiceAPI.createInvoice(invoiceData);

        // Excel 파일 생성 (거래명세서 생성 후)
        try {
          await generateExcelInvoice();
          alert('거래명세서와 Excel 파일이 생성되었습니다.');
        } catch (excelError) {
          console.error('Excel 생성 실패:', excelError);
          alert('거래명세서는 생성되었으나 Excel 파일 생성에 실패했습니다.');
        }
      }

      navigate('/invoices');
    } catch (error: any) {
      console.error('거래명세서 저장 실패:', error);
      alert(`거래명세서 저장에 실패했습니다:\n${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Excel 파일 생성 함수
  const generateExcelInvoice = async () => {
    // lineItems를 Excel 생성 API에 맞는 형식으로 변환
    const excelItems = lineItems.map(item => ({
      month: item.month || 0,
      day: item.day || 0,
      item_name: item.item_name,
      specification: item.specification || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      vat: Math.round((item.total_price || 0) * 0.1),
      part_number: item.part_number || '',
      isHeader: item.isHeader || false,
      isBlank: false
    }));

    // 고객 정보 구성
    const customerInfo = {
      company_name: customerName,
      address: customerAddress,
      phone: customers.find(c => c.id === customerId)?.phone || '',
      fax: ''
    };

    const excelData = {
      customer_name: customerName,
      service_date: issueDate,
      customer_info: customerInfo,
      items: excelItems
    };

    const response = await api.post('/api/generate-invoice', excelData);
    return response.data;
  };

  // Excel 생성 버튼 핸들러 (수정 모드에서 사용)
  const handleGenerateExcel = async () => {
    if (!customerId || !customerName || !customerAddress) {
      alert('고객 정보를 모두 입력해주세요.');
      return;
    }

    if (lineItems.length === 0) {
      alert('최소 1개 이상의 항목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await generateExcelInvoice();
      alert('Excel 파일이 생성되었습니다.');
    } catch (error: any) {
      console.error('Excel 생성 실패:', error);
      alert(`Excel 파일 생성에 실패했습니다:\n${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { total_amount, vat_amount, grand_total } = calculateTotals();

  if (loading) {
    return (
      <div className="page page-center">
        <div className="container-tight py-4">
          <div className="text-center">
            <div className="mb-3">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
            <div className="text-muted mb-3">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">
                  {invoiceId ? '거래명세서 수정' : '거래명세서 작성'}
                </h2>
              </div>
              <div className="col-auto ms-auto">
                <div className="btn-list">
                  <button
                    type="button"
                    className="btn btn-ghost-secondary"
                    onClick={() => navigate('/invoices')}
                  >
                    취소
                  </button>
                  {invoiceId && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleGenerateExcel}
                      disabled={loading}
                    >
                      Excel 생성
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="page-body">
          <div className="container-xl">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">기본 정보</h3>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label required">고객사</label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="고객사 검색..."
                      />
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              {customer.company_name} {customer.contact_person && `(${customer.contact_person})`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label required">발행일</label>
                    <input
                      type="date"
                      className="form-control"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <label className="form-label required">고객 주소</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="고객 주소를 입력하세요"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-12">
                    <label className="form-label">비고</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="특이사항을 입력하세요"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h3 className="card-title">거래명세서 항목</h3>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-success btn-sm me-2"
                    onClick={addServiceCost}
                  >
                    + 서비스비용추가
                  </button>
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    onClick={addPartsCost}
                  >
                    + 부품비용추가
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>월</th>
                        <th style={{ width: '80px' }}>일</th>
                        <th style={{ width: '180px' }}>품목</th>
                        <th style={{ minWidth: '200px' }}>규격</th>
                        <th style={{ width: '120px' }}>수량</th>
                        <th style={{ width: '130px' }}>단가</th>
                        <th style={{ width: '130px' }}>금액</th>
                        <th style={{ width: '80px' }}>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center text-muted">
                            항목이 없습니다. 위의 버튼을 눌러 서비스비용 또는 부품비용을 추가하세요.
                          </td>
                        </tr>
                      )}

                      {lineItems.map((item, idx) => (
                        <tr key={item.id} className={item.isHeader ? 'table-active' : ''}>
                          {/* 월 */}
                          <td>
                            {item.isHeader ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={item.month || ''}
                                onChange={(e) => updateLineItem(item.id, 'month', parseInt(e.target.value) || 0)}
                                placeholder="월"
                                min="1"
                                max="12"
                                style={{ width: '70px' }}
                              />
                            ) : null}
                          </td>

                          {/* 일 */}
                          <td>
                            {item.isHeader ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={item.day || ''}
                                onChange={(e) => updateLineItem(item.id, 'day', parseInt(e.target.value) || 0)}
                                placeholder="일"
                                min="1"
                                max="31"
                                style={{ width: '70px' }}
                              />
                            ) : null}
                          </td>

                          {/* 품목 */}
                          <td>
                            {item.isHeader ? (
                              <strong>{item.item_name}</strong>
                            ) : item.isPartsCost ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={item.item_name}
                                onChange={(e) => updateLineItem(item.id, 'item_name', e.target.value)}
                                placeholder="품목명"
                              />
                            ) : (
                              item.item_name
                            )}
                          </td>

                          {/* 규격 */}
                          <td>
                            {!item.isHeader && (
                              <div className="position-relative">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.specification}
                                  onChange={(e) => {
                                    updateLineItem(item.id, 'specification', e.target.value);
                                    // 부품비용일 경우 부품 검색 (부품번호 또는 부품명)
                                    if (item.isPartsCost) {
                                      handlePartSearch(item.id, e.target.value);
                                    }
                                  }}
                                  placeholder={item.isPartsCost ? "부품명 또는 부품번호 입력" : "규격"}
                                  readOnly={item.isServiceCost}
                                />

                                {/* 부품 검색 자동완성 드롭다운 */}
                                {item.isPartsCost && activePartSearchId === item.id && partSearchResults.length > 0 && (
                                  <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto', position: 'absolute', zIndex: 1000 }}>
                                    {partSearchResults.map((part, pidx) => (
                                      <button
                                        key={pidx}
                                        type="button"
                                        className="dropdown-item"
                                        onClick={() => handlePartSelect(item.id, part)}
                                      >
                                        <div>
                                          <strong>{part.part_name}</strong> ({part.part_number})
                                        </div>
                                        <small className="text-muted">
                                          청구가: {(part.charge_price || 0).toLocaleString()}원 | 재고: {part.stock_quantity}
                                        </small>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 수량 */}
                          <td>
                            {!item.isHeader && (
                              <input
                                type="number"
                                className="form-control form-control-sm text-end"
                                value={item.quantity || ''}
                                onChange={(e) => updateLineItem(item.id, 'quantity', item.isPartsCost ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                step={item.isPartsCost ? "1" : "0.1"}
                                min="0"
                              />
                            )}
                          </td>

                          {/* 단가 */}
                          <td>
                            {!item.isHeader && (
                              <input
                                type="number"
                                className="form-control form-control-sm text-end"
                                value={item.unit_price || ''}
                                onChange={(e) => updateLineItem(item.id, 'unit_price', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                min="0"
                                readOnly={item.isServiceCost}
                              />
                            )}
                          </td>

                          {/* 금액 */}
                          <td className="text-end">
                            {!item.isHeader && (
                              <strong>{item.total_price.toLocaleString()}</strong>
                            )}
                          </td>

                          {/* 액션 */}
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeLineItem(item.id)}
                              title="삭제"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 합계 표시 */}
                <div className="row mt-3">
                  <div className="col-md-6 ms-auto">
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <th className="text-end">공급가액</th>
                          <td className="text-end">{total_amount.toLocaleString()}원</td>
                        </tr>
                        <tr>
                          <th className="text-end">부가세 (10%)</th>
                          <td className="text-end">{vat_amount.toLocaleString()}원</td>
                        </tr>
                        <tr className="table-active">
                          <th className="text-end fs-4">총합계</th>
                          <td className="text-end fs-4"><strong>{grand_total.toLocaleString()}원</strong></td>
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

      {/* 부품 추가 모달 */}
      {showPartsModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
              <div className="modal-content" style={{ backgroundColor: '#ffffff', position: 'relative', zIndex: 1051 }}>
                <div className="modal-header">
                  <h5 className="modal-title">부품 추가</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPartsModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">부품번호 검색</label>
                    <input
                      type="text"
                      className="form-control"
                      value={modalPartNumber}
                      onChange={(e) => {
                        setModalPartNumber(e.target.value);
                        handleModalPartSearch(e.target.value);
                      }}
                      placeholder="부품번호 입력..."
                      maxLength={16}
                    />
                    {modalPartSearchResults.length > 0 && (
                      <div className="list-group mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {modalPartSearchResults.map((part, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="list-group-item list-group-item-action"
                            onClick={() => handleModalPartSelect(part)}
                          >
                            <div className="d-flex w-100 justify-content-between">
                              <h6 className="mb-1">{part.part_number}</h6>
                              <small className="text-success">{part.charge_price?.toLocaleString()}원</small>
                            </div>
                            <p className="mb-1">{part.part_name}</p>
                            <small className="text-muted">재고: {part.stock_quantity}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label required">부품명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={modalPartName}
                      onChange={(e) => setModalPartName(e.target.value)}
                      placeholder="부품명 입력..."
                    />
                    <small className="form-hint">부품번호 없이 부품명만 입력 가능합니다</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label required">수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={modalPartQuantity}
                      onChange={(e) => setModalPartQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      step="1"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">구매가 (원)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={modalPartUnitPrice}
                      onChange={(e) => setModalPartUnitPrice(parseInt(e.target.value) || 0)}
                      placeholder="구매가 입력..."
                      min="0"
                      disabled={!!modalPartNumber}
                    />
                    {!modalPartNumber && modalPartUnitPrice > 0 && (
                      <small className="form-hint text-success">
                        청구가: {Math.round(modalPartUnitPrice * (1 + marginRate / 100)).toLocaleString()}원 (마진율 {marginRate}% 적용)
                      </small>
                    )}
                    {modalPartNumber && (
                      <small className="form-hint text-muted">
                        등록된 부품은 청구가가 자동 적용됩니다
                      </small>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-link link-secondary" onClick={() => setShowPartsModal(false)}>
                    취소
                  </button>
                  <button type="button" className="btn btn-primary ms-auto" onClick={confirmAddPart}>
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceForm;
