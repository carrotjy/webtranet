import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface SparePart {
  id: number;
  part_number: string;
  part_name: string;
  stock_quantity: number;
  price: number;
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
}

const SpareParts: React.FC = () => {
  const { user } = useAuth();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  // Form states
  const [newPart, setNewPart] = useState({
    part_number: '',
    part_name: '',
    stock_quantity: 0,
    price: 0
  });
  const [stockTransaction, setStockTransaction] = useState({
    part_number: '',
    part_name: '',
    quantity: 0,
    reference_number: '',
    customer_name: '',
    is_existing_part: false
  });
  const [stockModalError, setStockModalError] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchSpareParts();
  }, []);

  const fetchSpareParts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/spare-parts');
      setSpareParts(response.data);
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
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching all history:', err);
      setError('입출고 내역을 불러오는데 실패했습니다.');
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
      setNewPart({ part_number: '', part_name: '', stock_quantity: 0, price: 0 });
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
      setStockTransaction({
        part_number: '',
        part_name: '',
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
      setStockTransaction({
        part_number: '',
        part_name: '',
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
      await api.put(`/api/spare-parts/${selectedPart.id}`, newPart);
      setShowEditModal(false);
      setSelectedPart(null);
      setNewPart({ part_number: '', part_name: '', stock_quantity: 0, price: 0 });
      fetchSpareParts();
    } catch (err) {
      console.error('Error updating part:', err);
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
              <input
                type="text"
                className="form-control"
                placeholder="부품번호 또는 부품명을 검색하세요..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                {user?.spare_parts_access && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      fetchAllHistory();
                      setShowHistoryModal(true);
                    }}
                  >
                    입출고내역
                  </button>
                )}
                {(user?.spare_parts_stock_in ?? false) && (
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => setShowStockInModal(true)}
                  >
                    입고
                  </button>
                )}
                {(user?.spare_parts_stock_out ?? false) && (
                  <button 
                    className="btn btn-outline-warning"
                    onClick={() => setShowStockOutModal(true)}
                  >
                    출고
                  </button>
                )}
                {user?.spare_parts_access && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowRegisterModal(true)}
                  >
                    새파트등록
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ marginTop: '6px' }}>
        <div className="container-xl">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <div className="card">
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>부품번호</th>
                    <th>부품명</th>
                    <th>재고수량</th>
                    <th>가격(EUR)</th>
                    <th>등록일</th>
                    <th className="w-1">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.length > 0 ? (
                    filteredParts.map((part) => (
                      <tr key={part.id}>
                        <td>{part.part_number}</td>
                        <td>{part.part_name}</td>
                        <td>{part.stock_quantity}</td>
                        <td>€{part.price?.toFixed(2) || '0.00'}</td>
                        <td>{new Date(part.created_at).toLocaleDateString('ko-KR')}</td>
                        <td>
                          <div className="btn-list flex-nowrap">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setSelectedPart(part);
                                setShowViewModal(true);
                              }}
                            >
                              보기
                            </button>
                            {(user?.spare_parts_edit ?? false) && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                  setSelectedPart(part);
                                  setNewPart({
                                    part_number: part.part_number,
                                    part_name: part.part_name,
                                    stock_quantity: part.stock_quantity,
                                    price: part.price
                                  });
                                  setShowEditModal(true);
                                }}
                              >
                                편집
                              </button>
                            )}
                            {(user?.spare_parts_delete ?? false) && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  setSelectedPart(part);
                                  setShowDeleteModal(true);
                                }}
                              >
                                삭제
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
          </div>
        </div>
      </div>

      {showHistoryModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal modal-blur fade show" style={{ display: 'block', zIndex: 1055 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">입출고 내역</h5>
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
                          <th>이전재고</th>
                          <th>변경후재고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.length > 0 ? (
                          history.map((record) => (
                            <tr key={record.id}>
                              <td>{new Date(record.transaction_date).toLocaleString('ko-KR')}</td>
                              <td>{record.part_number}</td>
                              <td>{record.part_name || '-'}</td>
                              <td>
                                <span className={`badge ${record.transaction_type === 'IN' ? 'bg-primary' : 'bg-warning'}`}>
                                  {record.transaction_type === 'IN' ? '입고' : '출고'}
                                </span>
                              </td>
                              <td>{record.quantity}개</td>
                              <td>{record.previous_stock}개</td>
                              <td>{record.new_stock}개</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center text-muted">
                              입출고 내역이 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 새 부품 등록 모달 */}
      {showRegisterModal && (
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
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
                    <label className="form-label">초기 재고수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newPart.stock_quantity}
                      onChange={(e) => setNewPart({...newPart, stock_quantity: parseInt(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">가격(EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={newPart.price}
                      onChange={(e) => setNewPart({...newPart, price: parseFloat(e.target.value) || 0})}
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
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 입고</h5>
                <button type="button" className="btn-close" onClick={() => setShowStockInModal(false)}></button>
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
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.part_number}
                      onChange={(e) => {
                        const value = e.target.value;
                        setStockTransaction({...stockTransaction, part_number: value});
                        searchPartByNumber(value);
                      }}
                      placeholder="부품번호를 입력하세요"
                    />
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockInModal(false)}>
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
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 출고</h5>
                <button type="button" className="btn-close" onClick={() => setShowStockOutModal(false)}></button>
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
                    <input
                      type="text"
                      className="form-control"
                      value={stockTransaction.part_number}
                      onChange={(e) => {
                        const value = e.target.value;
                        setStockTransaction({...stockTransaction, part_number: value});
                        
                        if (value.trim()) {
                          searchPartByNumber(value);
                        } else {
                          setStockTransaction({...stockTransaction, part_number: value, part_name: ''});
                        }
                      }}
                      placeholder="부품번호 입력"
                    />
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
                            setCustomerSearchResults([]);
                          }
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
                          overflowY: 'auto',
                          zIndex: 1050
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
                              {customer.customer_name}
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockOutModal(false)}>
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
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
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
                    <label className="form-label">재고수량</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPart.stock_quantity}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">가격(EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={selectedPart.price}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label">등록일</label>
                    <input
                      type="text"
                      className="form-control"
                      value={new Date(selectedPart.created_at).toLocaleString('ko-KR')}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">수정일</label>
                    <input
                      type="text"
                      className="form-control"
                      value={new Date(selectedPart.updated_at).toLocaleString('ko-KR')}
                      readOnly
                    />
                  </div>
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
        <div className="modal modal-blur fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">부품 정보 수정</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
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
                <div className="row mt-3">
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
                  <div className="col-md-6">
                    <label className="form-label">가격(EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={newPart.price}
                      onChange={(e) => setNewPart({...newPart, price: parseFloat(e.target.value) || 0})}
                      min="0"
                    />
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
    </div>
  );
};

export default SpareParts;