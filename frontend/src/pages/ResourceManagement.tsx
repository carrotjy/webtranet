import React, { useState, useEffect, useCallback } from 'react';
import { resourceAPI, customerAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

interface ManagementHistory {
  id?: number;
  date: string;
  content: string;
}

interface Resource {
  id: number;
  category: string;
  serial_number: string;
  product_name: string;
  note: string;
  management_history?: ManagementHistory[];
  customer_id: number;
  customer_name?: string;
}

interface Customer {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  tel: string;
  fax: string;
  president: string;
  mobile: string;
  contact: string;
}

const CATEGORIES = ['Pressbrake', 'Laser', 'Software'];

const ResourceManagement: React.FC = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 정렬 관련 상태
  const [sortField, setSortField] = useState<'serial_number' | 'warranty_expiration' | null>('serial_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 고객 검색 관련 state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1); // 키보드 네비게이션용

  // 히스토리 템플릿 관련 state
  const [historyTemplates, setHistoryTemplates] = useState<string[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState<number | null>(null);

  const [formData, setFormData] = useState<Omit<Resource, 'id'>>({
    category: '',
    serial_number: '',
    product_name: '',
    note: '',
    management_history: [],
    customer_id: 0
  });

  useEffect(() => {
    console.log('ResourceManagement 컴포넌트 마운트');
    loadResources();
    loadCustomers();
    loadHistoryTemplates();
  }, []);

  // 히스토리 템플릿 로드 (useCallback으로 메모이제이션)
  const loadHistoryTemplates = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('resourceSettings');
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        if (settings.historyTemplates) {
          const templates = settings.historyTemplates
            .split(',')
            .map((template: string) => template.trim())
            .filter((template: string) => template.length > 0);
          setHistoryTemplates(templates);
        } else {
          setDefaultTemplates();
        }
      } else {
        setDefaultTemplates();
      }
    } catch (error) {
      console.error('히스토리 템플릿 로드 실패:', error);
      setDefaultTemplates();
    }
  }, []);

  // 기본 템플릿 설정 (useCallback으로 메모이제이션)
  const setDefaultTemplates = useCallback(() => {
    const defaultTemplates = [
      'FAC 서명',
      '설비 설치', 
      '시운전 완료',
      '사용자 교육 완료',
      '정기 점검',
      '부품 교체',
      '수리 완료',
      '보증기한 만료',
      '장비 이설',
      '폐기 처리'
    ];
    setHistoryTemplates(defaultTemplates);
    
    // localStorage에도 저장
    const defaultSettings = {
      historyTemplates: defaultTemplates.join(', ')
    };
    localStorage.setItem('resourceSettings', JSON.stringify(defaultSettings));
  }, []);

  // 외부 클릭 시 고객 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.position-relative')) {
        setShowCustomerSearch(false);
        setSelectedIndex(-1);
      }
      if (!target.closest('.history-dropdown-container')) {
        setShowHistoryDropdown(null);
      }
    };

    if (showCustomerSearch || showHistoryDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCustomerSearch, showHistoryDropdown]);

  // 보증기한 만료일 추출 함수
  const getWarrantyExpirationDate = (managementHistory: ManagementHistory[]): string => {
    if (!managementHistory || managementHistory.length === 0) {
      return '-';
    }
    
    // "보증기한 만료" 키워드가 포함된 이력 찾기
    const warrantyExpiration = managementHistory.find(history => 
      history.content && history.content.includes('보증기한 만료')
    );
    
    return warrantyExpiration ? warrantyExpiration.date : '-';
  };

  // 정렬 함수
  const handleSort = (field: 'serial_number' | 'warranty_expiration') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // 새로운 컬럼 클릭 시 기본적으로 내림차순
    }
  };

  const getSortIcon = (field: 'serial_number' | 'warranty_expiration') => {
    if (sortField !== field) return '';
    return sortDirection === 'desc' ? '▼' : '▲';
  };

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      // include_customer=true 파라미터로 고객 정보와 함께 리소스 조회
      const response = await resourceAPI.getResources(undefined, true);
      setResources(response.data);
    } catch (error) {
      console.error('리소스 로드 실패:', error);
      setError('리소스를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await customerAPI.getCustomers();
      
      // API 응답에서 customers 배열 추출 (ServiceReports와 동일한 방식)
      const customerData = response.data?.customers || [];
      
      if (Array.isArray(customerData)) {
        setCustomers(customerData);
      } else {
        console.warn('고객 데이터가 배열이 아닙니다:', customerData);
        setCustomers([]);
      }
    } catch (error) {
      console.error('고객 목록 로드 실패:', error);
      setCustomers([]); // 에러 시 빈 배열로 설정
    }
  }, []);

  // 고객 검색 함수
  const searchCustomers = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
      setSelectedIndex(-1);
      return;
    }

    // customers가 배열인지 확인
    if (!Array.isArray(customers)) {
      console.warn('customers가 배열이 아닙니다:', customers);
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
      setSelectedIndex(-1);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setCustomerSearchResults(filtered);
    setShowCustomerSearch(true);
    setSelectedIndex(-1); // 검색 시 선택 인덱스 초기화
  }, [customers]);

  // 키보드 이벤트 처리 함수
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showCustomerSearch || customerSearchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < customerSearchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : customerSearchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < customerSearchResults.length) {
          handleSelectCustomer(customerSearchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowCustomerSearch(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // 고객 선택 함수
  const handleSelectCustomer = (customer: Customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id
    });
    setCustomerSearchTerm(customer.company_name);
    setShowCustomerSearch(false);
    setCustomerSearchResults([]);
    setSelectedIndex(-1); // 선택 후 인덱스 초기화
  };

  // 전체 고객 리스트 표시
  const showAllCustomers = useCallback(() => {
    // customers가 배열인지 확인
    if (!Array.isArray(customers)) {
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
      setSelectedIndex(-1);
      return;
    }
    
    setCustomerSearchResults(customers.slice(0, 20)); // 처음 20개만 표시
    setShowCustomerSearch(true);
    setSelectedIndex(-1); // 인덱스 초기화
  }, [customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 보기 모드일 때는 폼 제출하지 않음
    if (isViewMode) {
      return;
    }
    
    if (!formData.category.trim()) {
      alert('카테고리를 선택해주세요.');
      return;
    }
    
    if (!formData.serial_number.trim()) {
      alert('시리얼 번호를 입력해주세요.');
      return;
    }
    
    if (!formData.product_name.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    if (!formData.customer_id) {
      alert('고객을 선택해주세요.');
      return;
    }

    try {
      console.log('전송할 formData:', formData);
      
      if (editingResource) {
        await resourceAPI.updateResource(editingResource.id, formData);
        alert('리소스가 수정되었습니다.');
      } else {
        await resourceAPI.createResource(formData);
        alert('리소스가 추가되었습니다.');
      }
      
      await loadResources();
      setShowForm(false);
      setEditingResource(null);
      setFormData({
        category: '',
        serial_number: '',
        product_name: '',
        note: '',
        management_history: [],
        customer_id: 0
      });
    } catch (error: any) {
      console.error('리소스 저장 실패:', error);
      console.error('에러 상세:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
      console.error('에러 메시지:', error.message);
      
      // 서버에서 온 에러 메시지 표시
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
      alert(`리소스 저장 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setIsViewMode(false);
    setFormData({
      category: resource.category || '',
      serial_number: resource.serial_number || '',
      product_name: resource.product_name || '',
      note: resource.note || '',
      management_history: resource.management_history || [],
      customer_id: resource.customer_id || 0
    });
    // 고객명 설정
    setCustomerSearchTerm(resource.customer_name || '');
    setShowCustomerSearch(false);
    setCustomerSearchResults([]);
    setShowForm(true);
  };

  const handleView = (resource: Resource) => {
    // 보기 모드로 설정 (편집 불가)
    setEditingResource(resource);
    setIsViewMode(true);
    setFormData({
      category: resource.category || '',
      serial_number: resource.serial_number || '',
      product_name: resource.product_name || '',
      note: resource.note || '',
      management_history: resource.management_history || [],
      customer_id: resource.customer_id || 0
    });
    // 고객명 설정
    setCustomerSearchTerm(resource.customer_name || '');
    setShowCustomerSearch(false);
    setCustomerSearchResults([]);
    setShowForm(true);
  };

  // 관리 이력 추가 함수
  const addManagementHistory = () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const newHistory: ManagementHistory = {
      date: today,
      content: ''
    };
    setFormData({
      ...formData,
      management_history: [...(formData.management_history || []), newHistory]
    });
  };

  // 관리 이력 삭제 함수
  const removeManagementHistory = (index: number) => {
    const updatedHistory = (formData.management_history || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      management_history: updatedHistory
    });
  };

  // 관리 이력 업데이트 함수
  const updateManagementHistory = useCallback((index: number, field: 'date' | 'content', value: string) => {
    const updatedHistory = [...(formData.management_history || [])];
    if (updatedHistory[index]) {
      updatedHistory[index] = { ...updatedHistory[index], [field]: value };
      setFormData({
        ...formData,
        management_history: updatedHistory
      });
    }
  }, [formData]);

  // 히스토리 템플릿 선택 함수
  const selectHistoryTemplate = useCallback((index: number, template: string) => {
    updateManagementHistory(index, 'content', template);
    setShowHistoryDropdown(null);
  }, [updateManagementHistory]);

  const handleDelete = async (resourceId: number) => {
    if (window.confirm('정말로 이 리소스를 삭제하시겠습니까?')) {
      try {
        await resourceAPI.deleteResource(resourceId);
        await loadResources();
        alert('리소스가 삭제되었습니다.');
      } catch (error) {
        console.error('리소스 삭제 실패:', error);
        alert('리소스 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  // 필터링된 리소스
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchTerm || 
      resource.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resource.management_history && resource.management_history.some(history => 
        history.content.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    const matchesCategory = !selectedCategory || resource.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    if (sortField === 'serial_number') {
      const comparison = a.serial_number.localeCompare(b.serial_number);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'warranty_expiration') {
      const dateA = getWarrantyExpirationDate(a.management_history || []);
      const dateB = getWarrantyExpirationDate(b.management_history || []);
      
      // "-" 값은 항상 뒤로 정렬
      if (dateA === '-' && dateB === '-') return 0;
      if (dateA === '-') return 1;
      if (dateB === '-') return -1;
      
      const comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    
    return 0;
  });

  // 페이지네이션
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResources = filteredResources.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);

  if (loading) {
    return (
      <div className="container-xl">
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">로딩중...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-xl">
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      </div>
    );
  }

  // 폼 표시 시
  if (showForm) {
    return (
      <div className="modal modal-blur show" style={{display: 'block'}}>
        {/* 모달 백드롭 */}
        <div 
          className="modal-backdrop show" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: 1040
          }}
          onClick={() => {
            setShowForm(false);
            setEditingResource(null);
            setIsViewMode(false);
            setCustomerSearchTerm('');
            setShowCustomerSearch(false);
            setCustomerSearchResults([]);
          }}
        ></div>
        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ zIndex: 1050 }}>
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                  <h5 className="modal-title">
                    {isViewMode ? '리소스 상세 정보' : editingResource ? '리소스 수정' : '새 리소스 추가'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingResource(null);
                      setIsViewMode(false);
                      setCustomerSearchTerm('');
                      setShowCustomerSearch(false);
                      setCustomerSearchResults([]);
                    }}
                  ></button>
                </div>
                
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">고객사 *</label>
                        <div className="position-relative">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="고객사명을 입력하여 검색..."
                            value={customerSearchTerm}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCustomerSearchTerm(value);
                              if (value.length >= 1) {
                                searchCustomers(value);
                              } else {
                                setCustomerSearchResults([]);
                                setShowCustomerSearch(false);
                                setSelectedIndex(-1);
                                setFormData({...formData, customer_id: 0});
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
                            onKeyDown={handleKeyDown}
                            required
                            disabled={isViewMode}
                          />
                          {showCustomerSearch && !isViewMode && (
                            <div 
                              className="position-absolute w-100 mt-1"
                              style={{
                                zIndex: 1000,
                                backgroundColor: '#ffffff',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                maxHeight: '200px',
                                overflowY: 'auto'
                              }}
                            >
                              {customerSearchResults.length > 0 ? (
                                customerSearchResults.map((customer, index) => (
                                  <div
                                    key={customer.id}
                                    className="px-3 py-2"
                                    style={{ 
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #eee',
                                      backgroundColor: selectedIndex === index ? '#e3f2fd' : '',
                                      color: selectedIndex === index ? '#1976d2' : ''
                                    }}
                                    onMouseEnter={(e) => {
                                      if (selectedIndex !== index) {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (selectedIndex !== index) {
                                        e.currentTarget.style.backgroundColor = '';
                                      } else {
                                        e.currentTarget.style.backgroundColor = '#e3f2fd';
                                      }
                                    }}
                                    onClick={() => handleSelectCustomer(customer)}
                                  >
                                    <div className="fw-medium">{customer.company_name}</div>
                                    <small className="text-muted">{customer.contact_person}</small>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-muted">검색 결과가 없습니다.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">카테고리</label>
                        <select
                          className="form-select"
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          disabled={isViewMode}
                        >
                          <option value="">카테고리 선택</option>
                          {CATEGORIES.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">시리얼 번호 *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.serial_number}
                          onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                          required
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">제품명 *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.product_name}
                          onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                          required
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <label className="form-label">관리 이력</label>
                      {!isViewMode && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={addManagementHistory}
                        >
                          + 이력 추가
                        </button>
                      )}
                    </div>
                    
                    {formData.management_history && formData.management_history.length > 0 ? (
                      <div className="mt-3">
                        <table className="table">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '130px' }}>일자</th>
                              <th>내용</th>
                              {!isViewMode && <th style={{ width: '50px' }}></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {formData.management_history.map((history, index) => (
                              <tr key={index}>
                                <td>
                                  {isViewMode ? (
                                    <span className="text-muted">{history.date}</span>
                                  ) : (
                                    <input
                                      type="date"
                                      className="form-control form-control-sm"
                                      value={history.date}
                                      onChange={(e) => updateManagementHistory(index, 'date', e.target.value)}
                                    />
                                  )}
                                </td>
                                <td>
                                  {isViewMode ? (
                                    <span>{history.content}</span>
                                  ) : (
                                    <div className="position-relative history-dropdown-container">
                                      <div className="input-group input-group-sm">
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={history.content}
                                          onChange={(e) => updateManagementHistory(index, 'content', e.target.value)}
                                          placeholder="관리 이력 내용을 입력하세요"
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split"
                                          onClick={() => {
                                            console.log('드롭다운 버튼 클릭, 현재 템플릿:', historyTemplates);
                                            console.log('현재 showHistoryDropdown:', showHistoryDropdown, 'index:', index);
                                            setShowHistoryDropdown(showHistoryDropdown === index ? null : index);
                                          }}
                                          title={`템플릿 선택 (${historyTemplates.length}개)`}
                                        >
                                          <span className="visually-hidden">Template</span>
                                        </button>
                                      </div>
                                      {showHistoryDropdown === index && (
                                        <div className="dropdown-menu show" style={{
                                          position: 'absolute',
                                          top: '100%',
                                          left: 0,
                                          right: 0,
                                          zIndex: 9999,
                                          maxHeight: '200px',
                                          overflowY: 'auto',
                                          backgroundColor: 'white',
                                          border: '1px solid #dee2e6',
                                          borderRadius: '0.375rem',
                                          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
                                        }}>
                                          {historyTemplates.length > 0 ? (
                                            historyTemplates.map((template, templateIndex) => (
                                              <button
                                                key={templateIndex}
                                                type="button"
                                                className="dropdown-item"
                                                onClick={() => selectHistoryTemplate(index, template)}
                                                style={{
                                                  padding: '0.5rem 1rem',
                                                  border: 'none',
                                                  background: 'none',
                                                  textAlign: 'left',
                                                  width: '100%',
                                                  cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                              >
                                                {template}
                                              </button>
                                            ))
                                          ) : (
                                            <div className="dropdown-item-text text-muted" style={{ padding: '0.5rem 1rem' }}>
                                              설정된 템플릿이 없습니다.<br/>
                                              <small>관리자 &gt; 리소스 설정에서 템플릿을 추가하세요.</small>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                {!isViewMode && (
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => removeManagementHistory(index)}
                                      title="삭제"
                                    >
                                      ×
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      !isViewMode && (
                        <div className="text-muted text-center py-3">
                          관리 이력이 없습니다. '+ 이력 추가' 버튼을 클릭하여 이력을 추가하세요.
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  {!isViewMode && (
                    <button type="submit" className="btn btn-primary">
                      {editingResource ? '수정' : '저장'}
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingResource(null);
                      setIsViewMode(false);
                      setCustomerSearchTerm('');
                      setShowCustomerSearch(false);
                      setCustomerSearchResults([]);
                    }}
                  >
                    {isViewMode ? '닫기' : '취소'}
                  </button>
                </div>
              </form>
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
            <div className="position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="검색어를 입력하세요 (제품명, 시리얼번호, 고객사, 관리이력)"
                value={searchTerm}
                onChange={handleSearchChange}
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
          <div className="col-auto">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">전체 카테고리</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="col-auto">
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
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setEditingResource(null);
                  setIsViewMode(false);
                  setFormData({
                    category: '',
                    serial_number: '',
                    product_name: '',
                    note: '',
                    management_history: [],
                    customer_id: 0
                  });
                  setCustomerSearchTerm('');
                  setShowCustomerSearch(false);
                  setCustomerSearchResults([]);
                  setShowForm(true);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                리소스 추가
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          <div className="mb-2">
            <small className="text-muted">SN / 보증기한 만료일 헤더 클릭 시 정렬 가능</small>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter table-striped">
              <thead>
                <tr>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none', color: '#206bc4' }}
                    onClick={() => handleSort('serial_number')}
                  >
                    SN {getSortIcon('serial_number')}
                  </th>
                  <th>장비명</th>
                  <th>카테고리</th>
                  <th>고객사</th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none', color: '#206bc4' }}
                    onClick={() => handleSort('warranty_expiration')}
                  >
                    보증기한 만료일 {getSortIcon('warranty_expiration')}
                  </th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {currentResources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      {filteredResources.length === 0 && searchTerm 
                        ? '검색 결과가 없습니다.'
                        : '등록된 리소스가 없습니다.'
                      }
                    </td>
                  </tr>
                ) : (
                  currentResources.map((resource) => (
                    <tr key={resource.id}>
                      <td>{resource.serial_number}</td>
                      <td>{resource.product_name}</td>
                      <td>{resource.category}</td>
                      <td>{resource.customer_name}</td>
                      <td>{getWarrantyExpirationDate(resource.management_history || [])}</td>
                      <td>
                        <div className="d-flex gap-1">
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
                            onClick={() => handleView(resource)}
                            title="보기"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          {user?.is_admin && (
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
                              onClick={() => handleEdit(resource)}
                              title="편집"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          )}
                          {user?.is_admin && (
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
                              onClick={() => handleDelete(resource.id)}
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
                )}
              </tbody>
            </table>
          </div>

          {filteredResources.length > 0 && (
            <div className="mt-3">
              <div className="text-center text-muted mb-2">
                총 {filteredResources.length}개 중 {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResources.length)}개 표시
              </div>
              <div className="d-flex justify-content-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredResources.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onPreviousPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceManagement;