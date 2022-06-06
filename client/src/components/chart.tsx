import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
  import { Line } from 'react-chartjs-2';
import { reports } from '../model';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
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

  const charData = reports.map(report => ({
    day: new Date(report.key).toLocaleDateString(),
    count: report.tickets.length,
    eta: report.eta,
    live_est: report.eta - report.logged,
    logged: report.logged
  }));
  
  const cData = {
    labels: charData.map(_ => _.day),
    datasets: [
      {
        label: 'Count',
        data: charData.map(_ => _.count),
        borderColor: 'rgb(255, 0, 0)',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
      },
      {
        label: 'ETA',
        data: charData.map(_ => Number(_.eta)),
        borderColor: 'rgb(0, 255, 0)',
        backgroundColor: 'rgba(0, 255, 0, 0.5)',
      },
      {
        label: 'LiveETA',
        data: charData.map(_ => Number(_.live_est)),
        borderColor: 'rgb(0, 0, 255)',
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
      },
      {
        label: 'Logged',
        data: charData.map(_ => _.logged),
        borderColor: 'rgb(50, 200, 200)',
        backgroundColor: 'rgba(50, 200, 200, 0.5)',
      },
    ],
  };

export const Chart = () => {
    return <Line options={options} data={cData} />
}