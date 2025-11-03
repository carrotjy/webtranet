import React, { useState, useEffect } from 'react';
import { invoiceAPI } from '../services/api';

interface MonthlyData {
  work: number;
  travel: number;
  parts: number;
}

interface InvoiceCodeData {
  code: string;
  description: string;
  monthly_data: {
    [key: string]: MonthlyData;
  };
}

const YTDSummaryCard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [invoiceCodesData, setInvoiceCodesData] = useState<InvoiceCodeData[]>([]);

  // 연도 옵션 생성 (현재 연도 기준 -5년 ~ +1년)
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await invoiceAPI.getYTDSummary(selectedYear);

        if (response.data.success) {
          setInvoiceCodesData(response.data.data.invoice_codes);
        } else {
          setError('데이터를 불러오는데 실패했습니다.');
        }
      } catch (err: any) {
        console.error('YTD 요약 조회 실패:', err);
        setError(err.response?.data?.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedYear]);

  // 분기별 합계 계산
  const getQuarterlyTotal = (data: InvoiceCodeData, quarter: number): number => {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    let total = 0;

    for (let month = startMonth; month <= endMonth; month++) {
      const monthData = data.monthly_data[month.toString()];
      if (monthData) {
        total += monthData.work + monthData.travel + monthData.parts;
      }
    }

    return total;
  };

  // YTD 합계 계산
  const getYTDTotal = (data: InvoiceCodeData): number => {
    let total = 0;

    for (let month = 1; month <= 12; month++) {
      const monthData = data.monthly_data[month.toString()];
      if (monthData) {
        total += monthData.work + monthData.travel + monthData.parts;
      }
    }

    return total;
  };

  // 타입별 전체 합계 계산
  const getTypeTotal = (data: InvoiceCodeData, type: 'work' | 'travel' | 'parts'): number => {
    let total = 0;

    for (let month = 1; month <= 12; month++) {
      const monthData = data.monthly_data[month.toString()];
      if (monthData) {
        total += monthData[type];
      }
    }

    return total;
  };

  // 월별 합계 계산
  const getMonthlyTotal = (data: InvoiceCodeData, month: number): number => {
    const monthData = data.monthly_data[month.toString()];
    if (!monthData) return 0;
    return monthData.work + monthData.travel + monthData.parts;
  };

  // 금액 포맷팅
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '-';
    return `₩${Math.round(amount).toLocaleString()}`;
  };

  return (
    <div className="col-12">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">YTD 요약 (Invoice Code별 월별/분기별 비용 집계)</h3>
          <div className="card-actions">
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
          ) : invoiceCodesData.length === 0 ? (
            <div className="text-center text-muted py-5">
              {selectedYear}년도 발행된 거래명세서가 없습니다.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-sm" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light">
                  <tr>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '80px', position: 'sticky', left: 0, backgroundColor: '#f8f9fa', zIndex: 2 }}>
                      Code
                    </th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '120px', position: 'sticky', left: '80px', backgroundColor: '#f8f9fa', zIndex: 2 }}>
                      Description
                    </th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '100px', backgroundColor: '#e3f2fd' }}>
                      Work Total
                    </th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '100px', backgroundColor: '#fff3e0' }}>
                      Travel Total
                    </th>
                    <th rowSpan={2} className="text-center align-middle" style={{ minWidth: '100px', backgroundColor: '#f3e5f5' }}>
                      Parts Total
                    </th>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <th key={`month-${month}`} className="text-center" style={{ minWidth: '100px' }}>
                        {month}월
                      </th>
                    ))}
                    <th className="text-center" style={{ minWidth: '100px', backgroundColor: '#e8f5e9' }}>Q1</th>
                    <th className="text-center" style={{ minWidth: '100px', backgroundColor: '#e8f5e9' }}>Q2</th>
                    <th className="text-center" style={{ minWidth: '100px', backgroundColor: '#e8f5e9' }}>Q3</th>
                    <th className="text-center" style={{ minWidth: '100px', backgroundColor: '#e8f5e9' }}>Q4</th>
                    <th className="text-center" style={{ minWidth: '120px', backgroundColor: '#fff9c4', fontWeight: 'bold' }}>YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceCodesData.map((codeData) => {
                    const workTotal = getTypeTotal(codeData, 'work');
                    const travelTotal = getTypeTotal(codeData, 'travel');
                    const partsTotal = getTypeTotal(codeData, 'parts');
                    const ytdTotal = getYTDTotal(codeData);

                    // 전체 합계가 0이면 행 숨기기
                    if (ytdTotal === 0) return null;

                    return (
                      <tr key={codeData.code}>
                        <td className="text-center fw-bold" style={{ position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>
                          {codeData.code}
                        </td>
                        <td style={{ position: 'sticky', left: '80px', backgroundColor: '#fff', zIndex: 1 }}>
                          {codeData.description}
                        </td>
                        <td className="text-end" style={{ backgroundColor: workTotal > 0 ? '#e3f2fd' : 'transparent' }}>
                          {formatCurrency(workTotal)}
                        </td>
                        <td className="text-end" style={{ backgroundColor: travelTotal > 0 ? '#fff3e0' : 'transparent' }}>
                          {formatCurrency(travelTotal)}
                        </td>
                        <td className="text-end" style={{ backgroundColor: partsTotal > 0 ? '#f3e5f5' : 'transparent' }}>
                          {formatCurrency(partsTotal)}
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                          const monthTotal = getMonthlyTotal(codeData, month);
                          const monthData = codeData.monthly_data[month.toString()];

                          return (
                            <td
                              key={`${codeData.code}-month-${month}`}
                              className="text-end"
                              style={{
                                backgroundColor: monthTotal > 0 ? '#f5f5f5' : 'transparent',
                                fontWeight: monthTotal > 0 ? 'bold' : 'normal',
                                cursor: monthTotal > 0 ? 'help' : 'default'
                              }}
                              title={monthTotal > 0 && monthData ?
                                `Work: ${formatCurrency(monthData.work)}\nTravel: ${formatCurrency(monthData.travel)}\nParts: ${formatCurrency(monthData.parts)}`
                                : ''}
                            >
                              {formatCurrency(monthTotal)}
                            </td>
                          );
                        })}
                        {[1, 2, 3, 4].map(quarter => {
                          const qTotal = getQuarterlyTotal(codeData, quarter);
                          return (
                            <td
                              key={`${codeData.code}-q${quarter}`}
                              className="text-end"
                              style={{
                                backgroundColor: qTotal > 0 ? '#e8f5e9' : 'transparent',
                                fontWeight: qTotal > 0 ? 'bold' : 'normal'
                              }}
                            >
                              {formatCurrency(qTotal)}
                            </td>
                          );
                        })}
                        <td className="text-end fw-bold" style={{ backgroundColor: '#fff9c4' }}>
                          {formatCurrency(ytdTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-2 text-muted small">
                <strong>범례:</strong>
                <span className="ms-2" style={{ padding: '2px 8px', backgroundColor: '#e3f2fd', marginRight: '8px' }}>Work (작업)</span>
                <span style={{ padding: '2px 8px', backgroundColor: '#fff3e0', marginRight: '8px' }}>Travel (이동)</span>
                <span style={{ padding: '2px 8px', backgroundColor: '#f3e5f5', marginRight: '8px' }}>Parts (부품)</span>
                <span style={{ padding: '2px 8px', backgroundColor: '#e8f5e9', marginRight: '8px' }}>분기 합계</span>
                <span style={{ padding: '2px 8px', backgroundColor: '#fff9c4' }}>YTD 합계</span>
              </div>
              <div className="mt-1 text-muted small">
                월별 셀에 마우스를 올리면 Work/Travel/Parts 세부 금액을 확인할 수 있습니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YTDSummaryCard;
