import React, { useState, useEffect } from 'react';
import { customerAPI, serviceReportAPI, resourceAPI, authAPI, userAPI } from '../services/api';

interface Customer {
  id: number;
  company_name: string;
  contact_person: string;
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

interface ServiceReport {
  id: number;
  report_number: string;
  customer_id: number;
  customer_name?: string;
  technician_id: number;
  technician_name?: string;
  machine_model: string;
  machine_serial: string;
  symptom?: string;
  details?: string;
  problem_description?: string;
  solution_description?: string;
  service_date?: string;
  status?: string;
  work_hours?: number;
  parts_used?: string;
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
  resource_id: number;
  machine_model: string;
  machine_serial: string;
  symptom: string;
  details: string;
  service_date: string;
  used_parts: UsedPart[];
  time_records: TimeRecord[];
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
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<ServiceReport | null>(null);
  
  // 폼 데이터 기본값 함수
  const getDefaultFormData = (): FormData => ({
    customer_id: 0,
    customer_name: '',
    customer_address: '',
    technician_id: 1,
    technician_name: '현재 사용자', // TODO: 로그인 사용자 정보에서 가져오기
    resource_id: 0,
    machine_model: '',
    machine_serial: '',
    symptom: '',
    details: '',
    service_date: new Date().toISOString().split('T')[0], // 오늘 날짜를 기본값으로
    used_parts: [],
    time_records: []
  });
  
  const [formData, setFormData] = useState<FormData>(getDefaultFormData());
  
  // 고객 관련 상태
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  // 기술부 직원 관련 상태
  const [technicians, setTechnicians] = useState<{id: number, name: string}[]>([]);
  const [currentUser, setCurrentUser] = useState<{id: number, name: string, department: string} | null>(null);

