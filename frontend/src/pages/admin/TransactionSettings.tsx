import React, { useState } from 'react';

const TransactionSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    defaultCurrency: 'KRW',
    taxRate: 10,
    invoicePrefix: 'INV',
    autoNumbering: true,
    emailTemplate: 'standard'
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // TODO: API 호출하여 설정 저장
    console.log('거래명세서 설정 저장:', settings);
    alert('설정이 저장되었습니다.');
  };

  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle">관리자</div>
            <h2 className="page-title">거래명세서 설정</h2>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          <div className="row row-deck row-cards">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">거래명세서 기본 설정</h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">기본 통화</label>
                        <select 
                          className="form-select"
                          value={settings.defaultCurrency}
                          onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
                        >
                          <option value="KRW">원 (KRW)</option>
                          <option value="USD">달러 (USD)</option>
                          <option value="EUR">유로 (EUR)</option>
                          <option value="JPY">엔 (JPY)</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">세율 (%)</label>
                        <input 
                          type="number"
                          className="form-control"
                          value={settings.taxRate}
                          onChange={(e) => handleSettingChange('taxRate', parseFloat(e.target.value))}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">송장 번호 접두사</label>
                        <input 
                          type="text"
                          className="form-control"
                          value={settings.invoicePrefix}
                          onChange={(e) => handleSettingChange('invoicePrefix', e.target.value)}
                          placeholder="예: INV, TR"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">이메일 템플릿</label>
                        <select 
                          className="form-select"
                          value={settings.emailTemplate}
                          onChange={(e) => handleSettingChange('emailTemplate', e.target.value)}
                        >
                          <option value="standard">표준</option>
                          <option value="formal">공식</option>
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
                            checked={settings.autoNumbering}
                            onChange={(e) => handleSettingChange('autoNumbering', e.target.checked)}
                          />
                          <span className="form-check-label">자동 번호 생성</span>
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
                  <h3 className="card-title">결제 방법 관리</h3>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-vcenter table-mobile-md card-table">
                      <thead>
                        <tr>
                          <th>결제 방법</th>
                          <th>설명</th>
                          <th>수수료 (%)</th>
                          <th>사용여부</th>
                          <th className="w-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>현금</td>
                          <td>현금 결제</td>
                          <td>0%</td>
                          <td><span className="badge bg-success">활성</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary">수정</button>
                          </td>
                        </tr>
                        <tr>
                          <td>카드</td>
                          <td>신용카드 결제</td>
                          <td>2.3%</td>
                          <td><span className="badge bg-success">활성</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary">수정</button>
                          </td>
                        </tr>
                        <tr>
                          <td>계좌이체</td>
                          <td>은행 계좌이체</td>
                          <td>0.5%</td>
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
    </div>
  );
};

export default TransactionSettings;