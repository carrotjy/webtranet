import React, { useState, useEffect } from 'react';
import api, { customerAPI, serviceReportAPI, resourceAPI, authAPI, userAPI, sparePartsAPI, invoiceAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  id: number;
  company_name: string;
  contact_person: string;
  president: string;
  address: string;
}

interface Resource {
  id: number;
  category: string;
  serial_number: string;
  product_name: string;
  note?: string;
  updated_at?: string;
}

interface UsedPart {
  id?: number;
  part_name: string;
  part_number?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // 새로 추가된 필드들
  isFoundInDB?: boolean;
  searchMessage?: string;
  currentStock?: number;
  sparePart_id?: number;
}

interface TimeRecord {
  date: string;
  departure_time: string;
  work_start_time: string;
  work_end_time: string;
  travel_end_time: string;
  work_meal_time: string;
  travel_meal_time: string;
  calculated_work_time?: string;
  calculated_travel_time?: string;
}

interface InvoiceCode {
  id: number;
  code: string;
  description: string;
}

interface ServiceReport {
  id: number;
  report_number: string;
  customer_id: number;
  customer_name?: string;
  customer_address?: string;
  technician_id: number;
  technician_name?: string;
  support_technician_ids?: number[]; // 서비스 동행/지원 FSE들
  machine_model: string;
  machine_serial: string;
  symptom?: string;
  invoice_code_id?: number;
  invoice_code?: string;
  invoice_description?: string;
  details?: string;
  problem_description?: string;
  solution_description?: string;
  service_date?: string;
  status?: string;
  work_hours?: number;
  parts_used?: string;
  is_locked?: boolean;
  locked_by?: number;
  locked_at?: string;
  created_at?: string;
  updated_at?: string;
  used_parts?: UsedPart[];
  time_record?: TimeRecord;
}

interface FormData {
  customer_id: number;
  customer_name: string;
  customer_address: string;
  technician_id: number;
  technician_name: string;
  support_technician_ids: number[]; // 서비스 동행/지원 FSE들
  support_technician_names: string[]; // 서비스 동행/지원 FSE 이름들
  resource_id: number;
  machine_model: string;
  machine_serial: string;
  symptom: string;
  details: string;
  service_date: string;
  used_parts: UsedPart[];
  time_records: TimeRecord[];
  invoice_code_id?: number;
}

// 거래명세서 항목 타입
interface InvoiceLineItem {
  id: string;
  month: number;
  day: number;
  item_name: string;
  specification: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat: number;
  isNego?: boolean;
  isHeader?: boolean;  // 헤더 행 구분
  isBlank?: boolean;   // 빈 행 구분
  dateGroup: string; // 날짜 그룹핑용 (YYYY-MM-DD)
}

// 시간 계산 유틸리티 함수들
const parseTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  
  // HH:MM 형식인 경우 (예: "09:30")
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(s => parseInt(s, 10) || 0);
    return hours * 60 + minutes;
  }
  
  // HHMM 형식인 경우 (예: "0930")
  if (timeStr.length === 4) {
    const hours = parseInt(timeStr.substring(0, 2), 10);
    const minutes = parseInt(timeStr.substring(2, 4), 10);
    return hours * 60 + minutes;
  }
  
  return 0;
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// HH:MM 형식을 HHMM 형식으로 변환 (폼 입력용)
const convertToFormFormat = (timeStr: string): string => {
  if (!timeStr) return '';
  
  // 이미 HHMM 형식인 경우
  if (!timeStr.includes(':') && timeStr.length === 4) {
    return timeStr;
  }
  
  // HH:MM 형식인 경우 HHMM으로 변환
  if (timeStr.includes(':')) {
    return timeStr.replace(':', '');
  }
  
  return timeStr;
};

// HHMM 형식을 HH:MM 형식으로 변환 (표시용)
const convertToDisplayFormat = (timeStr: string): string => {
  if (!timeStr) return '';
  
  // 이미 HH:MM 형식인 경우
  if (timeStr.includes(':')) {
    return timeStr;
  }
  
  // HHMM 형식인 경우 HH:MM으로 변환
  if (timeStr.length === 4) {
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  }
  
  return timeStr;
};

// 서비스 리포트의 가장 최신 작업일자 Date 객체 가져오기 (정렬용)
const getLatestWorkDateObject = (report: ServiceReport): Date => {
  try {
    let dates: string[] = [];
    
    // service_date 추가
    if (report.service_date) {
      dates.push(report.service_date);
    }
    
    // time_records에서 날짜들 수집
    const timeRecords = (report as any).time_records;
    if (Array.isArray(timeRecords) && timeRecords.length > 0) {
      timeRecords.forEach(record => {
        if (record.date) {
          dates.push(record.date);
        } else if (record.work_date) {
          dates.push(record.work_date);
        }
      });
    } else if (report.time_record) {
      // 단일 time_record 처리
      const timeRecord = report.time_record as any;
      if (timeRecord.date) {
        dates.push(timeRecord.date);
      } else if (timeRecord.work_date) {
        dates.push(timeRecord.work_date);
      }
    }
    
    // 날짜가 없으면 created_at 사용
    if (dates.length === 0) {
      return new Date(report.created_at || '');
    }
    
    // 가장 최근 날짜 찾기
    const sortedDates = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return new Date(sortedDates[0]);
    
  } catch (error) {
    // 오류 발생 시 created_at 사용
    return new Date(report.created_at || '');
  }
};

// 서비스 리포트의 가장 최신 작업일자 문자열 가져오기 (표시용)
const getLatestWorkDate = (report: ServiceReport): string => {
  return getLatestWorkDateObject(report).toLocaleDateString('ko-KR');
};

const calculateWorkTime = (startTime: string, endTime: string, mealTime: string): string => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const meal = parseTime(mealTime);
  
  if (start >= end) return "00:00";
  
  const totalMinutes = end - start - meal;
  return totalMinutes > 0 ? formatTime(totalMinutes) : "00:00";
};

const calculateTravelTime = (departureTime: string, workStartTime: string, workEndTime: string, travelEndTime: string, mealTime: string): string => {
  const departure = parseTime(departureTime);
  const workStart = parseTime(workStartTime);
  const workEnd = parseTime(workEndTime);
  const travelEnd = parseTime(travelEndTime);
  const meal = parseTime(mealTime);
  
  const morningTravel = workStart - departure;
  const eveningTravel = travelEnd - workEnd;
  const totalTravel = morningTravel + eveningTravel - meal;
  
  return totalTravel > 0 ? formatTime(totalTravel) : "00:00";
};

