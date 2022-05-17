import { useState } from 'react';
import './App.css';
import data from './tickets_history.json'
import { Box, MenuItem, Select, Tab, Tabs, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
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
import React from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function onlyUnique(value: any, index: any, self: string | any[]) {
  return self.indexOf(value) === index;
}

type Story = (typeof data)[number]['stories'][number];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function App() {

  const stories = data.reverse().reduce((acc, cur) => {

    const sKeys = acc.map(_ => _.key);

    return [...acc, ...cur.stories.filter(oS => !sKeys.includes(oS.key))];
  }, new Array<Story>());

  const charData = data.reverse().map(({ count, eta, day, logged }) => ({ count, eta, day, logged }));

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Chart.js Line Chart',
      },
    },
  };

  const cData = {
    labels: charData.map(_ => new Date(_.day).toLocaleDateString()),
    datasets: [
      {
        label: 'Count',
        data: charData.map(_ => _.count),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'ETA',
        data: charData.map(_ => Number(_.eta)),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Logged',
        data: charData.map(_ => _.logged),
        borderColor: 'rgb(23, 12, 2)',
        backgroundColor: 'rgba(2, 122, 34, 0.5)',
      },
    ],
  };

  const allDates = data.map(_ => new Date(_.day).toLocaleDateString()).filter(onlyUnique);

  const [from, setFrom] = useState<string>(allDates[0]);

  const [to, setTo] = useState<string>(allDates[allDates.length - 1]);

  const columns: GridColDef[] = [
    {
      field: 'key', headerName: 'ID', width: 120,
      renderCell: (params: GridRenderCellParams<string>) => (
        <a href={`https://jira.in.devexperts.com/browse/${params.value}`}>{params.value}</a>
      ),
    },
    { field: 'points', headerName: 'ETA', width: 60 },
    { field: 'priority', headerName: 'Priority', width: 130 },
    { field: 'type', headerName: 'Type', width: 150 },
  ];

  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className="App">
      <div>
        <Select labelId="label" label="From" id="select" value={from} onChange={(item) => setFrom(item.target.value)}>
          {allDates.map(_ => <MenuItem value={_}>{_}</MenuItem>)}
        </Select>
        <Select labelId="label" label="To" id="select" value={to} onChange={(item) => setTo(item.target.value)}>
          {allDates.map(_ => <MenuItem value={_}>{_}</MenuItem>)}
        </Select>
      </div>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Table" />
          <Tab label="Chart" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <div className="grid">
          <DataGrid
            rows={stories}
            columns={columns}
            getRowId={item => item.key}
          />
        </div>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Line options={options} data={cData} />
      </TabPanel>

    </div>
  );
}

export default App;
