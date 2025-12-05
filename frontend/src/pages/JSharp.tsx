import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type TabType = 'convert' | 'option' | 'order' | 'site-settings' | 'product-page';
type ConvertSection = 'resize' | 'merge';
type ReplacementType = 'product_name' | 'option' | 'additional_items';

interface FieldReplacement {
  id: number;
  before: string;
  after: string;
}

interface ReplacementRules {
  product_name: FieldReplacement[];
  option: FieldReplacement[];
  additional_items: FieldReplacement[];
}

interface SiteReplacementRules {
  ebay: ReplacementRules;
  smartstore: ReplacementRules;
  '11st': ReplacementRules;
  coupang: ReplacementRules;
}

interface ProductPageRow {
  id: number;
  text: string;
  image: File | null;
}

interface Order {
  id: number;
  site: string;
  order_number: string;
  buyer_name: string;
  recipient_name: string;
  phone: string;
  phone2?: string;
  address: string;
  delivery_memo?: string;
  product_name: string;
  quantity: number;
  option?: string;
  additional_items?: string;
  price: number;
  order_date: string;
  status: 'pending' | 'completed';
}

interface ColumnMapping {
  order_number: string;
  buyer_name: string;
  recipient_name: string;
  phone: string;
  phone2: string;
  address: string;
  delivery_memo: string;
  product_name: string;
  quantity: string;
  option: string;
  additional_items: string;
  price: string;
  order_date: string;
  parcel_quantity?: string;  // 로젠 전용
  parcel_fee?: string;        // 로젠 전용
}

interface SiteColumnMappings {
  ebay: ColumnMapping;
  smartstore: ColumnMapping;
  '11st': ColumnMapping;
  coupang: ColumnMapping;
  logen: ColumnMapping;
}

interface ExportRow {
  recipient_name: string;
  phone: string;
  phone2: string;
  address: string;
  quantity: number;
  delivery_memo: string;
  parcel_quantity: number;  // F열: 택배수량
  parcel_fee: number;       // G열: 택배운임
}

// 치환 규칙 로드 함수 (컴포넌트 외부)
const loadReplacementRules = (): SiteReplacementRules => {
  const saved = localStorage.getItem('jsharp_replacement_rules');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // 기존 형식(사이트 구분 없음)에서 새 형식으로 마이그레이션
      if (parsed.product_name && !parsed.ebay) {
        return {
          ebay: parsed,
          smartstore: {
            product_name: [{ id: 1, before: '', after: '' }],
            option: [{ id: 1, before: '', after: '' }],
            additional_items: [{ id: 1, before: '', after: '' }]
          },
          '11st': {
            product_name: [{ id: 1, before: '', after: '' }],
            option: [{ id: 1, before: '', after: '' }],
            additional_items: [{ id: 1, before: '', after: '' }]
          },
          coupang: {
            product_name: [{ id: 1, before: '', after: '' }],
            option: [{ id: 1, before: '', after: '' }],
            additional_items: [{ id: 1, before: '', after: '' }]
          }
        };
      }
      return parsed;
    } catch (e) {
      console.error('치환 규칙 로드 실패:', e);
    }
  }
  return {
    ebay: {
      product_name: [{ id: 1, before: '', after: '' }],
      option: [{ id: 1, before: '', after: '' }],
      additional_items: [{ id: 1, before: '', after: '' }]
    },
    smartstore: {
      product_name: [{ id: 1, before: '', after: '' }],
      option: [{ id: 1, before: '', after: '' }],
      additional_items: [{ id: 1, before: '', after: '' }]
    },
    '11st': {
      product_name: [{ id: 1, before: '', after: '' }],
      option: [{ id: 1, before: '', after: '' }],
      additional_items: [{ id: 1, before: '', after: '' }]
    },
    coupang: {
      product_name: [{ id: 1, before: '', after: '' }],
      option: [{ id: 1, before: '', after: '' }],
      additional_items: [{ id: 1, before: '', after: '' }]
    }
  };
};

