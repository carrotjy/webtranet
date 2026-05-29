import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface InvoiceRates {
  id?: number;
  work_rate: number;
  travel_rate: number;
  created_at?: string;
  updated_at?: string;
}

interface SupplierInfo {
  company_name: string;
  registration_number: string;
  ceo_name: string;
  address: string;
  phone: string;
  fax: string;
}

const InvoiceSettings: React.FC = () => {
  const [rates, setRates] = useState<InvoiceRates>({
    work_rate: 50000,
    travel_rate: 30000
  });

  const [supplierInfo, setSupplierInfo] = useState<SupplierInfo>({
    company_name: '',
    registration_number: '',
    ceo_name: '',
    address: '',
    phone: '',
    fax: ''
  });

  const [invoiceSavePath, setInvoiceSavePath] = useState('');
  const [invoiceSaveUser, setInvoiceSaveUser] = useState('');
  const [invoiceSavePassword, setInvoiceSavePassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [savingPath, setSavingPath] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  // 현재 요율 설정 조회
  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/invoice-rates');
      if (response.data) {
        setRates(response.data);
      }
    } catch (error) {
      console.error('요율 설정 조회 실패:', error);
      // 기본값 유지
    } finally {
      setLoading(false);
    }
  };

  // 공급자 정보 조회
  const fetchSupplierInfo = async () => {
    try {
      const response = await api.get('/api/admin/supplier-info');
      if (response.data) {
        setSupplierInfo(response.data);
      }
    } catch (error) {
      console.error('공급자 정보 조회 실패:', error);
      // 기본값 유지
    }
  };

  // 거래명세서 저장 경로 조회
  const fetchInvoiceSavePath = async () => {
    try {
      const response = await api.get('/api/system/invoice-save-path');
      if (response.data.success) {
        setInvoiceSavePath(response.data.invoice_save_path || '');
        setInvoiceSaveUser(response.data.invoice_save_user || '');
        setHasPassword(response.data.has_password || false);
      }
    } catch (error) {
      console.error('거래명세서 저장 경로 조회 실패:', error);
    }
  };

  // 거래명세서 저장 경로 저장
  const handleSaveInvoicePath = async () => {
    try {
      setSavingPath(true);
      await api.post('/api/system/invoice-save-path', {
        invoice_save_path: invoiceSavePath,
        invoice_save_user: invoiceSaveUser,
        invoice_save_password: invoiceSavePassword,
      });
      alert('거래명세서 저장 경로가 설정되었습니다.');
      setInvoiceSavePassword('');
      setHasPassword(invoiceSavePassword !== '' ? true : hasPassword);
    } catch (error: any) {
      const msg = error?.response?.data?.message || '저장 경로 설정에 실패했습니다.';
      alert(msg);
    } finally {
      setSavingPath(false);
    }
  };

  // 요율 설정 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/api/admin/invoice-rates', rates);
      alert('요율 설정이 저장되었습니다.');
    } catch (error) {
      console.error('요율 설정 저장 실패:', error);
      alert('요율 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRateChange = (field: keyof InvoiceRates, value: number) => {
    setRates(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 공급자 정보 저장
  const handleSaveSupplier = async () => {
    try {
      setSavingSupplier(true);
      await api.post('/api/admin/supplier-info', supplierInfo);
      alert('공급자 정보가 저장되었습니다.');
    } catch (error) {
      console.error('공급자 정보 저장 실패:', error);
      alert('공급자 정보 저장에 실패했습니다.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSupplierChange = (field: keyof SupplierInfo, value: string) => {
    setSupplierInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    fetchRates();
    fetchSupplierInfo();
    fetchInvoiceSavePath();
  }, []);

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle">관리자</div>
            <h2 className="page-title">거래명세표 관리</h2>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">

            {/* 거래명세서 저장 경로 설정 카드 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">거래명세서 저장 경로</h3>
                  <div className="card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveInvoicePath}
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
                          value={invoiceSavePath}
                          onChange={(e) => setInvoiceSavePath(e.target.value)}
                          placeholder="예: \\messerver\invoice$  또는  /mnt/share/거래명세서"
                        />
                        <div className="form-hint">
                          거래명세서 생성 시 Excel 및 PDF 파일이 저장될 폴더 경로.
                          비워두면 서버 기본 경로(instance/거래명세서)를 사용합니다.
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">접속 계정 (ID)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={invoiceSaveUser}
                          onChange={(e) => setInvoiceSaveUser(e.target.value)}
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
                          {hasPassword && (
                            <span className="badge bg-success ms-2" style={{ fontSize: '0.7em' }}>설정됨</span>
                          )}
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          value={invoiceSavePassword}
                          onChange={(e) => setInvoiceSavePassword(e.target.value)}
                          placeholder={hasPassword ? '변경하려면 새 비밀번호 입력' : '비밀번호 입력'}
                          autoComplete="new-password"
                        />
                        <div className="form-hint">
                          비워두면 기존 비밀번호를 유지합니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 공급자 정보 카드 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">공급자 정보</h3>
                  <div className="card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveSupplier}
                      disabled={savingSupplier}
                    >
                      {savingSupplier ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          저장 중...
                        </>
                      ) : (
                        '공급자 정보 저장'
                      )}
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">사업자명</label>
                        <input
                          type="text"
                          className="form-control"
                          value={supplierInfo.company_name}
                          onChange={(e) => handleSupplierChange('company_name', e.target.value)}
                          placeholder="(주)회사명"
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">사업자등록번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={supplierInfo.registration_number}
                          onChange={(e) => handleSupplierChange('registration_number', e.target.value)}
                          placeholder="000-00-00000"
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">대표자명</label>
                        <input
                          type="text"
                          className="form-control"
                          value={supplierInfo.ceo_name}
                          onChange={(e) => handleSupplierChange('ceo_name', e.target.value)}
                          placeholder="홍길동"
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">사업장 주소</label>
                        <input
                          type="text"
                          className="form-control"
                          value={supplierInfo.address}
                          onChange={(e) => handleSupplierChange('address', e.target.value)}
                          placeholder="서울시 강남구..."
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">전화번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={supplierInfo.phone}
                          onChange={(e) => handleSupplierChange('phone', e.target.value)}
                          placeholder="02-0000-0000"
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">팩스번호</label>
                        <input
                          type="text"
                          className="form-control"
                          value={supplierInfo.fax}
                          onChange={(e) => handleSupplierChange('fax', e.target.value)}
                          placeholder="02-0000-0001"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 요율 설정 카드 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">시간당 요율 설정</h3>
                  <div className="card-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          저장 중...
                        </>
                      ) : (
                        '설정 저장'
                      )}
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">로딩 중...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            작업시간 요율 <span className="text-muted">(원/시간)</span>
                          </label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              value={rates.work_rate}
                              onChange={(e) => handleRateChange('work_rate', parseInt(e.target.value) || 0)}
                              placeholder="50000"
                              min="0"
                              step="1000"
                            />
                            <span className="input-group-text">원</span>
                          </div>
                          <div className="form-hint">
                            서비스 리포트의 작업시간에 적용되는 시간당 요율입니다.
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            이동시간 요율 <span className="text-muted">(원/시간)</span>
                          </label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="form-control"
                              value={rates.travel_rate}
                              onChange={(e) => handleRateChange('travel_rate', parseInt(e.target.value) || 0)}
                              placeholder="30000"
                              min="0"
                              step="1000"
                            />
                            <span className="input-group-text">원</span>
                          </div>
                          <div className="form-hint">
                            서비스 리포트의 이동시간에 적용되는 시간당 요율입니다.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 거래명세표 설정 정보 카드 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">거래명세표 자동 생성 규칙</h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-12">
                      <h4>거래명세표 번호 형식</h4>
                      <p className="text-muted mb-3">YYYYMM0001 (예: 202509001)</p>
                      
                      <h4>부가세 계산</h4>
                      <p className="text-muted mb-3">공급가액의 10% 자동 계산</p>
                      
                      <h4>거래명세표 항목 구성</h4>
                      <ul className="list-unstyled">
                        <li className="mb-2">
                          <strong>작업시간:</strong> 서비스 리포트의 작업시간 × 작업시간 요율
                        </li>
                        <li className="mb-2">
                          <strong>이동시간:</strong> 서비스 리포트의 이동시간 × 이동시간 요율
                        </li>
                        <li className="mb-2">
                          <strong>사용 부품:</strong> 서비스 리포트의 사용 부품 × 단가
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 현재 설정 미리보기 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">설정 미리보기</h3>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-vcenter">
                      <thead>
                        <tr>
                          <th>항목</th>
                          <th>수량</th>
                          <th>단가</th>
                          <th>금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-muted">작업시간 (예시: 2시간)</td>
                          <td>2.0</td>
                          <td>{rates.work_rate.toLocaleString()}원</td>
                          <td className="fw-bold">{(rates.work_rate * 2).toLocaleString()}원</td>
                        </tr>
                        <tr>
                          <td className="text-muted">이동시간 (예시: 1시간)</td>
                          <td>1.0</td>
                          <td>{rates.travel_rate.toLocaleString()}원</td>
                          <td className="fw-bold">{(rates.travel_rate * 1).toLocaleString()}원</td>
                        </tr>
                        <tr className="table-active">
                          <td className="fw-bold">합계</td>
                          <td></td>
                          <td></td>
                          <td className="fw-bold">{(rates.work_rate * 2 + rates.travel_rate * 1).toLocaleString()}원</td>
                        </tr>
                        <tr>
                          <td className="text-muted">부가세 (10%)</td>
                          <td></td>
                          <td></td>
                          <td className="fw-bold">{Math.round((rates.work_rate * 2 + rates.travel_rate * 1) * 0.1).toLocaleString()}원</td>
                        </tr>
                        <tr className="table-success">
                          <td className="fw-bold">총합계</td>
                          <td></td>
                          <td></td>
                          <td className="fw-bold">{Math.round((rates.work_rate * 2 + rates.travel_rate * 1) * 1.1).toLocaleString()}원</td>
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
  );
};

export default InvoiceSettings;