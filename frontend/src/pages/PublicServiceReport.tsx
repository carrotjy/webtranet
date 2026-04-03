import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { publicServiceReportAPI } from '../services/api';

interface PublicReport {
  id: number;
  report_number: string;
  customer_name: string;
  customer_address: string;
  service_date: string;
  technician_name: string;
  machine_model: string;
  machine_serial: string;
  problem_description: string;
  solution_description: string;
  used_parts: Array<{
    part_name: string;
    part_number?: string;
    quantity: number;
    unit_price: number;
  }>;
  time_records: Array<{
    work_date: string;
    start_time: string;
    end_time: string;
    work_hours: number;
  }>;
  has_signature: boolean;
  customer_signed_at: string | null;
  signer_name: string | null;
}

const PublicServiceReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signerName, setSignerName] = useState('');
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    publicServiceReportAPI.getReport(token)
      .then(res => {
        setReport(res.data.report);
      })
      .catch(err => {
        const msg = err?.response?.data?.error || '서비스 리포트를 불러오는 중 오류가 발생했습니다.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // 캔버스 크기를 컨테이너 실제 픽셀 크기에 맞게 동기화 (모바일 터치 오프셋 방지)
  useEffect(() => {
    const resizeCanvas = () => {
      if (!containerRef.current || !sigCanvasRef.current) return;
      const canvas = sigCanvasRef.current.getCanvas();
      const w = containerRef.current.clientWidth;
      canvas.width = w;
      canvas.height = 180;
      sigCanvasRef.current.clear();
    };
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      alert('서명을 그려주세요.');
      return;
    }
    const dataUrl = sigCanvasRef.current.toDataURL('image/png');
    setSubmitting(true);
    try {
      await publicServiceReportAPI.submitSignature(token, dataUrl, signerName.trim() || undefined);
      setSubmitted(true);
      setReport(prev => prev ? {
        ...prev,
        has_signature: true,
        customer_signed_at: new Date().toISOString(),
        signer_name: signerName.trim() || null,
      } : prev);
    } catch (err: any) {
      const msg = err?.response?.data?.error || '서명 저장 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <div className="text-center">
          <h4 className="text-danger mb-3">오류</h4>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '20px 0' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className="card shadow-sm mb-4">
          <div className="card-body text-center py-4">
            <h4 className="mb-1 fw-bold">서비스 리포트</h4>
            <p className="text-muted mb-0">문서번호: {report.report_number}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card shadow-sm mb-4">
          <div className="card-header fw-semibold">기본 정보</div>
          <div className="card-body">
            <div className="row g-2">
              <div className="col-6">
                <small className="text-muted">고객사</small>
                <div className="fw-semibold">{report.customer_name || '-'}</div>
              </div>
              <div className="col-6">
                <small className="text-muted">서비스 날짜</small>
                <div className="fw-semibold">{report.service_date || '-'}</div>
              </div>
              <div className="col-6">
                <small className="text-muted">담당 엔지니어</small>
                <div className="fw-semibold">{report.technician_name || '-'}</div>
              </div>
              <div className="col-6">
                <small className="text-muted">고객 주소</small>
                <div className="fw-semibold">{report.customer_address || '-'}</div>
              </div>
              <div className="col-6">
                <small className="text-muted">기종</small>
                <div className="fw-semibold">{report.machine_model || '-'}</div>
              </div>
              <div className="col-6">
                <small className="text-muted">시리얼 번호</small>
                <div className="fw-semibold">{report.machine_serial || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Problem / Solution */}
        <div className="card shadow-sm mb-4">
          <div className="card-header fw-semibold">작업 내용</div>
          <div className="card-body">
            {report.problem_description && (
              <div className="mb-3">
                <small className="text-muted d-block mb-1">고장 내용</small>
                <div style={{ whiteSpace: 'pre-wrap' }}>{report.problem_description}</div>
              </div>
            )}
            {report.solution_description && (
              <div>
                <small className="text-muted d-block mb-1">조치 내용</small>
                <div style={{ whiteSpace: 'pre-wrap' }}>{report.solution_description}</div>
              </div>
            )}
          </div>
        </div>

        {/* Time Records */}
        {report.time_records && report.time_records.length > 0 && (
          <div className="card shadow-sm mb-4">
            <div className="card-header fw-semibold">작업 시간</div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>날짜</th>
                    <th>시작</th>
                    <th>종료</th>
                    <th>시간(h)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.time_records.map((t, i) => (
                    <tr key={i}>
                      <td>{t.work_date}</td>
                      <td>{t.start_time}</td>
                      <td>{t.end_time}</td>
                      <td>{t.work_hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Used Parts */}
        {report.used_parts && report.used_parts.length > 0 && (
          <div className="card shadow-sm mb-4">
            <div className="card-header fw-semibold">사용 부품</div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>부품명</th>
                    <th>부품번호</th>
                    <th>수량</th>
                    <th>단가</th>
                  </tr>
                </thead>
                <tbody>
                  {report.used_parts.map((p, i) => (
                    <tr key={i}>
                      <td>{p.part_name}</td>
                      <td>{p.part_number || '-'}</td>
                      <td>{p.quantity}</td>
                      <td>{p.unit_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-header d-flex align-items-center gap-3">
            <span className="fw-semibold">고객 서명</span>
            {!report.has_signature && !submitted && (
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="서명자 성함 (선택)"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                style={{ maxWidth: 180 }}
              />
            )}
          </div>
          <div className="card-body">
            {report.has_signature || submitted ? (
              <div className="text-center py-3">
                <div className="text-success mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                </div>
                <h5 className="text-success">서명 완료</h5>
                {(report.signer_name || (submitted && signerName.trim())) && (
                  <p className="mb-1 fw-semibold">{report.signer_name || signerName.trim()}</p>
                )}
                {report.customer_signed_at && (
                  <p className="text-muted small mb-0">
                    서명일시: {new Date(report.customer_signed_at).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-muted small mb-2">아래 서명란에 서명 후 완료 버튼을 눌러주세요.</p>
                <div
                  ref={containerRef}
                  style={{ border: '1px solid #dee2e6', borderRadius: 4, background: '#fff', marginBottom: 8 }}
                >
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="black"
                    canvasProps={{
                      style: { width: '100%', height: 180, display: 'block' }
                    }}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={handleClear} disabled={submitting}>
                    다시 쓰기
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                        저장 중...
                      </>
                    ) : '서명 완료'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicServiceReport;
