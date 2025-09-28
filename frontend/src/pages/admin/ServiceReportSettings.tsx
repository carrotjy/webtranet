import React, { useState } from 'react';

const ServiceReportSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    defaultStatus: 'pending',
    autoAssignment: false,
    emailNotification: true,
    reportTemplate: 'standard'
  });

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
    </div>
  );
};

export default ServiceReportSettings;