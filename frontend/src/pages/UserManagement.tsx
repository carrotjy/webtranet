import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  contact?: string;
  is_admin: boolean;
  service_report_access: boolean;
  transaction_access: boolean;
  customer_access: boolean;
  spare_parts_access: boolean;
  resource_access: boolean;  // 리소스 접근 권한 추가
  created_at: string;
  // 서비스 리포트 CRUD 권한
  service_report_create: boolean;
  service_report_read: boolean;
  service_report_update: boolean;
  service_report_delete: boolean;
  // 리소스 CRUD 권한
  resource_create: boolean;
  resource_read: boolean;
  resource_update: boolean;
  resource_delete: boolean;
  // 고객정보 CRUD 권한
  customer_create: boolean;
  customer_read: boolean;
  customer_update: boolean;
  customer_delete: boolean;
  // 거래명세서 CRUD 권한
  transaction_create: boolean;
  transaction_read: boolean;
  transaction_update: boolean;
  transaction_delete: boolean;
  // 부품 CRUD 권한
  spare_parts_create: boolean;
  spare_parts_read: boolean;
  spare_parts_update: boolean;
  spare_parts_delete_crud: boolean;
  // 부품 입출고 권한
  spare_parts_stock_in: boolean;
  spare_parts_stock_out: boolean;
  spare_parts_stock_history_edit: boolean;  // 입출고 내역 수정 권한
  spare_parts_stock_history_delete: boolean;  // 입출고 내역 삭제 권한
  // 추가 기능 권한
  service_report_lock: boolean;
  transaction_excel_export: boolean;
  transaction_lock: boolean;
  transaction_bill_view: boolean;
  transaction_fax_send: boolean;  // 팩스 전송 권한
  transaction_file_download: boolean;  // 파일 다운로드 권한
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  department: string;
  contact: string;
  is_admin: boolean;
  service_report_access: boolean;
  transaction_access: boolean;
  customer_access: boolean;
  spare_parts_access: boolean;
  resource_access: boolean;  // 리소스 접근 권한 추가
  // 서비스 리포트 CRUD 권한
  service_report_create: boolean;
  service_report_read: boolean;
  service_report_update: boolean;
  service_report_delete: boolean;
  // 리소스 CRUD 권한
  resource_create: boolean;
  resource_read: boolean;
  resource_update: boolean;
  resource_delete: boolean;
  // 고객정보 CRUD 권한
  customer_create: boolean;
  customer_read: boolean;
  customer_update: boolean;
  customer_delete: boolean;
  // 거래명세서 CRUD 권한
  transaction_create: boolean;
  transaction_read: boolean;
  transaction_update: boolean;
  transaction_delete: boolean;
  // 부품 CRUD 권한
  spare_parts_create: boolean;
  spare_parts_read: boolean;
  spare_parts_update: boolean;
  spare_parts_delete_crud: boolean;
  // 부품 입출고 권한
  spare_parts_stock_in: boolean;
  spare_parts_stock_out: boolean;
  spare_parts_stock_history_edit: boolean;  // 입출고 내역 수정 권한
  spare_parts_stock_history_delete: boolean;  // 입출고 내역 삭제 권한
  // 추가 기능 권한
  service_report_lock: boolean;
  transaction_excel_export: boolean;
  transaction_lock: boolean;
  transaction_bill_view: boolean;
  transaction_fax_send: boolean;  // 팩스 전송 권한
  transaction_file_download: boolean;  // 파일 다운로드 권한
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    
    try {
      // 다양한 날짜 형식을 처리
      let date: Date;
      
      // ISO 형식이나 일반적인 날짜 문자열 처리
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        // 만약 단순 문자열이라면 Date 객체로 변환
        date = new Date(dateString);
      }
      
      // 유효하지 않은 날짜인 경우
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // 연-월-일 형식으로 반환
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '-';
    }
  };
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    department: '',
    contact: '',
    is_admin: false,
    service_report_access: false,
    transaction_access: false,
    customer_access: false,
    spare_parts_access: false,
    resource_access: false,
    // 서비스 리포트 CRUD 권한
    service_report_create: false,
    service_report_read: false,
    service_report_update: false,
    service_report_delete: false,
    // 리소스 CRUD 권한
    resource_create: false,
    resource_read: false,
    resource_update: false,
    resource_delete: false,
    // 고객정보 CRUD 권한
    customer_create: false,
    customer_read: false,
    customer_update: false,
    customer_delete: false,
    // 거래명세서 CRUD 권한
    transaction_create: false,
    transaction_read: false,
    transaction_update: false,
    transaction_delete: false,
    // 부품 CRUD 권한
    spare_parts_create: false,
    spare_parts_read: false,
    spare_parts_update: false,
    spare_parts_delete_crud: false,
    // 부품 입출고 권한
    spare_parts_stock_in: true,
    spare_parts_stock_out: true,
    spare_parts_stock_history_edit: false,
    spare_parts_stock_history_delete: false,
    // 추가 기능 권한
    service_report_lock: true,
    transaction_excel_export: true,
    transaction_lock: true,
    transaction_bill_view: true,
    transaction_fax_send: true,
    transaction_file_download: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      const userData = response.data?.users || [];
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error: any) {
      console.error('사용자 목록 로딩 실패:', error);
      let errorMessage = '사용자 목록을 불러오는데 실패했습니다.';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = '백엔드 서버에 연결할 수 없습니다. 서버가 실행되고 있는지 확인해주세요.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, formData);
        alert('사용자가 수정되었습니다.');
      } else {
        await userAPI.createUser(formData);
        alert('사용자가 생성되었습니다.');
      }
      
      setShowForm(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('사용자 저장 실패:', error);
      let errorMessage = '사용자 저장에 실패했습니다.';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = '백엔드 서버에 연결할 수 없습니다. 서버가 실행되고 있는지 확인해주세요.';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(errorMessage);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // 비밀번호는 비워둠
      department: user.department,
      contact: user.contact || '',
      is_admin: user.is_admin,
      service_report_access: user.service_report_access,
      transaction_access: user.transaction_access,
      customer_access: user.customer_access,
      spare_parts_access: user.spare_parts_access,
      resource_access: user.resource_access || false,
      // 서비스 리포트 CRUD 권한
      service_report_create: user.service_report_create || false,
      service_report_read: user.service_report_read || false,
      service_report_update: user.service_report_update || false,
      service_report_delete: user.service_report_delete || false,
      // 리소스 CRUD 권한
      resource_create: user.resource_create || false,
      resource_read: user.resource_read || false,
      resource_update: user.resource_update || false,
      resource_delete: user.resource_delete || false,
      // 고객정보 CRUD 권한
      customer_create: user.customer_create || false,
      customer_read: user.customer_read || false,
      customer_update: user.customer_update || false,
      customer_delete: user.customer_delete || false,
      // 거래명세서 CRUD 권한
      transaction_create: user.transaction_create || false,
      transaction_read: user.transaction_read || false,
      transaction_update: user.transaction_update || false,
      transaction_delete: user.transaction_delete || false,
      // 부품 CRUD 권한
      spare_parts_create: user.spare_parts_create || false,
      spare_parts_read: user.spare_parts_read || false,
      spare_parts_update: user.spare_parts_update || false,
      spare_parts_delete_crud: user.spare_parts_delete_crud || false,
      // 부품 입출고 권한
      spare_parts_stock_in: user.spare_parts_stock_in !== undefined ? user.spare_parts_stock_in : true,
      spare_parts_stock_out: user.spare_parts_stock_out !== undefined ? user.spare_parts_stock_out : true,
      spare_parts_stock_history_edit: user.spare_parts_stock_history_edit !== undefined ? user.spare_parts_stock_history_edit : false,
      spare_parts_stock_history_delete: user.spare_parts_stock_history_delete !== undefined ? user.spare_parts_stock_history_delete : false,
      // 추가 기능 권한
      service_report_lock: user.service_report_lock !== undefined ? user.service_report_lock : true,
      transaction_excel_export: user.transaction_excel_export !== undefined ? user.transaction_excel_export : true,
      transaction_lock: user.transaction_lock !== undefined ? user.transaction_lock : true,
      transaction_bill_view: user.transaction_bill_view !== undefined ? user.transaction_bill_view : true,
      transaction_fax_send: user.transaction_fax_send !== undefined ? user.transaction_fax_send : true,
      transaction_file_download: user.transaction_file_download !== undefined ? user.transaction_file_download : true
    });
    setShowForm(true);
  };

  const handleDelete = async (userId: number) => {
    // userId 유효성 검사 추가
    if (!userId) {
      console.error('유효하지 않은 사용자 ID:', userId);
      alert('유효하지 않은 사용자 ID입니다.');
      return;
    }
    
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        await userAPI.deleteUser(userId);
        alert('사용자가 삭제되었습니다.');
        loadUsers();
      } catch (error: any) {
        console.error('사용자 삭제 실패:', error);
        let errorMessage = '사용자 삭제에 실패했습니다.';
        
        if (error.code === 'ERR_NETWORK') {
          errorMessage = '백엔드 서버에 연결할 수 없습니다. 서버가 실행되고 있는지 확인해주세요.';
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        alert(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      department: '',
      contact: '',
      is_admin: false,
      service_report_access: false,
      transaction_access: false,
      customer_access: false,
      spare_parts_access: false,
      resource_access: false,
      // 서비스 리포트 CRUD 권한
      service_report_create: false,
      service_report_read: false,
      service_report_update: false,
      service_report_delete: false,
      // 리소스 CRUD 권한
      resource_create: false,
      resource_read: false,
      resource_update: false,
      resource_delete: false,
      // 고객정보 CRUD 권한
      customer_create: false,
      customer_read: false,
      customer_update: false,
      customer_delete: false,
      // 거래명세서 CRUD 권한
      transaction_create: false,
      transaction_read: false,
      transaction_update: false,
      transaction_delete: false,
      // 부품 CRUD 권한
      spare_parts_create: false,
      spare_parts_read: false,
      spare_parts_update: false,
      spare_parts_delete_crud: false,
      // 부품 입출고 권한
      spare_parts_stock_in: true,
      spare_parts_stock_out: true,
      spare_parts_stock_history_edit: false,
      spare_parts_stock_history_delete: false,
      // 추가 기능 권한
      service_report_lock: true,
      transaction_excel_export: true,
      transaction_lock: true,
      transaction_bill_view: true,
      transaction_fax_send: true,
      transaction_file_download: true
    });
  };

  const handleNewUser = () => {
    setEditingUser(null);
    resetForm();
    setShowForm(true);
  };

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
              <h2 className="page-title">사용자 관리</h2>
              <div className="text-muted mt-1">시스템 사용자 및 권한을 관리합니다</div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <button className="btn btn-primary" onClick={handleNewUser}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  새 사용자 추가
                </button>
              </div>
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
                  <h3 className="card-title">사용자 목록</h3>
                </div>
                <div className="card-body p-0">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="empty">
                        <div className="empty-img">
                          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxVjE5QTQgNCAwIDAgMCAxNiAxNUg4QTQgNCAwIDAgMCA0IDE5VjIxIiBzdHJva2U9IiM4Nzk0YTgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iOSIgcj0iNCIgc3Ryb2tlPSIjODc5NGE4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K" alt="" height="128" width="128" />
                        </div>
                        <p className="empty-title">사용자가 없습니다</p>
                        <p className="empty-subtitle text-muted">
                          첫 번째 사용자를 추가해보세요.
                        </p>
                        <div className="empty-action">
                          <button className="btn btn-primary" onClick={handleNewUser}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            새 사용자 추가
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table card-table table-vcenter text-nowrap datatable">
                        <thead>
                          <tr>
                            <th>이름</th>
                            <th>이메일</th>
                            <th>부서</th>
                            <th>연락처</th>
                            <th>관리자</th>
                            <th>권한</th>
                            <th>생성일</th>
                            <th>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {user.name}
                                </div>
                              </td>
                              <td>{user.email}</td>
                              <td>
                                <span className="badge" style={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #4299e1', 
                                  color: '#4299e1' 
                                }}>
                                  {user.department}
                                </span>
                              </td>
                              <td>{user.contact || '-'}</td>
                              <td>
                                {user.is_admin ? (
                                  <span className="badge" style={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e53e3e', 
                                    color: '#e53e3e' 
                                  }}>관리자</span>
                                ) : (
                                  <span className="badge" style={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #718096', 
                                    color: '#718096' 
                                  }}>일반</span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-1 flex-wrap">
                                  <span 
                                    className="badge" 
                                    style={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #4299e1', 
                                      color: '#4299e1',
                                      filter: user.service_report_access ? 'none' : 'blur(1.5px)',
                                      opacity: user.service_report_access ? 1 : 0.5
                                    }}
                                  >
                                    리포트
                                  </span>
                                  <span 
                                    className="badge" 
                                    style={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #dd6b20', 
                                      color: '#dd6b20',
                                      filter: user.customer_access ? 'none' : 'blur(1.5px)',
                                      opacity: user.customer_access ? 1 : 0.5
                                    }}
                                  >
                                    고객
                                  </span>
                                  <span 
                                    className="badge" 
                                    style={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #d53f8c', 
                                      color: '#d53f8c',
                                      filter: user.resource_access ? 'none' : 'blur(1.5px)',
                                      opacity: user.resource_access ? 1 : 0.5
                                    }}
                                  >
                                    리소스
                                  </span>
                                  <span 
                                    className="badge" 
                                    style={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #38a169', 
                                      color: '#38a169',
                                      filter: user.transaction_access ? 'none' : 'blur(1.5px)',
                                      opacity: user.transaction_access ? 1 : 0.5
                                    }}
                                  >
                                    거래
                                  </span>
                                  <span 
                                    className="badge" 
                                    style={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #805ad5', 
                                      color: '#805ad5',
                                      filter: user.spare_parts_access ? 'none' : 'blur(1.5px)',
                                      opacity: user.spare_parts_access ? 1 : 0.5
                                    }}
                                  >
                                    부품
                                  </span>
                                </div>
                              </td>
                              <td>{formatDate(user.created_at)}</td>
                              <td>
                                <div className="btn-list">
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleEdit(user)}
                                  >
                                    수정
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(user.id)}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 사용자 추가/수정 모달 */}
      {showForm && (
        <div
          className="modal modal-blur fade show"
          style={{ display: 'block' }}
          data-bs-backdrop="static"
          data-bs-keyboard="false"
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingUser ? '사용자 수정' : '새 사용자 추가'}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">이름</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">이메일</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">비밀번호 {editingUser && '(변경하지 않으려면 비워두세요)'}</label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        autoComplete="new-password"
                        required={!editingUser}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">부서</label>
                      <select
                        className="form-control"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        required
                      >
                        <option value="">부서 선택</option>
                        <option value="기술부">기술부</option>
                        <option value="영업부">영업부</option>
                        <option value="관리부">관리부</option>
                      </select>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label">연락처</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.contact}
                        onChange={(e) => setFormData({...formData, contact: e.target.value})}
                        placeholder="010-0000-0000"
                      />
                    </div>
                    
                    {/* 관리자 권한 */}
                    <div className="col-12 mb-3">
                      <label className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={formData.is_admin}
                          onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                        />
                        <span className="form-check-label">관리자 권한 부여</span>
                      </label>
                    </div>

                    {/* 접근 권한 */}
                    <div className="col-12">
                      <label className="form-label">접근 권한</label>
                      <div className="row">
                        <div className="col-md-6">
                          <label className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={formData.service_report_access}
                              onChange={(e) => setFormData({...formData, service_report_access: e.target.checked})}
                            />
                            <span className="form-check-label">서비스 리포트</span>
                          </label>
                        </div>
                        <div className="col-md-6">
                          <label className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={formData.transaction_access}
                              onChange={(e) => setFormData({...formData, transaction_access: e.target.checked})}
                            />
                            <span className="form-check-label">거래 관리</span>
                          </label>
                        </div>
                        <div className="col-md-6">
                          <label className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={formData.customer_access}
                              onChange={(e) => setFormData({...formData, customer_access: e.target.checked})}
                            />
                            <span className="form-check-label">고객 관리</span>
                          </label>
                        </div>
                        <div className="col-md-6">
                          <label className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={formData.spare_parts_access}
                              onChange={(e) => setFormData({...formData, spare_parts_access: e.target.checked})}
                            />
                            <span className="form-check-label">부품 관리</span>
                          </label>
                        </div>
                        <div className="col-md-6">
                          <label className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={formData.resource_access}
                              onChange={(e) => setFormData({...formData, resource_access: e.target.checked})}
                            />
                            <span className="form-check-label">리소스 관리</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* CRUD 상세 권한 */}
                    <div className="col-12 mt-4">
                      <label className="form-label">상세 권한 설정</label>
                      <div className="card">
                        <div className="card-body">
                          
                          {/* 서비스 리포트 CRUD 권한 */}
                          <div className="mb-3">
                            <h5 className="card-title">서비스 리포트 권한</h5>
                            <div className="row">
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.service_report_create}
                                    onChange={(e) => setFormData({...formData, service_report_create: e.target.checked})}
                                  />
                                  <span className="form-check-label">생성</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.service_report_read}
                                    onChange={(e) => setFormData({...formData, service_report_read: e.target.checked})}
                                  />
                                  <span className="form-check-label">조회</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.service_report_update}
                                    onChange={(e) => setFormData({...formData, service_report_update: e.target.checked})}
                                  />
                                  <span className="form-check-label">수정</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.service_report_delete}
                                    onChange={(e) => setFormData({...formData, service_report_delete: e.target.checked})}
                                  />
                                  <span className="form-check-label">삭제</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.service_report_lock}
                                    onChange={(e) => setFormData({...formData, service_report_lock: e.target.checked})}
                                  />
                                  <span className="form-check-label">잠금 버튼</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* 리소스 CRUD 권한 */}
                          <div className="mb-3">
                            <h5 className="card-title">리소스 권한</h5>
                            <div className="row">
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.resource_create}
                                    onChange={(e) => setFormData({...formData, resource_create: e.target.checked})}
                                  />
                                  <span className="form-check-label">생성</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.resource_read}
                                    onChange={(e) => setFormData({...formData, resource_read: e.target.checked})}
                                  />
                                  <span className="form-check-label">조회</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.resource_update}
                                    onChange={(e) => setFormData({...formData, resource_update: e.target.checked})}
                                  />
                                  <span className="form-check-label">수정</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.resource_delete}
                                    onChange={(e) => setFormData({...formData, resource_delete: e.target.checked})}
                                  />
                                  <span className="form-check-label">삭제</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* 고객정보 CRUD 권한 */}
                          <div className="mb-0">
                            <h5 className="card-title">고객정보 권한</h5>
                            <div className="row">
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.customer_create}
                                    onChange={(e) => setFormData({...formData, customer_create: e.target.checked})}
                                  />
                                  <span className="form-check-label">생성</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.customer_read}
                                    onChange={(e) => setFormData({...formData, customer_read: e.target.checked})}
                                  />
                                  <span className="form-check-label">조회</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.customer_update}
                                    onChange={(e) => setFormData({...formData, customer_update: e.target.checked})}
                                  />
                                  <span className="form-check-label">수정</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.customer_delete}
                                    onChange={(e) => setFormData({...formData, customer_delete: e.target.checked})}
                                  />
                                  <span className="form-check-label">삭제</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* 거래명세서 CRUD 권한 */}
                          <div className="mb-3">
                            <h5 className="card-title">거래명세서 권한</h5>
                            <div className="row">
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_create}
                                    onChange={(e) => setFormData({...formData, transaction_create: e.target.checked})}
                                  />
                                  <span className="form-check-label">생성</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_read}
                                    onChange={(e) => setFormData({...formData, transaction_read: e.target.checked})}
                                  />
                                  <span className="form-check-label">조회</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_update}
                                    onChange={(e) => setFormData({...formData, transaction_update: e.target.checked})}
                                  />
                                  <span className="form-check-label">수정</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_delete}
                                    onChange={(e) => setFormData({...formData, transaction_delete: e.target.checked})}
                                  />
                                  <span className="form-check-label">삭제</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_excel_export}
                                    onChange={(e) => setFormData({...formData, transaction_excel_export: e.target.checked})}
                                  />
                                  <span className="form-check-label">엑셀 생성 버튼</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_lock}
                                    onChange={(e) => setFormData({...formData, transaction_lock: e.target.checked})}
                                  />
                                  <span className="form-check-label">잠금 버튼</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_bill_view}
                                    onChange={(e) => setFormData({...formData, transaction_bill_view: e.target.checked})}
                                  />
                                  <span className="form-check-label">계산서 발행 처리</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_fax_send}
                                    onChange={(e) => setFormData({...formData, transaction_fax_send: e.target.checked})}
                                  />
                                  <span className="form-check-label">팩스 전송 버튼</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.transaction_file_download}
                                    onChange={(e) => setFormData({...formData, transaction_file_download: e.target.checked})}
                                  />
                                  <span className="form-check-label">파일 다운로드 버튼</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* 부품 CRUD 권한 */}
                          <div className="mb-3">
                            <h5 className="card-title">부품 권한</h5>
                            <div className="row">
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_create}
                                    onChange={(e) => setFormData({...formData, spare_parts_create: e.target.checked})}
                                  />
                                  <span className="form-check-label">생성</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_read}
                                    onChange={(e) => setFormData({...formData, spare_parts_read: e.target.checked})}
                                  />
                                  <span className="form-check-label">조회</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_update}
                                    onChange={(e) => setFormData({...formData, spare_parts_update: e.target.checked})}
                                  />
                                  <span className="form-check-label">수정</span>
                                </label>
                              </div>
                              <div className="col-md-3">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_delete_crud}
                                    onChange={(e) => setFormData({...formData, spare_parts_delete_crud: e.target.checked})}
                                  />
                                  <span className="form-check-label">삭제</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_stock_in}
                                    onChange={(e) => setFormData({...formData, spare_parts_stock_in: e.target.checked})}
                                  />
                                  <span className="form-check-label">입고 버튼</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_stock_out}
                                    onChange={(e) => setFormData({...formData, spare_parts_stock_out: e.target.checked})}
                                  />
                                  <span className="form-check-label">출고 버튼</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_stock_history_edit}
                                    onChange={(e) => setFormData({...formData, spare_parts_stock_history_edit: e.target.checked})}
                                  />
                                  <span className="form-check-label">입출고내역 수정 버튼</span>
                                </label>
                              </div>
                              <div className="col-md-3 mt-2">
                                <label className="form-check">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formData.spare_parts_stock_history_delete}
                                    onChange={(e) => setFormData({...formData, spare_parts_stock_history_delete: e.target.checked})}
                                  />
                                  <span className="form-check-label">입출고내역 삭제 버튼</span>
                                </label>
                              </div>
                            </div>
                          </div>

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
                      setShowForm(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                  >
                    취소
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingUser ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;