  useEffect(() => {
    loadReports();
    loadCustomers();
    loadCurrentUser();
    loadTechnicians();
  }, []);

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

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await serviceReportAPI.getServiceReports();
      // API 응답에서 reports 배열 추출
      const reportData = response.data?.reports || [];
      if (process.env.NODE_ENV === 'development') {
        console.log('Service Report API Response:', response.data);
        console.log('Extracted Reports:', reportData);
      }
      setReports(Array.isArray(reportData) ? reportData : []);
    } catch (error) {
      console.error('서비스 리포트 로딩 실패:', error);
      setReports([]); // 오류 시 빈 배열로 초기화
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getCustomers();
      // API 응답에서 customers 배열 추출
      const customerData = response.data?.customers || [];
      if (process.env.NODE_ENV === 'development') {
        console.log('Customer API Response:', response.data);
        console.log('Extracted Customers:', customerData);
      }
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

  // 전체 고객 리스트 표시 함수
  const showAllCustomers = async () => {
    try {
      const response = await customerAPI.getCustomers();
      const allCustomers = response.data?.customers || response.data || [];
      
      setCustomerSearchResults(allCustomers.slice(0, 15)); // 15개로 제한
      setShowCustomerSearch(allCustomers.length > 0);
    } catch (error) {
      console.error('고객 리스트 로딩 실패:', error);
      // API 실패 시 로컬 customers 배열 사용
      setCustomerSearchResults(customers.slice(0, 15));
      setShowCustomerSearch(customers.length > 0);
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
      ).slice(0, 15); // 15개로 제한 (페이지네이션)
      
      setCustomerSearchResults(filteredCustomers);
      setShowCustomerSearch(filteredCustomers.length > 0);
    } catch (error) {
      console.error('고객 검색 실패:', error);
      // API 실패 시 로컬 customers 배열에서 검색
      const filteredCustomers = customers.filter(customer =>
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 15);
      
      setCustomerSearchResults(filteredCustomers);
      setShowCustomerSearch(filteredCustomers.length > 0);
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
      const resourceData = resourceResponse.data?.resources || resourceResponse.data || [];
      if (process.env.NODE_ENV === 'development') {
        console.log('Resource API Response:', resourceResponse.data);
      }
      
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

  // 사용부품 관련 함수들 (핵심 기능)
  const addUsedPart = () => {
    const newPart: UsedPart = {
      part_name: '',
      part_number: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
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

  const updateUsedPart = (index: number, field: keyof UsedPart, value: string | number) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('=== 서비스 리포트 제출 시작 ===');
      console.log('editingReport:', editingReport);
      console.log('현재 formData:', formData);
      console.log('formData.used_parts:', formData.used_parts);
      console.log('used_parts 길이:', formData.used_parts.length);
      
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
        machine_model: formData.machine_model,
        machine_serial: formData.machine_serial,
        service_date: formData.service_date,
        problem_description: formData.symptom,
        solution_description: formData.details,
        used_parts: formData.used_parts, // 배열 형태로 전송
        time_records: convertedTimeRecords, // 새로운 time_records 배열 사용
        time_record: convertedTimeRecords.length > 0 ? convertedTimeRecords[0] : null, // 백워드 호환성용
        work_hours: 0, // 필요시 time_record에서 계산
        status: 'completed'
      };
      
      console.log('제출할 데이터:', submitData);
      console.log('제출할 used_parts:', submitData.used_parts);
      console.log('JSON.stringify(submitData):', JSON.stringify(submitData, null, 2));

      if (editingReport) {
        // 수정 모드
        console.log('수정 모드: 리포트 ID', editingReport.id);
        const response = await serviceReportAPI.updateServiceReport(editingReport.id, submitData);
        console.log('수정 API 응답:', response);
        alert('서비스 리포트가 수정되었습니다.');
      } else {
        // 새로 생성 모드
        console.log('생성 모드');
        const response = await serviceReportAPI.createServiceReport(submitData);
        console.log('생성 API 응답:', response);
        alert('서비스 리포트가 생성되었습니다.');
      }
      
      // 폼 닫기 및 초기화
      setShowForm(false);
      setEditingReport(null);
      
      // 목록 새로고침
      console.log('목록 새로고침 시작');
      await loadReports();
      console.log('=== 서비스 리포트 제출 완료 ===');
      
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
  const handleEdit = (report: ServiceReport) => {
    console.log('=== 수정 모달 열기 시작 ===');
    console.log('선택한 리포트:', report);
    console.log('리포트의 used_parts:', report.used_parts);
    console.log('리포트의 parts_used:', (report as any).parts_used);
    
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
    
    console.log('수정 폼에 설정할 부품 데이터:', editPartsData);
    console.log('부품 개수:', editPartsData.length);
    
    // 시간기록 데이터 처리 (새로운 time_records 배열 우선 확인)
    let editTimeRecordsData: TimeRecord[] = [];
    const timeRecords = (report as any).time_records;
    const timeRecord = report.time_record;
    
    console.log('리포트의 time_records:', timeRecords);
    console.log('리포트의 time_record:', timeRecord);
    
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
    
    console.log('수정 폼에 설정할 시간기록 데이터:', editTimeRecordsData);
    console.log('시간기록 개수:', editTimeRecordsData.length);
    
    setFormData({
      customer_id: report.customer_id,
      customer_name: report.customer_name || '',
      customer_address: '', // TODO: 고객 주소 정보 가져오기
      technician_id: report.technician_id,
      technician_name: report.technician_name || '',
      resource_id: 0, // TODO: 리소스 ID 가져오기
      machine_model: report.machine_model,
      machine_serial: report.machine_serial,
      symptom: report.problem_description || report.symptom || '',
      details: report.solution_description || report.details || '',
      service_date: report.service_date || new Date().toISOString().split('T')[0],
      used_parts: editPartsData,
      time_records: editTimeRecordsData
    });
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
          .hover-row:hover {
            background-color: #f8f9fa !important;
            transform: scale(1.005);
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .hover-row:hover td {
            background-color: #f8f9fa !important;
          }
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
              <input
                type="text"
                className="form-control"
                placeholder="검색어를 입력하세요 (고객사, 담당자, 모델, S/N, 작업내용, 날짜: yymmdd 형식)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
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
                  새 리포트 작성
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ marginTop: '6px' }}>
        <div className="container-xl">
          <div className="card">
            <div className="card-header" style={{ padding: '0.75rem', height: '3.25rem', display: 'flex', alignItems: 'center' }}>
              <small className="text-muted">💡 DATE / SN 헤더 클릭 시 정렬 가능</small>
            </div>
            <div className="table-responsive">
              <table className="table card-table table-vcenter text-nowrap datatable table-bordered">
                <thead className="table-light">
                  <tr style={{ height: '3.25rem' }}>
                    <th 
                      style={{
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        padding: '0.75rem'
                      }}
                      className="sortable-header"
                      onClick={() => handleSort('date')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        e.currentTarget.style.fontWeight = 'bold';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.boxShadow = '';
                        e.currentTarget.style.fontWeight = '';
                      }}
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
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        padding: '0.75rem'
                      }}
                      className="sortable-header"
                      onClick={() => handleSort('sn')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        e.currentTarget.style.fontWeight = 'bold';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.boxShadow = '';
                        e.currentTarget.style.fontWeight = '';
                      }}
                    >
                      Sn {getSortIcon('sn')}
                    </th>
                    <th style={{ padding: '0.75rem' }}>Job Description</th>
                    <th className="w-1" style={{ padding: '0.75rem' }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedReports.length > 0 ? filteredAndSortedReports.map((report) => (
                    <tr key={report.id} className="hover-row" style={{backgroundColor: '#fdfdfd'}}>
                      <td className="bg-white text-center">{getLatestWorkDate(report)}</td>
                      <td className="bg-white fw-medium">{report.customer_name}</td>
                      <td className="bg-white">{report.technician_name}</td>
                      <td className="bg-white">{report.machine_model}</td>
                      <td className="bg-white">{report.machine_serial}</td>
                      <td className="bg-white text-wrap" style={{maxWidth: '200px'}}>
                        {report.problem_description || report.symptom}
                      </td>
                      <td className="bg-white text-center">
                        <div className="btn-list flex-nowrap">
                          <button 
                            className="btn btn-sm btn-outline-info"
                            onClick={() => handleView(report)}
                          >
                            보기
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(report.id)}
                          >
                            삭제
                          </button>
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
          </div>
        </div>
      </div>

      {/* 서비스 리포트 작성/수정 모달 */}
      {showForm && (
        <div className="modal modal-blur fade show" style={{display: 'block'}}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingReport ? '서비스 리포트 수정' : '서비스 리포트 작성'}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowForm(false);
                    setEditingReport(null);
                    setFormData(getDefaultFormData());
                    setCustomerResources([]);
                    setShowCustomerSearch(false);
                  }}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  {/* 첫 번째 행: 서비스일자, 서비스담당 */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">서비스 날짜</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.service_date}
                        onChange={(e) => setFormData({...formData, service_date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
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
                          {showCustomerSearch && customerSearchResults.length > 0 && (
                            <div className="position-absolute w-100 mt-1" style={{zIndex: 1000}}>
                              <div className="list-group shadow">
                                {customerSearchResults.map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    className="list-group-item list-group-item-action"
                                    onClick={() => handleSelectCustomer(customer)}
                                  >
                                    <strong>{customer.company_name}</strong>
                                    <small className="text-muted d-block">{customer.contact_person} | {customer.address}</small>
                                  </button>
                                ))}
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
                      {customerResources.length > 0 ? (
                        <select
                          className="form-select"
                          value={formData.resource_id}
                          onChange={(e) => {
                            const resourceId = parseInt(e.target.value);
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
                              <th>부품명</th>
                              <th>부품번호</th>
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
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={part.part_name}
                                    onChange={(e) => updateUsedPart(index, 'part_name', e.target.value)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={part.part_number || ''}
                                    onChange={(e) => updateUsedPart(index, 'part_number', e.target.value)}
                                  />
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

                  <div className="row mt-4">
                    <div className="col-12 d-flex gap-2 justify-content-end">
                      <button type="submit" className="btn btn-primary">
                        {editingReport ? '수정' : '저장'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowForm(false);
                          setEditingReport(null);
                          setFormData(getDefaultFormData());
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
        <div className="modal modal-blur fade show" style={{display: 'block', zIndex: 2000}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">고객 선택</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setCustomerSearchTerm('');
                  }}
                />
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
                  <table className="table table-sm table-hover">
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
        <div className="modal modal-blur fade show" style={{display: 'block', zIndex: 2000}}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">서비스 리포트 상세 보기</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingReport(null);
                  }}
                />
              </div>
              <div className="modal-body">
                {/* 기본 정보 - 표 형태 */}
                <div className="mb-4">
                  <h5 className="mb-3">기본 정보</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                      <tbody>
                        <tr>
                          <td className="bg-light fw-bold" style={{width: '150px'}}>서비스 날짜</td>
                          <td className="bg-white">
                            {viewingReport.service_date ? new Date(viewingReport.service_date).toLocaleDateString('ko-KR') : '-'}
                          </td>
                          <td className="bg-light fw-bold" style={{width: '100px'}}>서비스담당</td>
                          <td className="bg-white">{viewingReport.technician_name || '-'}</td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold">고객명</td>
                          <td className="bg-white" colSpan={3}>{viewingReport.customer_name || '-'}</td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold">고객사 주소</td>
                          <td className="bg-white" colSpan={3}>
                            {/* TODO: 고객사 주소 정보 표시 */}
                            고객사 주소 정보
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
                {(() => {
                  // used_parts가 배열인지 문자열인지 확인하고 처리
                  let partsData: any[] = [];
                  const usedParts = viewingReport.used_parts as any;
                  const partsUsed = (viewingReport as any).parts_used;
                  
                  if (Array.isArray(usedParts)) {
                    partsData = usedParts;
                  } else if (typeof usedParts === 'string' && usedParts.trim()) {
                    // 문자열 형태의 used_parts를 파싱
                    partsData = [{
                      part_name: usedParts,
                      part_number: '-',
                      quantity: '-',
                      unit_price: 0,
                      total_price: 0
                    }];
                  } else if (partsUsed && typeof partsUsed === 'string' && partsUsed.trim()) {
                    // backend의 parts_used 필드 확인
                    partsData = [{
                      part_name: partsUsed,
                      part_number: '-',
                      quantity: '-',
                      unit_price: 0,
                      total_price: 0
                    }];
                  }
                  
                  return partsData.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">사용부품 내역</h5>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>부품명</th>
                              <th>부품번호</th>
                              <th>수량</th>
                              <th>단가</th>
                              <th>총액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partsData.map((part: any, index: number) => (
                              <tr key={index}>
                                <td className="bg-white">{part.part_name || '-'}</td>
                                <td className="bg-white">{part.part_number || '-'}</td>
                                <td className="bg-white text-center">{part.quantity || '-'}</td>
                                <td className="bg-white text-end">{typeof part.unit_price === 'number' ? part.unit_price.toLocaleString() : (part.unit_price || '0')}</td>
                                <td className="bg-white text-end fw-bold">{typeof part.total_price === 'number' ? part.total_price.toLocaleString() : (part.total_price || '0')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

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

                <div className="row mt-4">
                  <div className="col-12 d-flex gap-2 justify-content-end">
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
      </div>
    </>
  );
};

export default ServiceReports;