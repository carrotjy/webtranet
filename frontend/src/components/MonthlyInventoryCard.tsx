import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

interface MonthlyData {
  inbound: number;
  outbound: number;
}

interface PartMonthlyData {
  part_number: string;
  part_name: string;
  erp_name: string | null;
  previous_year_stock: number;
  current_stock: number;
  monthly_data: {
    [key: string]: MonthlyData;
  };
}

const MonthlyInventoryCard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [partsData, setPartsData] = useState<PartMonthlyData[]>([]);
  const [exporting, setExporting] = useState<boolean>(false);

  // 연도 옵션 생성 (현재 연도 기준 -5년 ~ +1년)
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await inventoryAPI.getMonthlySummary(selectedYear);

        if (response.data.success) {
          setPartsData(response.data.data.parts);
        } else {
          setError('데이터를 불러오는데 실패했습니다.');
        }
      } catch (err: any) {
        console.error('월별 재고현황 조회 실패:', err);
        setError(err.response?.data?.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedYear]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const response = await inventoryAPI.exportMonthlySummary(selectedYear);

      // Blob을 파일로 다운로드
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedYear}-재고현황.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('엑셀 파일이 다운로드되었습니다.');
    } catch (err: any) {
      console.error('엑셀 생성 실패:', err);
      alert(err.response?.data?.message || '엑셀 파일 생성에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="col-12">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">월별 재고현황</h3>
          <div className="card-actions">
            <div className="d-flex gap-2">
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ width: '120px' }}
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleExportExcel}
                disabled={exporting || loading}
              >
                {exporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
                      <path d="M8 11h8v7h-8z"/>
                      <path d="M8 15h8"/>
                      <path d="M11 11v7"/>
                    </svg>
                    엑셀 다운로드
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">로딩 중...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : partsData.length === 0 ? (
            <div className="text-center text-muted py-5">
              {selectedYear}년도 입출고 데이터가 없습니다.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-0">
                <thead style={{ backgroundColor: '#858585ff', color: 'white' }}>
                  <tr>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '120px' }}>파트번호</th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '150px' }}>파트명</th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '150px' }}>ERP명</th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '100px' }}>이월재고</th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '100px' }}>현재재고</th>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <th key={month} colSpan={2} className="text-center" style={{ minWidth: '120px' }}>
                        {month}월
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {Array.from({ length: 12 }, (_, i) => (
                      <React.Fragment key={i}>
                        <th className="text-center" style={{ fontSize: '0.85rem', padding: '0.25rem' }}>입고</th>
                        <th className="text-center" style={{ fontSize: '0.85rem', padding: '0.25rem' }}>출고</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partsData.map((part, index) => (
                    <tr key={part.part_number} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td className="text-center">{part.part_number}</td>
                      <td>{part.part_name}</td>
                      <td>{part.erp_name || '-'}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{part.previous_year_stock}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{part.current_stock}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                        const monthData = part.monthly_data[month.toString()] || { inbound: 0, outbound: 0 };
                        return (
                          <React.Fragment key={month}>
                            <td className="text-center" style={{
                              backgroundColor: monthData.inbound > 0 ? '#e8f4f8' : 'transparent',
                              fontWeight: monthData.inbound > 0 ? 'bold' : 'normal'
                            }}>
                              {monthData.inbound || '-'}
                            </td>
                            <td className="text-center" style={{
                              backgroundColor: monthData.outbound > 0 ? '#fff4e6' : 'transparent',
                              fontWeight: monthData.outbound > 0 ? 'bold' : 'normal'
                            }}>
                              {monthData.outbound || '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyInventoryCard;