const ServiceReports: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<ServiceReport | null>(null);
  
  // 폼 데이터 기본값 함수
  const getDefaultFormData = (codes?: InvoiceCode[]): FormData => {
    // 131-유상청구건 코드의 ID 찾기
    const defaultInvoiceCode = codes?.find(code => code.code === '131');
    const defaultInvoiceCodeId = defaultInvoiceCode?.id;
    
    return {
      customer_id: 0,
      customer_name: '',
      customer_address: '',
      technician_id: 1,
      technician_name: '현재 사용자', // TODO: 로그인 사용자 정보에서 가져오기
      support_technician_ids: [],
      support_technician_names: [],
      resource_id: 0,
      machine_model: '',
      machine_serial: '',
      symptom: '',
      details: '',
      service_date: new Date().toISOString().split('T')[0], // 오늘 날짜를 기본값으로
      used_parts: [],
      time_records: [],
      invoice_code_id: defaultInvoiceCodeId
    };
  };
  
  const [formData, setFormData] = useState<FormData>(getDefaultFormData());
  
  // 고객 관련 상태
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState('');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 정렬 관련 상태
  const [sortField, setSortField] = useState<'date' | 'sn' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // 보기 모달 관련 상태
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingReport, setViewingReport] = useState<ServiceReport | null>(null);
  
  // 리소스 관련 상태
  const [customerResources, setCustomerResources] = useState<Resource[]>([]);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  
  // 서비스 동행/지원 FSE 선택 관련 상태
  const [showSupportTechnicianDropdown, setShowSupportTechnicianDropdown] = useState(false);
  
  // 리소스 추가 모달 관련 상태
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [newResourceData, setNewResourceData] = useState({
    category: '',
    product_name: '',
    serial_number: '',
    note: ''
  });
  
  // 고객사 추가 모달 관련 상태
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    fax: '',
    president: '',
    mobile: '',
    contact: ''
  });
  
  // 기술부 직원 관련 상태
  const [technicians, setTechnicians] = useState<{id: number, name: string}[]>([]);
  const [currentUser, setCurrentUser] = useState<{id: number, name: string, department: string} | null>(null);
  
  // Invoice 코드 관련 상태
  const [invoiceCodes, setInvoiceCodes] = useState<InvoiceCode[]>([]);
  
  // 권한 확인 (관리자인지)
  const [isAdmin, setIsAdmin] = useState(false);

  // 거래명세서 생성 모달 관련 상태
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([]);
  const [sparePartSettings, setSparePartSettings] = useState<{
    marginRate: number;
    workTimePrice: number;
    travelTimePrice: number;
  }>({
    marginRate: 20,
    workTimePrice: 89000,
    travelTimePrice: 70000
  });

  // 리포트 상세보기 모달에서 청구가 표시용 상태
  const [partsWithBillingPrice, setPartsWithBillingPrice] = useState<any[]>([]);

  // 드래그 앤 드롭 관련 상태
  const [draggedItem, setDraggedItem] = useState<InvoiceLineItem | null>(null);
  const [dragOverDateGroup, setDragOverDateGroup] = useState<string | null>(null);

  // 부품 자동완성 관련 상태
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [activePartSearchIndex, setActivePartSearchIndex] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
    loadCustomers();
    loadCurrentUser();
    loadTechnicians();
    loadInvoiceCodes();
    checkAdminPermission();
  }, []);

  // viewingReport가 변경되면 청구가 계산
  useEffect(() => {
    const calculateBillingPrices = async () => {
      if (!viewingReport) {
        setPartsWithBillingPrice([]);
        return;
      }

      // used_parts 데이터 추출
      let partsData: any[] = [];
      const usedParts = viewingReport.used_parts as any;
      const partsUsed = (viewingReport as any).parts_used;

      if (Array.isArray(usedParts)) {
        partsData = usedParts;
      } else if (typeof usedParts === 'string' && usedParts.trim()) {
        partsData = [{
          part_name: usedParts,
          part_number: '-',
          quantity: '-',
          unit_price: 0,
          total_price: 0
        }];
      } else if (partsUsed && typeof partsUsed === 'string' && partsUsed.trim()) {
        partsData = [{
          part_name: partsUsed,
          part_number: '-',
          quantity: '-',
          unit_price: 0,
          total_price: 0
        }];
      }

      if (partsData.length === 0) {
        setPartsWithBillingPrice([]);
        return;
      }

      // 각 부품의 청구가 계산
      const updatedParts = await Promise.all(
        partsData.map(async (part) => {
          let billingPrice = 0;

          // 1. 부품번호가 있으면 스페어파트 DB에서 청구가 조회
          if (part.part_number && part.part_number !== '-') {
            try {
              const response = await sparePartsAPI.searchPartByNumber(part.part_number);
              if (response.data && response.data.billing_price_krw) {
                billingPrice = response.data.billing_price_krw;
              }
            } catch (error) {
              console.error('스페어파트 조회 실패:', error);
            }
          }

          // 2. 청구가가 없으면 구매가에 마진율 적용
          if (billingPrice === 0 && part.unit_price > 0) {
            billingPrice = Math.round(part.unit_price * (1 + sparePartSettings.marginRate / 100));
          }

          const quantity = typeof part.quantity === 'number' ? part.quantity : parseFloat(part.quantity) || 0;
          const totalBillingPrice = Math.round(billingPrice * quantity);

          return {
            ...part,
            billing_unit_price: billingPrice,
            billing_total_price: totalBillingPrice
          };
        })
      );

      setPartsWithBillingPrice(updatedParts);
    };

    calculateBillingPrices();
  }, [viewingReport, sparePartSettings.marginRate]);

  // 인보이스 코드 로드 후 기본값 업데이트
  useEffect(() => {
    if (invoiceCodes.length > 0 && formData.invoice_code_id === undefined) {
      const defaultInvoiceCode = invoiceCodes.find(code => code.code === '131');
      if (defaultInvoiceCode) {
        setFormData(prev => ({
          ...prev,
          invoice_code_id: defaultInvoiceCode.id
        }));
      }
    }
  }, [invoiceCodes]);

  // 검색 결과 외부 클릭 시 숨기기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showCustomerSearch && !target.closest('.position-relative')) {
        setShowCustomerSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerSearch]);

  // 서비스 동행/지원 드롭다운 외부 클릭 시 숨기기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSupportTechnicianDropdown && !target.closest('.position-relative')) {
        setShowSupportTechnicianDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSupportTechnicianDropdown]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await serviceReportAPI.getServiceReports();
      
      // API 응답에서 reports 배열 추출
      const reportData = response.data?.reports || [];
      setReports(Array.isArray(reportData) ? reportData : []);
    } catch (error) {
      console.error('서비스 리포트 로딩 실패:', error);
      setReports([]); // 오류 시 빈 배열로 초기화
    } finally {
      setLoading(false);
    }
  };

  // 검색어 클리어 함수
  const handleSearchClear = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getCustomers();
      // API 응답에서 customers 배열 추출
      const customerData = response.data?.customers || [];
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (error) {
      console.error('고객 로딩 실패:', error);
      setCustomers([]); // 오류 시 빈 배열로 초기화
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.data?.user;
      if (userData) {
        setCurrentUser({
          id: userData.id,
          name: userData.name,
          department: userData.department
        });
        
        // 로그인한 사용자가 기술부인 경우 자동으로 서비스담당자로 설정
        if (userData.department === '기술부') {
          setFormData(prev => ({ ...prev, technician_name: userData.name }));
        }
      }
    } catch (error) {
      console.error('현재 사용자 정보 로딩 실패:', error);
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await userAPI.getTechnicians();
      const technicianData = response.data?.technicians || [];
      setTechnicians(Array.isArray(technicianData) ? technicianData : []);
    } catch (error) {
      console.error('기술부 직원 목록 로딩 실패:', error);
    }
  };

  // Invoice 코드 목록 로드
  const loadInvoiceCodes = async () => {
    try {
      const response = await api.get('/api/invoice-codes');
      const invoiceData = response.data?.invoice_codes || [];
      setInvoiceCodes(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (error) {
      console.error('Invoice 코드 로딩 실패:', error);
      setInvoiceCodes([]);
    }
  };

  // 관리자 권한 확인
  const checkAdminPermission = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.data?.user;
      setIsAdmin(userData?.is_admin || false);
    } catch (error) {
      console.error('사용자 권한 확인 실패:', error);
      setIsAdmin(false);
    }
  };

  // 전체 고객 리스트 표시 함수
  const showAllCustomers = async () => {
    try {
      console.log('ServiceReports showAllCustomers: API 호출 시작');
      const response = await customerAPI.getCustomers();
      console.log('ServiceReports showAllCustomers: API 응답:', response.data);
      
      const allCustomers = response.data?.customers || response.data || [];
      console.log('ServiceReports showAllCustomers: 추출된 고객 수:', allCustomers.length);
      
      setCustomerSearchResults(allCustomers); // 제한 없이 모든 고객 표시
      setShowCustomerSearch(true); // 항상 드롭다운을 표시 (새 고객사 추가 옵션 때문에)
    } catch (error) {
      console.error('고객 리스트 로딩 실패:', error);
      // API 실패 시 로컬 customers 배열 사용
      console.log('ServiceReports showAllCustomers: 로컬 customers 배열 사용, 수:', customers.length);
      setCustomerSearchResults(customers);
      setShowCustomerSearch(true); // 항상 드롭다운을 표시 (새 고객사 추가 옵션 때문에)
    }
  };

  // 고객 검색 함수 - API를 통해 전체 고객 리스트에서 검색
  const searchCustomers = async (searchTerm: string) => {
    if (searchTerm.length < 1) {
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
      return;
    }

    try {
      // API를 통해 전체 고객 리스트에서 검색
      const response = await customerAPI.getCustomers();
      const allCustomers = response.data?.customers || response.data || [];
      
      const filteredCustomers = allCustomers.filter((customer: Customer) =>
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      ); // 제한 없이 모든 검색 결과 표시
      
      setCustomerSearchResults(filteredCustomers);
      setShowCustomerSearch(true); // 검색 결과가 없어도 드롭다운을 표시 (새 고객사 추가 옵션 때문에)
    } catch (error) {
      console.error('고객 검색 실패:', error);
      // API 실패 시 로컬 customers 배열에서 검색
      const filteredCustomers = customers.filter(customer =>
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setCustomerSearchResults(filteredCustomers);
      setShowCustomerSearch(true); // 검색 결과가 없어도 드롭다운을 표시 (새 고객사 추가 옵션 때문에)
    }
  };

  // 고객 선택 시 리소스 통합 (핵심 기능)
  const handleSelectCustomer = async (customer: Customer) => {
    try {
      setFormData(prev => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.company_name,
        customer_address: customer.address || '',
        resource_id: 0,
        machine_model: '',
        machine_serial: ''
      }));

      const resourceResponse = await resourceAPI.getResources(customer.id);
      console.log('고객 선택: 리소스 API 응답:', resourceResponse.data);
      
      const resourceData = resourceResponse.data?.resources || resourceResponse.data || [];
      console.log('고객 선택: 추출된 리소스 수:', resourceData.length);
      console.log('고객 선택: 리소스 데이터:', resourceData);
      
      setCustomerResources(Array.isArray(resourceData) ? resourceData : []);
      setShowCustomerSearch(false);
      setCustomerSearchResults([]);

      // 가장 최근 리소스를 기본 선택
      if (Array.isArray(resourceData) && resourceData.length > 0) {
        const latestResource = resourceData
          .sort((a: Resource, b: Resource) => 
            new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime()
          )[0];

        setFormData(prev => ({
          ...prev,
          resource_id: latestResource.id,
          machine_model: latestResource.product_name || '',
          machine_serial: latestResource.serial_number || ''
        }));
      }
    } catch (error) {
      console.error('리소스 로딩 실패:', error);
      setShowCustomerSearch(false);
    }
  };

  // 리소스 선택 함수
  const handleSelectResource = (resource: Resource) => {
    setFormData(prev => ({
      ...prev,
      resource_id: resource.id,
      machine_model: resource.product_name || '',
      machine_serial: resource.serial_number || ''
    }));
  };

  // 서비스 동행/지원 FSE 추가
  const handleAddSupportTechnician = (technician: any) => {
    // 이미 선택된 FSE인지 확인
    if (formData.support_technician_ids.includes(technician.id)) {
      alert('이미 선택된 FSE입니다.');
      return;
    }
    
    // 주 담당 FSE와 같은지 확인
    if (formData.technician_id === technician.id) {
      alert('주 담당 FSE와 동일한 사람은 선택할 수 없습니다.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      support_technician_ids: [...prev.support_technician_ids, technician.id],
      support_technician_names: [...prev.support_technician_names, technician.name]
    }));
    setShowSupportTechnicianDropdown(false);
  };

  // 서비스 동행/지원 FSE 제거
  const handleRemoveSupportTechnician = (technicianId: number) => {
    const index = formData.support_technician_ids.indexOf(technicianId);
    if (index > -1) {
      const newIds = [...formData.support_technician_ids];
      const newNames = [...formData.support_technician_names];
      newIds.splice(index, 1);
      newNames.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        support_technician_ids: newIds,
        support_technician_names: newNames
      }));
    }
  };

  // 고객사 추가 모달 열기
  const handleAddCustomer = () => {
    setNewCustomerData({
      company_name: formData.customer_name || '', // 검색 중이던 텍스트를 기본값으로 사용
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      postal_code: '',
      fax: '',
      president: '',
      mobile: '',
      contact: ''
    });
    setShowAddCustomerModal(true);
    setShowCustomerSearch(false); // 검색 드롭다운 닫기
  };

  // 새 고객사 저장
  const handleSaveNewCustomer = async () => {
    try {
      if (!newCustomerData.company_name.trim()) {
        alert('회사명을 입력해주세요.');
        return;
      }
      
      if (!newCustomerData.contact_person.trim()) {
        alert('담당자명을 입력해주세요.');
        return;
      }

      const customerData = {
        company_name: newCustomerData.company_name.trim(),
        contact_person: newCustomerData.contact_person.trim(),
        email: newCustomerData.email.trim(),
        phone: newCustomerData.phone.trim(),
        address: newCustomerData.address.trim(),
        postal_code: newCustomerData.postal_code.trim(),
        fax: newCustomerData.fax.trim(),
        president: newCustomerData.president.trim(),
        mobile: newCustomerData.mobile.trim(),
        contact: newCustomerData.contact.trim()
      };

      const response = await customerAPI.createCustomer(customerData);

      if (response.data) {
        alert('고객사가 성공적으로 추가되었습니다.');
        setShowAddCustomerModal(false);

        // 고객 목록 새로고침
        await loadCustomers();

        // 새로 추가된 고객을 자동 선택
        const newCustomer = response.data.customer || response.data;
        if (newCustomer) {
          handleSelectCustomer(newCustomer);
        }

        // 모달 데이터 초기화
        setNewCustomerData({
          company_name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          postal_code: '',
          fax: '',
          president: '',
          mobile: '',
          contact: ''
        });
      }
    } catch (error: any) {
      console.error('고객사 추가 실패:', error);
      
      let errorMessage = '고객사 추가에 실패했습니다.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = `오류: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 리소스 추가 모달 열기
  const handleAddResource = () => {
    if (!formData.customer_id) {
      alert('먼저 고객사를 선택해주세요.');
      return;
    }
    setNewResourceData({
      category: '',
      product_name: '',
      serial_number: '',
      note: ''
    });
    setShowAddResourceModal(true);
  };

  // 새 리소스 저장
  const handleSaveNewResource = async () => {
    if (!newResourceData.category || !newResourceData.product_name || !newResourceData.serial_number) {
      alert('카테고리, 제품명, 시리얼번호는 필수 항목입니다.');
      return;
    }

    try {
      const resourceData = {
        ...newResourceData,
        customer_id: formData.customer_id
      };

      const response = await resourceAPI.createResource(resourceData);
      
      if (response.data) {
        alert('리소스가 성공적으로 추가되었습니다.');
        setShowAddResourceModal(false);
        
        // 고객의 리소스 목록 새로고침
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          const resourceResponse = await resourceAPI.getResources(customer.id);
          const resourceData = resourceResponse.data?.resources || resourceResponse.data || [];
          setCustomerResources(Array.isArray(resourceData) ? resourceData : []);
          
          // 새로 추가된 리소스를 자동 선택
          const newResource = response.data.resource || response.data;
          if (newResource) {
            handleSelectResource(newResource);
          }
        }
      }
    } catch (error) {
      console.error('리소스 추가 실패:', error);
      alert('리소스 추가에 실패했습니다.');
    }
  };

  // 사용부품 관련 함수들 (핵심 기능)
  const addUsedPart = () => {
    const newPart: UsedPart = {
      part_name: '',
      part_number: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      isFoundInDB: undefined,
      searchMessage: '',
      currentStock: undefined,
      sparePart_id: undefined
    };
    setFormData(prev => ({
      ...prev,
      used_parts: [...prev.used_parts, newPart]
    }));
  };

  const removeUsedPart = (index: number) => {
    if (window.confirm('이 부품 항목을 삭제하시겠습니까?')) {
      setFormData(prev => ({
        ...prev,
        used_parts: prev.used_parts.filter((_, i) => i !== index)
      }));
    }
  };

  const updateUsedPart = async (index: number, field: keyof UsedPart, value: string | number) => {
    console.log('updateUsedPart 호출됨:', { index, field, value });
    setFormData(prev => {
      const updatedParts = [...prev.used_parts];
      updatedParts[index] = { ...updatedParts[index], [field]: value };
      
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? Number(value) : updatedParts[index].quantity;
        const unitPrice = field === 'unit_price' ? Number(value) : updatedParts[index].unit_price;
        updatedParts[index].total_price = quantity * unitPrice;
      }
      
      return { ...prev, used_parts: updatedParts };
    });

    // 파트번호가 입력되면 자동으로 부품 검색
    if (field === 'part_number' && value && typeof value === 'string') {
      console.log('부품번호 입력됨:', value);
      await searchPartByNumber(index, value);
    }
  };

  // 파트번호로 부품 검색 (자동완성용)
  const searchPartByNumber = async (index: number, partNumber: string) => {
    console.log('searchPartByNumber 호출됨:', partNumber);

    // 검색어가 비어있으면 결과 초기화
    if (!partNumber || partNumber.length < 1) {
      setPartSearchResults([]);
      setActivePartSearchIndex(null);
      return;
    }

    try {
      console.log('API 호출 시작');
      const response = await sparePartsAPI.searchPartByNumber(partNumber);
      console.log('API 응답:', response.data);

      if (response.data.success && response.data.spare_parts) {
        // 검색 결과를 state에 저장하고 드롭다운 활성화
        setPartSearchResults(response.data.spare_parts);
        setActivePartSearchIndex(index);
      } else {
        setPartSearchResults([]);
        setActivePartSearchIndex(null);
      }
    } catch (error) {
      console.error('부품 검색 중 오류:', error);
      console.error('오류 상세:', (error as any)?.response?.data);
      setPartSearchResults([]);
      setActivePartSearchIndex(null);
    }
  };

  // 자동완성에서 부품 선택
  const selectPartFromAutocomplete = (index: number, part: any) => {
    setFormData(prev => {
      const updatedParts = [...prev.used_parts];
      updatedParts[index] = {
        ...updatedParts[index],
        part_number: part.part_number,
        part_name: part.part_name,
        unit_price: part.charge_price || 0,
        total_price: updatedParts[index].quantity * (part.charge_price || 0),
        isFoundInDB: true,
        currentStock: part.stock_quantity,
        sparePart_id: part.id,
        searchMessage: `현재 재고: ${part.stock_quantity}개`
      };
      return { ...prev, used_parts: updatedParts };
    });

    // 드롭다운 닫기
    setPartSearchResults([]);
    setActivePartSearchIndex(null);
  };

  // 시간 기록 관련 함수들 (새로운 테이블 형태)
  const addTimeRecord = () => {
    const newTimeRecord: TimeRecord = {
      date: new Date().toISOString().split('T')[0],
      departure_time: '',
      work_start_time: '',
      work_end_time: '',
      travel_end_time: '',
      work_meal_time: '',
      travel_meal_time: '',
    };
    setFormData(prev => ({
      ...prev,
      time_records: [...prev.time_records, newTimeRecord]
    }));
  };

  const removeTimeRecord = (index: number) => {
    if (window.confirm('이 시간 기록을 삭제하시겠습니까?')) {
      setFormData(prev => ({
        ...prev,
        time_records: prev.time_records.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTimeRecord = (index: number, field: keyof TimeRecord, value: string) => {
    setFormData(prev => {
      const updatedRecords = [...prev.time_records];
      updatedRecords[index] = { ...updatedRecords[index], [field]: value };
      
      // 계산된 시간 업데이트
      const record = updatedRecords[index];
      if (field === 'work_start_time' || field === 'work_end_time' || field === 'work_meal_time') {
        record.calculated_work_time = calculateWorkTime(
          record.work_start_time,
          record.work_end_time,
          record.work_meal_time
        );
      }
      
      if (field === 'departure_time' || field === 'work_start_time' || field === 'work_end_time' || 
          field === 'travel_end_time' || field === 'travel_meal_time') {
        record.calculated_travel_time = calculateTravelTime(
          record.departure_time,
          record.work_start_time,
          record.work_end_time,
          record.travel_end_time,
          record.travel_meal_time
        );
      }
      
      return { ...prev, time_records: updatedRecords };
    });
  };

  // 스페어파트 설정 로드
  const loadSparePartSettings = async () => {
    try {
      const response = await api.get('/api/admin/spare-part-settings');
      if (response.data.success) {
        setSparePartSettings({
          marginRate: response.data.data.marginRate || 20,
          workTimePrice: response.data.data.workTimePrice || 89000,
          travelTimePrice: response.data.data.travelTimePrice || 70000
        });
      }
    } catch (error) {
      console.error('스페어파트 설정 로드 실패:', error);
    }
  };

  // 거래명세서 생성 모달 열기
  const handleCreateInvoice = async (serviceReportId: number) => {
    try {
      setLoading(true);

      // 스페어파트 설정 로드
      await loadSparePartSettings();

      // viewingReport에서 데이터 추출
      if (!viewingReport) {
        alert('리포트 정보를 불러올 수 없습니다.');
        return;
      }

      // 거래명세서 항목 생성
      const lineItems = await generateInvoiceLineItems(viewingReport);
      setInvoiceLineItems(lineItems);

      // 모달 표시
      setShowInvoiceModal(true);
      setShowViewModal(false);

    } catch (error: any) {
      console.error('거래명세서 생성 준비 실패:', error);
      alert('거래명세서 생성 준비에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 거래명세서 항목 생성 로직
  const generateInvoiceLineItems = async (report: ServiceReport): Promise<InvoiceLineItem[]> => {
    const items: InvoiceLineItem[] = [];

    // 시간 기록에서 일자별 항목 생성
    const timeRecords = (report as any).time_records || [];
    const dateGroups = new Map<string, {workHours: number, travelHours: number}>();

    // 일자별로 시간 집계
    timeRecords.forEach((record: TimeRecord) => {
      const date = record.date;
      if (!date) return;

      const workHours = record.calculated_work_time ? parseFloat(record.calculated_work_time) : 0;
      const travelHours = record.calculated_travel_time ? parseFloat(record.calculated_travel_time) : 0;

      if (dateGroups.has(date)) {
        const existing = dateGroups.get(date)!;
        existing.workHours += workHours;
        existing.travelHours += travelHours;
      } else {
        dateGroups.set(date, { workHours, travelHours });
      }
    });

    // 날짜별로 정렬
    const sortedDates = Array.from(dateGroups.keys()).sort();

    // 각 날짜별로 항목 생성
    sortedDates.forEach((dateStr, dateIndex) => {
      const dateObj = new Date(dateStr);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const timeData = dateGroups.get(dateStr)!;

      // 이전 날짜와 다르면 빈 행 추가
      if (dateIndex > 0) {
        items.push({
          id: `blank-${dateStr}`,
          month: 0,
          day: 0,
          item_name: '',
          specification: '',
          quantity: 0,
          unit_price: 0,
          total_price: 0,
          vat: 0,
          isBlank: true,
          dateGroup: dateStr
        });
      }

      // 헤더 행: 1. 서비스 비용
      items.push({
        id: `header-service-${dateStr}`,
        month,
        day,
        item_name: '1. 서비스 비용',
        specification: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
        vat: 0,
        isHeader: true,
        dateGroup: dateStr
      });

      // 작업시간 항목
      const workQuantity = Math.round(timeData.workHours * 10) / 10;
      const workUnitPrice = sparePartSettings.workTimePrice;
      const workTotalPrice = Math.round(workQuantity * workUnitPrice);
      const workVat = Math.round(workTotalPrice * 0.1);

      items.push({
        id: `work-${dateStr}`,
        month: 0,  // 헤더 다음 행은 월/일 표시 안 함
        day: 0,
        item_name: '작업시간',
        specification: '1인 1시간',
        quantity: workQuantity,
        unit_price: workUnitPrice,
        total_price: workTotalPrice,
        vat: workVat,
        dateGroup: dateStr
      });

      // 이동시간 항목
      const travelQuantity = Math.round(timeData.travelHours * 10) / 10;
      const travelUnitPrice = sparePartSettings.travelTimePrice;
      const travelTotalPrice = Math.round(travelQuantity * travelUnitPrice);
      const travelVat = Math.round(travelTotalPrice * 0.1);

      items.push({
        id: `travel-${dateStr}`,
        month: 0,
        day: 0,
        item_name: '이동시간',
        specification: '1시간',
        quantity: travelQuantity,
        unit_price: travelUnitPrice,
        total_price: travelTotalPrice,
        vat: travelVat,
        dateGroup: dateStr
      });
    });

    // 부품 항목 추가
    if (report.used_parts && report.used_parts.length > 0) {
      // 헤더 행: 2. 부품 비용
      const lastDate = sortedDates[sortedDates.length - 1] || '';
      items.push({
        id: `header-parts`,
        month: 0,
        day: 0,
        item_name: '2. 부품 비용',
        specification: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
        vat: 0,
        isHeader: true,
        dateGroup: lastDate ? `${lastDate}-header-parts` : 'header-parts'
      });

      for (const part of report.used_parts) {
        let unitPrice = 0;

        // 파트번호가 있는 경우 스페어파트에서 청구가 조회
        if (part.part_number) {
          try {
            const response = await sparePartsAPI.searchPartByNumber(part.part_number);
            if (response.data && response.data.billing_price_krw) {
              unitPrice = response.data.billing_price_krw;
            } else {
              console.warn(`파트번호 ${part.part_number}의 청구가가 없습니다.`);
            }
          } catch (error) {
            console.error('스페어파트 조회 실패:', error);
          }
        }

        // 파트번호가 없거나 청구가를 못찾은 경우, FSE가 입력한 구매가 + 마진율로 계산
        if (unitPrice === 0 && part.unit_price > 0) {
          unitPrice = Math.round(part.unit_price * (1 + sparePartSettings.marginRate / 100));
        }

        const totalPrice = Math.round(unitPrice * part.quantity);
        const vat = Math.round(totalPrice * 0.1);

        items.push({
          id: `part-${part.id || Math.random()}`,
          month: 0,
          day: 0,
          item_name: part.part_name,
          specification: part.part_number || '',
          quantity: part.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          vat,
          dateGroup: lastDate ? `${lastDate}-header-parts` : 'header-parts'
        });
      }
    }

    return items;
  };

  // 항목 업데이트 함수
  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setInvoiceLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // 수량이나 단가가 변경되면 합계와 부가세 자동 계산
        if (field === 'quantity' || field === 'unit_price') {
          const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
          const price = field === 'unit_price' ? parseInt(value) || 0 : item.unit_price;
          updated.total_price = Math.round(qty * price);
          updated.vat = Math.round(updated.total_price * 0.1);
        }

        return updated;
      }
      return item;
    }));
  };

  // 네고 항목 추가
  const addNegoItem = (afterDateGroup: string) => {
    const negoItem: InvoiceLineItem = {
      id: `nego-${Date.now()}`,
      month: 0,  // 같은 dateGroup 내에서는 월/일 표시 안 함
      day: 0,
      item_name: 'NEGO',
      specification: '1시간',
      quantity: 0,
      unit_price: 0,
      total_price: 0,
      vat: 0,
      isNego: true,
      dateGroup: afterDateGroup
    };

    // 해당 날짜 그룹 뒤에 삽입
    setInvoiceLineItems(prev => {
      const newItems = [...prev];
      const lastIndexOfGroup = newItems.map((item, idx) =>
        item.dateGroup === afterDateGroup ? idx : -1
      ).filter(idx => idx !== -1).pop();

      if (lastIndexOfGroup !== undefined) {
        newItems.splice(lastIndexOfGroup + 1, 0, negoItem);
      } else {
        newItems.push(negoItem);
      }

      return newItems;
    });
  };

  // 네고 항목 삭제
  const removeNegoItem = (id: string) => {
    setInvoiceLineItems(prev => prev.filter(item => item.id !== id));
  };

  // 드래그 시작 (부품 비용 헤더를 드래그)
  const handleDragStart = (e: React.DragEvent, item: InvoiceLineItem) => {
    console.log('=== DRAG START ===');
    console.log('드래그 시작 항목:', item);

    // "2. 부품 비용" 헤더만 드래그 가능
    if (!item.isHeader || item.item_name !== '2. 부품 비용') {
      console.log('드래그 불가: 부품 비용 헤더가 아님');
      e.preventDefault();
      return;
    }

    console.log('드래그 가능: 부품 비용 헤더');
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 드래그 오버 (날짜 그룹 위로 드래그)
  const handleDragOver = (e: React.DragEvent, dateGroup: string) => {
    e.preventDefault();

    // 부품 헤더 그룹이 아닌 경우에만 드롭 영역으로 설정
    if (!dateGroup.includes('header-parts')) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverDateGroup(dateGroup);
    }
  };

  // 드래그 떠남
  const handleDragLeave = () => {
    setDragOverDateGroup(null);
  };

  // 드롭 (부품 비용 헤더와 그 아래 모든 부품들을 다른 날짜 그룹으로 이동)
  const handleDrop = (e: React.DragEvent, targetDateGroup: string) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('=== DROP 이벤트 발생 ===');
    console.log('draggedItem:', draggedItem);
    console.log('targetDateGroup:', targetDateGroup);

    if (!draggedItem || !targetDateGroup || targetDateGroup.includes('header-parts')) {
      console.log('드롭 취소: 조건 미충족');
      setDraggedItem(null);
      setDragOverDateGroup(null);
      return;
    }

    // 부품 비용 헤더와 그 아래 모든 부품 항목들을 새로운 날짜 그룹으로 이동
    setInvoiceLineItems(prev => {
      const newItems = [...prev];

      // 드래그된 부품 헤더의 dateGroup (반드시 header-parts를 포함해야 함)
      let draggedHeaderGroup = draggedItem.dateGroup;
      console.log('원본 draggedHeaderGroup:', draggedHeaderGroup);

      // dateGroup이 header-parts를 포함하지 않으면 추가
      if (draggedHeaderGroup && !draggedHeaderGroup.includes('header-parts')) {
        draggedHeaderGroup = `${draggedHeaderGroup}-header-parts`;
        console.log('수정된 draggedHeaderGroup:', draggedHeaderGroup);
      }

      if (!draggedHeaderGroup) {
        console.log('드래그된 헤더 그룹 없음');
        return prev;
      }

      // 해당 헤더 그룹에 속한 모든 항목들 찾기 (헤더 + 부품들)
      const itemsToMove = newItems.filter(item => item.dateGroup === draggedHeaderGroup);
      console.log('이동할 항목 수:', itemsToMove.length);
      console.log('이동할 항목들:', itemsToMove.map(i => i.item_name));

      if (itemsToMove.length === 0) {
        console.log('이동할 항목 없음');
        return prev;
      }

      // 원본 위치에서 제거
      const filteredItems = newItems.filter(item => item.dateGroup !== draggedHeaderGroup);
      console.log('제거 후 항목 수:', filteredItems.length);

      // 타겟 날짜 그룹의 마지막 위치 찾기
      const targetDateIndices = filteredItems
        .map((item, idx) => item.dateGroup === targetDateGroup ? idx : -1)
        .filter(idx => idx !== -1);

      const insertPosition = targetDateIndices.length > 0
        ? Math.max(...targetDateIndices) + 1
        : filteredItems.length;

      console.log('삽입 위치:', insertPosition);

      // 새로운 dateGroup 설정
      const newPartsHeaderGroup = `${targetDateGroup}-header-parts`;
      console.log('새로운 부품 헤더 그룹:', newPartsHeaderGroup);

      // 모든 항목의 dateGroup 업데이트
      const updatedItemsToMove = itemsToMove.map(item => ({
        ...item,
        dateGroup: newPartsHeaderGroup
      }));

      // 타겟 위치에 삽입
      filteredItems.splice(insertPosition, 0, ...updatedItemsToMove);
      console.log('최종 항목 수:', filteredItems.length);

      return filteredItems;
    });

    setDraggedItem(null);
    setDragOverDateGroup(null);
  };

  // 드래그 끝
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverDateGroup(null);
  };

  // 최종 거래명세서 생성
  const handleFinalizeInvoice = async () => {
    try {
      if (!viewingReport) {
        alert('리포트 정보를 찾을 수 없습니다.');
        return;
      }

      setLoading(true);

      // 고객사 정보 찾기
      const customer = customers.find(c => c.company_name === viewingReport.customer_name);
      const customerAny = customer as any; // 타입 확장을 위해 any로 캐스팅

      // 1. Excel/PDF 파일 생성 (기존 로직)
      const response = await api.post('/api/generate-invoice', {
        customer_name: viewingReport.customer_name,
        service_date: viewingReport.service_date,
        customer_info: {
          company_name: viewingReport.customer_name,
          address: customer?.address || viewingReport.customer_address || '',
          phone: customerAny?.phone || '',
          fax: customerAny?.fax || ''
        },
        items: invoiceLineItems.map(item => ({
          month: item.month,
          day: item.day,
          item_name: item.item_name,
          specification: item.specification,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          vat: item.vat
        }))
      });

      // 2. DB에 거래명세서 저장 (신규 기능)
      try {
        // 거래명세서 항목별 소계 계산
        let work_subtotal = 0;
        let travel_subtotal = 0;
        let parts_subtotal = 0;

        // 거래명세서 항목을 DB 형식으로 변환
        const dbItems = invoiceLineItems
          .filter(item => !item.isHeader && !item.isBlank) // 헤더와 빈 행 제외
          .map(item => {
            let item_type = 'parts'; // 기본값을 parts로 변경

            // nego 항목 확인 (isNego 필드 또는 마이너스 금액)
            const isNego = item.isNego || item.total_price < 0;

            // 항목명으로 타입 구분
            if (isNego) {
              item_type = 'nego';
              // nego는 원래 마이너스 금액이므로 그대로 더함 (마이너스 효과)
              if (item.item_name.includes('작업')) {
                work_subtotal += item.total_price;
              } else if (item.item_name.includes('출장') || item.item_name.includes('이동')) {
                travel_subtotal += item.total_price;
              } else {
                parts_subtotal += item.total_price;
              }
            } else if (item.item_name.includes('작업')) {
              item_type = 'work';
              work_subtotal += item.total_price;
            } else if (item.item_name.includes('출장') || item.item_name.includes('이동')) {
              item_type = 'travel';
              travel_subtotal += item.total_price;
            } else {
              item_type = 'parts';
              parts_subtotal += item.total_price;
            }

            return {
              item_type,
              description: item.specification || item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              month: item.month,
              day: item.day,
              item_name: item.item_name,
              part_number: '' // 서비스 리포트에서는 부품번호가 없음
            };
          });

        const total_amount = work_subtotal + travel_subtotal + parts_subtotal;
        const vat_amount = total_amount * 0.1;
        const grand_total = total_amount + vat_amount;

        const invoiceData = {
          service_report_id: viewingReport.id,
          customer_id: customer?.id,
          customer_name: viewingReport.customer_name,
          customer_address: customer?.address || viewingReport.customer_address || '',
          issue_date: new Date().toISOString().split('T')[0],
          work_subtotal,
          travel_subtotal,
          parts_subtotal,
          total_amount,
          vat_amount,
          grand_total,
          items: dbItems
        };

        await invoiceAPI.createInvoice(invoiceData);
        console.log('거래명세서가 DB에 저장되었습니다.');
      } catch (dbError: any) {
        console.error('DB 저장 실패:', dbError);
        // DB 저장 실패는 경고만 하고 계속 진행
        console.warn('거래명세서 DB 저장에 실패했지만 파일 생성은 계속 진행합니다.');
      }

      if (response.data.success) {
        // PDF가 성공적으로 생성되었으면 새 창에서 열기
        if (response.data.pdf_url) {
          const pdfUrl = `${window.location.origin}${response.data.pdf_url}`;
          window.open(pdfUrl, '_blank');
        } else if (response.data.excel_url) {
          // PDF가 없으면 Excel 파일 다운로드
          const excelUrl = `${window.location.origin}${response.data.excel_url}`;
          const link = document.createElement('a');
          link.href = excelUrl;
          link.download = '';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          alert('거래명세표가 Excel 파일로 생성되었습니다.\n\n(서버에 LibreOffice가 설치되지 않아 PDF 변환은 지원되지 않습니다)');
        } else {
          alert(`거래명세표가 생성되었으나 파일을 찾을 수 없습니다.\n\nExcel: ${response.data.excel_path}`);
        }

        setShowInvoiceModal(false);
        setShowViewModal(true);
      } else {
        alert(`거래명세표 생성에 실패했습니다: ${response.data.error}`);
      }
    } catch (error: any) {
      console.error('거래명세서 생성 실패:', error);
      const errorMessage = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details || '';

      if (errorDetails) {
        console.error('상세 에러:', errorDetails);
      }

      alert(`거래명세서 생성에 실패했습니다:\n\n${errorMessage}\n\n콘솔에서 상세 정보를 확인하세요.`);
    } finally {
      setLoading(false);
    }
  };

  // 정렬 함수
  const handleSort = (field: 'date' | 'sn') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // 새로운 컬럼 클릭 시 기본적으로 내림차순
    }
  };

  const getSortIcon = (field: 'date' | 'sn') => {
    if (sortField !== field) return '';
    return sortDirection === 'desc' ? '▼' : '▲';
  };

  const filteredCustomers = Array.isArray(customers) ? customers.filter(customer =>
    customer.company_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  ) : [];

  // 서비스 리포트 검색 필터링 및 정렬
  const filteredAndSortedReports = (() => {
    // 먼저 검색 필터링 적용
    const filtered = reports.filter(report => {
      if (!searchTerm) return true;
      
      const search = searchTerm.toLowerCase();
      
      // 날짜 검색 (yymmdd 형태)
      const formatDateForSearch = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear().toString().slice(-2); // 마지막 2자리
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return year + month + day;
      };
      
      const createdDate = formatDateForSearch(report.created_at || '');
      const serviceDate = formatDateForSearch(report.service_date || '');
      
      return (
        createdDate.includes(search) ||
        serviceDate.includes(search) ||
        report.customer_name?.toLowerCase().includes(search) ||
        report.technician_name?.toLowerCase().includes(search) ||
        report.machine_model?.toLowerCase().includes(search) ||
        report.machine_serial?.toLowerCase().includes(search) ||
        report.problem_description?.toLowerCase().includes(search) ||
        report.symptom?.toLowerCase().includes(search)
      );
    });

    // 정렬 적용
    if (!sortField) return filtered;

    return filtered.sort((a, b) => {
      let valueA: string | Date = '';
      let valueB: string | Date = '';

      if (sortField === 'date') {
        valueA = getLatestWorkDateObject(a);
        valueB = getLatestWorkDateObject(b);
      } else if (sortField === 'sn') {
        valueA = (a.machine_serial || '').toLowerCase();
        valueB = (b.machine_serial || '').toLowerCase();
      }

      if (sortField === 'date') {
        const dateA = valueA as Date;
        const dateB = valueB as Date;
        const comparison = dateA.getTime() - dateB.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const strA = valueA as string;
        const strB = valueB as string;
        const comparison = strA.localeCompare(strB);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });
  })();

  // 페이지네이션 적용
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredAndSortedReports.slice(startIndex, endIndex);

  // 서비스 리포트 저장 후 부품 처리
  const processServiceParts = async (serviceReportId: number, serviceReportData: any) => {
    try {
      // 고객명 추출
      const customer = customers.find(c => c.id === formData.customer_id);
      const customerName = customer ? customer.company_name : '고객명 미상';
      
      // 부품 처리 데이터 준비
      const processData = {
        service_report_id: serviceReportId,
        customer_name: customerName,
        used_parts: formData.used_parts.map(part => ({
          part_number: part.part_number || '',
          part_name: part.part_name,
          quantity: part.quantity,
          unit_price: part.unit_price
        }))
      };
      
      const response = await sparePartsAPI.processServiceParts(processData);
      
      if (response.data.success) {
        console.log('부품 처리 완료:', response.data.message);
        console.log('처리된 부품들:', response.data.processed_parts);
        
        // 처리 결과를 사용자에게 알림 (선택사항)
        const processedInfo = response.data.processed_parts
          .map((p: any) => `${p.part_name} (${p.quantity}개) - ${p.action}`)
          .join('\n');
        
        if (processedInfo) {
          console.log('부품 출고/등록 완료:\n', processedInfo);
        }
      }
    } catch (error) {
      console.error('부품 처리 중 오류:', error);
      // 부품 처리 실패는 서비스 리포트 저장을 방해하지 않도록 경고만 표시
      alert('서비스 리포트는 저장되었으나 부품 처리 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {

      
      // 시간 형식을 백엔드용으로 변환 (HHMM -> HH:MM)
      const convertedTimeRecords = formData.time_records.map(record => ({
        ...record,
        departure_time: convertToDisplayFormat(record.departure_time),
        work_start_time: convertToDisplayFormat(record.work_start_time),
        work_end_time: convertToDisplayFormat(record.work_end_time),
        travel_end_time: convertToDisplayFormat(record.travel_end_time),
        work_meal_time: convertToDisplayFormat(record.work_meal_time),
        travel_meal_time: convertToDisplayFormat(record.travel_meal_time),
      }));
      
      // 제출할 데이터 준비
      const submitData = {
        customer_id: formData.customer_id,
        technician_id: formData.technician_id,
        support_technician_ids: formData.support_technician_ids, // 서비스 동행/지원 FSE들
        machine_model: formData.machine_model,
        machine_serial: formData.machine_serial,
        service_date: formData.service_date,
        problem_description: formData.symptom,
        solution_description: formData.details,
        used_parts: formData.used_parts, // 배열 형태로 전송
        time_records: convertedTimeRecords, // 새로운 time_records 배열 사용
        time_record: convertedTimeRecords.length > 0 ? convertedTimeRecords[0] : null, // 백워드 호환성용
        work_hours: 0, // 필요시 time_record에서 계산
        status: 'completed',
        invoice_code_id: formData.invoice_code_id || null // Invoice 코드 추가
      };
      
      if (editingReport) {
        // 수정 모드
        const response = await serviceReportAPI.updateServiceReport(editingReport.id, submitData);
        
        // 부품 처리 (수정 시에도 부품 출고 처리)
        if (formData.used_parts.length > 0) {
          await processServiceParts(editingReport.id, response.data);
        }
        
        alert('서비스 리포트가 수정되었습니다.');
      } else {
        // 새로 생성 모드
        const response = await serviceReportAPI.createServiceReport(submitData);
        
        // 부품 처리 (신규 생성 시 부품 출고 처리)
        if (formData.used_parts.length > 0 && response.data.report) {
          await processServiceParts(response.data.report.id, response.data);
        }
        
        alert('서비스 리포트가 생성되었습니다.');
      }
      
      // 폼 닫기 및 초기화
      setShowForm(false);
      setEditingReport(null);
      
      // 목록 새로고침
      await loadReports();
      
    } catch (error: any) {
      console.error('=== 서비스 리포트 저장 실패 ===');
      console.error('에러 상세:', error);
      console.error('에러 메시지:', error?.message);
      console.error('에러 응답:', error?.response?.data);
      console.error('에러 상태:', error?.response?.status);
      alert(`서비스 리포트 저장에 실패했습니다: ${error?.response?.data?.error || error?.message || '알 수 없는 오류'}`);
    }
  };

  // 보기 버튼 클릭 핸들러
  const handleView = (report: ServiceReport) => {
    setViewingReport(report);
    setShowViewModal(true);
  };

  // 수정 버튼 클릭 핸들러
  const handleEdit = async (report: ServiceReport) => {
    setEditingReport(report);
    
    // used_parts 데이터 처리 (보기 모달과 동일한 로직)
    let editPartsData: UsedPart[] = [];
    const usedParts = report.used_parts as any;
    const partsUsed = (report as any).parts_used;
    
    if (Array.isArray(usedParts)) {
      editPartsData = usedParts;
    } else if (typeof usedParts === 'string' && usedParts.trim()) {
      // 문자열 형태의 used_parts를 파싱
      editPartsData = [{
        part_name: usedParts,
        part_number: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0
      }];
    } else if (partsUsed && typeof partsUsed === 'string' && partsUsed.trim()) {
      // backend의 parts_used 필드 확인 및 파싱
      // 예: "부품A (수량: 2), 부품B (수량: 1)" 형태를 파싱
      try {
        const parts = partsUsed.split(',').map(part => part.trim());
        editPartsData = parts.map(partStr => {
          // 정규식으로 "부품명 (수량: N)" 패턴 파싱
          const match = partStr.match(/^(.+?)\s*\(수량:\s*(\d+)\)$/);
          if (match) {
            return {
              part_name: match[1].trim(),
              part_number: '',
              quantity: parseInt(match[2]) || 1,
              unit_price: 0,
              total_price: 0
            };
          } else {
            // 패턴이 맞지 않으면 전체를 부품명으로 사용
            return {
              part_name: partStr,
              part_number: '',
              quantity: 1,
              unit_price: 0,
              total_price: 0
            };
          }
        }).filter(part => part.part_name); // 빈 부품명 제거
      } catch (error) {
        console.error('부품 데이터 파싱 오류:', error);
        // 파싱 실패 시 전체를 하나의 부품으로 처리
        editPartsData = [{
          part_name: partsUsed,
          part_number: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0
        }];
      }
    }
    

    
    // 시간기록 데이터 처리 (새로운 time_records 배열 우선 확인)
    let editTimeRecordsData: TimeRecord[] = [];
    const timeRecords = (report as any).time_records;
    const timeRecord = report.time_record;
    

    
    if (Array.isArray(timeRecords) && timeRecords.length > 0) {
      // 새로운 time_records 배열 사용 (HH:MM을 HHMM 형식으로 변환)
      editTimeRecordsData = timeRecords.map(tr => ({
        ...tr,
        departure_time: convertToFormFormat(tr.departure_time || ''),
        work_start_time: convertToFormFormat(tr.work_start_time || ''),
        work_end_time: convertToFormFormat(tr.work_end_time || ''),
        travel_end_time: convertToFormFormat(tr.travel_end_time || ''),
        work_meal_time: convertToFormFormat(tr.work_meal_time || ''),
        travel_meal_time: convertToFormFormat(tr.travel_meal_time || ''),
      }));
    } else if (timeRecord) {
      // 기존 time_record 단일 객체를 배열로 변환
      editTimeRecordsData = [{
        date: timeRecord.date || (timeRecord as any).work_date || report.service_date || new Date().toISOString().split('T')[0],
        departure_time: convertToFormFormat(timeRecord.departure_time || ''),
        work_start_time: convertToFormFormat(timeRecord.work_start_time || ''),
        work_end_time: convertToFormFormat(timeRecord.work_end_time || ''),
        travel_end_time: convertToFormFormat(timeRecord.travel_end_time || ''),
        work_meal_time: convertToFormFormat(timeRecord.work_meal_time || ''),
        travel_meal_time: convertToFormFormat(timeRecord.travel_meal_time || ''),
        calculated_work_time: timeRecord.calculated_work_time,
        calculated_travel_time: timeRecord.calculated_travel_time,
      }];
    }
    

    
    // 131-유상청구건 코드의 ID 찾기
    const defaultInvoiceCode = invoiceCodes.find(code => code.code === '131');
    const defaultInvoiceCodeId = defaultInvoiceCode?.id;

    // 먼저 기본 폼 데이터 설정
    const supportTechnicianIds = report.support_technician_ids || [];
    const supportTechnicianNames = supportTechnicianIds.map(techId => {
      const tech = technicians.find(t => t.id === techId);
      return tech ? tech.name : '';
    }).filter(name => name); // 빈 이름 제거

    setFormData({
      customer_id: report.customer_id,
      customer_name: report.customer_name || '',
      customer_address: '', // 고객 선택시 자동으로 채워질 예정
      technician_id: report.technician_id,
      technician_name: report.technician_name || '',
      support_technician_ids: supportTechnicianIds,
      support_technician_names: supportTechnicianNames,
      resource_id: 0, // 고객 선택시 자동으로 채워질 예정
      machine_model: report.machine_model,
      machine_serial: report.machine_serial,
      symptom: report.problem_description || report.symptom || '',
      details: report.solution_description || report.details || '',
      service_date: report.service_date || new Date().toISOString().split('T')[0],
      used_parts: editPartsData,
      time_records: editTimeRecordsData,
      invoice_code_id: report.invoice_code_id || defaultInvoiceCodeId
    });

    // 고객 정보 로드 및 선택 처리
    if (report.customer_id) {
      try {
        // 전체 고객 목록에서 해당 고객 찾기
        const response = await customerAPI.getCustomers();
        const allCustomers = response.data?.customers || response.data || [];
        const selectedCustomer = allCustomers.find((customer: Customer) => customer.id === report.customer_id);
        
        if (selectedCustomer) {
          // handleSelectCustomer와 동일한 로직 실행
          console.log('수정 모드: 고객 정보 로드됨:', selectedCustomer);
          
          // 고객 주소 설정
          setFormData(prev => ({
            ...prev,
            customer_address: selectedCustomer.address || ''
          }));

          // 고객 리소스 로드
          const customerResourcesResponse = await resourceAPI.getResources(selectedCustomer.id);
          console.log('수정 모드: 리소스 API 응답:', customerResourcesResponse.data);
          
          const resources = customerResourcesResponse.data?.resources || customerResourcesResponse.data || [];
          console.log('수정 모드: 추출된 리소스 수:', resources.length);
          console.log('수정 모드: 리소스 데이터:', resources);
          
          setCustomerResources(resources);

          // 기존 리소스 ID가 있으면 해당 리소스 선택, 없으면 첫 번째 리소스 선택
          if (resources.length > 0) {
            let selectedResourceId = 0;
            
            // 기존 machine_model과 machine_serial로 리소스 찾기
            const matchingResource = resources.find((resource: any) => 
              resource.product_name === report.machine_model && resource.serial_number === report.machine_serial
            );
            
            if (matchingResource) {
              selectedResourceId = matchingResource.id;
            } else {
              selectedResourceId = resources[0].id;
            }

            setFormData(prev => ({
              ...prev,
              resource_id: selectedResourceId,
              machine_model: report.machine_model || resources.find((r: any) => r.id === selectedResourceId)?.product_name || '',
              machine_serial: report.machine_serial || resources.find((r: any) => r.id === selectedResourceId)?.serial_number || ''
            }));
          }
        }
      } catch (error) {
        console.error('고객 정보 로드 실패:', error);
      }
    }

    setShowForm(true);
  };

  // 삭제 버튼 클릭 핸들러
  const handleDelete = async (reportId: number) => {
    if (window.confirm('정말로 이 서비스 리포트를 삭제하시겠습니까?')) {
      try {
        await serviceReportAPI.deleteServiceReport(reportId);
        alert('서비스 리포트가 삭제되었습니다.');
        loadReports(); // 목록 새로고침
      } catch (error) {
        console.error('삭제 실패:', error);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  const handleLock = async (reportId: number) => {
    if (window.confirm('이 서비스 리포트를 잠금 처리하시겠습니까?\n잠금 후에는 일반 사용자가 수정할 수 없습니다.')) {
      try {
        await serviceReportAPI.lockServiceReport(reportId);
        alert('서비스 리포트가 잠금 처리되었습니다.');
        loadReports(); // 목록 새로고침
      } catch (error: any) {
        console.error('잠금 실패:', error);
        alert(error.response?.data?.error || '잠금 처리에 실패했습니다.');
      }
    }
  };

  const handleUnlock = async (reportId: number) => {
    if (window.confirm('이 서비스 리포트의 잠금을 해제하시겠습니까?')) {
      try {
        await serviceReportAPI.unlockServiceReport(reportId);
        alert('서비스 리포트의 잠금이 해제되었습니다.');
        loadReports(); // 목록 새로고침
      } catch (error: any) {
        console.error('잠금 해제 실패:', error);
        alert(error.response?.data?.error || '잠금 해제에 실패했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '200px'}}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .table-bordered th,
          .table-bordered td {
            border-color: #e9ecef;
          }
        `}
      </style>
      <div className="container-fluid">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="검색어를 입력하세요 (고객사, 담당자, 모델, S/N, 작업내용, 날짜: yymmdd 형식)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // 검색어 변경시 첫 페이지로 이동
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn btn-sm position-absolute"
                      style={{
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        opacity: 0.6,
                        zIndex: 10,
                        color: '#dc3545'
                      }}
                      onClick={handleSearchClear}
                      title="검색어 지우기"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            <div className="col-auto d-print-none">
              <select
                className="form-select"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
                }}
              >
                <option value={5}>5개씩</option>
                <option value={10}>10개씩</option>
                <option value={20}>20개씩</option>
                <option value={50}>50개씩</option>
              </select>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                {hasPermission('service_report_create') && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
                    const today = new Date();
                    const todayString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
                    
                    // 새 폼 열 때마다 기술부 사용자 자동 설정 및 오늘 날짜 설정
                    setFormData({
                      service_date: todayString,
                      technician_id: currentUser?.id || 0,
                      technician_name: currentUser?.department === '기술부' ? currentUser.name : '',
                      support_technician_ids: [],
                      support_technician_names: [],
                      customer_id: 0,
                      customer_name: '',
                      customer_address: '',
                      resource_id: 0,
                      machine_model: '',
                      machine_serial: '',
                      symptom: '',
                      details: '',
                      used_parts: [],
                      time_records: [{ date: todayString, departure_time: '', work_start_time: '', work_end_time: '', travel_end_time: '', work_meal_time: '', travel_meal_time: '' }]
                    });
                    setCustomerResources([]);
                    setShowCustomerSearch(false);
                    setCustomerSearchResults([]);
                    setShowForm(true);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  새 리포트 작성
                </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          <div className="mb-2">
            <small className="text-muted">💡 DATE / SN 헤더 클릭 시 정렬 가능</small>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter table-striped">
                <thead>
                  <tr>
                    <th 
                      style={{
                        cursor: 'pointer', 
                        userSelect: 'none',
                        color: '#206bc4'
                      }}
                      onClick={() => handleSort('date')}
                    >
                      작업일자 {getSortIcon('date')}
                    </th>
                    <th style={{ padding: '0.75rem' }}>Customer</th>
                    <th style={{ padding: '0.75rem' }}>FSE</th>
                    <th style={{ padding: '0.75rem' }}>Model</th>
                    <th 
                      style={{
                        cursor: 'pointer', 
                        userSelect: 'none',
                        color: '#206bc4'
                      }}
                      onClick={() => handleSort('sn')}
                    >
                      SN {getSortIcon('sn')}
                    </th>
                    <th>Job Description</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedReports.length > 0 ? currentReports.map((report) => (
                    <tr key={report.id} style={{backgroundColor: '#fdfdfd'}}>
                      <td className="bg-white text-center">{getLatestWorkDate(report)}</td>
                      <td className="bg-white fw-medium">{report.customer_name}</td>
                      <td className="bg-white">{report.technician_name}</td>
                      <td className="bg-white">{report.machine_model}</td>
                      <td className="bg-white">{report.machine_serial}</td>
                      <td className="bg-white text-wrap" style={{maxWidth: '200px'}}>
                        {report.problem_description || report.symptom}
                      </td>
                      <td className="bg-white text-center">
                        <div className="d-flex gap-1">
                          {hasPermission('service_report_read') && (
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: '0'
                              }}
                              onClick={() => handleView(report)}
                              title="보기"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                          )}
                          {(user?.is_admin || hasPermission('service_report_update') || user?.name === report.technician_name) && (
                            <button 
                              className="btn btn-sm btn-outline-secondary"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: '0'
                              }}
                              onClick={() => handleEdit(report)}
                              title="편집"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          )}
                          {user?.is_admin && (
                            report.is_locked ? (
                              <button
                                className="btn btn-sm btn-outline-success"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  padding: '0'
                                }}
                                onClick={() => handleUnlock(report.id)}
                                title="잠금 해제"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-warning"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  padding: '0'
                                }}
                                onClick={() => handleLock(report.id)}
                                title="잠금"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              </button>
                            )
                          )}
                          {(hasPermission('service_report_delete') && (user?.is_admin || user?.name === report.technician_name)) && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: '0'
                              }}
                              onClick={() => handleDelete(report.id)}
                              title="삭제"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 서비스 리포트가 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* 페이지네이션 */}
            {filteredAndSortedReports.length >= itemsPerPage && (
              <div className="mt-3">
                <div className="d-flex align-items-center justify-content-start mb-2">
                  <span className="text-muted small">
                    총 {filteredAndSortedReports.length}개의 리포트 (페이지 {currentPage}/{Math.ceil(filteredAndSortedReports.length / itemsPerPage)})
                  </span>
                </div>
                
                <div className="d-flex justify-content-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredAndSortedReports.length / itemsPerPage)}
                    totalItems={filteredAndSortedReports.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPreviousPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    onNextPage={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedReports.length / itemsPerPage), prev + 1))}
                  />
                </div>
              </div>
            )}
        </div>
      </div>

      {/* 서비스 리포트 작성/수정 모달 */}
      {showForm && (
        <div 
          className="modal modal-blur fade show" 
          style={{display: 'block'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditingReport(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingReport ? '서비스 리포트 수정' : '서비스 리포트 작성'}
                  {editingReport?.is_locked ? (
                    <span className="badge bg-warning text-dark ms-2">
                      <i className="bi bi-lock-fill me-1"></i>
                      읽기전용 (잠금됨)
                    </span>
                  ) : null}
                </h5>
                <div className="ms-auto">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => {
                      setShowForm(false);
                      setEditingReport(null);
                      setFormData(getDefaultFormData(invoiceCodes));
                      setCustomerResources([]);
                      setShowCustomerSearch(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={editingReport?.is_locked}>
                  {/* 첫 번째 행: 서비스일자, 서비스담당, 서비스 동행/지원 */}
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">서비스 날짜</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.service_date}
                        onChange={(e) => setFormData({...formData, service_date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">서비스담당</label>
                      <select
                        className="form-control"
                        value={formData.technician_name}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          const selectedTech = technicians.find(tech => tech.name === selectedName);
                          setFormData({
                            ...formData, 
                            technician_name: selectedName,
                            technician_id: selectedTech?.id || 0
                          });
                        }}
                        required
                      >
                        <option value="">기술부 직원을 선택하세요</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.name}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">서비스 동행/지원</label>
                      <div className="position-relative">
                        <div
                          className="form-control d-flex flex-wrap gap-1 align-items-center"
                          style={{
                            minHeight: '38px',
                            height: '38px',
                            cursor: editingReport?.is_locked ? 'not-allowed' : 'pointer',
                            opacity: editingReport?.is_locked ? 0.6 : 1,
                            overflow: 'visible'
                          }}
                          onClick={() => !editingReport?.is_locked && setShowSupportTechnicianDropdown(!showSupportTechnicianDropdown)}
                        >
                          {formData.support_technician_names.length === 0 ? (
                            <span className="text-muted">동행/지원 FSE</span>
                          ) : (
                            formData.support_technician_names.map((name, index) => (
                              <span
                                key={formData.support_technician_ids[index]}
                                className="d-flex align-items-center gap-1"
                                style={{
                                  backgroundColor: 'white',
                                  color: 'black',
                                  border: '1px solid #6c757d',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.875rem',
                                  lineHeight: '1.2'
                                }}
                              >
                                {name}
                                {!editingReport?.is_locked && (
                                  <button
                                    type="button"
                                    className="btn-close"
                                    style={{
                                      fontSize: '0.6em',
                                      filter: 'invert(18%) sepia(93%) saturate(7499%) hue-rotate(357deg) brightness(91%) contrast(135%)'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSupportTechnician(formData.support_technician_ids[index]);
                                    }}
                                  />
                                )}
                              </span>
                            ))
                          )}
                        </div>
                        
                        {showSupportTechnicianDropdown && (
                          <div 
                            className="position-absolute w-100"
                            style={{
                              zIndex: 1000,
                              backgroundColor: '#ffffff',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              marginTop: '4px'
                            }}
                          >
                            {technicians
                              .filter(tech => 
                                tech.id !== formData.technician_id && 
                                !formData.support_technician_ids.includes(tech.id)
                              )
                              .map((tech) => (
                                <div
                                  key={tech.id}
                                  className="px-3 py-2"
                                  style={{ 
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #eee'
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.target as HTMLElement).style.backgroundColor = '#f8f9fa';
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                  }}
                                  onClick={() => {
                                    handleAddSupportTechnician(tech);
                                    setShowSupportTechnicianDropdown(false);
                                  }}
                                >
                                  {tech.name}
                                </div>
                              ))}
                            {technicians.filter(tech => 
                              tech.id !== formData.technician_id && 
                              !formData.support_technician_ids.includes(tech.id)
                            ).length === 0 && (
                              <div className="px-3 py-2 text-muted">선택 가능한 FSE가 없습니다</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 두 번째 행: 고객명과 검색필드 */}
                  <div className="row mb-3">
                    <div className="col-12">
                      <div className="d-flex align-items-end gap-3">
                        <div style={{ minWidth: '100px' }}>
                          <label className="form-label">고객명</label>
                        </div>
                        <div className="flex-fill position-relative">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="고객사명을 입력하여 검색..."
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({ ...prev, customer_name: value }));
                              if (value.length >= 1) {
                                searchCustomers(value);
                              } else {
                                setCustomerSearchResults([]);
                                setShowCustomerSearch(false);
                              }
                            }}
                            onFocus={(e) => {
                              const value = e.target.value;
                              if (value.length >= 1) {
                                searchCustomers(value);
                              } else {
                                // 빈 필드 클릭 시 전체 고객 리스트 표시 (페이지네이션)
                                showAllCustomers();
                              }
                            }}
                            value={formData.customer_name}
                          />
                          {showCustomerSearch && (
                            <div className="position-absolute w-100 mt-1" style={{zIndex: 1000}}>
                              <div className="list-group shadow" style={{
                                backgroundColor: '#ffffff', 
                                opacity: 1,
                                maxHeight: '300px',
                                overflowY: 'auto'
                              }}>
                                {customerSearchResults.length > 0 ? (
                                  customerSearchResults.map((customer) => (
                                    <button
                                      key={customer.id}
                                      type="button"
                                      className="list-group-item list-group-item-action"
                                      style={{backgroundColor: '#ffffff', opacity: 1}}
                                      onClick={() => handleSelectCustomer(customer)}
                                    >
                                      <div>
                                        <strong>{customer.company_name}</strong>
                                        {/* {customer.president && <small className="text-muted d-block">대표 {customer.president}</small>} */}
                                      </div>
                                      {customer.address && (
                                        <small className="text-muted d-block">
                                          {customer.address}
                                        </small>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="list-group-item text-muted">
                                    검색 결과가 없습니다.
                                  </div>
                                )}
                                {/* 새 고객사 추가 옵션 */}
                                <button
                                  type="button"
                                  className="list-group-item list-group-item-action"
                                  style={{backgroundColor: '#e3f2fd', fontWeight: 'bold', borderTop: '2px solid #2196f3'}}
                                  onClick={handleAddCustomer}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="icon me-2" width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                  새 고객사 추가
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 두 번째 행: 고객사 주소 */}
                  <div className="row mb-3">
                    <div className="col-12">
                      <label className="form-label">고객사 주소</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.customer_address}
                        readOnly
                        placeholder="고객사 선택 시 자동으로 입력됩니다"
                      />
                    </div>
                  </div>

                  {/* 세 번째 행: Model과 SN (리소스 선택) */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Model</label>
                      {formData.customer_id ? (
                        <select
                          className="form-select"
                          value={formData.resource_id}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'add_new') {
                              handleAddResource();
                              return;
                            }
                            const resourceId = parseInt(value);
                            const resource = customerResources.find(r => r.id === resourceId);
                            if (resource) {
                              handleSelectResource(resource);
                            }
                          }}
                          required
                        >
                          <option value="">리소스를 선택하세요</option>
                          {customerResources.map((resource) => (
                            <option key={resource.id} value={resource.id}>
                              {resource.product_name} ({resource.serial_number})
                            </option>
                          ))}
                          <option value="add_new" style={{backgroundColor: '#e3f2fd', fontWeight: 'bold'}}>
                            + 새 리소스 추가
                          </option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          value={formData.machine_model}
                          placeholder="고객사를 먼저 선택하세요"
                          readOnly
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">SN</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.machine_serial}
                        readOnly
                        placeholder="Model 선택 시 자동으로 입력됩니다"
                      />
                    </div>
                  </div>

                  {/* Job Description */}
                  <div className="row mb-3">
                    <div className="col-12">
                      <label className="form-label">Job Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={formData.symptom}
                        onChange={(e) => setFormData({...formData, symptom: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* 처리 내용 */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <label className="form-label">처리 내용</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={formData.details}
                        onChange={(e) => setFormData({...formData, details: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* 사용부품 내역 */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>사용부품 내역</h5>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={addUsedPart}
                      >
                        + 부품 추가
                      </button>
                    </div>
                    
                    {formData.used_parts.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>부품번호</th>
                              <th>부품명</th>
                              <th>수량</th>
                              <th>단가</th>
                              <th>총액</th>
                              <th style={{width: '60px'}}>삭제</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.used_parts.map((part, index) => (
                              <tr key={index}>
                                <td>
                                  <div style={{ position: 'relative' }}>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={part.part_number || ''}
                                      onChange={(e) => updateUsedPart(index, 'part_number', e.target.value)}
                                      placeholder="파트번호 입력"
                                    />

                                    {/* 자동완성 드롭다운 */}
                                    {activePartSearchIndex === index && partSearchResults.length > 0 && (
                                      <div
                                        className="dropdown-menu show w-100"
                                        style={{
                                          maxHeight: '200px',
                                          overflowY: 'auto',
                                          position: 'absolute',
                                          zIndex: 1000
                                        }}
                                      >
                                        {partSearchResults.map((searchPart, pidx) => (
                                          <button
                                            key={pidx}
                                            type="button"
                                            className="dropdown-item"
                                            onClick={() => selectPartFromAutocomplete(index, searchPart)}
                                          >
                                            <div>
                                              <strong>{searchPart.part_name}</strong> ({searchPart.part_number})
                                            </div>
                                            <small className="text-muted">
                                              청구가: {(searchPart.charge_price || 0).toLocaleString()}원 | 재고: {searchPart.stock_quantity}
                                            </small>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {part.isFoundInDB === false && part.part_number && (
                                    <small className="text-info d-block mt-1">
                                      신규 부품으로 등록됩니다
                                    </small>
                                  )}
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={part.part_name}
                                    onChange={(e) => updateUsedPart(index, 'part_name', e.target.value)}
                                    required
                                    readOnly={part.isFoundInDB === true}
                                  />
                                  {part.searchMessage && (
                                    <small className={`text-${part.isFoundInDB ? 'success' : 'warning'} d-block mt-1`}>
                                      {part.searchMessage}
                                    </small>
                                  )}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={part.quantity}
                                    onChange={(e) => updateUsedPart(index, 'quantity', parseInt(e.target.value) || 0)}
                                    min="0"
                                    required
                                  />
                                  {part.currentStock !== undefined && part.quantity > part.currentStock && (
                                    <small className="text-warning d-block mt-1">
                                      재고 부족 (현재: {part.currentStock}개)
                                    </small>
                                  )}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={part.unit_price}
                                    onChange={(e) => updateUsedPart(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                    required
                                    readOnly={part.isFoundInDB === true}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={part.total_price}
                                    readOnly
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeUsedPart(index)}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-muted py-3">
                        <i className="fas fa-box-open fa-2x mb-2"></i>
                        <p className="mb-0">등록된 사용부품이 없습니다.</p>
                        <small>위의 '+ 부품 추가' 버튼을 클릭하여 부품을 추가하세요.</small>
                      </div>
                    )}
                  </div>

                  {/* 시간 기록부 (테이블 형태) */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>작업/이동 시간 기록부</h5>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={addTimeRecord}
                      >
                        + 날짜 추가
                      </button>
                    </div>
                    
                    {formData.time_records.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>날짜</th>
                              <th>출발시간</th>
                              <th>작업시작</th>
                              <th>작업종료</th>
                              <th>이동종료</th>
                              <th>식사시간(작업)</th>
                              <th>식사시간(이동)</th>
                              <th>작업시간</th>
                              <th>이동시간</th>
                              <th style={{width: '60px'}}>삭제</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.time_records.map((record, index) => (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={record.date}
                                    onChange={(e) => updateTimeRecord(index, 'date', e.target.value)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="HHMM"
                                    maxLength={4}
                                    value={record.departure_time}
                                    onChange={(e) => updateTimeRecord(index, 'departure_time', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="HHMM"
                                    maxLength={4}
                                    value={record.work_start_time}
                                    onChange={(e) => updateTimeRecord(index, 'work_start_time', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="HHMM"
                                    maxLength={4}
                                    value={record.work_end_time}
                                    onChange={(e) => updateTimeRecord(index, 'work_end_time', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="HHMM"
                                    maxLength={4}
                                    value={record.travel_end_time}
                                    onChange={(e) => updateTimeRecord(index, 'travel_end_time', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="HHMM"
                                    maxLength={4}
                                    value={record.work_meal_time}
                                    onChange={(e) => updateTimeRecord(index, 'work_meal_time', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="HHMM"
                                    maxLength={4}
                                    value={record.travel_meal_time}
                                    onChange={(e) => updateTimeRecord(index, 'travel_meal_time', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-primary fw-bold"
                                    value={record.calculated_work_time || ''}
                                    readOnly
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-primary fw-bold"
                                    value={record.calculated_travel_time || ''}
                                    readOnly
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeTimeRecord(index)}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-muted py-3">
                        <i className="fas fa-clock fa-2x mb-2"></i>
                        <p className="mb-0">등록된 시간 기록이 없습니다.</p>
                        <small>위의 '+ 날짜 추가' 버튼을 클릭하여 시간 기록을 추가하세요.</small>
                      </div>
                    )}
                  </div>

                  {/* Invoice 코드 선택 (관리자만 보임) - 시간 기록부 아래 배치 */}
                  {isAdmin && (
                    <div className="row mt-4">
                      <div className="col-md-6">
                        <label className="form-label">Invoice 코드 (선택사항)</label>
                        <select
                          className="form-control"
                          value={formData.invoice_code_id || ''}
                          onChange={(e) => setFormData({
                            ...formData, 
                            invoice_code_id: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                        >
                          <option value="">코드를 선택하세요</option>
                          {invoiceCodes.map((code) => (
                            <option key={code.id} value={code.id}>
                              {code.code} - {code.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  </fieldset>

                  <div className="row mt-4">
                    <div className="col-12 d-flex gap-2 justify-content-end">
                      {!editingReport?.is_locked && (
                        <button type="submit" className="btn btn-primary">
                          {editingReport ? '수정' : '저장'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowForm(false);
                          setEditingReport(null);
                          setFormData(getDefaultFormData(invoiceCodes));
                          setCustomerResources([]);
                          setShowCustomerSearch(false);
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 고객 선택 모달 */}
      {showCustomerModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{display: 'block', zIndex: 2000}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomerModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">고객 선택</h5>
                <div className="ms-auto">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => {
                      setShowCustomerModal(false);
                      setCustomerSearchTerm('');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="고객사명 또는 담당자명으로 검색..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="table-responsive" style={{maxHeight: '400px'}}>
                  <table className="table table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>고객사명</th>
                        <th>담당자</th>
                        <th>주소</th>
                        <th style={{width: '80px'}}>선택</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td>{customer.company_name}</td>
                          <td>{customer.contact_person}</td>
                          <td className="text-truncate" style={{maxWidth: '200px'}}>
                            {customer.address}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              선택
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted">
                    전체 고객: {customers.length}개 | 검색 결과: {filteredCustomers.length}개
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 서비스 리포트 보기 모달 */}
      {showViewModal && viewingReport && (
        <div 
          className="modal modal-blur fade show" 
          style={{display: 'block', zIndex: 2000}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowViewModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">서비스 리포트 상세 보기</h5>
                <div className="ms-auto">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingReport(null);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                {/* 기본 정보 - 표 형태 */}
                <div className="mb-4">
                  <h5 className="mb-3">기본 정보</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                      <tbody>
                        <tr>
                          <td className="bg-light fw-bold" style={{width: '120px'}}>서비스 날짜</td>
                          <td className="bg-white" style={{width: '150px'}}>
                            {viewingReport.service_date ? new Date(viewingReport.service_date).toLocaleDateString('ko-KR') : '-'}
                          </td>
                          <td className="bg-light fw-bold" style={{width: '100px'}}>서비스담당</td>
                          <td className="bg-white" style={{width: '120px'}}>{viewingReport.technician_name || '-'}</td>
                          <td className="bg-light fw-bold" style={{width: '100px'}}>동행/지원</td>
                          <td className="bg-white">
                            {viewingReport.support_technician_ids && viewingReport.support_technician_ids.length > 0 ? (
                              viewingReport.support_technician_ids.map(techId => {
                                const tech = technicians.find(t => t.id === techId);
                                return tech ? tech.name : null;
                              }).filter(name => name).join(', ')
                            ) : (
                              <span className="text-muted">없음</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold">고객명</td>
                          <td className="bg-white" colSpan={3}>{viewingReport.customer_name || '-'}</td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold">고객사 주소</td>
                          <td className="bg-white" colSpan={3}>
                            {viewingReport.customer_address || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold">Model</td>
                          <td className="bg-white">{viewingReport.machine_model || '-'}</td>
                          <td className="bg-light fw-bold">SN</td>
                          <td className="bg-white">{viewingReport.machine_serial || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 작업 내용 정보 - 표 형태 */}
                <div className="mb-4">
                  <h5 className="mb-3">작업 내용</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                      <tbody>
                        <tr>
                          <td className="bg-light fw-bold" style={{width: '150px', verticalAlign: 'top'}}>Job Description</td>
                          <td className="bg-white">
                            <div style={{minHeight: '80px', whiteSpace: 'pre-wrap', padding: '8px 0'}}>
                              {viewingReport.problem_description || viewingReport.symptom || '-'}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold" style={{verticalAlign: 'top'}}>처리 내용</td>
                          <td className="bg-white">
                            <div style={{minHeight: '100px', whiteSpace: 'pre-wrap', padding: '8px 0'}}>
                              {viewingReport.solution_description || viewingReport.details || '-'}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 사용부품 내역 */}
                {partsWithBillingPrice.length > 0 && (
                  <div className="mb-4">
                    <h5 className="mb-3">사용부품 내역</h5>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>부품명</th>
                            <th>부품번호</th>
                            <th>수량</th>
                            <th>단가 (청구가)</th>
                            <th>총액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partsWithBillingPrice.map((part: any, index: number) => (
                            <tr key={index}>
                              <td className="bg-white">{part.part_name || '-'}</td>
                              <td className="bg-white">{part.part_number || '-'}</td>
                              <td className="bg-white text-center">{part.quantity || '-'}</td>
                              <td className="bg-white text-end">{typeof part.billing_unit_price === 'number' ? part.billing_unit_price.toLocaleString() : '0'}</td>
                              <td className="bg-white text-end fw-bold">{typeof part.billing_total_price === 'number' ? part.billing_total_price.toLocaleString() : '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 시간 기록부 (테이블 형태) */}
                {(() => {
                  // time_records가 배열인지 단일 객체인지 확인하고 처리
                  let timeRecordsData: any[] = [];
                  const timeRecords = (viewingReport as any).time_records;
                  const timeRecord = viewingReport.time_record;
                  
                  if (Array.isArray(timeRecords) && timeRecords.length > 0) {
                    timeRecordsData = timeRecords;
                  } else if (timeRecord) {
                    // 기존 time_record를 배열로 변환
                    timeRecordsData = [timeRecord];
                  }
                  
                  return timeRecordsData.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">작업/이동 시간 기록부</h5>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center" style={{width: '100px'}}>날짜</th>
                              <th className="text-center" style={{width: '90px'}}>출발시간</th>
                              <th className="text-center" style={{width: '90px'}}>작업시작</th>
                              <th className="text-center" style={{width: '90px'}}>작업종료</th>
                              <th className="text-center" style={{width: '90px'}}>이동종료</th>
                              <th className="text-center" style={{width: '100px'}}>식사시간<br/><small>(작업)</small></th>
                              <th className="text-center" style={{width: '100px'}}>식사시간<br/><small>(이동)</small></th>
                              <th className="text-center text-primary" style={{width: '90px'}}>작업시간</th>
                              <th className="text-center text-primary" style={{width: '90px'}}>이동시간</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timeRecordsData.map((record: any, index: number) => (
                              <tr key={index}>
                                <td className="bg-white text-center">{record.date || record.work_date ? new Date(record.date || record.work_date).toLocaleDateString('ko-KR') : '-'}</td>
                                <td className="bg-white text-center">{convertToDisplayFormat(record.departure_time) || '-'}</td>
                                <td className="bg-white text-center">{convertToDisplayFormat(record.work_start_time) || '-'}</td>
                                <td className="bg-white text-center">{convertToDisplayFormat(record.work_end_time) || '-'}</td>
                                <td className="bg-white text-center">{convertToDisplayFormat(record.travel_end_time) || '-'}</td>
                                <td className="bg-white text-center">{convertToDisplayFormat(record.work_meal_time) || '-'}</td>
                                <td className="bg-white text-center">{convertToDisplayFormat(record.travel_meal_time) || '-'}</td>
                                <td className="bg-white text-center text-primary fw-bold">
                                  {record.calculated_work_time || '-'}
                                </td>
                                <td className="bg-white text-center text-primary fw-bold">
                                  {record.calculated_travel_time || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Invoice 코드 정보 (관리자만 보임) - 시간 기록부 하단에 배치 */}
                {isAdmin && (
                  <div className="mb-4">
                    <h5 className="mb-3">Invoice 코드</h5>
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <tbody>
                          <tr>
                            <td className="bg-light fw-bold" style={{width: '150px'}}>Invoice 코드</td>
                            <td className="bg-white">
                              {viewingReport.invoice_code ? 
                                `${viewingReport.invoice_code} - ${viewingReport.invoice_description || ''}` : 
                                '설정되지 않음'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="row mt-4">
                  <div className="col-12 d-flex gap-2 justify-content-end">
                    {hasPermission('transaction_create') && (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => {
                          if (viewingReport?.id) {
                            handleCreateInvoice(viewingReport.id);
                          }
                        }}
                        disabled={loading}
                        title="이 서비스 리포트를 기반으로 거래명세표를 생성합니다"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                          <rect x="3" y="4" width="18" height="16" rx="3"/>
                          <line x1="7" y1="8" x2="17" y2="8"/>
                          <line x1="7" y1="12" x2="17" y2="12"/>
                          <line x1="7" y1="16" x2="9" y2="16"/>
                        </svg>
                        {loading ? '생성 중...' : '거래명세표 항목 입력'}
                      </button>
                    )}
                    {/* {hasPermission('service_report_update') && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setShowViewModal(false);
                          handleEdit(viewingReport);
                        }}
                      >
                        수정하기
                      </button>
                    )} */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowViewModal(false);
                        setViewingReport(null);
                      }}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 리소스 추가 모달 */}
      {showAddResourceModal && (
        <div 
          className="modal modal-blur fade show" 
          style={{display: 'block', zIndex: 2100}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddResourceModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">새 리소스 추가</h5>
                <div className="ms-auto">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setShowAddResourceModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">카테고리 *</label>
                    <select
                      className="form-select"
                      value={newResourceData.category}
                      onChange={(e) => setNewResourceData({
                        ...newResourceData,
                        category: e.target.value
                      })}
                      required
                    >
                      <option value="">카테고리를 선택하세요</option>
                      <option value="Laser">Laser</option>
                      <option value="Pressbrake">Pressbrake</option>
                      <option value="Punch">Punch</option>
                      <option value="Shear">Shear</option>
                      <option value="Bender">Bender</option>
                      <option value="Welder">Welder</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">시리얼번호 *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newResourceData.serial_number}
                      onChange={(e) => setNewResourceData({
                        ...newResourceData,
                        serial_number: e.target.value
                      })}
                      placeholder="시리얼번호 입력"
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-12">
                    <label className="form-label">제품명 *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newResourceData.product_name}
                      onChange={(e) => setNewResourceData({
                        ...newResourceData,
                        product_name: e.target.value
                      })}
                      placeholder="제품명 입력"
                      required
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <label className="form-label">비고</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={newResourceData.note}
                      onChange={(e) => setNewResourceData({
                        ...newResourceData,
                        note: e.target.value
                      })}
                      placeholder="추가 정보 입력 (선택사항)"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveNewResource}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddResourceModal(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 고객사 추가 모달 */}
      {showAddCustomerModal && (
        <div
          className="modal modal-blur fade show"
          style={{display: 'block', zIndex: 2100}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddCustomerModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">새 고객사 추가</h5>
                <div className="ms-auto">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setShowAddCustomerModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* 첫 번째 줄: 회사명, 이메일 */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">회사명 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.company_name}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          company_name: e.target.value
                        })}
                        placeholder="회사명 입력"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">이메일</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          email: e.target.value
                        })}
                        placeholder="이메일 입력"
                      />
                    </div>
                  </div>

                  {/* 두 번째 줄: 담당자, 담당자 연락처 */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">담당자 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.contact_person}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          contact_person: e.target.value
                        })}
                        placeholder="담당자명 입력"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">담당자 연락처</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.contact}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          contact: e.target.value
                        })}
                        placeholder="담당자 연락처 입력"
                      />
                    </div>
                  </div>

                  {/* 전화번호, 팩스번호 */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">전화번호</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          phone: e.target.value
                        })}
                        placeholder="전화번호 입력"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">팩스번호</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.fax}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          fax: e.target.value
                        })}
                        placeholder="팩스번호 입력"
                      />
                    </div>
                  </div>

                  {/* 주소, 우편번호 (8:4 비율) */}
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label">주소</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={newCustomerData.address}
                          onChange={(e) => setNewCustomerData({
                            ...newCustomerData,
                            address: e.target.value
                          })}
                          placeholder="주소 입력"
                          readOnly
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => {
                            // @ts-ignore
                            new window.daum.Postcode({
                              oncomplete: function(data: any) {
                                // 도로명 주소 또는 지번 주소 선택
                                const fullAddress = data.roadAddress || data.jibunAddress;
                                setNewCustomerData({
                                  ...newCustomerData,
                                  address: fullAddress,
                                  postal_code: data.zonecode
                                });
                              }
                            }).open();
                          }}
                        >
                          주소 검색
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">우편번호</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.postal_code}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          postal_code: e.target.value
                        })}
                        placeholder="우편번호"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* 대표자, 대표자 휴대폰 */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">대표자</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.president}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          president: e.target.value
                        })}
                        placeholder="대표자명 입력"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">대표자 휴대폰</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomerData.mobile}
                        onChange={(e) => setNewCustomerData({
                          ...newCustomerData,
                          mobile: e.target.value
                        })}
                        placeholder="대표자 휴대폰 입력"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveNewCustomer}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거래명세서 항목 입력 모달 */}
      {showInvoiceModal && (
        <div
          className="modal modal-blur fade show"
          style={{display: 'block'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInvoiceModal(false);
              setShowViewModal(true);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">거래명세표 항목 입력</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setShowViewModal(true);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3">
                  <strong>안내:</strong> 리포트의 시간 및 부품 정보를 기반으로 거래명세서 항목이 자동으로 생성되었습니다.
                  필요에 따라 수정하거나 네고 항목을 추가할 수 있습니다.
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th style={{width: '60px'}}>월</th>
                        <th style={{width: '60px'}}>일</th>
                        <th style={{width: '150px'}}>품목</th>
                        <th style={{width: '150px'}}>규격</th>
                        <th style={{width: '100px'}}>수량</th>
                        <th style={{width: '120px'}}>단가</th>
                        <th style={{width: '120px'}}>합계</th>
                        <th style={{width: '120px'}}>부가세</th>
                        <th style={{width: '80px'}}>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        return invoiceLineItems.map((item, idx) => {
                          // 빈 행 렌더링
                          if (item.isBlank) {
                            return (
                              <tr key={item.id} style={{height: '20px'}}>
                                <td colSpan={9}></td>
                              </tr>
                            );
                          }

                          // 헤더 행 렌더링
                          if (item.isHeader) {
                            const isPartsHeader = item.item_name === '2. 부품 비용';

                            return (
                              <tr
                                key={item.id}
                                draggable={isPartsHeader}
                                onDragStart={(e) => handleDragStart(e, item)}
                                onDragEnd={handleDragEnd}
                                style={{
                                  backgroundColor: '#e7f5ff',
                                  fontWeight: 'bold',
                                  cursor: isPartsHeader ? 'move' : 'default'
                                }}
                              >
                                <td className="text-center">{item.month || ''}</td>
                                <td className="text-center">{item.day || ''}</td>
                                <td colSpan={7}>
                                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    {item.item_name}
                                    {isPartsHeader && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{
                                          flexShrink: 0,
                                          opacity: 0.6,
                                          cursor: 'move'
                                        }}
                                      >
                                        <title>드래그하여 다른 날짜로 이동</title>
                                        <line x1="3" y1="12" x2="21" y2="12"/>
                                        <line x1="3" y1="6" x2="21" y2="6"/>
                                        <line x1="3" y1="18" x2="21" y2="18"/>
                                      </svg>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          // 현재 항목이 dateGroup의 마지막인지 확인
                          // 부품 헤더는 제외하고, 실제 날짜 그룹의 마지막만 체크
                          const isLastOfDateGroup = item.dateGroup &&
                            !item.dateGroup.includes('header-parts') &&
                            (idx === invoiceLineItems.length - 1 ||
                             invoiceLineItems[idx + 1]?.dateGroup !== item.dateGroup ||
                             invoiceLineItems[idx + 1]?.isBlank ||
                             invoiceLineItems[idx + 1]?.item_name === '2. 부품 비용');

                          // 일반 데이터 행 렌더링
                          // 드롭 타겟: 부품 항목이 아니고, 빈 행이나 헤더가 아닌 경우
                          const isDropTarget = !item.dateGroup?.includes('header-parts') && !item.isBlank && !item.isHeader;

                          return (
                            <tr
                              key={item.id}
                              onDragOver={(e) => {
                                if (isDropTarget && draggedItem) {
                                  handleDragOver(e, item.dateGroup || '');
                                }
                              }}
                              onDragLeave={(e) => {
                                if (isDropTarget) {
                                  handleDragLeave();
                                }
                              }}
                              onDrop={(e) => {
                                if (isDropTarget && draggedItem) {
                                  handleDrop(e, item.dateGroup || '');
                                }
                              }}
                              style={{
                                backgroundColor: item.isNego ? '#fff3cd' :
                                               dragOverDateGroup === item.dateGroup ? '#d1ecf1' :
                                               'white',
                                color: item.isNego ? '#dc3545' : 'inherit',
                                transition: 'background-color 0.2s'
                              }}>
                              <td className="text-center" style={{color: item.isNego ? '#dc3545' : 'inherit'}}>
                                {item.month || ''}
                              </td>
                              <td className="text-center" style={{color: item.isNego ? '#dc3545' : 'inherit'}}>
                                {item.day || ''}
                              </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      style={{color: item.isNego ? '#dc3545' : 'inherit'}}
                                      value={item.item_name}
                                      onChange={(e) => updateLineItem(item.id, 'item_name', e.target.value)}
                                      readOnly={!item.isNego && item.item_name !== 'NEGO'}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      style={{color: item.isNego ? '#dc3545' : 'inherit'}}
                                      value={item.specification}
                                      onChange={(e) => updateLineItem(item.id, 'specification', e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="form-control form-control-sm"
                                      style={{color: item.isNego ? '#dc3545' : 'inherit'}}
                                      value={item.quantity}
                                      onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      style={{color: item.isNego ? '#dc3545' : 'inherit'}}
                                      value={item.unit_price.toLocaleString()}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/,/g, '');
                                        updateLineItem(item.id, 'unit_price', value);
                                      }}
                                    />
                                  </td>
                                  <td className="text-end" style={{color: item.isNego ? '#dc3545' : 'inherit'}}>
                                    {item.isNego && item.total_price > 0 ? '-' : ''}{Math.abs(item.total_price).toLocaleString()}
                                  </td>
                                  <td className="text-end" style={{color: item.isNego ? '#dc3545' : 'inherit'}}>
                                    {item.isNego && item.vat > 0 ? '-' : ''}{Math.abs(item.vat).toLocaleString()}
                                  </td>
                                  <td className="text-center">
                                    {item.isNego ? (
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => removeNegoItem(item.id)}
                                        title="네고 삭제"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="18" y1="6" x2="6" y2="18"/>
                                          <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                      </button>
                                    ) : isLastOfDateGroup && (
                                      <button
                                        className="btn btn-sm btn-outline-success"
                                        onClick={() => addNegoItem(item.dateGroup)}
                                        title="네고 추가"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="12" y1="5" x2="12" y2="19"/>
                                          <line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                          );
                        });
                      })()}

                      {/* 합계 행 */}
                      {invoiceLineItems.length > 0 && (
                        <tr style={{backgroundColor: '#e7f5ff', fontWeight: 'bold'}}>
                          <td colSpan={6} className="text-end">합계</td>
                          <td className="text-end">
                            {invoiceLineItems
                              .filter(item => !item.isHeader && !item.isBlank) // 헤더와 빈 행 제외
                              .reduce((sum, item) => {
                                // NEGO 항목은 마이너스로 계산
                                const amount = item.isNego ? -item.total_price : item.total_price;
                                return sum + amount;
                              }, 0).toLocaleString()}
                          </td>
                          <td className="text-end">
                            {invoiceLineItems
                              .filter(item => !item.isHeader && !item.isBlank) // 헤더와 빈 행 제외
                              .reduce((sum, item) => {
                                // NEGO 항목은 마이너스로 계산
                                const amount = item.isNego ? -item.vat : item.vat;
                                return sum + amount;
                              }, 0).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      )}

                      {invoiceLineItems.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-4">
                            생성된 항목이 없습니다. 리포트에 시간 정보나 부품 정보를 추가해주세요.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setShowViewModal(true);
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleFinalizeInvoice}
                  disabled={invoiceLineItems.length === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M5 12l5 5l10 -10"/>
                  </svg>
                  거래명세서 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default ServiceReports;