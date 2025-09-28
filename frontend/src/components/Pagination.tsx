import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPreviousPage,
  onNextPage
}) => {
  if (totalPages <= 1) return null;

  // 항상 현재 페이지를 중앙에 배치 (±3개씩 총 7개 페이지 표시)
  const maxVisiblePages = 7;
  const halfVisible = Math.floor(maxVisiblePages / 2); // 3
  
  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, currentPage + halfVisible);
  
  // 현재 페이지가 중앙에 오도록 조정
  if (currentPage <= halfVisible) {
    // 시작 부분에서는 1부터 시작
    startPage = 1;
    endPage = Math.min(totalPages, maxVisiblePages);
  } else if (currentPage > totalPages - halfVisible) {
    // 끝 부분에서는 끝에서 역산
    startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    endPage = totalPages;
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const buttonStyle = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    minWidth: '32px',
    padding: '8px'
  };

  const disabledStyle = {
    ...buttonStyle,
    cursor: 'not-allowed',
    opacity: 0.5
  };

  return (
    <div className="d-flex flex-column align-items-center mt-4">
      <div className="text-muted mb-3">
        총 {totalItems}개 항목 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}개 표시
      </div>
      
      <div className="d-flex align-items-center gap-1">
        {/* 맨 처음으로 */}
        <button 
          className="btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={currentPage === 1 ? disabledStyle : buttonStyle}
        >
          &lt;&lt;
        </button>
        
        {/* 이전 페이지 */}
        <button 
          className="btn"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          style={currentPage === 1 ? disabledStyle : buttonStyle}
        >
          &lt;
        </button>
        
        {/* 페이지 번호들 */}
        {pages.map(page => (
          <button
            key={page}
            className="btn"
            onClick={() => onPageChange(page)}
            style={{ 
              ...buttonStyle,
              fontWeight: currentPage === page ? 'bold' : 'normal'
            }}
          >
            {page}
          </button>
        ))}
        
        {/* 다음 페이지 */}
        <button 
          className="btn"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? disabledStyle : buttonStyle}
        >
          &gt;
        </button>

        {/* 맨 끝으로 */}
        <button 
          className="btn"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? disabledStyle : buttonStyle}
        >
          &gt;&gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination;