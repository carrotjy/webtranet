import React, { useState, useEffect } from 'react';

// 2차함수 팩터 계수 인터페이스
interface QuadraticFactorConfig {
  a: number; // 2차항 계수
  b: number; // 1차항 계수  
  c: number; // 상수항
  minPrice: number; // 최소 가격 (이하일 때 minFactor 사용)
  maxPrice: number; // 최대 가격 (이상일 때 maxFactor 사용)
  minFactor: number; // 최소 팩터
  maxFactor: number; // 최대 팩터
}

// 기본 설정값 (첨부된 이미지의 계수 사용)
const DEFAULT_REPAIR_PARTS_CONFIG: QuadraticFactorConfig = {
  a: 0.0000001,
  b: -0.000615608,
  c: 2.149275123,
  minPrice: 100,
  maxPrice: 3000,
  minFactor: 1.20,
  maxFactor: 2.10,
};

const DEFAULT_CONSUMABLE_PARTS_CONFIG: QuadraticFactorConfig = {
  a: 0.0000001,
  b: -0.0003,
  c: 1.6,
  minPrice: 5,
  maxPrice: 300,
  minFactor: 1.20,
  maxFactor: 1.55,
};

interface SparePartConfig {
  exchangeRates: {
    EUR: number;
    USD: number;
  };
  marginRate: number; // 구매품 마진율(%)
  repairPartsConfig: QuadraticFactorConfig;
  consumablePartsConfig: QuadraticFactorConfig;
}


