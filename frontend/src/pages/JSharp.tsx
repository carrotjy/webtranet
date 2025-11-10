import React, { useState, useRef } from 'react';

type TabType = 'convert' | 'option' | 'order' | 'product-page';
type ConvertSection = 'resize' | 'merge';

interface ProductPageRow {
  id: number;
  text: string;
  image: File | null;
}

const JSharp: React.FC = () => {
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

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
            <h2 className="page-title">J# Web Solution</h2>
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

                {/* 주문관리 탭 */}
                {activeTab === 'order' && (
                  <div className="text-center py-5">
                    <div className="empty">
                      <div className="empty-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-shopping-cart" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                          <circle cx="6" cy="19" r="2"></circle>
                          <circle cx="17" cy="19" r="2"></circle>
                          <path d="M17 17h-11v-14h-2"></path>
                          <path d="M6 5l14 1l-1 7h-13"></path>
                        </svg>
                      </div>
                      <p className="empty-title">주문관리 기능</p>
                      <p className="empty-subtitle text-muted">
                        주문관리 기능은 곧 추가될 예정입니다.
                      </p>
                    </div>
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
    </div>
  );
};

export default JSharp;
