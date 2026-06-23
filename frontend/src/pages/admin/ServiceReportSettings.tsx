import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface InvoiceCode {
  id: number;
  code: string;
  description: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ServiceReportSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    defaultStatus: 'pending',
    autoAssignment: false,
    emailNotification: true,
    reportTemplate: 'standard'
  });

  const [invoiceCodes, setInvoiceCodes] = useState<InvoiceCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<InvoiceCode | null>(null);
  const [modalData, setModalData] = useState({
    code: '',
    description: '',
    category: ''
  });

  // PDF 저장 경로 상태
  const [pdfSavePath, setPdfSavePath] = useState('');
  const [pdfSaveUser, setPdfSaveUser] = useState('');
  const [pdfSavePassword, setPdfSavePassword] = useState('');
  const [pdfHasPassword, setPdfHasPassword] = useState(false);
  const [savingPath, setSavingPath] = useState(false);
  const [testingPath, setTestingPath] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // TODO: API 호출하여 설정 저장
    console.log('서비스리포트 설정 저장:', settings);
    alert('설정이 저장되었습니다.');
  };

  // PDF 저장 경로 조회
  const fetchPdfSavePath = async () => {
    try {
      const response = await api.get('/api/system/service-report-save-path');
      if (response.data.success) {
        setPdfSavePath(response.data.service_report_save_path || '');
        setPdfSaveUser(response.data.service_report_save_user || '');
        setPdfHasPassword(response.data.has_password || false);
      }
    } catch (error) {
      console.error('서비스리포트 저장 경로 조회 실패:', error);
    }
  };

  // PDF 저장 경로 연결 테스트
  const handleTestPdfPath = async () => {
    try {
      setTestingPath(true);
      setTestLogs([]);
      setTestSuccess(null);
      const response = await api.post('/api/system/service-report-save-path/test', {});
      setTestLogs(response.data.logs || []);
      setTestSuccess(response.data.success);
    } catch (error: any) {
      const msg = error?.response?.data?.logs || ['❌ 테스트 요청 실패'];
      setTestLogs(Array.isArray(msg) ? msg : [msg]);
      setTestSuccess(false);
    } finally {
      setTestingPath(false);
    }
  };

  // PDF 저장 경로 저장
  const handleSavePdfPath = async () => {
    try {
      setSavingPath(true);
      await api.post('/api/system/service-report-save-path', {
        service_report_save_path: pdfSavePath,
        service_report_save_user: pdfSaveUser,
        service_report_save_password: pdfSavePassword,
      });
      alert('서비스리포트 저장 경로가 설정되었습니다.');
      setPdfSavePassword('');
      setPdfHasPassword(pdfSavePassword !== '' ? true : pdfHasPassword);
    } catch (error: any) {
      const msg = error?.response?.data?.message || '저장 경로 설정에 실패했습니다.';
      alert(msg);
    } finally {
      setSavingPath(false);
    }
  };

  // Invoice 코드 목록 조회
  const fetchInvoiceCodes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/invoice-codes');
      setInvoiceCodes(response.data.invoice_codes || []);
    } catch (error) {
      console.error('Invoice 코드 조회 실패:', error);
      alert('Invoice 코드 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Invoice 코드 생성/수정
  const handleSaveInvoiceCode = async () => {
    try {
      if (!modalData.code || !modalData.description) {
        alert('코드와 설명을 모두 입력해주세요.');
        return;
      }

      if (!/^\d{3}$/.test(modalData.code)) {
        alert('코드는 3자리 숫자여야 합니다.');
        return;
      }

      if (editingCode) {
        await api.put(`/api/admin/invoice-codes/${editingCode.id}`, modalData);
      } else {
        await api.post('/api/admin/invoice-codes', modalData);
      }

      alert(editingCode ? 'Invoice 코드가 수정되었습니다.' : 'Invoice 코드가 생성되었습니다.');

      setShowModal(false);
      setEditingCode(null);
      setModalData({ code: '', description: '', category: '' });

      // 목록 새로고침
      fetchInvoiceCodes();
    } catch (error: any) {
      console.error('Invoice 코드 저장 실패:', error);
      const message = error.response?.data?.error || 'Invoice 코드 저장에 실패했습니다.';
      alert(message);
    }
  };

  // Invoice 코드 삭제
  const handleDeleteInvoiceCode = async (codeId: number) => {
    if (!window.confirm('이 Invoice 코드를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/invoice-codes/${codeId}`);
      alert('Invoice 코드가 삭제되었습니다.');
      fetchInvoiceCodes();
    } catch (error: any) {
      console.error('Invoice 코드 삭제 실패:', error);
      const message = error.response?.data?.error || 'Invoice 코드 삭제에 실패했습니다.';
      alert(message);
    }
  };

  // 모달 열기/닫기
  const openModal = (code?: InvoiceCode) => {
    if (code) {
      setEditingCode(code);
      setModalData({
        code: code.code,
        description: code.description,
        category: code.category || ''
      });
    } else {
      setEditingCode(null);
      setModalData({ code: '', description: '', category: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCode(null);
    setModalData({ code: '', description: '', category: '' });
  };

  useEffect(() => {
    fetchInvoiceCodes();
    fetchPdfSavePath();
  }, []);

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle">관리자</div>
            <h2 className="page-title">서비스리포트 설정</h2>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            {/* PDF 저장 경로 설정 카드 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">서비스리포트 PDF 저장 경로</h3>
                  <div className="card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleSavePdfPath}
                      disabled={savingPath}
                    >
                      {savingPath ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          저장 중...
                        </>
                      ) : (
                        '경로 저장'
                      )}
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label">저장 경로</label>
                        <input
                          type="text"
                          className="form-control"
                          value={pdfSavePath}
                          onChange={(e) => setPdfSavePath(e.target.value)}
                          placeholder="예: \\messerver\reports$  또는  /mnt/share/서비스리포트"
                        />
                        <div className="form-hint">
                          PDF 저장 시 파일이 저장될 폴더 경로. 비워두면 저장하지 않고 다운로드만 됩니다.
                          저장 경로를 설정하면 <code>{'{year}년{month}월'}</code> 하위 폴더에 자동 저장됩니다.
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">접속 계정 (ID)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={pdfSaveUser}
                          onChange={(e) => setPdfSaveUser(e.target.value)}
                          placeholder="네트워크 공유 접속 사용자명"
                          autoComplete="username"
                        />
                        <div className="form-hint">
                          네트워크 공유(\\server\share)에 인증이 필요한 경우 입력하세요.
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          접속 비밀번호
                          {pdfHasPassword && (
                            <span className="badge bg-success ms-2" style={{ fontSize: '0.7em' }}>설정됨</span>
                          )}
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          value={pdfSavePassword}
                          onChange={(e) => setPdfSavePassword(e.target.value)}
                          placeholder={pdfHasPassword ? '변경하려면 새 비밀번호 입력' : '비밀번호 입력'}
                          autoComplete="new-password"
                        />
                        <div className="form-hint">
                          비워두면 기존 비밀번호를 유지합니다.
                        </div>
                      </div>
                    </div>

                    {/* 연결 테스트 버튼 */}
                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleTestPdfPath}
                        disabled={testingPath}
                      >
                        {testingPath ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            테스트 중...
                          </>
                        ) : (
                          '연결 테스트'
                        )}
                      </button>
                      <span className="text-muted ms-2" style={{ fontSize: '0.85em' }}>
                        저장 후 테스트하면 현재 DB에 저장된 설정으로 확인합니다.
                      </span>
                    </div>

                    {/* 테스트 결과 로그 */}
                    {testLogs.length > 0 && (
                      <div className="col-12 mt-3">
                        <div
                          className={`card border-${testSuccess ? 'success' : 'danger'}`}
                          style={{ background: '#1a1a2e' }}
                        >
                          <div className={`card-header py-2 bg-${testSuccess ? 'success' : 'danger'} bg-opacity-10`}>
                            <span className={`fw-bold text-${testSuccess ? 'success' : 'danger'}`}>
                              {testSuccess ? '✅ 테스트 성공' : '❌ 테스트 실패'}
                            </span>
                          </div>
                          <div className="card-body py-2">
                            <pre
                              style={{
                                margin: 0,
                                fontSize: '0.82em',
                                lineHeight: '1.6',
                                color: '#c9d1d9',
                                background: 'transparent',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}
                            >
                              {testLogs.join('\n')}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice 코드 관리 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Invoice 코드 관리</h3>
                  <div className="card-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => openModal()}
                    >
                      새 Invoice 코드 추가
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border" role="status"></div>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-vcenter">
                        <thead>
                          <tr>
                            <th>코드</th>
                            <th>설명</th>
                            <th>카테고리</th>
                            <th>생성일</th>
                            <th>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceCodes.map((code) => (
                            <tr key={code.id}>
                              <td className="fw-bold">{code.code}</td>
                              <td>{code.description}</td>
                              <td>{code.category || '-'}</td>
                              <td>{new Date(code.created_at).toLocaleDateString()}</td>
                              <td>
                                <div className="btn-group">
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => openModal(code)}
                                  >
                                    수정
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteInvoiceCode(code.id)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {invoiceCodes.length === 0 && (
                        <div className="text-center py-3 text-muted">
                          등록된 Invoice 코드가 없습니다.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 기본 설정 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">서비스리포트 기본 설정</h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">기본 상태</label>
                        <select 
                          className="form-select"
                          value={settings.defaultStatus}
                          onChange={(e) => handleSettingChange('defaultStatus', e.target.value)}
                        >
                          <option value="pending">대기중</option>
                          <option value="in_progress">진행중</option>
                          <option value="completed">완료</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">리포트 템플릿</label>
                        <select 
                          className="form-select"
                          value={settings.reportTemplate}
                          onChange={(e) => handleSettingChange('reportTemplate', e.target.value)}
                        >
                          <option value="standard">표준</option>
                          <option value="detailed">상세</option>
                          <option value="simple">간단</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox"
                            checked={settings.autoAssignment}
                            onChange={(e) => handleSettingChange('autoAssignment', e.target.checked)}
                          />
                          <span className="form-check-label">자동 담당자 배정</span>
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox"
                            checked={settings.emailNotification}
                            onChange={(e) => handleSettingChange('emailNotification', e.target.checked)}
                          />
                          <span className="form-check-label">이메일 알림</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-footer text-end">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleSave}
                  >
                    설정 저장
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">상태 관리</h3>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-vcenter table-mobile-md card-table">
                      <thead>
                        <tr>
                          <th>상태</th>
                          <th>설명</th>
                          <th>색상</th>
                          <th>사용여부</th>
                          <th className="w-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>대기중</td>
                          <td>서비스 요청 접수됨</td>
                          <td><span className="badge bg-yellow">노란색</span></td>
                          <td><span className="badge bg-success">활성</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary">수정</button>
                          </td>
                        </tr>
                        <tr>
                          <td>진행중</td>
                          <td>서비스 진행 중</td>
                          <td><span className="badge bg-blue">파란색</span></td>
                          <td><span className="badge bg-success">활성</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary">수정</button>
                          </td>
                        </tr>
                        <tr>
                          <td>완료</td>
                          <td>서비스 완료</td>
                          <td><span className="badge bg-green">초록색</span></td>
                          <td><span className="badge bg-success">활성</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary">수정</button>
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

      {/* Invoice 코드 추가/수정 모달 */}
      {showModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{ display: 'block' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCode ? 'Invoice 코드 수정' : '새 Invoice 코드 추가'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">코드 (3자리 숫자) <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalData.code}
                    onChange={(e) => setModalData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="001"
                    maxLength={3}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">설명 <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalData.description}
                    onChange={(e) => setModalData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="정기점검"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">카테고리</label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalData.category}
                    onChange={(e) => setModalData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="예: 유지보수, 수리, 점검"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveInvoiceCode}>
                  {editingCode ? '수정' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default ServiceReportSettings;