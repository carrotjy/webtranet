import React, { useState, useEffect } from 'react';

// 가격 구간 인터페이스
interface PriceRange {
  minPrice: number;
  maxPrice: number | null; // null은 "이상" 의미
  factor: number;
}

// 기본 가격 구간 설정
const DEFAULT_REPAIR_PARTS_RANGES: PriceRange[] = [
  { minPrice: 100, maxPrice: 200, factor: 2.10 },
  { minPrice: 200, maxPrice: 500, factor: 2.00 },
  { minPrice: 500, maxPrice: 1000, factor: 1.80 },
  { minPrice: 1000, maxPrice: 2000, factor: 1.60 },
  { minPrice: 2000, maxPrice: 3000, factor: 1.40 },
  { minPrice: 3000, maxPrice: null, factor: 1.20 }, // 3000 이상
];

const DEFAULT_CONSUMABLE_PARTS_RANGES: PriceRange[] = [
  { minPrice: 5, maxPrice: 50, factor: 1.55 },
  { minPrice: 50, maxPrice: 100, factor: 1.50 },
  { minPrice: 100, maxPrice: 150, factor: 1.45 },
  { minPrice: 150, maxPrice: 200, factor: 1.40 },
  { minPrice: 200, maxPrice: 250, factor: 1.35 },
  { minPrice: 250, maxPrice: 300, factor: 1.30 },
  { minPrice: 300, maxPrice: null, factor: 1.20 }, // 300 이상
];

interface SparePartConfig {
  currency: 'EUR' | 'USD' | 'KRW';
  exchangeRates: {
    EUR: number;
    USD: number;
    KRW: number;
  };
  repairPartsRanges: PriceRange[];
  consumablePartsRanges: PriceRange[];
}

