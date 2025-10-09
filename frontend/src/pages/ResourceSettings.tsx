import React, { useState, useEffect } from 'react';

interface ResourceSettings {
  historyTemplates: string;
}

const ResourceSettings: React.FC = () => {
  const [settings, setSettings] = useState<ResourceSettings>({
    historyTemplates: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // localStorage에서 설정 로드
      const savedSettings = localStorage.getItem('resourceSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // 기본값 설정
        setSettings({
          historyTemplates: 'FAC 서명, 설비 설치, 시운전 완료, 사용자 교육 완료, 정기 점검, 부품 교체, 수리 완료, 보증기한 만료, 장비 이설, 폐기 처리'
        });
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      alert('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // localStorage에 설정 저장
      localStorage.setItem('resourceSettings', JSON.stringify(settings));
      
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateChange = (value: string) => {
    setSettings({
      ...settings,
      historyTemplates: value
    });
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="container-xl">
          <div className="page-header d-print-none">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">리소스 설정</h2>
              </div>
            </div>
          </div>
          
          <div className="page-body">
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container-xl">
        <div className="page-header d-print-none">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">리소스 설정</h2>
              <div className="text-muted mt-1">리소스 관리에 사용되는 설정을 관리합니다.</div>
            </div>
          </div>
        </div>
        
        <div className="page-body">
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <path d="M9 7h-3a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-3"/>
                      <path d="M9 15h3l8.5 -8.5a1.5 1.5 0 0 0 -3 -3l-8.5 8.5v3"/>
                      <line x1="16" y1="5" x2="19" y2="8"/>
                    </svg>
                    관리 이력 템플릿
                  </h3>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">
                      자주 사용하는 이력 내용
                      <span className="text-muted ms-2">(콤마로 구분하여 입력)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={settings.historyTemplates}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      placeholder="예: FAC 서명, 설비 설치, 시운전 완료, 사용자 교육 완료"
                    />
                    <div className="form-text">
                      리소스 관리 페이지에서 이력을 추가할 때 드롭다운에 표시될 항목들입니다.
                      각 항목은 콤마로 구분하여 입력해주세요.
                    </div>
                  </div>
                  
                  {settings.historyTemplates && (
                    <div className="mb-3">
                      <label className="form-label">미리보기</label>
                      <div className="border rounded p-3" style={{ backgroundColor: '#f8f9fa' }}>
                        <div className="row">
                          {settings.historyTemplates.split(',').map((template, index) => (
                            <div key={index} className="col-auto mb-2">
                              <span className="badge bg-azure-lt text-azure">
                                {template.trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          저장 중...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M19 21h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h10l4 4v12a2 2 0 0 1 -2 2z"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="M13 5v4h4"/>
                          </svg>
                          설정 저장
                        </>
                      )}
                    </button>
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

export default ResourceSettings;