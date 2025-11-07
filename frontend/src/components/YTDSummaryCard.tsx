import React, { useState, useEffect } from 'react';
import { invoiceAPI } from '../services/api';

interface MonthlyData {
  work: number;
  travel: number;
  parts: number;
}

interface CategoryData {
  category: string;
  description: string;
  monthly_data: {
    [key: string]: MonthlyData;
  };
}

interface YTDData {
  year: number;
  categories: CategoryData[];
  labor_monthly_total: {
    [key: string]: number;
  };
  parts_monthly_total: {
    [key: string]: number;
  };
  has_null_categories?: boolean;
}

const YTDSummaryCard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [ytdData, setYtdData] = useState<YTDData | null>(null);

  // 연도 옵션 생성 (현재 연도 기준 -5년 ~ +1년)
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await invoiceAPI.getYTDSummary(selectedYear);

        console.log('YTD API Response:', response.data);
        console.log('Parts Monthly Total:', response.data.data?.parts_monthly_total);

        if (response.data.success) {
          setYtdData(response.data.data);
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

  // 금액 포맷팅 (원 단위, 천자리 콤마)
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '0';
    return Math.round(amount).toLocaleString('ko-KR');
  };

  // 시간 포맷팅 (소수점 1자리)
  const formatHours = (hours: number): string => {
    if (hours === 0) return '0';
    return hours.toFixed(1);
  };

  // 월별 합계 계산 (work 또는 travel)
  const getMonthlyAmount = (data: CategoryData, month: number, type: 'work' | 'travel'): number => {
    const monthData = data.monthly_data[month.toString()];
    if (!monthData) return 0;
    return monthData[type];
  };

  // 분기 합계 계산
  const getQuarterlyAmount = (data: CategoryData, quarter: number, type: 'work' | 'travel'): number => {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    let total = 0;

    for (let month = startMonth; month <= endMonth; month++) {
      total += getMonthlyAmount(data, month, type);
    }

    return total;
  };

  // YTD 합계 계산
  const getYTDAmount = (data: CategoryData, type: 'work' | 'travel'): number => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getMonthlyAmount(data, month, type);
    }
    return total;
  };

  // Labor 비용 월별 총계 가져오기
  const getLaborMonthlyTotal = (month: number): number => {
    if (!ytdData?.labor_monthly_total) return 0;
    return ytdData.labor_monthly_total[month.toString()] || 0;
  };

  // Labor 비용 분기별 총계
  const getLaborQuarterlyTotal = (quarter: number): number => {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    let total = 0;
    for (let month = startMonth; month <= endMonth; month++) {
      total += getLaborMonthlyTotal(month);
    }
    return total;
  };

  // Labor 비용 연간 총계
  const getLaborYearlyTotal = (): number => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getLaborMonthlyTotal(month);
    }
    return total;
  };

  // 부품비용 월별 총계 가져오기
  const getPartsMonthlyTotal = (month: number): number => {
    if (!ytdData?.parts_monthly_total) return 0;
    return ytdData.parts_monthly_total[month.toString()] || 0;
  };

  // 부품비용 분기별 총계
  const getPartsQuarterlyTotal = (quarter: number): number => {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    let total = 0;
    for (let month = startMonth; month <= endMonth; month++) {
      total += getPartsMonthlyTotal(month);
    }
    return total;
  };

  // 부품비용 연간 총계
  const getPartsYearlyTotal = (): number => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getPartsMonthlyTotal(month);
    }
    return total;
  };

  // 카테고리 행 렌더링 (work/travel 시간)
  const renderCategoryRow = (data: CategoryData, costType: 'work' | 'travel') => {
    const rowLabel = costType === 'work' ? 'Working Hours' : 'Traveling';

    return (
      <tr key={`${data.category}-${costType}`}>
        <td style={{ paddingLeft: '20px' }}>{rowLabel}</td>
        {/* Q1: Jan, Feb, Mar */}
        <td className="text-end">{formatHours(getMonthlyAmount(data, 1, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 2, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 3, costType))}</td>
        <td className="text-end">{formatHours(getQuarterlyAmount(data, 1, costType))}</td>
        {/* Q2: Apr, May, Jun */}
        <td className="text-end">{formatHours(getMonthlyAmount(data, 4, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 5, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 6, costType))}</td>
        <td className="text-end">{formatHours(getQuarterlyAmount(data, 2, costType))}</td>
        {/* Q3: Jul, Aug, Sep */}
        <td className="text-end">{formatHours(getMonthlyAmount(data, 7, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 8, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 9, costType))}</td>
        <td className="text-end">{formatHours(getQuarterlyAmount(data, 3, costType))}</td>
        {/* Q4: Oct, Nov, Dec */}
        <td className="text-end">{formatHours(getMonthlyAmount(data, 10, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 11, costType))}</td>
        <td className="text-end">{formatHours(getMonthlyAmount(data, 12, costType))}</td>
        <td className="text-end">{formatHours(getQuarterlyAmount(data, 4, costType))}</td>
        {/* Year */}
        <td className="text-end fw-bold" style={{ backgroundColor: '#fff9c4' }}>
          {formatHours(getYTDAmount(data, costType))}
        </td>
      </tr>
    );
  };

  return (
    <div className="col-12">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">YTD Summary (Hours & Costs in '000 KRW)</h3>
          <div className="card-actions">
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ width: '120px' }}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
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
          ) : !ytdData || ytdData.categories.length === 0 ? (
            <div className="text-center text-muted py-5">
              데이터가 없습니다.
            </div>
          ) : (
            <>
              {ytdData.has_null_categories && (
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Category가 지정되지 않은 레포트가 있습니다.
                </div>
              )}
              <div className="table-responsive">
              <table className="table table-bordered table-sm" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ minWidth: '150px' }}>Category</th>
                    <th className="text-center">Jan</th>
                    <th className="text-center">Feb</th>
                    <th className="text-center">Mar</th>
                    <th className="text-center" style={{ backgroundColor: '#e8f5e9' }}>1Q</th>
                    <th className="text-center">Apr</th>
                    <th className="text-center">May</th>
                    <th className="text-center">Jun</th>
                    <th className="text-center" style={{ backgroundColor: '#e8f5e9' }}>2Q</th>
                    <th className="text-center">Jul</th>
                    <th className="text-center">Aug</th>
                    <th className="text-center">Sep</th>
                    <th className="text-center" style={{ backgroundColor: '#e8f5e9' }}>3Q</th>
                    <th className="text-center">Oct</th>
                    <th className="text-center">Nov</th>
                    <th className="text-center">Dec</th>
                    <th className="text-center" style={{ backgroundColor: '#e8f5e9' }}>4Q</th>
                    <th className="text-center" style={{ backgroundColor: '#fff9c4' }}>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {ytdData.categories.map((categoryData) => (
                    <React.Fragment key={categoryData.category}>
                      <tr className="table-info">
                        <td colSpan={18} className="fw-bold">
                          Category {categoryData.category}
                        </td>
                      </tr>
                      {renderCategoryRow(categoryData, 'work')}
                      {renderCategoryRow(categoryData, 'travel')}
                    </React.Fragment>
                  ))}

                  {/* Labor 비용 총계 (카테고리 구분 없음, 네고 포함) */}
                  <tr className="table-success">
                    <td colSpan={18} className="fw-bold">
                      Labor Total (All Categories)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>Labor Cost</td>
                    {/* Q1: Jan, Feb, Mar */}
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(1))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(2))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(3))}</td>
                    <td className="text-end">{formatCurrency(getLaborQuarterlyTotal(1))}</td>
                    {/* Q2: Apr, May, Jun */}
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(4))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(5))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(6))}</td>
                    <td className="text-end">{formatCurrency(getLaborQuarterlyTotal(2))}</td>
                    {/* Q3: Jul, Aug, Sep */}
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(7))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(8))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(9))}</td>
                    <td className="text-end">{formatCurrency(getLaborQuarterlyTotal(3))}</td>
                    {/* Q4: Oct, Nov, Dec */}
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(10))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(11))}</td>
                    <td className="text-end">{formatCurrency(getLaborMonthlyTotal(12))}</td>
                    <td className="text-end">{formatCurrency(getLaborQuarterlyTotal(4))}</td>
                    {/* Year */}
                    <td className="text-end fw-bold" style={{ backgroundColor: '#fff9c4' }}>
                      {formatCurrency(getLaborYearlyTotal())}
                    </td>
                  </tr>

                  {/* 부품비용 총계 (카테고리 구분 없음) */}
                  <tr className="table-warning">
                    <td colSpan={18} className="fw-bold">
                      Parts Total (All Categories)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}>Parts Cost</td>
                    {/* Q1: Jan, Feb, Mar */}
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(1))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(2))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(3))}</td>
                    <td className="text-end">{formatCurrency(getPartsQuarterlyTotal(1))}</td>
                    {/* Q2: Apr, May, Jun */}
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(4))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(5))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(6))}</td>
                    <td className="text-end">{formatCurrency(getPartsQuarterlyTotal(2))}</td>
                    {/* Q3: Jul, Aug, Sep */}
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(7))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(8))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(9))}</td>
                    <td className="text-end">{formatCurrency(getPartsQuarterlyTotal(3))}</td>
                    {/* Q4: Oct, Nov, Dec */}
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(10))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(11))}</td>
                    <td className="text-end">{formatCurrency(getPartsMonthlyTotal(12))}</td>
                    <td className="text-end">{formatCurrency(getPartsQuarterlyTotal(4))}</td>
                    {/* Year */}
                    <td className="text-end fw-bold" style={{ backgroundColor: '#fff9c4' }}>
                      {formatCurrency(getPartsYearlyTotal())}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 text-muted small">
                <strong>참고:</strong> 카테고리별은 시간(Hours) 합산 (네고 시간 제외), Labor/Parts Total은 금액(KRW) 합산 (네고 금액 포함)
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default YTDSummaryCard;
