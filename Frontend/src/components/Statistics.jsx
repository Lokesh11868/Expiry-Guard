import React, { useState, useEffect, lazy, Suspense } from 'react';
import { getStatistics } from '../services/productService';
import { Package, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
const Doughnut = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })));
let chartRegistered = false;
const registerChartJS = () => {
  if (chartRegistered) return;
  import('chart.js').then(({ Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement }) => {
    Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
    chartRegistered = true;
  });
};

const StatCard = ({ title, value, Icon, color, bgColor }) => (
  <div className={`${bgColor} p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${color} bg-white`}><Icon className="h-6 w-6" /></div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-4">{title}</h2>
    {children}
  </div>
);

const LoadingSpinner = ({ className = '' }) => (
  <div className={`flex justify-center items-center h-64 ${className}`}><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
);

const Statistics = () => {
  const [stats, setStats] = useState({
    total_items: 0,
    expiring_this_week: 0,
    expired_items: 0,
    monthly_data: [],
    status_breakdown: { safe: 0, near: 0, expired: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    registerChartJS();
  }, []);

  const fetchStatistics = async () => {
    try {
      const data = await getStatistics();
      setStats(data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };


  const doughnutData = {
    labels: ['Safe', 'Near Expiry', 'Expired'],
    datasets: [{
      data: [stats.status_breakdown.safe, stats.status_breakdown.near, stats.status_breakdown.expired],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Product Statistics' }
    }
  };

  if (loading) return <LoadingSpinner className="py-12" />;
  return (
    <div className="max-w-3xl mx-auto p-2 sm:p-4 md:p-8 bg-white rounded-lg shadow space-y-6">
      <h1 className="text-2xl font-bold">Interactive Statistics Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={stats.total_items} Icon={Package} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Expiring This Week" value={stats.expiring_this_week} Icon={Clock} color="text-yellow-600" bgColor="bg-yellow-50" />
        <StatCard title="Expired Items" value={stats.expired_items} Icon={AlertTriangle} color="text-red-600" bgColor="bg-red-50" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard title="Product Status Distribution">
          <div className="h-64">
            <Suspense fallback={<LoadingSpinner className="h-full" />}>
              <Doughnut data={doughnutData} options={chartOptions} />
            </Suspense>
          </div>
        </ChartCard>
      </div>
      <ChartCard title="Quick Insights">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="space-y-2">
            <p>• Total inventory: {stats.total_items} products</p>
            <p>• Items needing attention: {stats.expiring_this_week} this week</p>
          </div>
          <div className="space-y-2">
            <p>• Expired items to remove: {stats.expired_items}</p>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};

export default Statistics;