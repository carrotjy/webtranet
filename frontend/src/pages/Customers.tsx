import React, { useState, useEffect } from 'react';
import { customerAPI, resourceAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  postal_code?: string;
  tel?: string;
  fax?: string;
  president?: string;
  mobile?: string;
  contact?: string;
  homepage?: string;
  business_card_image?: string;
  updated_at?: string;
  resources?: Resource[];
}

interface Resource {
  id?: number;
  customer_id?: number;
  category: string;
  serial_number: string;
  product_name: string;
  note?: string;
  updated_at?: string;
}

interface CustomerForm {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  fax: string;
  president: string;
  mobile: string;
  contact: string;
  homepage: string;
  business_card_image: string;
}

const CATEGORIES = ['Pressbrake', 'Laser', 'Software'];

const Customers: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [perPage, setPerPage] = useState(10); // 페이지당 고객 수
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerResources, setCustomerResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExtractingCard, setIsExtractingCard] = useState(false);
  const [showBusinessCardUpload, setShowBusinessCardUpload] = useState(false);

  const [formData, setFormData] = useState<CustomerForm>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    fax: '',
    president: '',
    mobile: '',
    contact: '',
    homepage: '',
    business_card_image: ''
  });

  const [resourceFormData, setResourceFormData] = useState<Resource>({
    category: 'Pressbrake',
    serial_number: '',
    product_name: '',
    note: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []); // 초기 로드 시 한 번만 실행

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        include_resources: true,
        per_page: 9999 // 전체 데이터 로드
      };

      const response = await customerAPI.getCustomers(params);

      const data = response.data;
      setCustomers(data.customers || []);
      setTotalCustomers(data.total || 0);
    } catch (error) {
      console.error('고객 정보 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerResources = async (customerId: number) => {
    try {
      const response = await resourceAPI.getResources(customerId);
      setCustomerResources(response.data);
    } catch (error) {
      console.error('리소스 정보 로딩 실패:', error);
    }
  };

  // 주소 복사 함수
  const copyAddressToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 클립보드에 복사되었습니다.');
    } catch (err) {
      // fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('주소가 클립보드에 복사되었습니다.');
    }
  };

  // 팩스 복사 함수
  const copyFaxToClipboard = async (fax: string) => {
    try {
      await navigator.clipboard.writeText(fax);
      alert('팩스 번호가 클립보드에 복사되었습니다.');
    } catch (err) {
      // fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fax;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('팩스 번호가 클립보드에 복사되었습니다.');
    }
  };

  // 페이지 네비게이션 함수들
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(currentPage + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name.trim()) {
      alert('회사명을 입력해 주세요.');
      return;
    }
    
    if (!formData.contact_person.trim()) {
      alert('담당자명을 입력해 주세요.');
      return;
    }

    try {
      if (editingCustomer) {
        await customerAPI.updateCustomer(editingCustomer.id, formData);
        alert('고객 정보가 성공적으로 수정되었습니다.');
      } else {
        await customerAPI.createCustomer(formData);
        alert('고객 정보가 성공적으로 등록되었습니다.');
      }
      
      setShowForm(false);
      setEditingCustomer(null);
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        fax: '',
        president: '',
        mobile: '',
        contact: '',
        homepage: '',
        business_card_image: ''
      });
      loadCustomers();
    } catch (error) {
      console.error('고객 정보 저장 실패:', error);
      alert('고객 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resourceFormData.serial_number.trim()) {
      alert('시리얼 번호를 입력해 주세요.');
      return;
    }
    
    if (!resourceFormData.product_name.trim()) {
      alert('제품명을 입력해 주세요.');
      return;
    }

    try {
      const resourceData = {
        ...resourceFormData,
        customer_id: selectedCustomer?.id
      };
      
      if (editingResource) {
        // 수정 모드
        await resourceAPI.updateResource(editingResource.id!, resourceData);
        setEditingResource(null);
        alert('리소스가 성공적으로 수정되었습니다.');
      } else {
        // 생성 모드
        await resourceAPI.createResource(resourceData);
        alert('리소스가 성공적으로 등록되었습니다.');
      }
      
      setShowResourceForm(false);
      setResourceFormData({
        category: 'Pressbrake',
        serial_number: '',
        product_name: '',
        note: ''
      });
      
      if (selectedCustomer) {
        // 장비 목록과 고객 데이터를 모두 새로고침
        await loadCustomerResources(selectedCustomer.id);
        await loadCustomers();
      }
    } catch (error) {
      console.error('리소스 저장 실패:', error);
      alert('리소스 저장 중 오류가 발생했습니다.');
    }
  };

  const handleResourceEdit = (resource: Resource) => {
    setEditingResource(resource);
    setResourceFormData({
      category: resource.category,
      serial_number: resource.serial_number,
      product_name: resource.product_name,
      note: resource.note || ''
    });
    setShowResourceForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name,
      contact_person: customer.contact_person,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      postal_code: customer.postal_code || '',
      fax: customer.fax || '',
      president: customer.president || '',
      mobile: customer.mobile || '',
      contact: customer.contact || '',
      homepage: customer.homepage || '',
      business_card_image: customer.business_card_image || ''
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      postal_code: '',
      fax: '',
      president: '',
      mobile: '',
      contact: '',
      homepage: '',
      business_card_image: ''
    });
    setShowForm(true);
  };

  const handleView = (customer: Customer) => {
    // 보기 전용 모달 표시
    setViewingCustomer(customer);
    setShowViewModal(true);
  };

  const handleDelete = async (customerId: number) => {
    if (window.confirm('정말로 이 고객 정보를 삭제하시겠습니까?')) {
      try {
        await customerAPI.deleteCustomer(customerId);
        loadCustomers();
        alert('고객 정보가 삭제되었습니다.');
      } catch (error) {
        console.error('고객 삭제 실패:', error);
        alert('고객 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleResourceDelete = async (resourceId: number) => {
    if (window.confirm('정말로 이 리소스를 삭제하시겠습니까?')) {
      try {
        await resourceAPI.deleteResource(resourceId);
        if (selectedCustomer) {
          // 장비 목록과 고객 데이터를 모두 새로고침
          await loadCustomerResources(selectedCustomer.id);
          await loadCustomers();
        }
        alert('리소스가 삭제되었습니다.');
      } catch (error) {
        console.error('리소스 삭제 실패:', error);
        alert('리소스 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 검색어 변경 시 첫 페이지로 리셋
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  // 검색어 클리어 함수
  const handleSearchClear = () => {
    setSearchTerm('');
    setCurrentPage(1); // 검색 클리어 시 첫 페이지로 이동
  };

  // 명함 이미지로부터 정보 추출
  const handleBusinessCardUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtractingCard(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/customers/extract-business-card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 추출된 데이터로 폼 필드 채우기
          setFormData(prev => ({
            ...prev,
            company_name: result.data.company_name || prev.company_name,
            contact_person: result.data.contact_person || prev.contact_person,
            email: result.data.email || prev.email,
            phone: result.data.phone || prev.phone,
            address: result.data.address || prev.address,
            fax: result.data.fax || prev.fax,
            mobile: result.data.mobile || prev.mobile,
            homepage: result.data.homepage || prev.homepage,
            president: result.data.president || prev.president,
            business_card_image: result.data.business_card_image || prev.business_card_image
          }));
          setShowBusinessCardUpload(false);
          alert('명함 정보가 성공적으로 추출되었습니다. 정보를 확인하고 수정해주세요.');
        } else {
          alert('명함 정보 추출에 실패했습니다.');
        }
      } else {
        const error = await response.json();
        alert(error.error || '명함 정보 추출에 실패했습니다.');
      }
    } catch (error) {
      console.error('명함 정보 추출 실패:', error);
      alert('명함 정보 추출 중 오류가 발생했습니다.');
    } finally {
      setIsExtractingCard(false);
    }
  };

  if (showForm) {
    return (
      <div className="page-header d-print-none">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">
                {editingCustomer ? '고객 정보 수정' : '새 고객 등록'}
              </h2>
            </div>
            <div className="col-auto">
              {!editingCustomer && (
                <>
                  <input
                    type="file"
                    id="business-card-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBusinessCardUpload}
                  />
                  <button
                    className="btn btn-primary me-2"
                    onClick={() => document.getElementById('business-card-upload')?.click()}
                    disabled={isExtractingCard}
                  >
                    {isExtractingCard ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        추출 중...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="16" rx="2"/>
                          <line x1="7" y1="8" x2="17" y2="8"/>
                          <line x1="7" y1="12" x2="13" y2="12"/>
                          <line x1="7" y1="16" x2="10" y2="16"/>
                        </svg>
                        명함으로부터 등록
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
        
        <div className="page-body">
          <div className="container-xl">
            <form onSubmit={handleSubmit}>
              <div className="card">
                <div className="card-body">
                  <div className="row">
                    {/* 첫 번째 줄: 회사명, 이메일 */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">회사명 *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.company_name}
                          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">이메일</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* 두 번째 줄: 담당자, 담당자 연락처 */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">담당자 *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.contact_person}
                          onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">담당자 연락처</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.contact}
                          onChange={(e) => setFormData({...formData, contact: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* 전화번호, 팩스번호 */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">전화번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">팩스번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.fax}
                          onChange={(e) => setFormData({...formData, fax: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* 주소, 우편번호 (8:4 비율) */}
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">주소</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            readOnly
                          />
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => {
                              // @ts-ignore
                              new window.daum.Postcode({
                                oncomplete: function(data: any) {
                                  // 도로명 주소 또는 지번 주소 선택
                                  const fullAddress = data.roadAddress || data.jibunAddress;
                                  setFormData({
                                    ...formData,
                                    address: fullAddress,
                                    postal_code: data.zonecode
                                  });
                                }
                              }).open();
                            }}
                          >
                            주소 검색
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">우편번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* 대표자, 대표자 휴대폰 */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">대표자</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.president}
                          onChange={(e) => setFormData({...formData, president: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">대표자 휴대폰</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.mobile}
                          onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* 홈페이지 */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">홈페이지</label>
                        <input
                          type="url"
                          className="form-control"
                          value={formData.homepage}
                          onChange={(e) => setFormData({...formData, homepage: e.target.value})}
                          placeholder="http://example.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">
                      {editingCustomer ? '수정' : '저장'}
                    </button>
                    {editingCustomer && (
                      <button 
                        type="button"
                        className="btn btn-info"
                        onClick={async () => {
                          setSelectedCustomer(editingCustomer);
                          await loadCustomerResources(editingCustomer.id);
                        }}
                      >
                        장비관리
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setShowForm(false);
                        setEditingCustomer(null);
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* 수정 폼에서도 장비관리 모달 표시 */}
        {selectedCustomer && (
          <div className="modal modal-blur fade show" style={{display: 'block'}} data-bs-backdrop="static" data-bs-keyboard="false" id="equipmentModalFromForm">
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{selectedCustomer.company_name} - 보유 장비 관리</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerResources([]);
                      setShowResourceForm(false);
                      setEditingResource(null);
                    }}
                  />
                </div>
                <div className="modal-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6>보유 장비 목록</h6>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setEditingResource(null);
                        setResourceFormData({
                          category: 'Pressbrake',
                          serial_number: '',
                          product_name: '',
                          note: ''
                        });
                        setShowResourceForm(true);
                      }}
                    >
                      장비 추가
                    </button>
                  </div>

                  {customerResources.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-muted">등록된 장비가 없습니다.</div>
                      <button 
                        className="btn btn-primary mt-2"
                        onClick={() => {
                          setEditingResource(null);
                          setResourceFormData({
                            category: 'Pressbrake',
                            serial_number: '',
                            product_name: '',
                            note: ''
                          });
                          setShowResourceForm(true);
                        }}
                      >
                        첫 번째 장비 추가
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>카테고리</th>
                            <th>제품명</th>
                            <th>시리얼번호</th>
                            <th>비고</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerResources.map((resource) => (
                            <tr key={resource.id}>
                              <td>
                                <span className="badge bg-blue-lt">{resource.category}</span>
                              </td>
                              <td>{resource.product_name}</td>
                              <td>{resource.serial_number}</td>
                              <td>{resource.note}</td>
                              <td>
                                <div className="btn-list">
                                  <button 
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => handleResourceEdit(resource)}
                                  >
                                    편집
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => resource.id && handleResourceDelete(resource.id)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 리소스 추가 폼 */}
                  {showResourceForm && (
                    <div className="card mt-3">
                      <div className="card-header">
                        <h6>{editingResource ? '장비 수정' : '새 장비 추가'}</h6>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleResourceSubmit}>
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">카테고리 *</label>
                                <select
                                  className="form-select"
                                  value={resourceFormData.category}
                                  onChange={(e) => setResourceFormData({...resourceFormData, category: e.target.value})}
                                  required
                                >
                                  {CATEGORIES.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">시리얼번호 *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={resourceFormData.serial_number}
                                  onChange={(e) => setResourceFormData({...resourceFormData, serial_number: e.target.value})}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-12">
                              <div className="mb-3">
                                <label className="form-label">제품명 *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={resourceFormData.product_name}
                                  onChange={(e) => setResourceFormData({...resourceFormData, product_name: e.target.value})}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-12">
                              <div className="mb-3">
                                <label className="form-label">비고</label>
                                <textarea
                                  className="form-control"
                                  rows={2}
                                  value={resourceFormData.note}
                                  onChange={(e) => setResourceFormData({...resourceFormData, note: e.target.value})}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary">
                              {editingResource ? '수정' : '저장'}
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setShowResourceForm(false);
                                setEditingResource(null);
                                setResourceFormData({
                                  category: 'Pressbrake',
                                  serial_number: '',
                                  product_name: '',
                                  note: ''
                                });
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerResources([]);
                      setShowResourceForm(false);
                      setEditingResource(null);
                    }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 보기 전용 모달
  if (showViewModal && viewingCustomer) {
    return (
      <div className="modal modal-blur fade show" style={{display: 'block'}} data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">고객 정보 조회</h5>
              <button 
                type="button" 
                className="btn-close"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCustomer(null);
                }}
              />
            </div>
            <div className="modal-body">
              <div className="row">
                {/* 첫 번째 줄: 회사명, 이메일 */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">회사명</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.company_name}
                      readOnly
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">이메일</label>
                    <input
                      type="email"
                      className="form-control"
                      value={viewingCustomer.email || ''}
                      readOnly
                    />
                  </div>
                </div>

                {/* 두 번째 줄: 담당자, 담당자 연락처 */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">담당자</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.contact_person}
                      readOnly
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">담당자 연락처</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.contact || ''}
                      readOnly
                    />
                  </div>
                </div>

                {/* 세 번째 줄: 전화번호, 팩스번호 */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">전화번호</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.phone || ''}
                      readOnly
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">팩스번호</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.fax || ''}
                      readOnly
                    />
                  </div>
                </div>

                {/* 네 번째 줄: 주소, 우편번호 (7:3 비율) */}
                <div className="col-md-8">
                  <div className="mb-3">
                    <label className="form-label">주소</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.address || ''}
                      readOnly
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">우편번호</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.postal_code || ''}
                      readOnly
                    />
                  </div>
                </div>

                {/* 다섯 번째 줄: 대표자, 대표자 휴대폰 */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">대표자</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.president || ''}
                      readOnly
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">대표자 휴대폰</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viewingCustomer.mobile || ''}
                      readOnly
                    />
                  </div>
                </div>

                {/* 여섯 번째 줄: 홈페이지 */}
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">홈페이지</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={viewingCustomer.homepage || ''}
                        readOnly
                      />
                      {viewingCustomer.homepage && (
                        <a
                          href={viewingCustomer.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-primary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                            <path d="M11 7h-5a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-5"></path>
                            <line x1="10" y1="14" x2="20" y2="4"></line>
                            <polyline points="15 4 20 4 20 9"></polyline>
                          </svg>
                          방문
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCustomer(null);
                }}
              >
                닫기
              </button>
              {hasPermission('customer_update') && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingCustomer);
                  }}
                >
                  편집
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 클라이언트 사이드 검색 필터링
  const filteredCustomers = searchTerm
    ? customers.filter(customer =>
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : customers;

  // 클라이언트 사이드 페이지네이션
  const totalFilteredCustomers = filteredCustomers.length;
  const totalPagesCalculated = Math.ceil(totalFilteredCustomers / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentPageCustomers = filteredCustomers.slice(startIndex, endIndex);

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
                placeholder="검색어를 입력하세요 (고객사명, 담당자, 주소)"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute"
                  onClick={handleSearchClear}
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
              {hasPermission('customer_create') && (
                <button 
                  className="btn btn-primary"
                  onClick={handleAddNew}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  새 고객 추가
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="page-body">
        <div className="container-xl">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">로딩 중...</span>
              </div>
              <div className="mt-3">
                <p className="text-muted">고객 정보를 불러오는 중입니다...</p>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty">
                <div className="empty-img">
                  <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IiM4Nzk0YTgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iOSIgcj0iNCIgc3Ryb2tlPSIjODc5NGE4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K" alt="" height="128" width="128" />
                </div>
                <p className="empty-title">고객이 없습니다</p>
                <p className="empty-subtitle text-muted">
                  첫 번째 고객을 추가해보세요.
                </p>
                <div className="empty-action">
                  {hasPermission('customer_create') && (
                    <button 
                      className="btn btn-primary"
                      onClick={handleAddNew}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      새 고객 추가
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className="table-responsive">
              <table className="table table-vcenter">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'center' }}>회사명</th>
                            <th style={{ textAlign: 'left' }}>주소</th>
                            <th style={{ textAlign: 'center' }}>팩스</th>
                            <th style={{ textAlign: 'center' }}>보유장비</th>
                            <th style={{ textAlign: 'center' }}>업데이트</th>
                            <th style={{ textAlign: 'center' }}>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPageCustomers.map((customer) => (
                            <tr key={customer.id}>
                              <td style={{ textAlign: 'center' }}>
                                <div className="text-reset font-weight-medium">{customer.company_name}</div>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="text-muted small" style={{ lineHeight: '1.4' }}>
                                    {customer.address || '주소 없음'}
                                  </div>
                                  {customer.address && (
                                    <button
                                      className="btn btn-sm p-1"
                                      onClick={() => copyAddressToClipboard(customer.address)}
                                      title="주소 복사"
                                      style={{ 
                                        border: 'none', 
                                        background: 'none',
                                        cursor: 'pointer',
                                        opacity: 0.6
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="d-flex align-items-center gap-2 justify-content-center">
                                  <div className="text-muted small">
                                    {customer.fax || '팩스 없음'}
                                  </div>
                                  {customer.fax && (
                                    <button
                                      className="btn btn-sm p-1"
                                      onClick={() => copyFaxToClipboard(customer.fax!)}
                                      title="팩스 번호 복사"
                                      style={{ 
                                        border: 'none', 
                                        background: 'none',
                                        cursor: 'pointer',
                                        opacity: 0.6
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <div>
                                  {customer.resources?.length ? (
                                    customer.resources.map((resource, index) => (
                                      <div key={index} className="mb-1" style={{ lineHeight: '1.3' }}>
                                        <span className="badge bg-blue-lt me-1">{resource.category}</span>
                                        <small className="text-muted">
                                          {resource.serial_number} - {resource.product_name}
                                        </small>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted">장비 없음</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="text-muted small">
                                  {customer.updated_at ? 
                                    new Date(customer.updated_at).toLocaleDateString('ko-KR', {
                                      year: '2-digit',
                                      month: '2-digit', 
                                      day: '2-digit'
                                    }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, '') :
                                    '정보 없음'
                                  }
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="d-flex gap-1 justify-content-center">
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
                                      onClick={() => handleView(customer)}
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
                                      onClick={() => handleEdit(customer)}
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
                                      onClick={() => handleDelete(customer.id)}
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
                      totalPages={totalPagesCalculated}
                      totalItems={totalFilteredCustomers}
                      itemsPerPage={perPage}
                      onPageChange={handlePageChange}
                      onPreviousPage={handlePreviousPage}
                      onNextPage={handleNextPage}
                    />
                    </>
                  )}
        </div>
      </div>

      {/* 리소스 관리 모달 - 수정 폼에서도 표시되도록 */}
      {selectedCustomer && (
        <div className="modal modal-blur fade show" style={{display: 'block'}} data-bs-backdrop="static" data-bs-keyboard="false" id="equipmentModal">
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedCustomer.company_name} - 보유 장비 관리</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerResources([]);
                    setShowResourceForm(false);
                    setEditingResource(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>보유 장비 목록</h6>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setEditingResource(null);
                      setResourceFormData({
                        category: 'Pressbrake',
                        serial_number: '',
                        product_name: '',
                        note: ''
                      });
                      setShowResourceForm(true);
                    }}
                  >
                    장비 추가
                  </button>
                </div>

                {customerResources.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-muted">등록된 장비가 없습니다.</div>
                    <button 
                      className="btn btn-primary mt-2"
                      onClick={() => {
                        setEditingResource(null);
                        setResourceFormData({
                          category: 'Pressbrake',
                          serial_number: '',
                          product_name: '',
                          note: ''
                        });
                        setShowResourceForm(true);
                      }}
                    >
                      첫 번째 장비 추가
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>카테고리</th>
                          <th>제품명</th>
                          <th>시리얼번호</th>
                          <th>비고</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerResources.map((resource) => (
                          <tr key={resource.id}>
                            <td>
                              <span className="badge bg-blue-lt">{resource.category}</span>
                            </td>
                            <td>{resource.product_name}</td>
                            <td>{resource.serial_number}</td>
                            <td>{resource.note}</td>
                            <td>
                              <div className="btn-list">
                                <button 
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleResourceEdit(resource)}
                                >
                                  편집
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => resource.id && handleResourceDelete(resource.id)}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 리소스 추가 폼 */}
                {showResourceForm && (
                  <div className="card mt-3">
                    <div className="card-header">
                      <h6>{editingResource ? '장비 수정' : '새 장비 추가'}</h6>
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleResourceSubmit}>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">카테고리 *</label>
                              <select
                                className="form-select"
                                value={resourceFormData.category}
                                onChange={(e) => setResourceFormData({...resourceFormData, category: e.target.value})}
                                required
                              >
                                {CATEGORIES.map(category => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">시리얼번호 *</label>
                              <input
                                type="text"
                                className="form-control"
                                value={resourceFormData.serial_number}
                                onChange={(e) => setResourceFormData({...resourceFormData, serial_number: e.target.value})}
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label">제품명 *</label>
                              <input
                                type="text"
                                className="form-control"
                                value={resourceFormData.product_name}
                                onChange={(e) => setResourceFormData({...resourceFormData, product_name: e.target.value})}
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label">비고</label>
                              <textarea
                                className="form-control"
                                rows={2}
                                value={resourceFormData.note}
                                onChange={(e) => setResourceFormData({...resourceFormData, note: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button type="submit" className="btn btn-primary">
                            {editingResource ? '수정' : '저장'}
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setShowResourceForm(false);
                              setEditingResource(null);
                              setResourceFormData({
                                category: 'Pressbrake',
                                serial_number: '',
                                product_name: '',
                                note: ''
                              });
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerResources([]);
                    setShowResourceForm(false);
                    setEditingResource(null);
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Customers;