const SparePartSettings: React.FC = () => {
  const [config, setConfig] = useState<SparePartConfig>({
    currency: 'EUR',
    exchangeRates: {
      EUR: 1400,
      USD: 1300,
      KRW: 1,
    },
    repairPartsRanges: [...DEFAULT_REPAIR_PARTS_RANGES],
    consumablePartsRanges: [...DEFAULT_CONSUMABLE_PARTS_RANGES],
  });

  const [testPrice, setTestPrice] = useState<number>(500);
  const [testPartType, setTestPartType] = useState<'repair' | 'consumable'>('repair');
  const [calculationResult, setCalculationResult] = useState<any>(null);

  // 가격에 따른 팩터 찾기
  const findFactor = (price: number, ranges: PriceRange[]): number => {
    for (const range of ranges) {
      if (price >= range.minPrice && (range.maxPrice === null || price <= range.maxPrice)) {
        return range.factor;
      }
    }
    return 1.0; // 기본값
  };

  // 가격 계산 함수
  const calculatePrice = (originalPrice: number, partType: 'repair' | 'consumable'): any => {
    const ranges = partType === 'repair' ? config.repairPartsRanges : config.consumablePartsRanges;
    const factor = findFactor(originalPrice, ranges);
    const eurPrice = originalPrice * factor;
    const krwPrice = eurPrice * config.exchangeRates.EUR;
    
    return {
      originalPrice,
      factor,
      eurPrice: Math.round(eurPrice * 100) / 100,
      krwPrice: Math.round(krwPrice),
    };
  };

  // 테스트 계산
  useEffect(() => {
    const result = calculatePrice(testPrice, testPartType);
    setCalculationResult(result);
  }, [testPrice, testPartType, config]);

  // 환율 업데이트
  const handleExchangeRateChange = (currency: keyof typeof config.exchangeRates, value: number) => {
    setConfig(prev => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        [currency]: value,
      },
    }));
  };

  // 가격 구간 추가
  const addPriceRange = (type: 'repair' | 'consumable') => {
    const newRange: PriceRange = {
      minPrice: 0,
      maxPrice: 100,
      factor: 1.5,
    };

    setConfig(prev => ({
      ...prev,
      [type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges']: [
        ...prev[type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges'],
        newRange,
      ],
    }));
  };

  // 가격 구간 삭제
  const removePriceRange = (type: 'repair' | 'consumable', index: number) => {
    setConfig(prev => ({
      ...prev,
      [type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges']: 
        prev[type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges'].filter((_, i) => i !== index),
    }));
  };

  // 가격 구간 업데이트
  const updatePriceRange = (type: 'repair' | 'consumable', index: number, field: keyof PriceRange, value: number | null) => {
    setConfig(prev => {
      const ranges = [...prev[type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges']];
      ranges[index] = {
        ...ranges[index],
        [field]: value,
      };
      return {
        ...prev,
        [type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges']: ranges,
      };
    });
  };

  // 기본값으로 재설정
  const resetToDefaults = (type: 'repair' | 'consumable') => {
    setConfig(prev => ({
      ...prev,
      [type === 'repair' ? 'repairPartsRanges' : 'consumablePartsRanges']: 
        type === 'repair' ? [...DEFAULT_REPAIR_PARTS_RANGES] : [...DEFAULT_CONSUMABLE_PARTS_RANGES],
    }));
  };

  // 가격 구간 테이블 렌더링
  const renderPriceRangeTable = (type: 'repair' | 'consumable') => {
    const ranges = type === 'repair' ? config.repairPartsRanges : config.consumablePartsRanges;
    const title = type === 'repair' ? '수리용 부품' : '소모성 부품';

    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>{title} 가격 구간</h5>
          <div>
            <button
              className="btn btn-outline-secondary btn-sm me-2"
              onClick={() => resetToDefaults(type)}
            >
              기본값으로 재설정
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => addPriceRange(type)}
            >
              구간 추가
            </button>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>최소 가격 (EUR)</th>
                <th>최대 가격 (EUR)</th>
                <th>팩터</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((range, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={range.minPrice}
                      onChange={(e) => updatePriceRange(type, index, 'minPrice', parseFloat(e.target.value) || 0)}
                      step="0.01"
                    />
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <input
                        type="number"
                        className="form-control form-control-sm me-2"
                        value={range.maxPrice || ''}
                        onChange={(e) => updatePriceRange(type, index, 'maxPrice', e.target.value ? parseFloat(e.target.value) : null)}
                        step="0.01"
                        disabled={range.maxPrice === null}
                      />
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={range.maxPrice === null}
                          onChange={(e) => updatePriceRange(type, index, 'maxPrice', e.target.checked ? null : 1000)}
                        />
                        <label className="form-check-label small">
                          이상
                        </label>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={range.factor}
                      onChange={(e) => updatePriceRange(type, index, 'factor', parseFloat(e.target.value) || 1)}
                      step="0.01"
                      min="1"
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removePriceRange(type, index)}
                      disabled={ranges.length <= 1}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>부품 가격 설정</h2>
            <button className="btn btn-primary">설정 저장</button>
          </div>

          {/* 환율 설정 */}
          <div className="card mb-4">
            <div className="card-header">
              <h4 className="card-title">환율 설정</h4>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <label className="form-label">EUR → KRW</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.exchangeRates.EUR}
                    onChange={(e) => handleExchangeRateChange('EUR', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">USD → KRW</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.exchangeRates.USD}
                    onChange={(e) => handleExchangeRateChange('USD', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">KRW → KRW</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.exchangeRates.KRW}
                    onChange={(e) => handleExchangeRateChange('KRW', parseFloat(e.target.value) || 0)}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 가격 구간 설정 */}
          <div className="card mb-4">
            <div className="card-header">
              <h4 className="card-title">가격 구간별 팩터 설정</h4>
            </div>
            <div className="card-body">
              {renderPriceRangeTable('repair')}
              {renderPriceRangeTable('consumable')}
            </div>
          </div>

          {/* 가격 계산 테스트 */}
          <div className="card mb-4">
            <div className="card-header">
              <h4 className="card-title">가격 계산 테스트</h4>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">테스트 가격 (EUR)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={testPrice}
                    onChange={(e) => setTestPrice(parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">부품 유형</label>
                  <select
                    className="form-select"
                    value={testPartType}
                    onChange={(e) => setTestPartType(e.target.value as 'repair' | 'consumable')}
                  >
                    <option value="repair">수리용 부품</option>
                    <option value="consumable">소모성 부품</option>
                  </select>
                </div>
              </div>

              {calculationResult && (
                <div className="alert alert-info">
                  <h6>계산 결과:</h6>
                  <ul className="mb-0">
                    <li>원가: €{calculationResult.originalPrice}</li>
                    <li>적용 팩터: {calculationResult.factor}</li>
                    <li>청구가 (EUR): €{calculationResult.eurPrice}</li>
                    <li>청구가 (KRW): ₩{calculationResult.krwPrice.toLocaleString()}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 설정 미리보기 */}
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">현재 설정 미리보기</h4>
            </div>
            <div className="card-body">
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SparePartSettings;