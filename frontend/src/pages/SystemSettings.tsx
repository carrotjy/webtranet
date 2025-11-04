import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Printer {
  name: string;
  is_default: boolean;
}

const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // LibreOffice 경로 설정
  const [libreOfficePath, setLibreOfficePath] = useState<string>('');
  const [libreOfficeLoading, setLibreOfficeLoading] = useState(false);
  const [libreOfficeSaveMessage, setLibreOfficeSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.is_admin) {
      alert('관리자만 접근할 수 있습니다.');
      navigate('/');
      return;
    }

    fetchPrinters();
    fetchCurrentFaxPrinter();
    fetchLibreOfficePath();
  }, [navigate]);

  const fetchPrinters = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/system/printers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setPrinters(response.data.printers);
      }
    } catch (error: any) {
      console.error('프린터 목록 조회 실패:', error);
      alert(error.response?.data?.message || '프린터 목록을 불러오지 못했습니다.');
    }
  };

  const fetchCurrentFaxPrinter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/system/fax-printer', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success && response.data.fax_printer) {
        setSelectedPrinter(response.data.fax_printer);
      }
    } catch (error: any) {
      console.error('팩스 프린터 설정 조회 실패:', error);
    }
  };

  const fetchLibreOfficePath = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/system/libreoffice-path', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success && response.data.libreoffice_path) {
        setLibreOfficePath(response.data.libreoffice_path);
      }
    } catch (error: any) {
      console.error('LibreOffice 경로 조회 실패:', error);
    }
  };

  const handleSaveFaxPrinter = async () => {
    if (!selectedPrinter) {
      setSaveMessage({ type: 'error', text: '프린터를 선택해주세요.' });
      return;
    }

    setLoading(true);
    setSaveMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/system/fax-printer', {
        printer_name: selectedPrinter
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSaveMessage({ type: 'success', text: '팩스 프린터가 설정되었습니다.' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error: any) {
      console.error('팩스 프린터 설정 실패:', error);
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.message || '설정 저장에 실패했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLibreOfficePath = async () => {
    if (!libreOfficePath.trim()) {
      setLibreOfficeSaveMessage({ type: 'error', text: 'LibreOffice 경로를 입력해주세요.' });
      return;
    }

    setLibreOfficeLoading(true);
    setLibreOfficeSaveMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/system/libreoffice-path', {
        libreoffice_path: libreOfficePath
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setLibreOfficeSaveMessage({ type: 'success', text: 'LibreOffice 경로가 설정되었습니다.' });
        setTimeout(() => setLibreOfficeSaveMessage(null), 3000);
      }
    } catch (error: any) {
      console.error('LibreOffice 경로 설정 실패:', error);
      setLibreOfficeSaveMessage({
        type: 'error',
        text: error.response?.data?.message || '설정 저장에 실패했습니다.'
      });
    } finally {
      setLibreOfficeLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>시스템 설정</h2>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-2"></i>
          돌아가기
        </button>
      </div>

      {/* 팩스 프린터 설정 섹션 */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <i className="bi bi-printer me-2"></i>
            팩스 전송 프린터 설정
          </h5>
        </div>
        <div className="card-body">
          <p className="text-muted">
            거래명세표를 팩스로 전송할 때 사용할 프린터를 선택하세요.
          </p>

          {printers.length === 0 ? (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              설치된 프린터가 없습니다. Windows에서 팩스 프린터를 설치해주세요.
            </div>
          ) : (
            <div className="list-group mb-3">
              {printers.map((printer, index) => (
                <label
                  key={index}
                  className={`list-group-item list-group-item-action d-flex align-items-center ${
                    selectedPrinter === printer.name ? 'active' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    className="form-check-input me-3"
                    name="fax-printer"
                    value={printer.name}
                    checked={selectedPrinter === printer.name}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-bold">{printer.name}</div>
                    {printer.is_default && (
                      <small className="text-muted">
                        <i className="bi bi-star-fill me-1"></i>
                        기본 프린터
                      </small>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {saveMessage && (
            <div className={`alert alert-${saveMessage.type === 'success' ? 'success' : 'danger'}`}>
              <i className={`bi bi-${saveMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
              {saveMessage.text}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSaveFaxPrinter}
            disabled={loading || !selectedPrinter}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                저장 중...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                설정 저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* LibreOffice 경로 설정 섹션 */}
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">
            <i className="bi bi-file-earmark-pdf me-2"></i>
            LibreOffice 경로 설정
          </h5>
        </div>
        <div className="card-body">
          <p className="text-muted">
            거래명세표 PDF 생성 시 사용할 LibreOffice 프로그램의 soffice.exe 경로를 입력하세요.
          </p>

          <div className="alert alert-info">
            <strong>Windows 기본 설치 경로:</strong>
            <ul className="mb-0 mt-2">
              <li><code>C:\Program Files\LibreOffice\program\soffice.exe</code> (64비트)</li>
              <li><code>C:\Program Files (x86)\LibreOffice\program\soffice.exe</code> (32비트)</li>
            </ul>
          </div>

          <div className="mb-3">
            <label htmlFor="libreoffice-path" className="form-label fw-bold">
              LibreOffice 경로
            </label>
            <input
              type="text"
              id="libreoffice-path"
              className="form-control"
              placeholder="예: C:\Program Files\LibreOffice\program\soffice.exe"
              value={libreOfficePath}
              onChange={(e) => setLibreOfficePath(e.target.value)}
            />
            <small className="text-muted">
              LibreOffice가 설치되지 않은 경우 <a href="https://www.libreoffice.org/download/download/" target="_blank" rel="noopener noreferrer">여기서 다운로드</a>하세요.
            </small>
          </div>

          {libreOfficeSaveMessage && (
            <div className={`alert alert-${libreOfficeSaveMessage.type === 'success' ? 'success' : 'danger'}`}>
              <i className={`bi bi-${libreOfficeSaveMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
              {libreOfficeSaveMessage.text}
            </div>
          )}

          <button
            className="btn btn-success"
            onClick={handleSaveLibreOfficePath}
            disabled={libreOfficeLoading || !libreOfficePath.trim()}
          >
            {libreOfficeLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                저장 중...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                경로 저장
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
