import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

interface SparePart {
  id: number;
  part_number: string;
  part_name: string;
  erp_name?: string;  // ERP명 추가
  stock_quantity: number;
  price: number;
  billing_price?: number;  // 백엔드에서 계산된 청구가
  created_at: string;
  updated_at: string;
}

interface SparePartHistory {
  id: number;
  part_number: string;
  part_name: string;
  transaction_type: 'IN' | 'OUT';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  transaction_date: string;
  created_at: string;
  created_by: string;
  reference_number?: string;
  customer_name?: string;
}

interface PriceHistory {
  id: number;
  part_number: string;
  price: number;
  billing_price?: number;  // 백엔드에서 계산된 청구가
  effective_date: string;
  created_at: string;
  created_by: string;
  notes?: string;
  currency: string;
  part_type: string;
}

const SpareParts: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 메인 목록 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [history, setHistory] = useState<SparePartHistory[]>([]);
  
  // 입출고 내역 페이지네이션 상태
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage] = useState(10);
  
  // 가격 이력 페이지네이션 상태
  const [priceHistoryCurrentPage, setPriceHistoryCurrentPage] = useState(1);
  const [priceHistoryItemsPerPage] = useState(5);
  
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [billingPrices, setBillingPrices] = useState<{[key: number]: number}>({});
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [newPrice, setNewPrice] = useState({
    price: 0,
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
    currency: 'KRW',
    part_type: 'repair'
  });
  
  // Form states
  const [newPart, setNewPart] = useState({
    part_number: '',
    part_name: '',
    erp_name: '',
    stock_quantity: 0
  });
  const [stockTransaction, setStockTransaction] = useState({
    part_number: '',
    part_name: '',
    erp_name: '',
    quantity: 0,
    reference_number: '',
    customer_name: '',
    is_existing_part: false
  });
  const [stockModalError, setStockModalError] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [partNumberSuggestions, setPartNumberSuggestions] = useState<SparePart[]>([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);
  
  // 각 부품의 청구가를 저장하는 state
  const [partBillingPrices, setPartBillingPrices] = useState<{[key: number]: number}>({});

  // 청구가 계산 함수 (가격 이력 모달에서만 사용)
  const calculateBillingPrice = async (costPrice: number, currency: string, partType: string) => {
    try {
      // 관리자 설정에서 팩터 정보 가져오기
      const response = await api.get('/api/admin/spare-part-settings');
      const factors = response.data.factors || {};
      
      // 환율 적용하여 KRW로 변환
      const exchangeRates: any = { EUR: 1450, USD: 1300, KRW: 1 };
      const krwCostPrice = costPrice * (exchangeRates[currency] || 1);
      
      // 부품 타입에 따른 팩터 선택
      const factorData = factors[partType] || {};
      const a = factorData.factor_a || (partType === 'repair' ? 0.0000001 : 0.0000001);
      const b = factorData.factor_b || (partType === 'repair' ? -0.000615608 : -0.0003);
      const c = factorData.factor_c || (partType === 'repair' ? 2.149275123 : 1.6);
      const minPrice = factorData.min_price || (partType === 'repair' ? 100 : 5);
      const maxPrice = factorData.max_price || (partType === 'repair' ? 3000 : 300);
      const minFactor = factorData.min_factor || 1.20;
      const maxFactor = factorData.max_factor || (partType === 'repair' ? 2.10 : 1.55);
      
      let finalPriceKrw;
      // 통화별 팩터 계산 로직
      if (currency === 'KRW') {
        // KRW 원가는 최소/최대가격 상관없이 마진율만 적용
        const marginRate = 1.20; // 기본 마진율 20%
        finalPriceKrw = krwCostPrice * marginRate;
      } else {
        // EUR/USD 원가는 EUR/USD 기준으로 최소/최대가격 비교해서 팩터 계산
        if (costPrice < minPrice) {
          // 최소 가격 미만일 때 최대 팩터 적용
          finalPriceKrw = krwCostPrice * maxFactor;
        } else if (costPrice > maxPrice) {
          // 최대 가격 초과일 때 최소 팩터 적용
          finalPriceKrw = krwCostPrice * minFactor;
        } else {
          // 정상 범위일 때 2차 함수 적용 (EUR/USD 가격 기준)
          const factor = a * (costPrice ** 2) + b * costPrice + c;
          finalPriceKrw = krwCostPrice * factor;
        }
      }
      
      // 최종 가격이 음수가 되지 않도록 보정
      finalPriceKrw = Math.max(krwCostPrice, finalPriceKrw);
      
      // 100원 단위에서 올림 처리
      const roundedPriceKrw = Math.ceil(finalPriceKrw / 100) * 100;
      
      return roundedPriceKrw; // 항상 원화로 반환
    } catch (error) {
      console.error('팩터 정보를 가져오는데 실패했습니다:', error);
      
      // 오류 시 기본값 사용
      const exchangeRates: any = { EUR: 1450, USD: 1300, KRW: 1 };
      const krwCostPrice = costPrice * (exchangeRates[currency] || 1);
      
      let a, b, c, minPrice, maxPrice, minFactor, maxFactor;
      if (partType === 'repair') {
        a = 0.0000001; b = -0.000615608; c = 2.149275123;
        minPrice = 100; maxPrice = 3000; minFactor = 1.20; maxFactor = 2.10;
      } else {
        a = 0.0000001; b = -0.0003; c = 1.6;
        minPrice = 5; maxPrice = 300; minFactor = 1.20; maxFactor = 1.55;
      }
      
      let finalPriceKrw;
      // 통화별 팩터 계산 로직 (오류 시 기본값)
      if (currency === 'KRW') {
        // KRW 원가는 최소/최대가격 상관없이 마진율만 적용
        const marginRate = 1.20; // 기본 마진율 20%
        finalPriceKrw = krwCostPrice * marginRate;
      } else {
        // EUR/USD 원가는 EUR/USD 기준으로 최소/최대가격 비교해서 팩터 계산
        if (costPrice < minPrice) {
          // 최소 가격 미만일 때 최대 팩터 적용
          finalPriceKrw = krwCostPrice * maxFactor;
        } else if (costPrice > maxPrice) {
          // 최대 가격 초과일 때 최소 팩터 적용
          finalPriceKrw = krwCostPrice * minFactor;
        } else {
          // 정상 범위일 때 2차 함수 적용 (EUR/USD 가격 기준)
          const factor = a * (costPrice ** 2) + b * costPrice + c;
          finalPriceKrw = krwCostPrice * factor;
        }
      }
      
      finalPriceKrw = Math.max(krwCostPrice, finalPriceKrw);
      
      // 100원 단위에서 올림 처리
      const roundedPriceKrw = Math.ceil(finalPriceKrw / 100) * 100;
      
      return roundedPriceKrw;
    }
  };

  // 모달 닫기 함수들
  const closeStockInModal = () => {
    setShowStockInModal(false);
    setShowPartSuggestions(false);
    setPartNumberSuggestions([]);
    setStockTransaction({
      part_number: '',
      part_name: '',
      erp_name: '',
      quantity: 0,
      reference_number: '',
      customer_name: '',
      is_existing_part: false
    });
    setStockModalError('');
  };

  const closeStockOutModal = () => {
    setShowStockOutModal(false);
    setShowPartSuggestions(false);
    setPartNumberSuggestions([]);
    setCustomerSearchResults([]);
    setStockTransaction({
      part_number: '',
      part_name: '',
      erp_name: '',
      quantity: 0,
      reference_number: '',
      customer_name: '',
      is_existing_part: false
    });
    setStockModalError('');
  };

  useEffect(() => {
    fetchSpareParts();
  }, []);

  const fetchSpareParts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/spare-parts');
      setSpareParts(response.data);
      
      // 백엔드에서 청구가가 함께 반환되므로 별도 계산 불필요
      // 각 부품의 billing_price를 partBillingPrices state에 저장
      const prices: {[key: number]: number} = {};
      response.data.forEach((part: SparePart) => {
        prices[part.id] = part.billing_price || 0;
      });
      setPartBillingPrices(prices);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
      setError('부품 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllHistory = async () => {
    try {
      console.log('Fetching all history...');
      const response = await api.get('/api/spare-parts/history');
      console.log('History response:', response.data);
      
      // 날짜일시 내림차순으로 정렬 (최신 순)
      const sortedHistory = response.data.sort((a: SparePartHistory, b: SparePartHistory) => {
        const dateA = new Date(a.transaction_date);
        const dateB = new Date(b.transaction_date);
        return dateB.getTime() - dateA.getTime(); // 내림차순
      });
      
      setHistory(sortedHistory);
    } catch (err) {
      console.error('Error fetching all history:', err);
      setError('입출고 내역을 불러오는데 실패했습니다.');
    }
  };

  const fetchPriceHistory = async (partId: number) => {
    console.log('Fetching price history for part ID:', partId);
    setPriceHistoryLoading(true);
    try {
      const response = await api.get(`/api/spare-parts/${partId}/price-history`);
      console.log('Price history response:', response.data);
      
      if (response.data && response.data.success) {
        const historyData = response.data.data || [];
        console.log('History data:', historyData);
        setPriceHistory(historyData);
        
        // 각 가격 이력의 저장된 청구가 사용
        const billingPricesMap: {[key: number]: number} = {};
        for (const price of historyData) {
          billingPricesMap[price.id] = price.billing_price || 0;
        }
        console.log('Billing prices map:', billingPricesMap);
        setBillingPrices(billingPricesMap);
      }
    } catch (err) {
      console.error('Error fetching price history:', err);
      setPriceHistory([]);
      setBillingPrices({});
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  const addPriceHistory = async () => {
    if (!selectedPart) return;
    
    try {
      const response = await api.post(`/api/spare-parts/${selectedPart.id}/price-history`, {
        price: newPrice.price,
        effective_date: newPrice.effective_date,
        currency: newPrice.currency,
        part_type: newPrice.part_type,
        notes: newPrice.notes
      });

      if (response.data && response.data.success) {
        setShowAddPriceModal(false);
        setNewPrice({
          price: 0,
          effective_date: new Date().toISOString().split('T')[0],
          notes: '',
          currency: 'KRW',
          part_type: 'repair'
        });
        // 가격 히스토리 새로고침
        fetchPriceHistory(selectedPart.id);
        // 스페어파트 목록 새로고침하여 최신 청구가 반영
        fetchSpareParts();
      }
    } catch (err: any) {
      console.error('Error adding price history:', err);
      alert(err.response?.data?.error || '가격 히스토리 추가 중 오류가 발생했습니다.');
    }
  };

  // 고객 검색 함수
  const searchCustomers = async (searchTerm: string) => {
    try {
      const response = await api.get(`/customers/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.data && response.data.success) {
        setCustomerSearchResults(response.data.data || []);
      } else {
        console.log('No customers found for search term:', searchTerm);
        setCustomerSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching customers:', err);
      setCustomerSearchResults([]);
    }
  };

  // 파트번호 자동완성 검색 함수
  const searchPartNumberSuggestions = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setPartNumberSuggestions([]);
      setShowPartSuggestions(false);
      return;
    }

    // 현재 등록된 부품들 중에서 부품번호나 부품명이 일치하는 것들 찾기
    const filtered = spareParts.filter(part => 
      part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.part_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // 최대 10개만 표시

    setPartNumberSuggestions(filtered);
    setShowPartSuggestions(filtered.length > 0);
  };

  const searchPartByNumber = async (partNumber: string) => {
    if (!partNumber.trim()) {
      setStockTransaction(prev => ({
        ...prev,
        part_name: '',
        is_existing_part: false
      }));
      return;
    }

    try {
      const response = await api.get(`/api/spare-parts/search/${partNumber}`);
      console.log('Search response:', response.data); // 디버깅용
      if (response.data && response.data.success && response.data.data) {
        setStockTransaction(prev => ({
          ...prev,
          part_name: response.data.data.part_name,
          is_existing_part: true
        }));
        setStockModalError('');
      }
    } catch (err) {
      console.error('Error searching part:', err);
      setStockTransaction(prev => ({
        ...prev,
        part_name: '',
        is_existing_part: false
      }));
    }
  };

  const handleRegisterPart = async () => {
    try {
      await api.post('/api/spare-parts', newPart);
      setShowRegisterModal(false);
      setNewPart({ part_number: '', part_name: '', erp_name: '', stock_quantity: 0 });
      fetchSpareParts();
    } catch (err: any) {
      console.error('Error registering part:', err);
      setError('부품 등록에 실패했습니다.');
    }
  };

  const handleStockIn = async () => {
    try {
      console.log('Stock transaction:', stockTransaction); // 디버깅용
      
      if (stockTransaction.is_existing_part) {
        // 기존 부품 입고
        const response = await api.post('/api/spare-parts/stock-transaction', {
          part_number: stockTransaction.part_number,
          transaction_type: 'IN',
          quantity: stockTransaction.quantity,
          transaction_date: new Date().toISOString().split('T')[0]
        });
        console.log('Stock transaction response:', response.data); // 디버깅용
      } else {
        // 새 부품 등록 후 입고
        console.log('Creating new part...'); // 디버깅용
        await api.post('/api/spare-parts', {
          part_number: stockTransaction.part_number,
          part_name: stockTransaction.part_name,
          erp_name: stockTransaction.erp_name,
          stock_quantity: 0,
          price: 0
        });

        console.log('Processing stock in for new part...'); // 디버깅용
        await api.post('/api/spare-parts/stock-transaction', {
          part_number: stockTransaction.part_number,
          transaction_type: 'IN',
          quantity: stockTransaction.quantity,
          transaction_date: new Date().toISOString().split('T')[0]
        });
      }

      setShowStockInModal(false);
      setShowPartSuggestions(false);
      setPartNumberSuggestions([]);
      setStockTransaction({
        part_number: '',
        part_name: '',
        erp_name: '',
        quantity: 0,
        reference_number: '',
        customer_name: '',
        is_existing_part: false
      });
      setStockModalError('');
      
      // 부품 목록 새로고침
      console.log('Refreshing parts list...'); // 디버깅용
      await fetchSpareParts();
    } catch (err: any) {
      console.error('Error processing stock in:', err);
      console.error('Error response:', err.response?.data); // 디버깅용
      setStockModalError(err.response?.data?.error || '입고 처리 중 오류가 발생했습니다.');
    }
  };

  const handleStockOut = async () => {
    try {
      // 부품번호와 수량 유효성 검사
      if (!stockTransaction.part_number || stockTransaction.quantity <= 0) {
        setStockModalError('부품번호와 수량을 올바르게 입력해주세요.');
        return;
      }

      console.log('Processing stock out:', stockTransaction); // 디버깅용

      const response = await api.post('/api/spare-parts/stock-transaction', {
        part_number: stockTransaction.part_number,
        transaction_type: 'OUT',
        quantity: stockTransaction.quantity,
        reference_number: stockTransaction.reference_number,
        customer_name: stockTransaction.customer_name,
        transaction_date: new Date().toISOString().split('T')[0]
      });

      console.log('Stock out response:', response.data); // 디버깅용
      
      setShowStockOutModal(false);
      setShowPartSuggestions(false);
      setPartNumberSuggestions([]);
      setCustomerSearchResults([]);
      setStockTransaction({
        part_number: '',
        part_name: '',
        erp_name: '',
        quantity: 0,
        reference_number: '',
        customer_name: '',
        is_existing_part: false
      });
      setStockModalError('');
      
      // 부품 목록 새로고침
      console.log('Refreshing parts list...'); // 디버깅용
      await fetchSpareParts();
    } catch (err: any) {
      console.error('Error processing stock out:', err);
      console.error('Error response:', err.response?.data); // 디버깅용
      setStockModalError(err.response?.data?.error || '출고 처리 중 오류가 발생했습니다.');
    }
  };

  const handleEditPart = async () => {
    if (!selectedPart) return;
    
    try {
      console.log('Updating part with data:', newPart);
      console.log('Part number:', selectedPart.part_number);
      const response = await api.put(`/api/spare-parts/${selectedPart.part_number}`, newPart);
      console.log('Update response:', response.data);
      setShowEditModal(false);
      setSelectedPart(null);
      setNewPart({ part_number: '', part_name: '', erp_name: '', stock_quantity: 0 });
      fetchSpareParts();
    } catch (err: any) {
      console.error('Error updating part:', err);
      console.error('Error response:', err.response?.data);
      setError('부품 수정에 실패했습니다.');
    }
  };

  const handleDeletePart = async () => {
    if (!selectedPart) return;
    
    try {
      await api.delete(`/api/spare-parts/${selectedPart.id}`);
      setShowDeleteModal(false);
      setSelectedPart(null);
      fetchSpareParts();
    } catch (err) {
      console.error('Error deleting part:', err);
      setError('부품 삭제에 실패했습니다.');
    }
  };

  const filteredParts = spareParts.filter(part =>
    (part.part_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.part_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 페이지네이션 계산
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentParts = filteredParts.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="page-header d-print-none">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control"
                  placeholder="부품번호 또는 부품명을 검색하세요..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // 검색어 변경시 첫 페이지로 이동
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-sm position-absolute"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
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
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
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
                {user?.spare_parts_access && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      fetchAllHistory();
                      setHistoryCurrentPage(1); // 페이지 초기화
                      setShowHistoryModal(true);
                    }}
                  >
                    입출고내역
                  </button>
                )}
                {hasPermission('customer_update') && (
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => setShowStockInModal(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>
                      <path d="M19 12h2l-9 -9l-9 9h2v7a2 2 0 0 0 2 2h5.5"/>
                      <path d="M16 19h6"/>
                      <path d="M22 16l-3 3l3 3"/>
                    </svg>
                    입고
                  </button>
                )}
                {hasPermission('customer_update') && (
                  <button 
                    className="btn btn-outline-warning"
                    onClick={() => setShowStockOutModal(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>
                      <path d="M19 12h2l-9 -9l-9 9h2v7a2 2 0 0 0 2 2h5.5"/>
                      <path d="M16 19h6"/>
                      <path d="M19 16l3 3l-3 3"/>
                    </svg>
                    출고
                  </button>
                )}
                {hasPermission('customer_create') && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowRegisterModal(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    새 파트 등록
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <div className="table-responsive">
            <table className="table table-vcenter table-striped">
              <thead>
                <tr>
                  <th>부품번호</th>
                  <th>부품명</th>
                  <th>ERP명</th>
                  <th>재고수량</th>
                  <th>청구가(KRW)</th>
                    <th>등록일</th>
                    <th className="w-1">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.length > 0 ? (
                    currentParts.map((part) => (
                      <tr key={part.id}>
                        <td>{part.part_number}</td>
                        <td>{part.part_name}</td>
                        <td>{part.erp_name || '-'}</td>
                        <td>{part.stock_quantity}</td>
                        <td>₩{partBillingPrices[part.id]?.toLocaleString('ko-KR') || '0'}</td>
                        <td>{new Date(part.created_at).toLocaleDateString('ko-KR')}</td>
                        <td>
                          <div className="d-flex gap-1">
                            {hasPermission('customer_read') && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: '0'
                              }}
                              onClick={async () => {
                                setSelectedPart(part);
                                setShowViewModal(true);
                                // 가격 이력 자동 로드
                                await fetchPriceHistory(part.id);
                                setPriceHistoryCurrentPage(1); // 첫 페이지로 초기화
                              }}
                              title="보기"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            )}
                            {hasPermission('customer_update') && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  padding: '0'
                                }}
                                onClick={() => {
                                  setSelectedPart(part);
                                  setNewPart({
                                    part_number: part.part_number,
                                    part_name: part.part_name,
                                    erp_name: part.erp_name || '',
                                    stock_quantity: part.stock_quantity
                                  });
                                  fetchPriceHistory(part.id);
                                  setShowEditModal(true);
                                }}
                                title="편집"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            )}
                            {hasPermission('customer_delete') && (
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
                                onClick={() => {
                                  setSelectedPart(part);
                                  setShowDeleteModal(true);
                                }}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 부품이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          
          {/* 페이지네이션 */}
          {filteredParts.length >= itemsPerPage && (
            <div className="mt-3">
              <div className="d-flex align-items-center justify-content-start mb-2">
                <span className="text-muted small">
                  총 {filteredParts.length}개의 부품 (페이지 {currentPage}/{Math.ceil(filteredParts.length / itemsPerPage)})
                </span>
              </div>
              
              <div className="d-flex justify-content-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredParts.length / itemsPerPage)}
                  totalItems={filteredParts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onPreviousPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  onNextPage={() => setCurrentPage(prev => Math.min(Math.ceil(filteredParts.length / itemsPerPage), prev + 1))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showHistoryModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHistoryModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    입출고 내역 
                    <span className="text-muted ms-2" style={{ fontSize: '14px', fontWeight: 'normal' }}>({history.length}건)</span>
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="table-responsive">
                    <table className="table table-vcenter">
                      <thead>
                        <tr>
                          <th>일시</th>
                          <th>부품번호</th>
                          <th>부품명</th>
                          <th>구분</th>
                          <th>수량</th>
                          <th>현재재고</th>
                          <th>요청자</th>
                          <th>사용처/참조</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // 페이지네이션 계산
                          const startIndex = (historyCurrentPage - 1) * historyItemsPerPage;
                          const endIndex = startIndex + historyItemsPerPage;
                          const currentItems = history.slice(startIndex, endIndex);
                          
                          return currentItems.length > 0 ? (
                            currentItems.map((record) => (
                              <tr key={record.id}>
                                <td>
                                  <div>{new Date(record.transaction_date).toLocaleDateString('ko-KR')}</div>
                                  <small className="text-muted">
                                    {new Date(record.transaction_date).toLocaleTimeString('ko-KR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </small>
                                </td>
                                <td><code>{record.part_number}</code></td>
                                <td>{record.part_name || '-'}</td>
                                <td>
                                  <span className={record.transaction_type === 'IN' ? 'text-primary' : 'text-warning'} style={{ fontSize: '14px', fontWeight: '600' }}>
                                    {record.transaction_type === 'IN' ? '입고' : '출고'}
                                  </span>
                                </td>
                                <td>
                                  <span className={record.transaction_type === 'IN' ? 'text-primary' : 'text-warning'}>
                                    {record.transaction_type === 'IN' ? '+' : '-'}{record.quantity}개
                                  </span>
                                </td>
                                <td><strong>{record.new_stock}개</strong></td>
                                <td>
                                  <span className="text-muted">
                                    {record.created_by || 'system'}
                                  </span>
                                </td>
                                <td>
                                  {record.transaction_type === 'OUT' && record.customer_name ? (
                                    <div>
                                      <div className="text-primary">{record.customer_name}</div>
                                      {record.reference_number && (
                                        <small className="text-muted">({record.reference_number})</small>
                                      )}
                                    </div>
                                  ) : record.reference_number ? (
                                    <small className="text-muted">{record.reference_number}</small>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="text-center text-muted">
                                입출고 내역이 없습니다.
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* 페이지네이션 */}
                  {history.length > historyItemsPerPage && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={historyCurrentPage}
                        totalPages={Math.ceil(history.length / historyItemsPerPage)}
                        totalItems={history.length}
                        itemsPerPage={historyItemsPerPage}
                        onPageChange={(page) => setHistoryCurrentPage(page)}
                        onPreviousPage={() => setHistoryCurrentPage(historyCurrentPage - 1)}
                        onNextPage={() => setHistoryCurrentPage(historyCurrentPage + 1)}
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                    닫기
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}      {/* 새 부품 등록 모달 */}
      {showRegisterModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRegisterModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">새 부품 등록</h5>
                <button type="button" className="btn-close" onClick={() => setShowRegisterModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">부품번호</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPart.part_number}
                      onChange={(e) => setNewPart({...newPart, part_number: e.target.value})}
                      placeholder="부품번호를 입력하세요"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">부품명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPart.part_name}
                      onChange={(e) => setNewPart({...newPart, part_name: e.target.value})}
                      placeholder="부품명을 입력하세요"
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">ERP명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPart.erp_name}
                      onChange={(e) => setNewPart({...newPart, erp_name: e.target.value})}
                      placeholder="ERP명을 입력하세요 (선택사항)"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">초기 재고수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newPart.stock_quantity}
                      onChange={(e) => setNewPart({...newPart, stock_quantity: parseInt(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleRegisterPart}>
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 입고 모달 */}
      {showStockInModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeStockInModal();
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 입고</h5>
                <button type="button" className="btn-close" onClick={closeStockInModal}></button>
              </div>
              <div className="modal-body">
                {stockModalError && (
                  <div className="alert alert-danger" role="alert">
                    {stockModalError}
                  </div>
                )}
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">부품번호</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={stockTransaction.part_number}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStockTransaction({...stockTransaction, part_number: value});
                          searchPartByNumber(value);
                          searchPartNumberSuggestions(value);
                        }}
                        onFocus={() => {
                          if (stockTransaction.part_number.trim()) {
                            searchPartNumberSuggestions(stockTransaction.part_number);
                          }
                        }}
                        onBlur={() => {
                          // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
                          setTimeout(() => setShowPartSuggestions(false), 200);
                        }}
                        placeholder="부품번호를 입력하세요"
                      />
                      
                      {showPartSuggestions && partNumberSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderTop: 'none',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                        }}>
                          {partNumberSuggestions.map((part) => (
                            <div
                              key={part.id}
                              onClick={() => {
                                setStockTransaction({
                                  ...stockTransaction, 
                                  part_number: part.part_number,
                                  part_name: part.part_name,
                                  erp_name: part.erp_name || '',
                                  is_existing_part: true
                                });
                                setShowPartSuggestions(false);
                                setStockModalError('');
                              }}
                              style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee'
                              }}
                              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = 'white'}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{part.part_number}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{part.part_name}</div>
                              <div style={{ fontSize: '11px', color: '#999' }}>재고: {part.stock_quantity}개</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">부품명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.part_name}
                      onChange={(e) => setStockTransaction({...stockTransaction, part_name: e.target.value})}
                      placeholder="부품명을 입력하세요"
                      disabled={stockTransaction.is_existing_part}
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">ERP명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.erp_name}
                      onChange={(e) => setStockTransaction({...stockTransaction, erp_name: e.target.value})}
                      placeholder="ERP명을 입력하세요"
                      disabled={stockTransaction.is_existing_part}
                    />
                  </div>
                  <div className="col-md-6">
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">입고 수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={stockTransaction.quantity}
                      onChange={(e) => setStockTransaction({...stockTransaction, quantity: parseInt(e.target.value) || 0})}
                      min="1"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">참조번호 (선택사항)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.reference_number}
                      onChange={(e) => setStockTransaction({...stockTransaction, reference_number: e.target.value})}
                      placeholder="인보이스 번호 등"
                    />
                  </div>
                </div>
                {stockTransaction.is_existing_part && (
                  <div className="alert alert-info mt-3" role="alert">
                    기존 부품에 입고 처리됩니다.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeStockInModal}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleStockIn}>
                  입고 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 출고 모달 */}
      {showStockOutModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeStockOutModal();
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 출고</h5>
                <button type="button" className="btn-close" onClick={closeStockOutModal}></button>
              </div>
              <div className="modal-body">
                {stockModalError && (
                  <div className="alert alert-danger" role="alert">
                    {stockModalError}
                  </div>
                )}
                
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">부품번호</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={stockTransaction.part_number}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStockTransaction({...stockTransaction, part_number: value});
                          
                          if (value.trim()) {
                            searchPartByNumber(value);
                            searchPartNumberSuggestions(value);
                          } else {
                            setStockTransaction({...stockTransaction, part_number: value, part_name: '', erp_name: ''});
                            setShowPartSuggestions(false);
                          }
                        }}
                        onFocus={() => {
                          if (stockTransaction.part_number.trim()) {
                            searchPartNumberSuggestions(stockTransaction.part_number);
                          }
                        }}
                        onBlur={() => {
                          // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
                          setTimeout(() => setShowPartSuggestions(false), 200);
                        }}
                        placeholder="부품번호 입력"
                      />
                      
                      {showPartSuggestions && partNumberSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderTop: 'none',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                        }}>
                          {partNumberSuggestions.map((part) => (
                            <div
                              key={part.id}
                              onClick={() => {
                                setStockTransaction({
                                  ...stockTransaction, 
                                  part_number: part.part_number,
                                  part_name: part.part_name,
                                  erp_name: part.erp_name || '',
                                  is_existing_part: true
                                });
                                setShowPartSuggestions(false);
                                setStockModalError('');
                              }}
                              style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee'
                              }}
                              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = 'white'}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{part.part_number}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{part.part_name}</div>
                              <div style={{ fontSize: '11px', color: '#999' }}>재고: {part.stock_quantity}개</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">부품명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.part_name}
                      onChange={(e) => setStockTransaction({...stockTransaction, part_name: e.target.value})}
                      placeholder="부품명"
                    />
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">ERP명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.erp_name}
                      onChange={(e) => setStockTransaction({...stockTransaction, erp_name: e.target.value})}
                      placeholder="ERP명"
                      disabled={stockTransaction.is_existing_part}
                    />
                  </div>
                  <div className="col-md-6">
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">출고 수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={stockTransaction.quantity}
                      onChange={(e) => setStockTransaction({...stockTransaction, quantity: parseInt(e.target.value) || 0})}
                      min="1"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">사용처 (고객사명)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={stockTransaction.customer_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStockTransaction({...stockTransaction, customer_name: value});

                          if (value.trim()) {
                            searchCustomers(value);
                          } else {
                            searchCustomers(''); // 빈 문자열로도 검색하여 전체 리스트 표시
                          }
                        }}
                        onFocus={() => {
                          // 포커스 시 전체 고객 리스트 표시
                          if (!stockTransaction.customer_name.trim()) {
                            searchCustomers('');
                          } else {
                            searchCustomers(stockTransaction.customer_name);
                          }
                        }}
                        onBlur={() => {
                          // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
                          setTimeout(() => setCustomerSearchResults([]), 200);
                        }}
                        placeholder="고객사명 검색"
                      />
                      
                      {customerSearchResults.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderTop: 'none',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {customerSearchResults.map((customer) => (
                            <div
                              key={customer.id}
                              onClick={() => {
                                setStockTransaction({...stockTransaction, customer_name: customer.customer_name});
                                setCustomerSearchResults([]);
                              }}
                              style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee'
                              }}
                              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = 'white'}
                            >
                              <div>
                                <strong>{customer.company_name}</strong>
                                {/* {customer.contact_person && <span>, 대표 "{customer.contact_person}"</span>} */}
                              </div>
                              {customer.address && (
                                <small className="text-muted d-block">
                                  {customer.address}
                                </small>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">참조번호 (선택사항)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.reference_number}
                      onChange={(e) => setStockTransaction({...stockTransaction, reference_number: e.target.value})}
                      placeholder="작업 번호 등"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeStockOutModal}>
                  취소
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={handleStockOut}
                  disabled={!stockTransaction.part_number || stockTransaction.quantity <= 0}
                >
                  출고 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 부품 보기 모달 */}
      {showViewModal && selectedPart && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowViewModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 정보</h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">부품번호</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPart.part_number}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">부품명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPart.part_name}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">ERP명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPart.erp_name || '-'}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">재고수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPart.stock_quantity}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">현재가격(원화)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`₩${selectedPart.price?.toLocaleString('ko-KR') || '0'}`}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">등록일</label>
                    <input
                      type="text"
                      className="form-control"
                      value={new Date(selectedPart.created_at).toLocaleString('ko-KR')}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-12">
                    <label className="form-label">수정일</label>
                    <input
                      type="text"
                      className="form-control"
                      value={new Date(selectedPart.updated_at).toLocaleString('ko-KR')}
                      readOnly
                    />
                  </div>
                </div>
                
                {/* 가격 히스토리 섹션 */}
                <hr className="mt-4 mb-3" />
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">가격 변경 이력</h6>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-sm table-vcenter">
                    <thead>
                      <tr>
                        <th>적용일</th>
                        <th>청구가</th>
                        <th>등록자</th>
                        <th>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // 페이지네이션 계산
                        const startIndex = (priceHistoryCurrentPage - 1) * priceHistoryItemsPerPage;
                        const endIndex = startIndex + priceHistoryItemsPerPage;
                        const currentItems = priceHistory.slice(startIndex, endIndex);
                        
                        return currentItems.length > 0 ? (
                          currentItems.map((price) => (
                            <tr key={price.id}>
                              <td>{new Date(price.effective_date).toLocaleDateString('ko-KR')}</td>
                              <td><strong>₩{(price.billing_price || price.price).toLocaleString('ko-KR')}</strong></td>
                              <td>{price.created_by}</td>
                              <td>{price.notes || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center text-muted">
                              가격 이력이 없습니다.
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                  
                  {/* 페이지네이션 */}
                  {priceHistory.length > priceHistoryItemsPerPage && (
                    <div className="mt-3">
                      <Pagination
                        currentPage={priceHistoryCurrentPage}
                        totalPages={Math.ceil(priceHistory.length / priceHistoryItemsPerPage)}
                        totalItems={priceHistory.length}
                        itemsPerPage={priceHistoryItemsPerPage}
                        onPageChange={(page) => setPriceHistoryCurrentPage(page)}
                        onPreviousPage={() => setPriceHistoryCurrentPage(priceHistoryCurrentPage - 1)}
                        onNextPage={() => setPriceHistoryCurrentPage(priceHistoryCurrentPage + 1)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 부품 편집 모달 */}
      {showEditModal && selectedPart && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">부품 정보 수정</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                {/* 기본 정보 */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">부품번호</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPart.part_number}
                      onChange={(e) => setNewPart({...newPart, part_number: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">부품명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPart.part_name}
                      onChange={(e) => setNewPart({...newPart, part_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">ERP명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPart.erp_name}
                      onChange={(e) => setNewPart({...newPart, erp_name: e.target.value})}
                      placeholder="ERP명을 입력하세요 (선택사항)"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">재고수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newPart.stock_quantity}
                      onChange={(e) => setNewPart({...newPart, stock_quantity: parseInt(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                </div>

                <hr />

                {/* 가격 정보 이력 */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">가격 정보 이력</h6>
                    <button 
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setNewPrice({
                          price: 0,
                          effective_date: new Date().toISOString().split('T')[0],
                          notes: '',
                          currency: 'KRW',
                          part_type: 'repair'
                        });
                        setShowAddPriceModal(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M12 5l0 14"/>
                        <path d="M5 12l14 0"/>
                      </svg>
                      가격정보
                    </button>
                  </div>
                  
                  <div className="card">
                    <div className="table-responsive">
                      <table className="table table-vcenter mb-0">
                        <thead>
                          <tr>
                            <th style={{ fontSize: '14px' }}>등록일시</th>
                            <th style={{ fontSize: '14px' }}>구매원가</th>
                            <th style={{ fontSize: '14px' }}>청구가 (원)</th>
                            <th style={{ fontSize: '14px' }}>통화</th>
                            <th style={{ fontSize: '14px' }}>부품타입</th>
                            <th style={{ fontSize: '14px' }}>등록자</th>
                            <th style={{ fontSize: '14px' }}>비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {priceHistoryLoading ? (
                            <tr>
                              <td colSpan={7} className="text-center" style={{ fontSize: '14px' }}>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                가격 이력을 불러오는 중...
                              </td>
                            </tr>
                          ) : priceHistory.length > 0 ? (
                            priceHistory.map((price) => (
                              <tr key={price.id}>
                                <td>
                                  <div style={{ fontSize: '14px' }}>{new Date(price.created_at).toLocaleDateString('ko-KR')}</div>
                                  <small className="text-muted" style={{ fontSize: '12px' }}>
                                    {new Date(price.created_at).toLocaleTimeString('ko-KR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </small>
                                </td>
                                <td>
                                  <span style={{ fontSize: '14px' }}>
                                    {price.currency === 'KRW' ? '₩' : 
                                     price.currency === 'EUR' ? '€' : '$'}{price.price.toLocaleString()}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '14px', color: '#0d6efd', fontWeight: '600' }}>
                                    ₩{(billingPrices[price.id] || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '14px', color: '#6c757d' }}>{price.currency}</span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                    {price.part_type === 'repair' ? '수리용' : '소모성'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '14px', color: '#6c757d' }}>{price.created_by}</span>
                                </td>
                                <td style={{ fontSize: '14px' }}>{price.notes || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center text-muted" style={{ fontSize: '14px' }}>
                                가격 정보가 없습니다. "가격정보" 버튼을 클릭하여 추가하세요.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleEditPart}>
                  수정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 부품 삭제 확인 모달 */}
      {showDeleteModal && selectedPart && (
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 삭제 확인</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>다음 부품을 삭제하시겠습니까?</p>
                <p><strong>{selectedPart.part_name}</strong> ({selectedPart.part_number})</p>
                <p className="text-danger">이 작업은 되돌릴 수 없습니다.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  취소
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeletePart}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가격 추가 모달 */}
      {showAddPriceModal && selectedPart && (
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">새 가격 추가 - {selectedPart.part_name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddPriceModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">부품 타입</label>
                      <select
                        className="form-select"
                        value={newPrice.part_type}
                        onChange={(e) => setNewPrice({...newPrice, part_type: e.target.value})}
                      >
                        <option value="repair">수리용 부품</option>
                        <option value="consumable">소모성 부품</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">통화 선택</label>
                      <select
                        className="form-select"
                        value={newPrice.currency || 'KRW'}
                        onChange={(e) => setNewPrice({...newPrice, currency: e.target.value})}
                      >
                        <option value="KRW">KRW (원화)</option>
                        <option value="EUR">EUR (유로)</option>
                        <option value="USD">USD (달러)</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">구매원가</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          {newPrice.currency === 'KRW' ? '₩' : 
                           newPrice.currency === 'EUR' ? '€' : '$'}
                        </span>
                        <input
                          type="number"
                          className="form-control"
                          value={newPrice.price}
                          onChange={(e) => setNewPrice({...newPrice, price: parseFloat(e.target.value) || 0})}
                          min="0"
                          step="0.01"
                          placeholder="구매원가를 입력하세요"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">적용일</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newPrice.effective_date}
                        onChange={(e) => setNewPrice({...newPrice, effective_date: e.target.value})}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">비고 (선택사항)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={newPrice.notes}
                        onChange={(e) => setNewPrice({...newPrice, notes: e.target.value})}
                        placeholder="가격 변경 사유나 추가 정보를 입력하세요"
                      />
                    </div>
                    {newPrice.price > 0 && (
                      <div className="alert alert-info">
                        <strong>입력 가격:</strong> {newPrice.currency === 'KRW' ? '₩' : 
                         newPrice.currency === 'EUR' ? '€' : '$'}{newPrice.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title">가격 변경 이력</h5>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="table table-sm table-vcenter mb-0">
                            <thead className="sticky-top bg-light">
                              <tr>
                                <th>적용일</th>
                                <th>가격</th>
                                <th>통화</th>
                                <th>등록자</th>
                              </tr>
                            </thead>
                            <tbody>
                              {priceHistory.length > 0 ? (
                                priceHistory.map((price) => (
                                  <tr key={price.id}>
                                    <td>
                                      <small>{new Date(price.effective_date).toLocaleDateString('ko-KR')}</small>
                                    </td>
                                    <td>
                                      <small>{(price.currency === 'KRW' ? '₩' : 
                                               price.currency === 'EUR' ? '€' : '$')}{price.price.toLocaleString()}</small>
                                    </td>
                                    <td>
                                      <small className="text-muted">{price.currency}</small>
                                    </td>
                                    <td>
                                      <small>{price.created_by}</small>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="text-center text-muted">
                                    <small>가격 변경 이력이 없습니다.</small>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddPriceModal(false)}>
                  취소
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={addPriceHistory}
                  disabled={newPrice.price <= 0}
                >
                  가격 추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpareParts;