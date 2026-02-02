import React from 'react';
import { Statistics } from '../services/statisticsService';
import { Activity, Users, TrendingUp, AlertTriangle, Wind, BarChart3, PieChart } from 'lucide-react';

interface StatisticsDashboardProps {
  statistics: Statistics;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ statistics }) => {
  const total = statistics.totalPatients;
  if (total === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500">Chưa có dữ liệu để thống kê</p>
      </div>
    );
  }

  const goldTotal = statistics.goldDistribution.a + statistics.goldDistribution.b + 
                   statistics.goldDistribution.e + statistics.goldDistribution.unknown;
  const severityTotal = statistics.severityDistribution.gold1 + statistics.severityDistribution.gold2 +
                       statistics.severityDistribution.gold3 + statistics.severityDistribution.gold4;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng số bệnh nhân</p>
              <p className="text-2xl font-bold text-slate-800">{total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Wind className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">FEV1% trung bình</p>
              <p className="text-2xl font-bold text-slate-800">
                {statistics.averageFEV1 > 0 ? statistics.averageFEV1.toFixed(1) : 'N/A'}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">CAT trung bình</p>
              <p className="text-2xl font-bold text-slate-800">
                {statistics.averageCAT > 0 ? statistics.averageCAT.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Đợt cấp TB/năm</p>
              <p className="text-2xl font-bold text-slate-800">
                {statistics.averageExacerbations.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GOLD Distribution */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-600" />
          Phân bố GOLD A/B/E
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'a', label: 'GOLD A', color: 'bg-emerald-500', count: statistics.goldDistribution.a },
            { key: 'b', label: 'GOLD B', color: 'bg-blue-500', count: statistics.goldDistribution.b },
            { key: 'e', label: 'GOLD E', color: 'bg-red-500', count: statistics.goldDistribution.e },
            { key: 'unknown', label: 'Chưa xác định', color: 'bg-slate-400', count: statistics.goldDistribution.unknown },
          ].map(item => (
            <div key={item.key} className="text-center">
              <div className={`${item.color} text-white rounded-lg p-4 mb-2`}>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs opacity-90">{item.label}</p>
              </div>
              {goldTotal > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {((item.count / goldTotal) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Phân bố Mức độ Tắc nghẽn
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { key: 'gold1', label: 'GOLD 1 (Nhẹ)', color: 'bg-emerald-500', count: statistics.severityDistribution.gold1 },
            { key: 'gold2', label: 'GOLD 2 (TB)', color: 'bg-blue-500', count: statistics.severityDistribution.gold2 },
            { key: 'gold3', label: 'GOLD 3 (Nặng)', color: 'bg-amber-500', count: statistics.severityDistribution.gold3 },
            { key: 'gold4', label: 'GOLD 4 (Rất nặng)', color: 'bg-red-500', count: statistics.severityDistribution.gold4 },
            { key: 'unknown', label: 'Chưa xác định', color: 'bg-slate-400', count: statistics.severityDistribution.unknown },
          ].map(item => (
            <div key={item.key} className="text-center">
              <div className={`${item.color} text-white rounded-lg p-4 mb-2`}>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs opacity-90">{item.label}</p>
              </div>
              {severityTotal > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {((item.count / severityTotal) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Phenotype Distribution */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-600" />
          Phân bố Phenotype
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'eosinophilic', label: 'Eosinophilic', count: statistics.phenotypeDistribution.eosinophilic, color: 'bg-purple-500' },
            { key: 'emphysema', label: 'Khí phế thũng', count: statistics.phenotypeDistribution.emphysema, color: 'bg-blue-500' },
            { key: 'chronicBronchitis', label: 'Viêm PQ mạn', count: statistics.phenotypeDistribution.chronicBronchitis, color: 'bg-cyan-500' },
            { key: 'aco', label: 'ACO', count: statistics.phenotypeDistribution.aco, color: 'bg-orange-500' },
          ].map(item => (
            <div key={item.key} className="text-center">
              <div className={`${item.color} text-white rounded-lg p-4 mb-2`}>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs opacity-90">{item.label}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {((item.count / total) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
