import React, { useState, useMemo } from 'react';
import { AssessmentRecord } from '../types';
import { Search, Calendar, User, ArrowUpDown, ChevronRight, Activity, AlertCircle, Wind, Scale, Cigarette, LayoutGrid, List as ListIcon, Trash2, Filter, X } from 'lucide-react';

interface PatientListProps {
  records: AssessmentRecord[];
  onSelect: (record: AssessmentRecord) => void;
  onDelete?: (id: string) => void;
}

const PatientList: React.FC<PatientListProps> = ({ records, onSelect, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'age'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gold: '' as 'A' | 'B' | 'E' | '' | 'all',
    severity: '' as 'gold1' | 'gold2' | 'gold3' | 'gold4' | '' | 'all',
    phenotype: '' as 'eosinophilic' | 'emphysema' | 'chronicBronchitis' | 'aco' | '' | 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Helper functions for filtering
  const classifyGOLD = (record: AssessmentRecord): 'A' | 'B' | 'E' | 'unknown' => {
    const exac = parseInt(record.data.exacerbationsLast12m || '0');
    const hosp = parseInt(record.data.hospitalizationsLast12m || '0');
    const cat = parseInt(record.data.catScore || '0');
    const mMRC = parseInt(record.data.mMRC || '0');

    if (exac >= 2 || hosp >= 1) return 'E';
    const lowSymptoms = (cat < 10 && cat > 0) || mMRC <= 1;
    if (lowSymptoms) return 'A';
    const highSymptoms = cat >= 10 || mMRC >= 2;
    if (highSymptoms) return 'B';
    return 'unknown';
  };

  const classifySeverity = (fev1Percent: string): 'gold1' | 'gold2' | 'gold3' | 'gold4' | 'unknown' => {
    const fev1 = parseFloat(fev1Percent || '0');
    if (fev1 >= 80) return 'gold1';
    if (fev1 >= 50) return 'gold2';
    if (fev1 >= 30) return 'gold3';
    if (fev1 > 0) return 'gold4';
    return 'unknown';
  };

  const detectPhenotype = (record: AssessmentRecord) => {
    const eos = parseFloat(record.data.eosinophils || '0');
    const isReversible = record.data.postBdReversibility;
    const hasEmphysema = /khí phế thũng|emphysema|kén khí|bullae|giãn phế nang/i.test(record.data.imagingFindings || '');
    const hasChronicBronchitis = record.data.cough && record.data.sputum;

    return {
      eosinophilic: eos >= 300,
      emphysema: hasEmphysema,
      chronicBronchitis: hasChronicBronchitis,
      aco: isReversible || eos >= 300,
    };
  };

  const filteredAndSortedRecords = useMemo(() => {
    // Filter
    let result = records.filter(r => {
      // Search filter
      const name = r.data.patientName?.toLowerCase() || '';
      const id = r.id.toLowerCase();
      const term = searchTerm.toLowerCase();
      if (term && !name.includes(term) && !id.includes(term)) return false;

      // GOLD filter
      if (filters.gold && filters.gold !== 'all') {
        const gold = classifyGOLD(r);
        if (gold !== filters.gold) return false;
      }

      // Severity filter
      if (filters.severity && filters.severity !== 'all') {
        const severity = classifySeverity(r.data.fev1Percent || '');
        if (severity !== filters.severity) return false;
      }

      // Phenotype filter
      if (filters.phenotype && filters.phenotype !== 'all') {
        const phenotype = detectPhenotype(r);
        if (!phenotype[filters.phenotype]) return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom).getTime();
        if (r.timestamp < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo).getTime() + 86400000; // Add 1 day
        if (r.timestamp > toDate) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          const nameA = a.data.patientName || 'Chưa đặt tên';
          const nameB = b.data.patientName || 'Chưa đặt tên';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'age':
          const ageA = parseInt(a.data.age || '0');
          const ageB = parseInt(b.data.age || '0');
          comparison = ageA - ageB;
          break;
        case 'date':
        default:
          comparison = a.timestamp - b.timestamp;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, searchTerm, sortBy, sortOrder, filters]);

  const clearFilters = () => {
    setFilters({
      gold: '',
      severity: '',
      phenotype: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = filters.gold || filters.severity || filters.phenotype || filters.dateFrom || filters.dateTo;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFev1Config = (fev1: string) => {
    const val = parseFloat(fev1);
    if (isNaN(val)) return { 
      bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', iconColor: 'text-slate-400',
      label: 'N/A'
    };
    if (val < 50) return { 
      bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', iconColor: 'text-red-500',
      label: 'Nặng (<50%)'
    };
    if (val < 80) return { 
      bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconColor: 'text-amber-500',
      label: 'Trung bình (50-79%)'
    };
    return { 
      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconColor: 'text-emerald-500',
      label: 'Nhẹ (≥80%)'
    };
  };

  const getCatStyle = (cat: string) => {
    const val = parseInt(cat);
    if (isNaN(val)) return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', iconColor: 'text-slate-400' };
    if (val >= 10) return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', iconColor: 'text-purple-500' };
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconColor: 'text-emerald-500' };
  };

  const getExacStyle = (exac: string, hosp: string) => {
    const e = parseInt(exac) || 0;
    const h = parseInt(hosp) || 0;
    if (e >= 2 || h >= 1) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', iconColor: 'text-red-500' };
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconColor: 'text-blue-500' };
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Chưa có hồ sơ nào</h3>
        <p className="text-slate-500 mt-2">Các đánh giá đã thực hiện sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search, Sort and View Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
          <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">Sắp xếp:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="date">Ngày đánh giá</option>
            <option value="name">Tên bệnh nhân</option>
            <option value="age">Tuổi</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
            title={sortOrder === 'asc' ? "Tăng dần" : "Giảm dần"}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* View Mode Toggle */}
          <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block"></div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
             <button
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               title="Dạng danh sách"
             >
               <ListIcon className="w-5 h-5" />
             </button>
             <button
               onClick={() => setViewMode('card')}
               className={`p-1.5 rounded transition-all ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               title="Dạng thẻ lưới"
             >
               <LayoutGrid className="w-5 h-5" />
             </button>
          </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Bộ lọc nâng cao</span>
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {[filters.gold, filters.severity, filters.phenotype, filters.dateFrom, filters.dateTo].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Xóa bộ lọc
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GOLD A/B/E</label>
                <select
                  value={filters.gold}
                  onChange={(e) => setFilters({ ...filters, gold: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Tất cả</option>
                  <option value="A">GOLD A</option>
                  <option value="B">GOLD B</option>
                  <option value="E">GOLD E</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mức độ</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Tất cả</option>
                  <option value="gold1">GOLD 1 (Nhẹ)</option>
                  <option value="gold2">GOLD 2 (TB)</option>
                  <option value="gold3">GOLD 3 (Nặng)</option>
                  <option value="gold4">GOLD 4 (Rất nặng)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phenotype</label>
                <select
                  value={filters.phenotype}
                  onChange={(e) => setFilters({ ...filters, phenotype: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Tất cả</option>
                  <option value="eosinophilic">Eosinophilic</option>
                  <option value="emphysema">Khí phế thũng</option>
                  <option value="chronicBronchitis">Viêm PQ mạn</option>
                  <option value="aco">ACO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient Grid/List */}
      <div className={`grid gap-4 ${viewMode === 'card' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {filteredAndSortedRecords.length === 0 ? (
           <div className="col-span-full text-center py-8 text-slate-500">Không tìm thấy bệnh nhân nào phù hợp.</div>
        ) : (
          filteredAndSortedRecords.map((record) => {
            const fev1Config = getFev1Config(record.data.fev1Percent);
            const catStyle = getCatStyle(record.data.catScore);
            const exacStyle = getExacStyle(record.data.exacerbationsLast12m, record.data.hospitalizationsLast12m);

            return (
            <div
              key={record.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col h-full relative"
            >
              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(record.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Xóa đánh giá này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <div 
                onClick={() => onSelect(record)}
                className="flex justify-between items-start mb-4 flex-1 cursor-pointer"
              >
                <div className="flex gap-4 w-full">
                  <div className="w-12 h-12 bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors rounded-full flex items-center justify-center shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                       <div>
                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                            {record.data.patientName || 'Bệnh nhân ẩn danh'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {/* Age */}
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {record.data.age ? `${record.data.age} tuổi` : 'N/A'}
                              </span>
                              {/* Sex */}
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {record.data.sex}
                              </span>
                              {/* BMI */}
                              {record.data.bmi && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 gap-1">
                                  <Scale className="w-3 h-3 text-slate-400" />
                                  {record.data.bmi}
                                </span>
                              )}
                              {/* Smoking Status */}
                              {record.data.smokingHistory && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border gap-1 ${
                                  record.data.smokingHistory === 'Đang hút thuốc'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  <Cigarette className="w-3 h-3" />
                                  {record.data.smokingHistory === 'Đang hút thuốc' ? 'Đang hút' : record.data.smokingHistory === 'Đã cai thuốc' ? 'Đã cai' : 'Chưa hút'}
                                  {record.data.packYears ? ` (${record.data.packYears} PA)` : ''}
                                </span>
                              )}
                            </div>
                       </div>
                       <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 whitespace-nowrap ml-2">
                            <Calendar className="w-3 h-3" />
                            {formatDate(record.timestamp)}
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlighted Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 mt-auto">
                 {/* FEV1 */}
                 <div title={fev1Config.label} className={`flex flex-col items-center justify-center p-2 rounded-lg border ${fev1Config.bg} ${fev1Config.border}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <Wind className={`w-3.5 h-3.5 ${fev1Config.iconColor}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${fev1Config.text}`}>FEV1</span>
                    </div>
                    <span className={`text-sm font-bold ${fev1Config.text}`}>
                       {record.data.fev1Percent ? `${record.data.fev1Percent}%` : 'N/A'}
                    </span>
                 </div>

                 {/* CAT Score */}
                 <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${catStyle.bg} ${catStyle.border}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <Activity className={`w-3.5 h-3.5 ${catStyle.iconColor}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${catStyle.text}`}>CAT</span>
                    </div>
                    <span className={`text-sm font-bold ${catStyle.text}`}>
                       {record.data.catScore || 'N/A'}
                    </span>
                 </div>

                 {/* Exacerbations */}
                 <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${exacStyle.bg} ${exacStyle.border}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <AlertCircle className={`w-3.5 h-3.5 ${exacStyle.iconColor}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${exacStyle.text}`}>Đợt cấp</span>
                    </div>
                    <span className={`text-sm font-bold ${exacStyle.text}`}>
                       {record.data.exacerbationsLast12m || '0'}
                    </span>
                 </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PatientList;