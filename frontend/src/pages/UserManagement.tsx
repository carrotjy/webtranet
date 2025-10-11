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
  created_at: string;
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
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
    spare_parts_access: false
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
    } catch (error) {
      console.error('사용자 목록 로딩 실패:', error);
      alert('사용자 목록을 불러오는데 실패했습니다.');
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
    } catch (error) {
      console.error('사용자 저장 실패:', error);
      alert('사용자 저장에 실패했습니다.');
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
      spare_parts_access: user.spare_parts_access
    });
    setShowForm(true);
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        await userAPI.deleteUser(userId);
        alert('사용자가 삭제되었습니다.');
        loadUsers();
      } catch (error) {
        console.error('사용자 삭제 실패:', error);
        alert('사용자 삭제에 실패했습니다.');
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
      spare_parts_access: false
    });
  };

  const handleNewUser = () => {
    setEditingUser(null);
    resetForm();
    setShowForm(true);
  };

  return (
    <>
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
                                  <span className="avatar avatar-sm me-2 avatar-rounded" style={{ backgroundColor: user.is_admin ? '#206bc4' : '#74788d' }}>
                                    {user.name.charAt(0)}
                                  </span>
                                  {user.name}
                                </div>
                              </td>
                              <td>{user.email}</td>
                              <td>
                                <span className={`badge ${user.department === '기술부' ? 'bg-blue' : 'bg-gray'}`}>
                                  {user.department}
                                </span>
                              </td>
                              <td>{user.contact || '-'}</td>
                              <td>
                                {user.is_admin ? (
                                  <span className="badge bg-red">관리자</span>
                                ) : (
                                  <span className="badge bg-secondary">일반</span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  {user.service_report_access && <span className="badge badge-outline text-blue">서비스리포트</span>}
                                  {user.transaction_access && <span className="badge badge-outline text-green">거래관리</span>}
                                  {user.customer_access && <span className="badge badge-outline text-orange">고객관리</span>}
                                  {user.spare_parts_access && <span className="badge badge-outline text-purple">부품관리</span>}
                                </div>
                              </td>
                              <td>{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
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
          onClick={(e) => {
            // 모달 배경 클릭시에만 닫기 (모달 내용 클릭시에는 닫지 않음)
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditingUser(null);
              resetForm();
            }
          }}
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