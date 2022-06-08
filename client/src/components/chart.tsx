import Big from 'big.js';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
  import { Bar } from 'react-chartjs-2';
import { db_weekly } from '../model';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Estimation',
      },
    },
  };

  const charData = Array.from(db_weekly.entries()).map(([key, report]) => ({
    day: new Date(key).toLocaleDateString(),
    count: report.count,
    eta: report.eta,
    live_est: report.eta - Big(report.logged).div(3600).div(8).round(2).toNumber(),
    logged: Big(report.logged).div(3600).div(8).round(2).toNumber(),
  }));
  
  const cData = {
    labels: charData.map(_ => _.day),
    datasets: [
      {
        label: 'Count',
        data: charData.map(_ => _.count),
        backgroundColor: '#003f5c',
      },
      {
        label: 'ETA',
        data: charData.map(_ => Number(_.eta)),
        backgroundColor: '#58508d',
      },
      {
        label: 'LiveETA',
        data: charData.map(_ => Number(_.live_est)),
        backgroundColor: '#bc5090',
      },
      {
        label: 'Logged',
        data: charData.map(_ => _.logged),
        backgroundColor: '#ff6361',
      },
    ],
  };

export const Chart = () => {
    return <Bar options={options} data={cData} />
}