const JSharp: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 접근 권한 체크: 인종현만 접근 가능
  useEffect(() => {
    if (user && user.name !== '인종현') {
      alert('접근 권한이 없습니다.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const [activeTab, setActiveTab] = useState<TabType>('order');
  const [convertSection, setConvertSection] = useState<ConvertSection>('resize');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isOptionDragging, setIsOptionDragging] = useState(false);
  const [isMergeDragging, setIsMergeDragging] = useState(false);
  const [isProductPageDragging, setIsProductPageDragging] = useState<{[key: number]: boolean}>({});

  // 옵션생성 탭 상태
  const [optionImages, setOptionImages] = useState<File[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('01');
  const [productName, setProductName] = useState('');
  const [imageOrder, setImageOrder] = useState<'left-right' | 'right-left'>('left-right');

  // 이미지병합 탭 상태
  const [mergeImages, setMergeImages] = useState<File[]>([]);
  const [mergeImageOrder, setMergeImageOrder] = useState<'left-right' | 'right-left'>('left-right');

  // 상품페이지작성 탭 상태
  const [productPageRows, setProductPageRows] = useState<ProductPageRow[]>([
    { id: 1, text: '', image: null }
  ]);
  const [nextRowId, setNextRowId] = useState(2);

  // 주문관리 탭 상태
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFiles, setOrderFiles] = useState<File[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterSite, setFilterSite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrderDragging, setIsOrderDragging] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  // 엑셀 내보내기 모달 상태
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportRows, setExportRows] = useState<ExportRow[]>([]);

  // 컬럼 매핑 상태 (localStorage에서 불러오기)
  const getDefaultMapping = (): ColumnMapping => ({
    order_number: '',
    buyer_name: '',
    recipient_name: '',
    phone: '',
    phone2: '',
    address: '',
    delivery_memo: '',
    product_name: '',
    quantity: '',
    option: '',
    additional_items: '',
    price: '',
    order_date: ''
  });

  const getDefaultLogenMapping = (): ColumnMapping => ({
    ...getDefaultMapping(),
    parcel_quantity: 'F/택배수량',  // 로젠 전용 기본값
    parcel_fee: 'G/택배운임'        // 로젠 전용 기본값
  });

  const loadColumnMappings = (): SiteColumnMappings => {
    const saved = localStorage.getItem('jsharp_column_mappings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // logen이 없으면 추가
        if (!parsed.logen) {
          parsed.logen = getDefaultLogenMapping();
        }
        // logen에 parcel 필드가 없으면 추가
        if (parsed.logen && !parsed.logen.parcel_quantity) {
          parsed.logen.parcel_quantity = 'F/택배수량';
        }
        if (parsed.logen && !parsed.logen.parcel_fee) {
          parsed.logen.parcel_fee = 'G/택배운임';
        }
        return parsed;
      } catch (e) {
        console.error('컬럼 매핑 로드 실패:', e);
      }
    }
    return {
      ebay: getDefaultMapping(),
      smartstore: getDefaultMapping(),
      '11st': getDefaultMapping(),
      coupang: getDefaultMapping(),
      logen: getDefaultLogenMapping()
    };
  };

  const [columnMappings, setColumnMappings] = useState<SiteColumnMappings>(loadColumnMappings());
  const [selectedMappingSite, setSelectedMappingSite] = useState<'ebay' | 'smartstore' | '11st' | 'coupang' | 'logen'>('ebay');
  const [parcelFeePerUnit, setParcelFeePerUnit] = useState<number>(() => {
    const saved = localStorage.getItem('jsharp_parcel_fee_per_unit');
    return saved ? parseInt(saved) : 3850;
  });

  // 사이트별 엑셀 비밀번호
  const [sitePasswords, setSitePasswords] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('jsharp_site_passwords');
    return saved ? JSON.parse(saved) : {};
  });

  // 치환 규칙 통합 관리 (사이트별)
  const [replacementRules, setReplacementRules] = useState<SiteReplacementRules>(loadReplacementRules());
  const [nextReplacementId, setNextReplacementId] = useState(() => {
    const rules = loadReplacementRules();
    const allIds: number[] = [];
    Object.values(rules).forEach(siteRules => {
      allIds.push(...siteRules.product_name.map(r => r.id));
      allIds.push(...siteRules.option.map(r => r.id));
      allIds.push(...siteRules.additional_items.map(r => r.id));
    });
    return Math.max(...allIds, 0) + 1;
  });

  // 치환 규칙 저장
  useEffect(() => {
    localStorage.setItem('jsharp_replacement_rules', JSON.stringify(replacementRules));
  }, [replacementRules]);

  // 출력 모달 상태
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const orderFileInputRef = useRef<HTMLInputElement>(null);

  const imageSizes = [430, 640, 860, 1000];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setUploadedImages(Array.from(files));
      setProcessedFiles([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
    );

    if (files.length > 0) {
      setUploadedImages(files);
      setProcessedFiles([]);
    }
  };

  // 옵션이미지생성 탭 드래그 핸들러
  const handleOptionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOptionDragging(true);
  };

  const handleOptionDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOptionDragging(false);
  };

  const handleOptionDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOptionDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setOptionImages(files);
    }
  };

  // 이미지병합 탭 드래그 핸들러
  const handleMergeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMergeDragging(true);
  };

  const handleMergeDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMergeDragging(false);
  };

  const handleMergeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMergeDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setMergeImages(files);
    }
  };

  // 상품페이지작성 탭 드래그 핸들러
  const handleProductPageDragOver = (e: React.DragEvent, rowId: number) => {
    e.preventDefault();
    setIsProductPageDragging(prev => ({ ...prev, [rowId]: true }));
  };

  const handleProductPageDragLeave = (e: React.DragEvent, rowId: number) => {
    e.preventDefault();
    setIsProductPageDragging(prev => ({ ...prev, [rowId]: false }));
  };

  const handleProductPageDrop = (e: React.DragEvent, rowId: number) => {
    e.preventDefault();
    setIsProductPageDragging(prev => ({ ...prev, [rowId]: false }));

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      updateProductPageRowImage(rowId, files[0]);
    }
  };

  const handleMergeImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setMergeImages(Array.from(files));
    }
  };

  const handleMergeImages = async () => {
    if (mergeImages.length !== 2) {
      alert('2개의 이미지를 업로드해주세요.');
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      mergeImages.forEach((image) => {
        formData.append('images', image);
      });
      formData.append('image_order', mergeImageOrder);

      const response = await fetch('/api/jsharp/merge-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged-image.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('이미지 병합이 완료되었습니다.');
      } else {
        const data = await response.json();
        alert(data.message || '이미지 병합에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 병합 실패:', error);
      alert('이미지 병합 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const addProductPageRow = () => {
    setProductPageRows([...productPageRows, { id: nextRowId, text: '', image: null }]);
    setNextRowId(nextRowId + 1);
  };

  const updateProductPageRowText = (id: number, text: string) => {
    setProductPageRows(productPageRows.map(row =>
      row.id === id ? { ...row, text } : row
    ));
  };

  const updateProductPageRowImage = (id: number, file: File | null) => {
    setProductPageRows(productPageRows.map(row =>
      row.id === id ? { ...row, image: file } : row
    ));
  };

  const removeProductPageRow = (id: number) => {
    if (productPageRows.length > 1) {
      setProductPageRows(productPageRows.filter(row => row.id !== id));
    }
  };

  const copyTextToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('텍스트가 복사되었습니다.');
    }).catch(() => {
      alert('복사에 실패했습니다.');
    });
  };

  // 주문관리 - 파일 선택 핸들러
  const handleOrderFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setOrderFiles(Array.from(files));
    }
  };

  // 주문관리 - 드래그 앤 드롭 핸들러
  const handleOrderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOrderDragging(true);
  };

  const handleOrderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOrderDragging(false);
  };

  const handleOrderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOrderDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );

    if (files.length > 0) {
      setOrderFiles(files);
    }
  };

  // 페이지 로드 시 DB에서 주문 목록 불러오기
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch('/api/jsharp/get-orders', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setOrders(data.orders);
        }
      } catch (error) {
        console.error('주문 목록 로드 실패:', error);
      }
    };

    loadOrders();
  }, []);

  // 주문관리 - 파일 제거 핸들러
  const removeOrderFile = (index: number) => {
    setOrderFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 주문관리 - 엑셀 파일 업로드 및 파싱
  const handleUploadOrders = async () => {
    if (orderFiles.length === 0) {
      alert('최소 1개 이상의 엑셀 파일을 선택해주세요.');
      return;
    }

    setLoadingOrders(true);

    try {
      const formData = new FormData();

      // 모든 파일 추가
      orderFiles.forEach((file) => {
        formData.append('files', file);
      });

      // 컬럼 매핑 정보 추가
      formData.append('columnMappings', JSON.stringify(columnMappings));

      // 치환 규칙 추가 (통합)
      formData.append('replacementRules', JSON.stringify(replacementRules));

      // 사이트별 비밀번호 추가
      formData.append('sitePasswords', JSON.stringify(sitePasswords));

      const response = await fetch('/api/jsharp/parse-order-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // DB에서 최신 주문 목록 다시 불러오기
        const getResponse = await fetch('/api/jsharp/get-orders', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const getData = await getResponse.json();
        if (getData.success) {
          setOrders(getData.orders);
        }
        
        alert(data.message || `${data.count}개의 주문을 가져왔습니다.`);
      } else {
        alert(data.message || '주문 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('주문 업로드 실패:', error);
      alert('주문 데이터 처리 중 오류가 발생했습니다.');
    } finally {
      setLoadingOrders(false);
    }
  };

  // 주문관리 - 필터링된 주문 목록
  const filteredOrders = orders.filter(order => {
    // 사이트 필터
    if (filterSite !== 'all') {
      const siteLower = order.site.toLowerCase();
      if (filterSite === 'gmarket') {
        // G마켓 필터: "지마켓" 포함하는 site 매칭
        if (!siteLower.includes('지마켓') && !siteLower.includes('gmarket') && !siteLower.includes('g마켓')) {
          return false;
        }
      } else if (filterSite === 'auction') {
        // 옥션 필터: "옥션" 포함하는 site 매칭
        if (!siteLower.includes('옥션') && !siteLower.includes('auction')) {
          return false;
        }
      } else if (order.site !== filterSite) {
        return false;
      }
    }

    // 상태 필터
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // 검색 쿼리 필터 (모든 필드 검색)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.buyer_name.toLowerCase().includes(query) ||
        order.recipient_name.toLowerCase().includes(query) ||
        order.product_name.toLowerCase().includes(query) ||
        order.phone.includes(query) ||
        (order.phone2 && order.phone2.includes(query)) ||
        order.address.toLowerCase().includes(query) ||
        (order.delivery_memo && order.delivery_memo.toLowerCase().includes(query)) ||
        (order.option && order.option.toLowerCase().includes(query)) ||
        (order.additional_items && order.additional_items.toLowerCase().includes(query)) ||
        order.order_date.includes(query)
      );
    }

    return true;
  });

  // 사이트 이니셜 가져오기 함수 (site 값 기반)
  const getSiteInitial = (site: string): string => {
    // site 값이 "지마켓" 또는 "옥션"인 경우 처리
    const siteLower = site.toLowerCase();
    if (siteLower.includes('지마켓') || siteLower.includes('gmarket') || siteLower.includes('g마켓')) {
      return 'G';
    } else if (siteLower.includes('옥션') || siteLower.includes('auction')) {
      return 'A';
    }

    const initials: { [key: string]: string } = {
      'ebay': 'E',
      'smartstore': 'S',
      '11st': '11',
      'coupang': 'C',
      'logen': 'L'
    };
    return initials[site] || site;
  };

  // 수령인 앞에 사이트 이니셜 추가
  const getRecipientWithInitial = (site: string, recipientName: string): string => {
    const initial = getSiteInitial(site);
    return `${initial}${recipientName}`;
  };

  // nan 값을 공란으로 변환
  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === 'nan' || String(value).toLowerCase() === 'nan') {
      return '';
    }
    return String(value);
  };

  // 상품명 10글자 제한
  const truncateProductName = (name: string, maxLength: number = 10): string => {
    const formatted = formatValue(name);
    if (formatted.length > maxLength) {
      return formatted.substring(0, maxLength) + '...';
    }
    return formatted;
  };

  // 사이트명 표시 함수 (이제 사용하지 않지만 유지)
  const getSiteBadge = (site: string) => {
    const siteConfig: { [key: string]: { label: string; color: string } } = {
      'ebay': { label: 'eBay', color: 'bg-primary' },
      'smartstore': { label: '스마트스토어', color: 'bg-success' },
      '11st': { label: '11번가', color: 'bg-danger' },
      'coupang': { label: '쿠팡', color: 'bg-warning' },
      'logen': { label: '로젠', color: 'bg-info' }
    };

    const config = siteConfig[site] || { label: site, color: 'bg-secondary' };
    return <span className={`badge ${config.color}`}>{config.label}</span>;
  };

  // 체크박스 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(order => order.id)));
    }
  };

  // 개별 체크박스 토글
  const handleToggleSelect = (orderId: number) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  // 주문 상태 업데이트
  const handleUpdateOrderStatus = async (orderId: number, status: 'pending' | 'completed', silent: boolean = false, skipLocalUpdate: boolean = false) => {
    try {
      const response = await fetch(`/api/jsharp/update-order-status/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '상태 업데이트 실패');
      }

      // 로컬 상태 업데이트 (일괄 처리가 아닌 경우만)
      if (!skipLocalUpdate) {
        setOrders(prevOrders => prevOrders.map(order =>
          order.id === orderId ? { ...order, status } : order
        ));
      }
    } catch (error: any) {
      console.error('상태 업데이트 오류:', error);
      if (!silent) {
        alert(`상태 업데이트에 실패했습니다: ${error.message}`);
      }
      throw error; // 에러를 다시 던져서 Promise.allSettled가 감지할 수 있도록 함
    }
  };

  // 선택된 주문들의 상태 일괄 변경
  const handleBulkUpdateStatus = async (status: 'pending' | 'completed') => {
    if (selectedOrderIds.size === 0) {
      alert('주문을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedOrderIds.size}개의 주문을 ${status === 'completed' ? '완료' : '미처리'} 상태로 변경하시겠습니까?`)) {
      return;
    }

    try {
      const orderIdsArray = Array.from(selectedOrderIds);
      const promises = orderIdsArray.map(orderId =>
        handleUpdateOrderStatus(orderId, status, true, true) // silent mode + skip local update
      );

      // Promise.allSettled를 사용하여 모든 요청이 완료되도록 함
      const results = await Promise.allSettled(promises);

      // 성공한 주문 ID 목록
      const successfulOrderIds = new Set<number>();
      orderIdsArray.forEach((orderId, index) => {
        if (results[index].status === 'fulfilled') {
          successfulOrderIds.add(orderId);
        }
      });

      // 로컬 상태를 한 번에 업데이트
      setOrders(prevOrders => prevOrders.map(order =>
        successfulOrderIds.has(order.id) ? { ...order, status } : order
      ));

      // 실패한 항목 확인
      const failedCount = results.filter(result => result.status === 'rejected').length;
      const successCount = results.filter(result => result.status === 'fulfilled').length;

      setSelectedOrderIds(new Set());

      if (failedCount > 0) {
        alert(`${successCount}개 성공, ${failedCount}개 실패했습니다.`);
      } else {
        alert(`${successCount}개의 주문 상태가 변경되었습니다.`);
      }
    } catch (error) {
      console.error('일괄 상태 변경 오류:', error);
      alert('일괄 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 주문 삭제
  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('이 주문을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/jsharp/delete-order/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '삭제 실패');
      }

      // 로컬 상태 업데이트
      setOrders(orders.filter(order => order.id !== orderId));
      selectedOrderIds.delete(orderId);
      setSelectedOrderIds(new Set(selectedOrderIds));
    } catch (error: any) {
      console.error('삭제 오류:', error);
      alert(`삭제에 실패했습니다: ${error.message}`);
    }
  };

  // 선택된 주문들 삭제
  const handleBulkDelete = async () => {
    if (selectedOrderIds.size === 0) {
      alert('삭제할 주문을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedOrderIds.size}개의 주문을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const promises = Array.from(selectedOrderIds).map(async (orderId) => {
        const response = await fetch(`/api/jsharp/delete-order/${orderId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '삭제 실패');
        }
        return orderId;
      });
      
      await Promise.all(promises);

      // 로컬 상태 업데이트
      setOrders(orders.filter(order => !selectedOrderIds.has(order.id)));
      setSelectedOrderIds(new Set());
      alert('선택한 주문이 삭제되었습니다.');
    } catch (error: any) {
      console.error('일괄 삭제 오류:', error);
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 주문 날짜 포맷 (yymmdd-hh:mm)
  const formatOrderDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const yy = date.getFullYear().toString().slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${yy}${mm}${dd}-${hh}:${min}`;
    } catch {
      return dateStr;
    }
  };

  // 엑셀 내보내기 모달 열기 (같은 주문일시 그룹화)
  const handleOpenExportDialog = () => {
    if (selectedOrderIds.size === 0) {
      alert('내보낼 주문을 선택해주세요.');
      return;
    }

    // 선택된 주문들 가져오기
    const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));

    // 주문일시별로 그룹화
    const orderGroups: { [key: string]: Order[] } = {};
    selectedOrders.forEach(order => {
      const dateKey = order.order_date;
      if (!orderGroups[dateKey]) {
        orderGroups[dateKey] = [];
      }
      orderGroups[dateKey].push(order);
    });

    // 각 그룹의 첫 번째 주문 정보를 사용하여 ExportRow 생성
    const rows: ExportRow[] = Object.keys(orderGroups).map(dateKey => {
      const groupOrders = orderGroups[dateKey];
      const firstOrder = groupOrders[0];

      // 총 수량 계산
      const totalQuantity = groupOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

      return {
        recipient_name: getRecipientWithInitial(firstOrder.site, firstOrder.recipient_name),
        phone: firstOrder.phone || '',
        phone2: firstOrder.phone2 || '',
        address: firstOrder.address || '',
        quantity: totalQuantity,
        delivery_memo: firstOrder.delivery_memo || '',
        parcel_quantity: 1,  // 기본값 1
        parcel_fee: parcelFeePerUnit     // 기본값 1 * 택배운임 단가
      };
    });

    setExportRows(rows);
    setShowExportDialog(true);
  };

  // 엑셀 내보내기 실행
  const handleConfirmExport = async () => {
    try {
      const response = await fetch('/api/jsharp/export-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          export_rows: exportRows,
          logen_mapping: columnMappings.logen
        })
      });

      if (!response.ok) {
        throw new Error('엑셀 내보내기 실패');
      }

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logen_orders_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('엑셀 파일이 다운로드되었습니다.');
      setShowExportDialog(false);
    } catch (error) {
      console.error('엑셀 내보내기 오류:', error);
      alert('엑셀 내보내기에 실패했습니다.');
    }
  };

  // 택배수량 변경 시 택배운임 자동 계산
  const updateParcelQuantity = (index: number, quantity: number) => {
    setExportRows(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        parcel_quantity: quantity,
        parcel_fee: quantity * parcelFeePerUnit
      };
      return updated;
    });
  };

  // 컬럼 매핑 업데이트
  const updateColumnMapping = (site: 'ebay' | 'smartstore' | '11st' | 'coupang' | 'logen', field: keyof ColumnMapping, value: string) => {
    setColumnMappings(prev => {
      const updated = {
        ...prev,
        [site]: {
          ...prev[site],
          [field]: value
        }
      };
      // localStorage에 저장
      localStorage.setItem('jsharp_column_mappings', JSON.stringify(updated));
      return updated;
    });
  };

  // 컬럼 매핑 초기화
  const resetColumnMapping = (site: 'ebay' | 'smartstore' | '11st' | 'coupang' | 'logen') => {
    if (window.confirm(`${site} 사이트의 컬럼 매핑을 초기화하시겠습니까?`)) {
      setColumnMappings(prev => {
        const updated = {
          ...prev,
          [site]: site === 'logen' ? getDefaultLogenMapping() : getDefaultMapping()
        };
        localStorage.setItem('jsharp_column_mappings', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // 치환 규칙 관리 함수 (사이트별)
  const addReplacement = (type: ReplacementType) => {
    const site = selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang';
    setReplacementRules(prev => ({
      ...prev,
      [site]: {
        ...prev[site],
        [type]: [...prev[site][type], { id: nextReplacementId, before: '', after: '' }]
      }
    }));
    setNextReplacementId(prev => prev + 1);
  };

  const removeReplacement = (type: ReplacementType, id: number) => {
    const site = selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang';
    if (replacementRules[site][type].length <= 1) {
      alert('최소 1개의 치환 규칙은 유지되어야 합니다.');
      return;
    }
    setReplacementRules(prev => ({
      ...prev,
      [site]: {
        ...prev[site],
        [type]: prev[site][type].filter((r: FieldReplacement) => r.id !== id)
      }
    }));
  };

  const updateReplacement = (type: ReplacementType, id: number, field: 'before' | 'after', value: string) => {
    const site = selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang';
    setReplacementRules(prev => ({
      ...prev,
      [site]: {
        ...prev[site],
        [type]: prev[site][type].map((r: FieldReplacement) => r.id === id ? { ...r, [field]: value } : r)
      }
    }));
  };

  const handleOptionImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setOptionImages(Array.from(files));
    }
  };

  const handleProcessImages = async () => {
    if (uploadedImages.length === 0) return;

    setProcessing(true);
    setProcessedFiles([]);

    try {
      const formData = new FormData();
      uploadedImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/jsharp/process-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed-images.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('이미지 처리가 완료되었습니다. ZIP 파일이 다운로드됩니다.');
      } else {
        const data = await response.json();
        alert(data.message || '이미지 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 처리 실패:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateOptionImage = async () => {
    if (optionImages.length === 0 || !productName.trim()) {
      alert('이미지와 상품명을 모두 입력해주세요.');
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      optionImages.forEach((image) => {
        formData.append('images', image);
      });
      formData.append('option_number', selectedOption);
      formData.append('product_name', productName);
      formData.append('image_order', imageOrder);

      const response = await fetch('/api/jsharp/generate-option-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `선택${selectedOption}-${productName}.jpg`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('옵션 이미지가 생성되었습니다.');
      } else {
        const data = await response.json();
        alert(data.message || '이미지 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-body" style={{ marginTop: '2rem' }}>
      <div className="container-xl">
        <div className="row g-2 align-items-center mb-3">
          <div className="col">
            <h2 className="page-title">J# Web System</h2>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs" role="tablist">
                  <li className="nav-item" role="presentation">
                    <a
                      href="#"
                      className={`nav-link ${activeTab === 'order' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('order');
                      }}
                      role="tab"
                    >
                      주문관리
                    </a>
                  </li>
                  <li className="nav-item" role="presentation">
                    <a
                      href="#"
                      className={`nav-link ${activeTab === 'site-settings' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('site-settings');
                      }}
                      role="tab"
                    >
                      사이트별설정
                    </a>
                  </li>
                  <li className="nav-item" role="presentation">
                    <a
                      href="#"
                      className={`nav-link ${activeTab === 'convert' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('convert');
                      }}
                      role="tab"
                    >
                      이미지변환
                    </a>
                  </li>
                  <li className="nav-item" role="presentation">
                    <a
                      href="#"
                      className={`nav-link ${activeTab === 'option' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('option');
                      }}
                      role="tab"
                    >
                      옵션이미지생성
                    </a>
                  </li>
                  <li className="nav-item" role="presentation">
                    <a
                      href="#"
                      className={`nav-link ${activeTab === 'product-page' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('product-page');
                      }}
                      role="tab"
                    >
                      상품페이지작성
                    </a>
                  </li>
                </ul>
              </div>

              <div className="card-body">
                {/* 이미지변환 탭 */}
                {activeTab === 'convert' && (
                  <div>
                    {/* 섹션 선택 버튼 - 모던한 아이콘 스타일 */}
                    <div className="mb-4">
                      <div className="btn-group w-100" role="group">
                        <button
                          type="button"
                          className={`btn ${convertSection === 'resize' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setConvertSection('resize')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M3 9h18"/>
                            <path d="M9 21V9"/>
                          </svg>
                          크기변환
                        </button>
                        <button
                          type="button"
                          className={`btn ${convertSection === 'merge' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setConvertSection('merge')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                          </svg>
                          이미지병합
                        </button>
                      </div>
                    </div>

                    {/* 크기변환 섹션 */}
                    {convertSection === 'resize' && (
                      <div>
                        {/* 드래그앤드롭 파일 업로드 영역 */}
                        <div className="mb-4">
                          <label className="form-label">이미지 업로드</label>
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border rounded p-5 text-center cursor-pointer ${
                              isDragging ? 'border-primary bg-primary-lt' : 'border-secondary'
                            }`}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              backgroundColor: isDragging ? '#f0f7ff' : '#f8f9fa'
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mb-3"
                              style={{ color: isDragging ? '#0054a6' : '#a8abaeff' }}
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <p className="mb-2 fw-bold" style={{ fontSize: '1.1rem' }}>
                              {isDragging ? 'Drop Here!' : 'Click or Drag Images Here'}
                            </p>
                            <p className="text-muted small mb-0">
                              PNG, JPG, HEIC, HEIF 등 모든 이미지 형식 지원
                            </p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="d-none"
                              multiple
                              accept="image/*,.heic,.heif"
                              onChange={handleImageUpload}
                            />
                          </div>
                          {uploadedImages.length > 0 && (
                            <div className="mt-2">
                              <span className="badge bg-success">
                                {uploadedImages.length}개의 이미지 선택됨
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 처리 안내 */}
                        <div className="mb-4">
                          <div className="alert alert-info">
                            <h4 className="alert-title">처리 정보</h4>
                            <div className="text-muted">
                              이미지는 4개 사이즈(430px, 640px, 860px, 1000px)로 자동 변환되며,<br />
                              각 이미지에 1px 흰색 테두리가 추가됩니다.<br />
                              파일명 형식: 원본명-430.jpg, 원본명-640.jpg, 원본명-860.jpg, 원본명-1000.jpg<br />
                              <strong>처리된 이미지는 ZIP 파일로 다운로드됩니다.</strong><br />
                              <strong className="text-primary">HEIC/HEIF 파일도 지원됩니다 (최상 품질 유지)</strong>
                            </div>
                          </div>
                        </div>

                        {/* 이미지 미리보기 */}
                        {uploadedImages.length > 0 && (
                          <div className="mb-4">
                            <label className="form-label">업로드된 이미지</label>
                            <div className="row g-3">
                              {uploadedImages.map((image, index) => {
                                const isHEIC = image.name.toLowerCase().endsWith('.heic') || image.name.toLowerCase().endsWith('.heif');
                                return (
                                  <div key={index} className="col-md-3">
                                    <div className="card">
                                      {!isHEIC ? (
                                        <img
                                          src={URL.createObjectURL(image)}
                                          alt={`preview-${index}`}
                                          className="card-img-top"
                                          style={{ height: '200px', objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <div
                                          className="card-img-top d-flex align-items-center justify-content-center"
                                          style={{
                                            height: '200px',
                                            backgroundColor: '#f8f9fa',
                                            color: '#6c757d'
                                          }}
                                        >
                                          <div className="text-center">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="48"
                                              height="48"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                              <circle cx="8.5" cy="8.5" r="1.5"/>
                                              <polyline points="21 15 16 10 5 21"/>
                                            </svg>
                                            <p className="mt-2 mb-0 small">HEIC 이미지</p>
                                          </div>
                                        </div>
                                      )}
                                      <div className="card-body">
                                        <p className="card-text text-truncate" title={image.name}>
                                          {image.name}
                                        </p>
                                        <small className="text-muted">
                                          {(image.size / 1024).toFixed(2)} KB
                                        </small>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 처리 버튼 */}
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={uploadedImages.length === 0 || processing}
                            onClick={handleProcessImages}
                          >
                            {processing ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                처리 중...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                크기변환 시작
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={processing}
                            onClick={() => {
                              setUploadedImages([]);
                              setProcessedFiles([]);
                            }}
                          >
                            초기화
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 이미지병합 섹션 */}
                    {convertSection === 'merge' && (
                      <div>
                        <div className="mb-4">
                          <div className="alert alert-info">
                            <h4 className="alert-title">이미지 병합 안내</h4>
                            <div className="text-muted">
                              • 430px 크기의 이미지 2개를 업로드하면 860px × 430px 크기로 병합됩니다.<br />
                              • 좌우 배치 순서를 변경할 수 있습니다.
                            </div>
                          </div>
                        </div>

                        {/* 이미지 업로드 */}
                        <div className="mb-4">
                          <label className="form-label">이미지 업로드 (2개)</label>
                          <div
                            onDragOver={handleMergeDragOver}
                            onDragLeave={handleMergeDragLeave}
                            onDrop={handleMergeDrop}
                            onClick={() => mergeFileInputRef.current?.click()}
                            className={`border rounded p-5 text-center cursor-pointer ${
                              isMergeDragging ? 'border-primary bg-primary-lt' : 'border-secondary'
                            }`}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              backgroundColor: isMergeDragging ? '#f0f7ff' : '#f8f9fa'
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mb-3"
                              style={{ color: isMergeDragging ? '#0054a6' : '#a8abaeff' }}
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <p className="mb-2 fw-bold" style={{ fontSize: '1.1rem' }}>
                              {isMergeDragging ? 'Drop Here!' : 'Click or Drag Images Here'}
                            </p>
                            <p className="text-muted small mb-0">
                              PNG, JPG 등 모든 이미지 형식 지원 (2개 필요)
                            </p>
                            <input
                              ref={mergeFileInputRef}
                              type="file"
                              className="d-none"
                              multiple
                              accept="image/*"
                              onChange={handleMergeImageUpload}
                            />
                          </div>
                          {mergeImages.length > 0 && (
                            <div className="mt-2">
                              <span className={`badge ${mergeImages.length === 2 ? 'bg-success' : 'bg-warning'}`}>
                                {mergeImages.length}개의 이미지 선택됨 {mergeImages.length !== 2 && '(2개 필요)'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 이미지 순서 선택 */}
                        {mergeImages.length === 2 && (
                          <div className="mb-4">
                            <label className="form-label">이미지 배치 순서</label>
                            <div className="form-selectgroup">
                              <label className="form-selectgroup-item">
                                <input
                                  type="radio"
                                  name="merge-image-order"
                                  value="left-right"
                                  className="form-selectgroup-input"
                                  checked={mergeImageOrder === 'left-right'}
                                  onChange={(e) => setMergeImageOrder('left-right')}
                                />
                                <span className="form-selectgroup-label">왼쪽 → 오른쪽</span>
                              </label>
                              <label className="form-selectgroup-item">
                                <input
                                  type="radio"
                                  name="merge-image-order"
                                  value="right-left"
                                  className="form-selectgroup-input"
                                  checked={mergeImageOrder === 'right-left'}
                                  onChange={(e) => setMergeImageOrder('right-left')}
                                />
                                <span className="form-selectgroup-label">오른쪽 → 왼쪽</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* 이미지 미리보기 */}
                        {mergeImages.length > 0 && (
                          <div className="mb-4">
                            <label className="form-label">업로드된 이미지</label>
                            <div className="row g-3">
                              {(mergeImageOrder === 'left-right' ? mergeImages : [...mergeImages].reverse()).map((image, index) => (
                                <div key={index} className="col-md-6">
                                  <div className="card">
                                    <img
                                      src={URL.createObjectURL(image)}
                                      alt={`merge-preview-${index}`}
                                      className="card-img-top"
                                      style={{ height: '300px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                                    />
                                    <div className="card-body">
                                      <p className="card-text text-truncate" title={image.name}>
                                        {mergeImageOrder === 'left-right' ? (index === 0 ? '왼쪽 이미지' : '오른쪽 이미지') : (index === 0 ? '오른쪽 이미지' : '왼쪽 이미지')}
                                      </p>
                                      <small className="text-muted">
                                        {image.name} ({(image.size / 1024).toFixed(2)} KB)
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 병합 버튼 */}
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={mergeImages.length !== 2 || processing}
                            onClick={handleMergeImages}
                          >
                            {processing ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                병합 중...
                              </>
                            ) : (
                              '이미지 병합'
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={processing}
                            onClick={() => {
                              setMergeImages([]);
                              setMergeImageOrder('left-right');
                            }}
                          >
                            초기화
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 옵션생성 탭 */}
                {activeTab === 'option' && (
                  <div>
                    <div className="mb-4">
                      <div className="alert alert-info">
                        <h4 className="alert-title">옵션 이미지 생성 안내</h4>
                        <div className="text-muted">
                          • 1개 이미지 (640px): 텍스트가 상단에 배치되어 가로 640px, 세로 640px 이상의 이미지 생성<br />
                          • 2개 이미지 (430px): 좌우로 나란히 배치되어 가로 860px, 세로 430px 이상의 이미지 생성<br />
                          • 이미지는 스마트스토어 업로드용으로 텍스트가 예쁘게 렌더링됩니다.
                        </div>
                      </div>
                    </div>

                    {/* 선택 번호 */}
                    <div className="mb-4">
                      <label className="form-label">선택 번호</label>
                      <select
                        className="form-select"
                        value={selectedOption}
                        onChange={(e) => setSelectedOption(e.target.value)}
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const num = String(i + 1).padStart(2, '0');
                          return (
                            <option key={num} value={num}>
                              선택{num}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 상품명 입력 */}
                    <div className="mb-4">
                      <label className="form-label">상품명</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="상품명을 입력하세요..."
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                      />
                    </div>

                    {/* 이미지 업로드 */}
                    <div className="mb-4">
                      <label className="form-label">이미지 업로드</label>
                      <div
                        onDragOver={handleOptionDragOver}
                        onDragLeave={handleOptionDragLeave}
                        onDrop={handleOptionDrop}
                        onClick={() => optionFileInputRef.current?.click()}
                        className={`border rounded p-5 text-center cursor-pointer ${
                          isOptionDragging ? 'border-primary bg-primary-lt' : 'border-secondary'
                        }`}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: isOptionDragging ? '#f0f7ff' : '#f8f9fa'
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mb-3"
                          style={{ color: isOptionDragging ? '#0054a6' : '#a8abaeff' }}
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p className="mb-2 fw-bold" style={{ fontSize: '1.1rem' }}>
                          {isOptionDragging ? 'Drop Here!' : 'Click or Drag Images Here'}
                        </p>
                        <p className="text-muted small mb-0">
                          PNG, JPG 등 모든 이미지 형식 지원
                        </p>
                        <input
                          ref={optionFileInputRef}
                          type="file"
                          className="d-none"
                          multiple
                          accept="image/*"
                          onChange={handleOptionImageUpload}
                        />
                      </div>
                      {optionImages.length > 0 && (
                        <div className="mt-2">
                          <span className="badge bg-success">
                            {optionImages.length}개의 이미지 선택됨
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 이미지 순서 선택 (2개 이미지일 때만) */}
                    {optionImages.length === 2 && (
                      <div className="mb-4">
                        <label className="form-label">이미지 배치 순서</label>
                        <div className="form-selectgroup">
                          <label className="form-selectgroup-item">
                            <input
                              type="radio"
                              name="image-order"
                              value="left-right"
                              className="form-selectgroup-input"
                              checked={imageOrder === 'left-right'}
                              onChange={(e) => setImageOrder('left-right')}
                            />
                            <span className="form-selectgroup-label">왼쪽 → 오른쪽</span>
                          </label>
                          <label className="form-selectgroup-item">
                            <input
                              type="radio"
                              name="image-order"
                              value="right-left"
                              className="form-selectgroup-input"
                              checked={imageOrder === 'right-left'}
                              onChange={(e) => setImageOrder('right-left')}
                            />
                            <span className="form-selectgroup-label">오른쪽 → 왼쪽</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* 이미지 미리보기 */}
                    {optionImages.length > 0 && (
                      <div className="mb-4">
                        <label className="form-label">업로드된 이미지</label>
                        <div className="row g-3">
                          {(imageOrder === 'left-right' ? optionImages : [...optionImages].reverse()).map((image, index) => (
                            <div key={index} className="col-md-6">
                              <div className="card">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={`option-preview-${index}`}
                                  className="card-img-top"
                                  style={{ height: '300px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                                />
                                <div className="card-body">
                                  <p className="card-text text-truncate" title={image.name}>
                                    {imageOrder === 'left-right' ? (index === 0 ? '왼쪽 이미지' : '오른쪽 이미지') : (index === 0 ? '오른쪽 이미지' : '왼쪽 이미지')}
                                  </p>
                                  <small className="text-muted">
                                    {image.name} ({(image.size / 1024).toFixed(2)} KB)
                                  </small>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 생성 버튼 */}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={optionImages.length === 0 || !productName.trim() || processing}
                        onClick={handleGenerateOptionImage}
                      >
                        {processing ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            생성 중...
                          </>
                        ) : (
                          '저장'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={processing}
                        onClick={() => {
                          setOptionImages([]);
                          setProductName('');
                          setImageOrder('left-right');
                        }}
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                )}

                {/* 사이트별설정 탭 */}
                {activeTab === 'site-settings' && (
                  <div>
                    {/* 설정 저장/불러오기 버튼 */}
                    <div className="mb-3 d-flex gap-2 justify-content-end">
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch('/api/jsharp/save-settings', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                column_mappings: columnMappings,
                                replacement_rules: replacementRules
                              })
                            });
                            const data = await response.json();
                            if (data.success) {
                              alert('설정이 서버에 저장되었습니다.');
                            } else {
                              alert(data.message || '저장에 실패했습니다.');
                            }
                          } catch (error) {
                            alert('설정 저장 중 오류가 발생했습니다.');
                          }
                        }}
                      >
                        서버에 저장
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch('/api/jsharp/load-settings', {
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            const data = await response.json();
                            if (data.success && data.data) {
                              if (data.data.column_mappings) {
                                setColumnMappings(data.data.column_mappings);
                                localStorage.setItem('jsharp_column_mappings', JSON.stringify(data.data.column_mappings));
                              }
                              if (data.data.replacement_rules) {
                                setReplacementRules(data.data.replacement_rules);
                                localStorage.setItem('jsharp_replacement_rules', JSON.stringify(data.data.replacement_rules));
                              }
                              alert('설정을 서버에서 불러왔습니다.');
                            } else {
                              alert(data.message || '불러오기에 실패했습니다.');
                            }
                          } catch (error) {
                            alert('설정 불러오기 중 오류가 발생했습니다.');
                          }
                        }}
                      >
                        서버에서 불러오기
                      </button>
                    </div>

                    {/* 사이트 선택 */}
                    <div className="card mb-4">
                      <div className="card-header">
                        <h3 className="card-title">쇼핑몰 선택</h3>
                      </div>
                      <div className="card-body">
                        <div className="btn-group w-100" role="group">
                          <button
                            type="button"
                            className={`btn ${selectedMappingSite === 'ebay' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setSelectedMappingSite('ebay')}
                          >
                            eBay
                          </button>
                          <button
                            type="button"
                            className={`btn ${selectedMappingSite === 'smartstore' ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => setSelectedMappingSite('smartstore')}
                          >
                            스마트스토어
                          </button>
                          <button
                            type="button"
                            className={`btn ${selectedMappingSite === '11st' ? 'btn-danger' : 'btn-outline-danger'}`}
                            onClick={() => setSelectedMappingSite('11st')}
                          >
                            11번가
                          </button>
                          <button
                            type="button"
                            className={`btn ${selectedMappingSite === 'coupang' ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() => setSelectedMappingSite('coupang')}
                          >
                            쿠팡
                          </button>
                          <button
                            type="button"
                            className={`btn ${selectedMappingSite === 'logen' ? 'btn-info' : 'btn-outline-info'}`}
                            onClick={() => setSelectedMappingSite('logen')}
                          >
                            로젠
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 컬럼 매핑 입력 폼 */}
                    <div className="card">
                      <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                          <h3 className="card-title mb-0">
                            {selectedMappingSite === 'ebay' && 'eBay'}
                            {selectedMappingSite === 'smartstore' && '스마트스토어'}
                            {selectedMappingSite === '11st' && '11번가'}
                            {selectedMappingSite === 'coupang' && '쿠팡'}
                            {selectedMappingSite === 'logen' && '로젠'}
                            {' '}컬럼 매핑
                          </h3>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => resetColumnMapping(selectedMappingSite)}
                          >
                            초기화
                          </button>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          {/* 주문번호 */}
                          <div className="col-md-6">
                            <label className="form-label">주문번호</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: A/주문번호, B/Order Number"
                              value={columnMappings[selectedMappingSite].order_number}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'order_number', e.target.value)}
                            />
                          </div>

                          {/* 주문자 */}
                          <div className="col-md-6">
                            <label className="form-label">주문자</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: C/주문자명, D/Buyer Name"
                              value={columnMappings[selectedMappingSite].buyer_name}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'buyer_name', e.target.value)}
                            />
                          </div>

                          {/* 수령인 */}
                          <div className="col-md-6">
                            <label className="form-label">
                              수령인 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: E/수취인, F/Ship To Name"
                              value={columnMappings[selectedMappingSite].recipient_name}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'recipient_name', e.target.value)}
                            />
                          </div>

                          {/* 전화번호1 */}
                          <div className="col-md-6">
                            <label className="form-label">
                              전화번호1 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: G/전화번호, H/Phone"
                              value={columnMappings[selectedMappingSite].phone}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'phone', e.target.value)}
                            />
                          </div>

                          {/* 전화번호2 */}
                          <div className="col-md-6">
                            <label className="form-label">전화번호2 (선택)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: I/추가연락처"
                              value={columnMappings[selectedMappingSite].phone2}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'phone2', e.target.value)}
                            />
                          </div>

                          {/* 주소 */}
                          <div className="col-md-6">
                            <label className="form-label">
                              주소 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: J/배송지주소, K/Address"
                              value={columnMappings[selectedMappingSite].address}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'address', e.target.value)}
                            />
                          </div>

                          {/* 배송메모 */}
                          <div className="col-md-6">
                            <label className="form-label">배송메모 (선택)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: L/배송메시지, M/배송요청사항"
                              value={columnMappings[selectedMappingSite].delivery_memo}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'delivery_memo', e.target.value)}
                            />
                          </div>

                          {/* 상품명 */}
                          <div className="col-md-6">
                            <label className="form-label">
                              상품명 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: N/상품명, O/Item Title"
                              value={columnMappings[selectedMappingSite].product_name}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'product_name', e.target.value)}
                            />
                          </div>

                          {/* 수량 */}
                          <div className="col-md-6">
                            <label className="form-label">{selectedMappingSite === 'logen' ? '택배수량' : '수량'}</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={selectedMappingSite === 'logen' ? '예: P/택배수량' : '예: P/수량, Q/Quantity'}
                              value={columnMappings[selectedMappingSite].quantity}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'quantity', e.target.value)}
                            />
                          </div>

                          {/* 옵션 */}
                          <div className="col-md-6">
                            <label className="form-label">옵션 (선택)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: R/옵션정보, S/선택옵션"
                              value={columnMappings[selectedMappingSite].option}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'option', e.target.value)}
                            />
                          </div>

                          {/* 추가구성 */}
                          <div className="col-md-6">
                            <label className="form-label">추가구성 (선택)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: T/추가구성품, U/추가상품"
                              value={columnMappings[selectedMappingSite].additional_items}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'additional_items', e.target.value)}
                            />
                          </div>

                          {/* 가격 */}
                          <div className="col-md-6">
                            <label className="form-label">{selectedMappingSite === 'logen' ? '택배운임' : '가격'}</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={selectedMappingSite === 'logen' ? '예: V/택배운임' : '예: V/판매가, W/Sale Price'}
                              value={columnMappings[selectedMappingSite].price}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'price', e.target.value)}
                            />
                          </div>

                          {/* 주문일자 */}
                          <div className="col-md-6">
                            <label className="form-label">주문일자</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="예: X/주문일시, Y/Sale Date"
                              value={columnMappings[selectedMappingSite].order_date}
                              onChange={(e) => updateColumnMapping(selectedMappingSite, 'order_date', e.target.value)}
                            />
                          </div>

                          {/* 로젠 전용 필드 */}
                          {selectedMappingSite === 'logen' && (
                            <>
                              {/* 택배수량 */}
                              <div className="col-md-6">
                                <label className="form-label">택배수량 (엑셀 열)</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="예: F/택배수량"
                                  value={columnMappings.logen.parcel_quantity || ''}
                                  onChange={(e) => updateColumnMapping('logen', 'parcel_quantity', e.target.value)}
                                />
                                <small className="form-hint">엑셀에 출력될 택배수량 컬럼 위치</small>
                              </div>

                              {/* 택배운임 */}
                              <div className="col-md-6">
                                <label className="form-label">택배운임 (엑셀 열)</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="예: G/택배운임"
                                  value={columnMappings.logen.parcel_fee || ''}
                                  onChange={(e) => updateColumnMapping('logen', 'parcel_fee', e.target.value)}
                                />
                                <small className="form-hint">엑셀에 출력될 택배운임 컬럼 위치</small>
                              </div>

                              {/* 택배운임 단가 */}
                              <div className="col-md-6">
                                <label className="form-label">택배운임 단가 (원)</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  placeholder="예: 3850"
                                  value={parcelFeePerUnit}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    setParcelFeePerUnit(value);
                                    localStorage.setItem('jsharp_parcel_fee_per_unit', value.toString());
                                  }}
                                />
                                <small className="form-hint">택배수량 × 이 단가로 택배운임이 자동 계산됩니다.</small>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="alert alert-warning">
                            <strong>주의:</strong> <span className="text-danger">*</span> 표시된 필드는 필수 항목입니다.
                            이 필드들이 비어있으면 해당 사이트의 엑셀을 자동 감지할 수 없습니다.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 엑셀 파일 비밀번호 섹션 - 로젠 제외 */}
                    {selectedMappingSite !== 'logen' && (
                      <div className="card mt-4">
                        <div className="card-header">
                          <h3 className="card-title">엑셀 파일 비밀번호</h3>
                          <p className="text-muted small mb-0 mt-1">
                            암호로 보호된 엑셀 파일을 업로드하는 경우, 비밀번호를 설정하세요.
                          </p>
                        </div>
                        <div className="card-body">
                          <div className="mb-3">
                            <label className="form-label">
                              {selectedMappingSite === 'ebay' && 'eBay'}
                              {selectedMappingSite === 'smartstore' && '스마트스토어'}
                              {selectedMappingSite === '11st' && '11번가'}
                              {selectedMappingSite === 'coupang' && '쿠팡'}
                              {' '}비밀번호
                            </label>
                            <input
                              type="password"
                              className="form-control"
                              placeholder="비밀번호 (선택)"
                              value={sitePasswords[selectedMappingSite] || ''}
                              onChange={(e) => {
                                const newPasswords = { ...sitePasswords, [selectedMappingSite]: e.target.value };
                                setSitePasswords(newPasswords);
                                localStorage.setItem('jsharp_site_passwords', JSON.stringify(newPasswords));
                              }}
                            />
                          </div>
                          <div className="mt-3">
                            <small className="text-muted">
                              비밀번호는 로컬 저장소에 저장되며, 엑셀 업로드 시 자동으로 암호를 해제합니다.
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 필드 치환 섹션 - 로젠 제외 */}
                    {selectedMappingSite !== 'logen' && (
                    <div className="card mt-4">
                      <div className="card-header">
                        <h3 className="card-title">필드 치환 설정</h3>
                        <p className="text-muted small mb-0 mt-1">
                          긴 텍스트를 간소화하기 위한 치환 규칙을 설정하세요. 엑셀 업로드 시 자동으로 적용됩니다.
                        </p>
                      </div>
                      <div className="card-body">
                        {/* 상품명 치환 */}
                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h4 className="mb-0">상품명 치환</h4>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => addReplacement('product_name')}
                            >
                              + 추가
                            </button>
                          </div>
                          {replacementRules[selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang'].product_name.map((replacement: FieldReplacement, index: number) => (
                            <div key={replacement.id} className="row g-2 mb-2 align-items-center">
                              <div className="col-auto" style={{ width: '40px' }}>
                                <span className="badge bg-secondary">{index + 1}</span>
                              </div>
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="치환 전 (예: 킨더조이 10입 빅사이즈/킨더초콜릿/빌/남아용/여아용)"
                                  value={replacement.before}
                                  onChange={(e) => updateReplacement('product_name', replacement.id, 'before', e.target.value)}
                                />
                              </div>
                              <div className="col-auto">→</div>
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="치환 후 (예: 킨더조이 10입)"
                                  value={replacement.after}
                                  onChange={(e) => updateReplacement('product_name', replacement.id, 'after', e.target.value)}
                                />
                              </div>
                              <div className="col-auto">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeReplacement('product_name', replacement.id)}
                                  disabled={replacementRules[selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang'].product_name.length <= 1}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <hr />

                        {/* 옵션 치환 */}
                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h4 className="mb-0">옵션 치환</h4>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => addReplacement('option')}
                            >
                              + 추가
                            </button>
                          </div>
                          {replacementRules[selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang'].option.map((replacement: FieldReplacement, index: number) => (
                            <div key={replacement.id} className="row g-2 mb-2 align-items-center">
                              <div className="col-auto" style={{ width: '40px' }}>
                                <span className="badge bg-secondary">{index + 1}</span>
                              </div>
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="치환 전"
                                  value={replacement.before}
                                  onChange={(e) => updateReplacement('option', replacement.id, 'before', e.target.value)}
                                />
                              </div>
                              <div className="col-auto">→</div>
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="치환 후"
                                  value={replacement.after}
                                  onChange={(e) => updateReplacement('option', replacement.id, 'after', e.target.value)}
                                />
                              </div>
                              <div className="col-auto">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeReplacement('option', replacement.id)}
                                  disabled={replacementRules[selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang'].option.length <= 1}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <hr />

                        {/* 추가구성 치환 */}
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h4 className="mb-0">추가구성 치환</h4>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => addReplacement('additional_items')}
                            >
                              + 추가
                            </button>
                          </div>
                          {replacementRules[selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang'].additional_items.map((replacement: FieldReplacement, index: number) => (
                            <div key={replacement.id} className="row g-2 mb-2 align-items-center">
                              <div className="col-auto" style={{ width: '40px' }}>
                                <span className="badge bg-secondary">{index + 1}</span>
                              </div>
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="치환 전"
                                  value={replacement.before}
                                  onChange={(e) => updateReplacement('additional_items', replacement.id, 'before', e.target.value)}
                                />
                              </div>
                              <div className="col-auto">→</div>
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="치환 후"
                                  value={replacement.after}
                                  onChange={(e) => updateReplacement('additional_items', replacement.id, 'after', e.target.value)}
                                />
                              </div>
                              <div className="col-auto">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeReplacement('additional_items', replacement.id)}
                                  disabled={replacementRules[selectedMappingSite as 'ebay' | 'smartstore' | '11st' | 'coupang'].additional_items.length <= 1}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {/* 주문관리 탭 */}
                {activeTab === 'order' && (
                  <div>
                    {/* 주문 목록 */}
                    {orders.length > 0 && (
                      <div className="card">
                        <div className="card-header">
                          {/* 4열 그리드 레이아웃 */}
                          <div className="row g-2 align-items-center">
                            {/* 1열: 전체 선택 체크박스 + 주문 목록 제목 */}
                            <div className="col-auto">
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                                  onChange={handleSelectAll}
                                  title="전체 선택"
                                />
                                <h3 className="card-title mb-0">주문 목록 ({filteredOrders.length}건)</h3>
                              </div>
                            </div>

                            {/* 2열: 작업 버튼들 (최소 폭) */}
                            <div className="col-auto">
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleBulkUpdateStatus('completed')}
                                  disabled={selectedOrderIds.size === 0}
                                  style={{ opacity: selectedOrderIds.size === 0 ? 0.5 : 1 }}
                                  title="선택한 주문을 완료 처리"
                                >
                                  완료
                                </button>
                                <button
                                  className="btn btn-sm btn-warning"
                                  onClick={() => handleBulkUpdateStatus('pending')}
                                  disabled={selectedOrderIds.size === 0}
                                  style={{ opacity: selectedOrderIds.size === 0 ? 0.5 : 1 }}
                                  title="선택한 주문을 미완료로 변경"
                                >
                                  미완료
                                </button>
                                <button
                                  className="btn btn-sm btn-info"
                                  onClick={() => {
                                    if (selectedOrderIds.size === 0) {
                                      alert('출력할 주문을 선택해주세요.');
                                      return;
                                    }
                                    window.print();
                                  }}
                                  disabled={selectedOrderIds.size === 0}
                                  style={{ opacity: selectedOrderIds.size === 0 ? 0.5 : 1 }}
                                  title="선택한 주문 출력"
                                >
                                  출력
                                </button>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={handleOpenExportDialog}
                                  disabled={selectedOrderIds.size === 0}
                                  style={{ opacity: selectedOrderIds.size === 0 ? 0.5 : 1 }}
                                  title="선택한 주문을 엑셀로 내보내기"
                                >
                                  엑셀
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={handleBulkDelete}
                                  disabled={selectedOrderIds.size === 0}
                                  style={{ opacity: selectedOrderIds.size === 0 ? 0.5 : 1 }}
                                  title="선택한 주문 삭제"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>

                            {/* 3열: 필터 및 검색 */}
                            <div className="col">
                              <div className="d-flex gap-2 align-items-center">
                                {/* 사이트 필터 */}
                                <select
                                  className="form-select form-select-sm"
                                  value={filterSite}
                                  onChange={(e) => setFilterSite(e.target.value)}
                                  style={{ width: '130px' }}
                                >
                                  <option value="all">전체 사이트</option>
                                  <option value="gmarket">G마켓</option>
                                  <option value="auction">옥션</option>
                                  <option value="smartstore">스마트스토어</option>
                                  <option value="11st">11번가</option>
                                  <option value="coupang">쿠팡</option>
                                  <option value="logen">로젠</option>
                                </select>

                                {/* 상태 필터 */}
                                <div className="btn-group" role="group">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setStatusFilter('all')}
                                  >
                                    전체
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                                    onClick={() => setStatusFilter('pending')}
                                  >
                                    미완료
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${statusFilter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                                    onClick={() => setStatusFilter('completed')}
                                  >
                                    완료
                                  </button>
                                </div>

                                {/* 검색 */}
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="주문번호, 이름, 상품명, 배송메모..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  style={{ width: '250px' }}
                                />
                              </div>
                            </div>

                            {/* 4열: 업로드 관련 버튼 */}
                            <div className="col-auto">
                              <div className="d-flex gap-2">
                                {/* 파일 업로드 영역 */}
                                <div
                                  onDragOver={handleOrderDragOver}
                                  onDragLeave={handleOrderDragLeave}
                                  onDrop={handleOrderDrop}
                                  onClick={() => orderFileInputRef.current?.click()}
                                  className={`border rounded text-center ${
                                    isOrderDragging ? 'border-primary bg-primary-lt' : 'border-secondary'
                                  }`}
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: isOrderDragging ? '#f0f7ff' : '#f8f9fa',
                                    padding: '6px 12px',
                                    width: '120px'
                                  }}
                                >
                                  <small className="fw-bold">
                                    {isOrderDragging ? 'Drop!' : 'Click/Drag'}
                                  </small>
                                  <input
                                    ref={orderFileInputRef}
                                    type="file"
                                    className="d-none"
                                    multiple
                                    accept=".xlsx,.xls"
                                    onChange={handleOrderFileChange}
                                  />
                                </div>

                                {/* 업로드 버튼 */}
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={orderFiles.length === 0 || loadingOrders}
                                  onClick={handleUploadOrders}
                                  title="주문 데이터 가져오기"
                                  style={{ width: '80px' }}
                                >
                                  {loadingOrders ? (
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                  ) : (
                                    '가져오기'
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="card-body p-0">
                          <div className="table-responsive">
                            <table className="table table-vcenter card-table">
                              <tbody>
                                {filteredOrders.length > 0 ? (
                                  (() => {
                                    // 주문일자로 그룹화
                                    const groupedOrders: { [key: string]: typeof filteredOrders } = {};
                                    filteredOrders.forEach(order => {
                                      const dateKey = order.order_date || 'no-date';
                                      if (!groupedOrders[dateKey]) {
                                        groupedOrders[dateKey] = [];
                                      }
                                      groupedOrders[dateKey].push(order);
                                    });

                                    let globalIndex = 0;
                                    return Object.entries(groupedOrders).map(([orderDate, ordersInGroup]) => {
                                      const firstOrder = ordersInGroup[0];
                                      const bgColor = globalIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                      globalIndex++;

                                      return (
                                        <React.Fragment key={orderDate}>
                                          {/* 첫 번째 행: 체크박스/상태와 주문 기본정보 */}
                                          <tr className={`${ordersInGroup.some(o => selectedOrderIds.has(o.id)) ? 'print-selected' : ''} row-type-basic`}>
                                            <td style={{ backgroundColor: bgColor }}>
                                              <div className="d-flex gap-3 align-items-center">
                                                <div className="col-checkbox" style={{ minWidth: '30px' }}>
                                                  <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={ordersInGroup.every(o => selectedOrderIds.has(o.id))}
                                                    onChange={() => {
                                                      const allSelected = ordersInGroup.every(o => selectedOrderIds.has(o.id));
                                                      const newSelected = new Set(selectedOrderIds);
                                                      ordersInGroup.forEach(o => {
                                                        if (allSelected) {
                                                          newSelected.delete(o.id);
                                                        } else {
                                                          newSelected.add(o.id);
                                                        }
                                                      });
                                                      setSelectedOrderIds(newSelected);
                                                    }}
                                                  />
                                                </div>
                                                <div className="col-status" style={{ minWidth: '50px' }}>
                                                  {ordersInGroup.every(o => o.status === 'completed') ? (
                                                    <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>완료</span>
                                                  ) : (
                                                    <span className="badge bg-warning" style={{ fontSize: '0.7rem' }}>미완료</span>
                                                  )}
                                                </div>
                                                <div className="col-order-date">
                                                  <strong>일자:</strong> {formatOrderDate(firstOrder.order_date)}
                                                </div>
                                                <div className="col-buyer-name">
                                                  <strong>구매자:</strong> {formatValue(firstOrder.buyer_name)}
                                                </div>
                                                <div className="col-recipient-name">
                                                  <strong>수취인:</strong> <span className="text-primary fw-bold">{getRecipientWithInitial(firstOrder.site, firstOrder.recipient_name)}</span>
                                                </div>
                                                <div className="col-phone">
                                                  <strong>Tel1:</strong> {formatValue(firstOrder.phone)}
                                                </div>
                                                {firstOrder.phone2 && (
                                                  <div className="col-phone2">
                                                    <strong>Tel2:</strong> {formatValue(firstOrder.phone2)}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                          {/* 두 번째 행: 주소, 배송메모 */}
                                          <tr className={`${ordersInGroup.some(o => selectedOrderIds.has(o.id)) ? 'print-selected' : ''} row-type-address`}>
                                            <td style={{ backgroundColor: bgColor }}>
                                              <div className="d-flex gap-3">
                                                <div className="col-address" style={{ flex: 2 }}>
                                                  <strong>주소:</strong> {formatValue(firstOrder.address)}
                                                </div>
                                                {firstOrder.delivery_memo && (
                                                  <div className="col-delivery-memo" style={{ flex: 1 }}>
                                                    <strong>배송메모:</strong> {formatValue(firstOrder.delivery_memo)}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                          {/* 세 번째 행 이후: 각 주문건별 상품 정보 */}
                                          {ordersInGroup.map((order, idx) => (
                                            <tr key={order.id} className={`${selectedOrderIds.has(order.id) ? 'print-selected' : ''} row-type-product`}>
                                              <td style={{ backgroundColor: bgColor, borderBottom: idx === ordersInGroup.length - 1 ? '2px solid #dee2e6' : '1px solid #e9ecef' }}>
                                                <div className="d-flex gap-3 align-items-center">
                                                  <div className="col-order-number" style={{ minWidth: '120px' }}>
                                                    <strong>주문번호:</strong> {formatValue(order.order_number)}
                                                  </div>
                                                  <div className="col-product-name" style={{ flex: 3, textAlign: 'right' }}>
                                                    <strong>상품명:</strong> {formatValue(order.product_name)}
                                                  </div>
                                                  <div className="col-quantity">
                                                    <strong>수량:</strong> {order.quantity || 1}
                                                  </div>
                                                  {order.option && (
                                                    <div className="col-option" style={{ flex: 1 }}>
                                                      <strong>옵션:</strong> {formatValue(order.option)}
                                                    </div>
                                                  )}
                                                  {order.additional_items && (
                                                    <div className="col-additional-items" style={{ flex: 1 }}>
                                                      <strong>추가구성:</strong> {formatValue(order.additional_items)}
                                                    </div>
                                                  )}
                                                  <div className="col-price">
                                                    <strong>금액:</strong> {(order.price || 0).toLocaleString()}원
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      );
                                    });
                                  })()
                                ) : (
                                  <tr>
                                    <td className="text-center text-muted py-4">
                                      검색 결과가 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* 엑셀 내보내기 다이얼로그 */}
                    {showExportDialog && (
                      <div className="modal modal-blur show" tabIndex={-1} style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowExportDialog(false)}>
                        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
                          <div className="modal-content">
                            <div className="modal-header">
                              <h5 className="modal-title">엑셀 내보내기 미리보기</h5>
                              <button type="button" className="btn-close" onClick={() => setShowExportDialog(false)}></button>
                            </div>
                            <div className="modal-body">
                              <div className="mb-3">
                                <p className="text-muted">
                                  아래 데이터를 확인하고 택배수량을 조정하세요. 택배운임은 자동으로 계산됩니다 (택배수량 × {parcelFeePerUnit.toLocaleString()}원).
                                </p>
                              </div>
                              <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '12%' }}>수령인</th>
                                      <th style={{ width: '10%' }}>전화번호1</th>
                                      <th style={{ width: '10%' }}>전화번호2</th>
                                      <th style={{ width: '28%' }}>주소</th>
                                      <th style={{ width: '8%' }}>수량</th>
                                      <th style={{ width: '15%' }}>배송메모</th>
                                      <th style={{ width: '8%' }}>택배수량</th>
                                      <th style={{ width: '9%' }}>택배운임</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {exportRows.map((row, index) => (
                                      <tr key={index}>
                                        <td>{(row.recipient_name && row.recipient_name !== 'nan') ? row.recipient_name : ''}</td>
                                        <td>{(row.phone && row.phone !== 'nan') ? row.phone : ''}</td>
                                        <td>{(row.phone2 && row.phone2 !== 'nan') ? row.phone2 : ''}</td>
                                        <td style={{ fontSize: '0.85em' }}>{(row.address && row.address !== 'nan') ? row.address : ''}</td>
                                        <td className="text-center">{row.quantity || ''}</td>
                                        <td style={{ fontSize: '0.85em' }}>{(row.delivery_memo && row.delivery_memo !== 'nan') ? row.delivery_memo : ''}</td>
                                        <td>
                                          <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            min="1"
                                            value={row.parcel_quantity}
                                            onChange={(e) => updateParcelQuantity(index, parseInt(e.target.value) || 1)}
                                            style={{ width: '60px' }}
                                          />
                                        </td>
                                        <td className="text-end">{row.parcel_fee.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="table-active">
                                      <td colSpan={6} className="text-end fw-bold">합계</td>
                                      <td className="text-center fw-bold">{exportRows.reduce((sum, row) => sum + row.parcel_quantity, 0)}</td>
                                      <td className="text-end fw-bold">{exportRows.reduce((sum, row) => sum + row.parcel_fee, 0).toLocaleString()}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                            <div className="modal-footer">
                              <button type="button" className="btn btn-secondary" onClick={() => setShowExportDialog(false)}>
                                취소
                              </button>
                              <button type="button" className="btn btn-primary" onClick={handleConfirmExport}>
                                다운로드
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 상품페이지작성 탭 */}
                {activeTab === 'product-page' && (
                  <div>
                    <div className="mb-4">
                      <div className="alert alert-info">
                        <h4 className="alert-title">상품페이지 작성 안내</h4>
                        <div className="text-muted">
                          • 텍스트와 이미지를 조합하여 상품페이지를 작성할 수 있습니다.<br />
                          • + 버튼을 클릭하여 새로운 행을 추가하세요.<br />
                          • 복사 버튼을 클릭하여 텍스트를 쉽게 복사할 수 있습니다.
                        </div>
                      </div>
                    </div>

                    {/* 상품페이지 행 목록 */}
                    {productPageRows.map((row, index) => (
                      <div key={row.id} className="card mb-3">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="card-title mb-0">행 {index + 1}</h4>
                            {productPageRows.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => removeProductPageRow(row.id)}
                              >
                                삭제
                              </button>
                            )}
                          </div>

                          {/* 텍스트 입력 */}
                          <div className="mb-3">
                            <label className="form-label">텍스트</label>
                            <div className="input-group">
                              <textarea
                                className="form-control"
                                rows={3}
                                placeholder="텍스트를 입력하세요..."
                                value={row.text}
                                onChange={(e) => updateProductPageRowText(row.id, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => copyTextToClipboard(row.text)}
                                disabled={!row.text.trim()}
                                title="텍스트 복사"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                  <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                                  <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"></path>
                                </svg>
                                복사
                              </button>
                            </div>
                          </div>

                          {/* 이미지 업로드 */}
                          <div className="mb-3">
                            <label className="form-label">이미지</label>
                            <div className="row g-3">
                              {/* 이미지 미리보기 (이미지가 있을 때만) */}
                              {row.image && (
                                <div className="col-md-6">
                                  <div className="card h-100">
                                    <img
                                      src={URL.createObjectURL(row.image)}
                                      alt={`row-${row.id}-preview`}
                                      className="card-img-top"
                                      style={{ height: '200px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                                    />
                                    <div className="card-body">
                                      <p className="card-text mb-1">
                                        <strong>파일명:</strong> {row.image.name}
                                      </p>
                                      <p className="card-text mb-0">
                                        <strong>크기:</strong> {(row.image.size / 1024).toFixed(2)} KB
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 업로드 박스 */}
                              <div className={row.image ? 'col-md-6' : 'col-12'}>
                                <div
                                  onDragOver={(e) => handleProductPageDragOver(e, row.id)}
                                  onDragLeave={(e) => handleProductPageDragLeave(e, row.id)}
                                  onDrop={(e) => handleProductPageDrop(e, row.id)}
                                  onClick={() => {
                                    const input = document.getElementById(`file-input-${row.id}`) as HTMLInputElement;
                                    input?.click();
                                  }}
                                  className={`border rounded text-center cursor-pointer h-100 d-flex flex-column justify-content-center ${
                                    isProductPageDragging[row.id] ? 'border-primary bg-primary-lt' : 'border-secondary'
                                  }`}
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: isProductPageDragging[row.id] ? '#f0f7ff' : '#f8f9fa',
                                    minHeight: row.image ? '280px' : '150px',
                                    padding: '1rem'
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="mb-2 mx-auto"
                                    style={{ color: isProductPageDragging[row.id] ? '#0054a6' : '#a8abaeff' }}
                                  >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                  </svg>
                                  <p className="mb-1 fw-bold">
                                    {isProductPageDragging[row.id] ? 'Drop Here!' : row.image ? '이미지 변경' : 'Click or Drag Image Here'}
                                  </p>
                                  <p className="text-muted small mb-0">
                                    PNG, JPG 등 모든 이미지 형식 지원
                                  </p>
                                  <input
                                    id={`file-input-${row.id}`}
                                    type="file"
                                    className="d-none"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      updateProductPageRowImage(row.id, file);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* + 버튼 */}
                    <div className="text-center">
                      <button
                        type="button"
                        className="btn btn-success btn-lg"
                        onClick={addProductPageRow}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        행 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 출력 모달 */}
      {showPrintModal && (
        <div 
          className="modal modal-blur fade show d-block" 
          id="printModal" 
          tabIndex={-1} 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999
          }}
        >
          <div 
            className="modal-dialog" 
            style={{
              maxWidth: '100vw',
              width: '100vw',
              height: '100vh',
              margin: 0,
              padding: '20px'
            }}
          >
            <div className="modal-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header no-print">
                <h5 className="modal-title">주문 출력</h5>
                <button type="button" className="btn-close" onClick={() => setShowPrintModal(false)}></button>
              </div>
              <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <tbody>
                      {(() => {
                        // 선택된 주문들을 order_date로 그룹화
                        const selectedOrders = orders.filter(order => selectedOrderIds.has(order.id));
                        
                        // 중복 제거 (혹시 모를 중복 데이터 방지 - order.id 기준)
                        const uniqueOrders = selectedOrders.reduce((acc, order) => {
                          if (!acc.find(o => o.id === order.id)) {
                            acc.push(order);
                          }
                          return acc;
                        }, [] as Order[]);

                        const groupedByDate = new Map<string, typeof uniqueOrders>();
                        
                        uniqueOrders.forEach(order => {
                          const dateKey = order.order_date || '';
                          if (!groupedByDate.has(dateKey)) {
                            groupedByDate.set(dateKey, []);
                          }
                          groupedByDate.get(dateKey)!.push(order);
                        });

                        // 값 정리 함수 (null, undefined, 'nan', 'null' 등을 공란으로)
                        const cleanValue = (value: any): string => {
                          if (value === null || value === undefined || value === '' || 
                              String(value).toLowerCase() === 'nan' || 
                              String(value).toLowerCase() === 'null') {
                            return '';
                          }
                          return String(value);
                        };

                        // 날짜별로 렌더링
                        return Array.from(groupedByDate.entries()).map(([orderDate, dateOrders], groupIndex) => {
                          const firstOrder = dateOrders[0];
                          
                          return (
                            <React.Fragment key={`group-${orderDate}-${groupIndex}`}>
                              {/* 그룹 헤더 (일자, 구매자, 수취인 정보) */}
                              <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <td colSpan={6} className="fw-bold p-3">
                                  <div className="row">
                                    <div className="col-md-4">
                                      <strong>주문일자:</strong> {cleanValue(firstOrder.order_date) || '-'}
                                    </div>
                                    <div className="col-md-4">
                                      <strong>구매자:</strong> {cleanValue(firstOrder.buyer_name) || '-'}
                                    </div>
                                    <div className="col-md-4">
                                      <strong>수취인:</strong> {getRecipientWithInitial(firstOrder.site, cleanValue(firstOrder.recipient_name) || '-')} / {cleanValue(firstOrder.phone) || '-'}
                                    </div>
                                  </div>
                                  <div className="row mt-2">
                                    <div className="col-12">
                                      <strong>주소:</strong> {cleanValue(firstOrder.address) || '-'}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* 상품 헤더 */}
                              <tr style={{ backgroundColor: '#e9ecef' }}>
                                <th style={{ width: '15%' }}>주문번호</th>
                                <th style={{ width: '30%' }}>상품명</th>
                                <th style={{ width: '7%' }}>수량</th>
                                <th style={{ width: '20%' }}>옵션</th>
                                <th style={{ width: '20%' }}>추가구성</th>
                                <th style={{ width: '8%' }}>금액</th>
                              </tr>

                              {/* 상품 행들 */}
                              {dateOrders.map(order => (
                                <tr key={order.id}>
                                  <td>{cleanValue(order.order_number) || ''}</td>
                                  <td>{cleanValue(order.product_name) || ''}</td>
                                  <td className="text-center">{order.quantity || ''}</td>                                  
                                  <td>{cleanValue(order.option) || ''}</td>
                                  <td>{cleanValue(order.additional_items) || ''}</td>
                                  <td className="text-end">{order.price ? `${order.price.toLocaleString()}원` : ''}</td>
                                </tr>
                              ))}
                              
                              {/* 그룹 구분선 */}
                              <tr>
                                <td colSpan={6} style={{ height: '20px', borderBottom: '3px solid #dee2e6' }}></td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer no-print">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>
                  닫기
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    window.print();
                  }}
                >
                  출력하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프린트용 스타일 */}
      <style>{`
        @media print {
          /* 페이지 기본 설정 */
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* 불필요한 요소 숨기기 */
          .navbar, .card-header, .btn, .form-control, .form-select,
          .nav-tabs, .modal, footer, header, .no-print, .btn-group {
            display: none !important;
          }

          /* 카드/컨테이너 스타일 초기화 */
          .container-xl, .page-wrapper, .page-body, .card, .card-body,
          .table-responsive {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          /* 테이블 기본 설정 */
          .card-table {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10pt;
            border-collapse: collapse;
          }

          /* 선택되지 않은 주문 숨기기 */
          .card-table tbody tr:not(.print-selected) {
            display: none !important;
          }

          /* 주소/메모 행 숨기기 (2행) */
          .card-table tbody tr.row-type-address {
            display: none !important;
          }

          /* 체크박스 숨기기 */
          .col-checkbox {
            display: none !important;
          }

          /* 상태 뱃지 숨기기 */
          .col-status {
            display: none !important;
          }

          .card-table td, .card-table th {
            padding: 4px 8px !important;
            border: 1px solid #000 !important;
          }

          .card-table tbody tr {
            page-break-inside: avoid;
          }

          /* 프린트 색상 유지 */
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* 페이지 여백 */
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

export default JSharp;
