import React, { useState, useEffect } from 'react';
import { customerAPI, resourceAPI } from '../services/api';
import Pagination from '../components/Pagination';

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
  tel: string;
  fax: string;
  president: string;
  mobile: string;
  contact: string;
}

const CATEGORIES = ['Pressbrake', 'Laser', 'Software'];

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [perPage] = useState(10); // 페이지당 고객 수
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerResources, setCustomerResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [formData, setFormData] = useState<CustomerForm>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    tel: '',
    fax: '',
    president: '',
    mobile: '',
    contact: ''
  });

  const [resourceFormData, setResourceFormData] = useState<Resource>({
    category: 'Pressbrake',
    serial_number: '',
    product_name: '',
    note: ''
  });

  useEffect(() => {
    loadCustomers();
  }, [currentPage, searchTerm]); // currentPage와 searchTerm이 변경될 때마다 호출

  const loadCustomers = async (page: number = currentPage, keyword: string = searchTerm) => {
    try {
      const params: any = {
        include_resources: true,
        page: page,
        per_page: perPage
      };
      
      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }
      
      const response = await customerAPI.getCustomers(params);
      
      const data = response.data;
      setCustomers(data.customers || []);
      setTotalCustomers(data.total || 0);
      setTotalPages(data.total_pages || 0);
      setCurrentPage(data.page || 1);
    } catch (error) {
      console.error('고객 정보 로딩 실패:', error);
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

  // 페이지 네비게이션 함수들
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
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
        tel: '',
        fax: '',
        president: '',
        mobile: '',
        contact: ''
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
      tel: customer.tel || '',
      fax: customer.fax || '',
      president: customer.president || '',
      mobile: customer.mobile || '',
      contact: customer.contact || ''
    });
    setShowForm(true);
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

  const handleImportClick = () => {
    if (window.confirm('기존 고객 정보가 엑셀 파일의 데이터로 덮어씌워질 수 있습니다. 계속하시겠습니까?')) {
      setShowImportModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 타입 확인
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      alert('파일을 선택해 주세요.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await customerAPI.importFromExcel(selectedFile);
      const result = response.data;
      
      let message = `엑셀 임포트가 완료되었습니다.\n성공: ${result.success_count}건\n실패: ${result.error_count}건`;
      
      if (result.errors && result.errors.length > 0) {
        message += '\n\n오류 내역:\n' + result.errors.join('\n');
      }
      
      alert(message);
      
      // 성공한 경우 고객 목록 새로고침
      if (result.success_count > 0) {
        loadCustomers();
      }
      
      // 모달 닫기 및 초기화
      setShowImportModal(false);
      setSelectedFile(null);
      
    } catch (error: any) {
      console.error('엑셀 임포트 실패:', error);
      const errorMessage = error.response?.data?.error || '엑셀 임포트 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  // 검색어 변경 시 첫 페이지로 리셋
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
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
                    {/* 기본 정보 */}
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
                        <label className="form-label">이메일</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

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

                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">주소</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">우편번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">전화</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.tel}
                          onChange={(e) => setFormData({...formData, tel: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">팩스</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.fax}
                          onChange={(e) => setFormData({...formData, fax: e.target.value})}
                        />
                      </div>
                    </div>

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
                        <label className="form-label">휴대폰</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.mobile}
                          onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">연락처</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.contact}
                          onChange={(e) => setFormData({...formData, contact: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">
                      {editingCustomer ? '수정' : '저장'}
                    </button>
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
      </div>
    );
  }

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <input
              type="text"
              className="form-control"
              placeholder="검색어를 입력하세요 (고객사명, 담당자, 주소)"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="col-auto ms-auto d-print-none">
            <div className="btn-list">
              <button 
                className="btn btn-outline-primary"
                onClick={handleImportClick}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                고객정보 가져오기
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                새 고객 추가
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">고객 목록</h3>
                  <div className="card-actions">
                    <span className="text-muted">
                      총 {totalCustomers}개의 고객
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  {customers.length === 0 ? (
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
                          <button 
                            className="btn btn-primary"
                            onClick={() => setShowForm(true)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            새 고객 추가
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table table-vcenter">
                        <thead>
                          <tr>
                            <th>회사명</th>
                            <th>주소</th>
                            <th>보유장비</th>
                            <th>업데이트</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((customer) => (
                            <tr key={customer.id}>
                              <td>
                                <div className="text-reset font-weight-medium">{customer.company_name}</div>
                              </td>
                              <td>
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
                              <td>
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
                              <td>
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
                              <td>
                                <div className="btn-list flex-nowrap">
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      // 항상 서버에서 최신 장비 데이터를 로드
                                      loadCustomerResources(customer.id);
                                    }}
                                  >
                                    장비관리
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => handleEdit(customer)}
                                  >
                                    편집
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(customer.id)}
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
                    
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalCustomers}
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
          </div>
        </div>
      </div>

      {/* 리소스 관리 모달 */}
      {selectedCustomer && (
        <div className="modal modal-blur fade show" style={{display: 'block'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedCustomer.company_name} - 보유 장비 관리</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerResources([]);
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

      {/* 엑셀 임포트 모달 */}
      {showImportModal && (
        <div className="modal modal-blur fade show" style={{display: 'block'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">엑셀에서 고객정보 가져오기</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFile(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">엑셀 파일 선택</label>
                  <div className="input-group">
                    <input
                      type="file"
                      className="form-control"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                      disabled={isImporting}
                    >
                      Browse
                    </button>
                  </div>
                  {selectedFile && (
                    <div className="form-hint mt-2">
                      선택된 파일: {selectedFile.name}
                    </div>
                  )}
                </div>

                <div className="alert alert-info">
                  <h5>엑셀 파일 형식 안내</h5>
                  <p className="mb-2">엑셀 파일에는 다음 컬럼이 포함되어야 합니다:</p>
                  <ul className="mb-2">
                    <li><strong>company_name</strong> (필수): 회사명</li>
                    <li><strong>contact_person</strong> (필수): 담당자명</li>
                    <li><strong>email</strong> (선택): 이메일</li>
                    <li><strong>phone</strong> (선택): 전화번호</li>
                    <li><strong>address</strong> (선택): 주소</li>
                    <li><strong>postal_code</strong> (선택): 우편번호</li>
                    <li><strong>tel</strong> (선택): 전화</li>
                    <li><strong>fax</strong> (선택): 팩스</li>
                    <li><strong>president</strong> (선택): 대표자</li>
                    <li><strong>mobile</strong> (선택): 휴대폰</li>
                    <li><strong>contact</strong> (선택): 연락처</li>
                  </ul>
                  <p className="mb-0">
                    <strong>주의:</strong> 동일한 회사명이 있는 경우 기존 정보가 덮어씌워집니다.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFile(null);
                  }}
                  disabled={isImporting}
                >
                  취소
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleImportSubmit}
                  disabled={!selectedFile || isImporting}
                >
                  {isImporting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      가져오는 중...
                    </>
                  ) : (
                    '불러오기'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;