const SparePartSettings: React.FC = () => {
  // localStorage에서 설정 불러오기
  const loadConfigFromStorage = (): SparePartConfig => {
    try {
      const saved = localStorage.getItem('sparePartConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return {
          exchangeRates: {
            EUR: parsedConfig.exchangeRates?.EUR || 1400,
            USD: parsedConfig.exchangeRates?.USD || 1300,
          },
          marginRate: parsedConfig.marginRate || 20,
          repairPartsConfig: parsedConfig.repairPartsConfig || { ...DEFAULT_REPAIR_PARTS_CONFIG },
          consumablePartsConfig: parsedConfig.consumablePartsConfig || { ...DEFAULT_CONSUMABLE_PARTS_CONFIG },
        };
      }
    } catch (error) {
      console.error('설정 불러오기 실패:', error);
    }
    
    return {
      exchangeRates: { EUR: 1400, USD: 1300 },
      marginRate: 20,
      repairPartsConfig: { ...DEFAULT_REPAIR_PARTS_CONFIG },
      consumablePartsConfig: { ...DEFAULT_CONSUMABLE_PARTS_CONFIG },
    };
  };

  const [config, setConfig] = useState<SparePartConfig>(loadConfigFromStorage());
  const [testPrice, setTestPrice] = useState<number>(500);
  const [testPartType, setTestPartType] = useState<'repair' | 'consumable'>('repair');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 초기 설정 로드 (API에서)
  useEffect(() => {
    const loadSettingsFromAPI = async () => {
      try {
        console.log('API에서 설정 로드 시도...');
        const response = await fetch('/api/admin/spare-part-settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('API 응답:', data);
          if (data.success && data.data) {
            console.log('로드된 마진율:', data.data.marginRate);
            setConfig(data.data);
            console.log('관리자 설정에서 로드된 계수:', data.data);
          } else {
            console.error('설정 로드 실패:', data.error);
            console.log('API 로드 실패 - 기존 설정 유지');
          }
        } else {
          console.error('API 호출 실패, 상태 코드:', response.status);
          console.log('API 호출 실패 - 기존 설정 유지');
        }
      } catch (error) {
        console.error('설정 로드 중 오류:', error);
        console.log('API 오류 - 기존 설정 유지');
      }
    };

    loadSettingsFromAPI();
  }, []);

  // Excel 수식 기반 2차함수 팩터 계산 (2차함수 특성 반영)
  // =IF((C14<C3),H19,IF((C14>C8),H14,(M17*C14*C14+M18*C14+M19)))
  const calculateQuadraticFactor = (price: number, partConfig: QuadraticFactorConfig): number => {
    const { a, b, c, minPrice, maxPrice, minFactor, maxFactor } = partConfig;
    
    if (price < minPrice) {
      return maxFactor; // 최소가격 미만일 때 최대팩터 적용 (2차함수 특성)
    } else if (price > maxPrice) {
      return minFactor; // 최대가격 초과일 때 최소팩터 적용 (2차함수 특성)
    } else {
      // M17*C14*C14+M18*C14+M19 (2차함수)
      const factor = a * price * price + b * price + c;
      return Math.max(minFactor, Math.min(maxFactor, factor));
    }
  };

  // 가격 계산 함수
  const calculatePrice = (originalPrice: number, partType: 'repair' | 'consumable') => {
    const partConfig = partType === 'repair' ? config.repairPartsConfig : config.consumablePartsConfig;
    const factor = calculateQuadraticFactor(originalPrice, partConfig);
    const eurPrice = originalPrice * factor;
    const krwPrice = eurPrice * config.exchangeRates.EUR;
    
    return {
      originalPrice,
      factor: Math.round(factor * 1000) / 1000,
      eurPrice: Math.round(eurPrice * 100) / 100,
      krwPrice: Math.round(krwPrice),
    };
  };

  // 테스트 계산
  useEffect(() => {
    const result = calculatePrice(testPrice, testPartType);
    setCalculationResult(result);
  }, [testPrice, testPartType, config]);

  // 설정 변경 시 localStorage에 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem('sparePartConfig', JSON.stringify(config));
      setLastSaved(new Date());
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  }, [config]);

  // 환율 업데이트
  const handleExchangeRateChange = (currency: keyof typeof config.exchangeRates, value: number) => {
    setConfig(prev => ({
      ...prev,
      exchangeRates: { ...prev.exchangeRates, [currency]: value },
    }));
  };

  // 마진율 업데이트
  const handleMarginRateChange = (value: number) => {
    console.log('마진율 변경:', value);
    setConfig(prev => ({ ...prev, marginRate: value }));
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    try {
      console.log('저장할 설정:', config);

      // 부품 관리 설정 저장 (API 호출)
      const sparePartResponse = await fetch('/api/admin/spare-part-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config),
      });

      console.log('부품 설정 저장 응답 상태:', sparePartResponse.status);

      let settingsSaved = false;

      // 부품 설정 저장 결과 확인
      if (sparePartResponse.ok) {
        const sparePartData = await sparePartResponse.json();
        console.log('부품 설정 저장 응답:', sparePartData);
        if (sparePartData.success) {
          settingsSaved = true;
          console.log('부품 관리 설정 저장 성공');
        } else {
          console.error('부품 설정 저장 실패:', sparePartData.error);
        }
      } else {
        const errorText = await sparePartResponse.text();
        console.error('부품 설정 API 호출 실패:', sparePartResponse.status, errorText);
      }

      // 로컬스토리지에 백업 저장
      localStorage.setItem('sparePartConfig', JSON.stringify(config));
      setLastSaved(new Date());

      // 결과에 따른 메시지 표시
      if (settingsSaved) {
        alert('설정이 성공적으로 저장되었습니다!\n이제 가격 계산에 새로운 설정이 적용됩니다.');
      } else {
        alert('서버 저장에 실패했습니다.\n로컬 백업은 완료되었습니다.');
      }

      console.log('현재 설정:', config);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // 에러 시 로컬스토리지에만 저장
      localStorage.setItem('sparePartConfig', JSON.stringify(config));
      setLastSaved(new Date());
      alert('네트워크 오류가 발생했습니다.\n로컬 백업은 완료되었습니다.');
    }
  };

  // 2차함수 계수 업데이트
  const updateQuadraticConfig = (type: 'repair' | 'consumable', field: keyof QuadraticFactorConfig, value: number) => {
    setConfig(prev => ({
      ...prev,
      [type === 'repair' ? 'repairPartsConfig' : 'consumablePartsConfig']: {
        ...prev[type === 'repair' ? 'repairPartsConfig' : 'consumablePartsConfig'],
        [field]: value,
      },
    }));
  };

  // 기본값으로 재설정
  const resetToDefaults = (type: 'repair' | 'consumable') => {
    setConfig(prev => ({
      ...prev,
      [type === 'repair' ? 'repairPartsConfig' : 'consumablePartsConfig']: 
        type === 'repair' ? { ...DEFAULT_REPAIR_PARTS_CONFIG } : { ...DEFAULT_CONSUMABLE_PARTS_CONFIG },
    }));
  };

  // 커브 포인트 생성 (시각화용)
  const generateCurvePoints = (partConfig: QuadraticFactorConfig, pointCount: number = 50) => {
    const { minPrice, maxPrice } = partConfig;
    const step = (maxPrice - minPrice) / (pointCount - 1);
    const points = [];
    
    for (let i = 0; i < pointCount; i++) {
      const price = minPrice + (step * i);
      const factor = calculateQuadraticFactor(price, partConfig);
      points.push({ price, factor });
    }
    
    return points;
  };

  // 2차함수 계수 설정 테이블 렌더링
  const renderQuadraticConfigTable = (type: 'repair' | 'consumable') => {
    const partConfig = type === 'repair' ? config.repairPartsConfig : config.consumablePartsConfig;
    const title = type === 'repair' ? '수리용 부품' : '소모성 부품';
    const curvePoints = generateCurvePoints(partConfig);

    return (
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>{title} 팩터 설정</h5>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => resetToDefaults(type)}
          >
            기본값으로 재설정
          </button>
        </div>
        <div className="card-body">
          {/* 2차함수 계수 입력 */}
          <div className="mb-3">
            <h6>2차함수 계수 (y = ax² + bx + c)</h6>
            <table className="table table-sm table-bordered">
              <thead className="table-warning">
                <tr>
                  <th style={{width: '15%'}}>계수</th>
                  <th style={{width: '45%'}}>값</th>
                  <th>설명</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>a</strong></td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={partConfig.a}
                      onChange={(e) => updateQuadraticConfig(type, 'a', parseFloat(e.target.value) || 0)}
                      step="0.0000001"
                    />
                  </td>
                  <td>2차항</td>
                </tr>
                <tr>
                  <td><strong>b</strong></td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={partConfig.b}
                      onChange={(e) => updateQuadraticConfig(type, 'b', parseFloat(e.target.value) || 0)}
                      step="0.000001"
                    />
                  </td>
                  <td>1차항</td>
                </tr>
                <tr>
                  <td><strong>c</strong></td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={partConfig.c}
                      onChange={(e) => updateQuadraticConfig(type, 'c', parseFloat(e.target.value) || 0)}
                      step="0.01"
                    />
                  </td>
                  <td>상수항</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 범위 및 한계값 */}
          <div className="mb-3">
            <h6>범위 및 한계값</h6>
            <div className="row">
              <div className="col-6">
                <label className="form-label">최소 가격</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={partConfig.minPrice}
                  onChange={(e) => updateQuadraticConfig(type, 'minPrice', parseFloat(e.target.value) || 0)}
                  step="1"
                />
              </div>
              <div className="col-6">
                <label className="form-label">최대 가격</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={partConfig.maxPrice}
                  onChange={(e) => updateQuadraticConfig(type, 'maxPrice', parseFloat(e.target.value) || 0)}
                  step="1"
                />
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-6">
                <label className="form-label">최소 팩터</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={partConfig.minFactor}
                  onChange={(e) => updateQuadraticConfig(type, 'minFactor', parseFloat(e.target.value) || 1)}
                  step="0.01"
                  min="1"
                />
              </div>
              <div className="col-6">
                <label className="form-label">최대 팩터</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={partConfig.maxFactor}
                  onChange={(e) => updateQuadraticConfig(type, 'maxFactor', parseFloat(e.target.value) || 1)}
                  step="0.01"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* 커브 시각화 */}
          <div className="mb-2">
            <h6>팩터 커브</h6>
            <div className="border p-2" style={{height: '120px', backgroundColor: '#f8f9fa'}}>
              <svg width="100%" height="100%" viewBox="0 0 400 80">
                {/* 축 */}
                <line x1="30" y1="70" x2="370" y2="70" stroke="#333" strokeWidth="1"/>
                <line x1="30" y1="70" x2="30" y2="10" stroke="#333" strokeWidth="1"/>
                
                {/* 커브 */}
                <polyline
                  fill="none"
                  stroke="#007bff"
                  strokeWidth="2"
                  points={curvePoints.map((point, index) => {
                    const x = 30 + (index / (curvePoints.length - 1)) * 340;
                    const y = 70 - ((point.factor - partConfig.minFactor) / (partConfig.maxFactor - partConfig.minFactor)) * 60;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                
                {/* 최소/최대 값 표시 */}
                <text x="35" y="78" fontSize="8" fill="#666">{partConfig.minPrice}</text>
                <text x="360" y="78" fontSize="8" fill="#666">{partConfig.maxPrice}</text>
                <text x="15" y="73" fontSize="8" fill="#666">{partConfig.minFactor}</text>
                <text x="15" y="15" fontSize="8" fill="#666">{partConfig.maxFactor}</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
            <div>
              <h2>스페어파트 관리 설정</h2>
              {lastSaved && (
                <small className="text-muted">
                  마지막 저장: {lastSaved.toLocaleString('ko-KR')}
                </small>
              )}
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleSaveSettings}
            >
              설정 저장
            </button>
          </div>

          {/* 환율 및 마진율 설정 */}
          <div className="card mb-4">
            <div className="card-header">
              <h4 className="card-title">환율 및 마진율 설정</h4>
              <p className="text-muted mb-0 small">
                FSE들은 국내 구매가를 입력하고, 관리자는 ERP 확인 후 EUR/USD 가격을 입력할 수 있습니다.
              </p>
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
                    step="0.01"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">USD → KRW</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.exchangeRates.USD}
                    onChange={(e) => handleExchangeRateChange('USD', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">구매품 마진율 (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.marginRate}
                    onChange={(e) => handleMarginRateChange(parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2차함수 팩터 설정 */}
          <div className="row">
            <div className="col-md-6">
              {renderQuadraticConfigTable('repair')}
            </div>
            <div className="col-md-6">
              {renderQuadraticConfigTable('consumable')}
            </div>
          </div>

          {/* 테스트 계산기 */}
          <div className="card">
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
                  <label className="form-label">부품 종류</label>
                  <select
                    className="form-control"
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
                    <li>원가: {calculationResult.originalPrice} EUR</li>
                    <li>적용 팩터: {calculationResult.factor}</li>
                    <li>판매가: {calculationResult.eurPrice} EUR</li>
                    <li>원화 환산: {calculationResult.krwPrice.toLocaleString()} KRW</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SparePartSettings;