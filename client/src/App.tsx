import { useMemo, useState } from 'react';
import './App.css';
import data from './tickets_history.json'
import { Box, MenuItem, Select, Tab, Tabs } from '@mui/material';
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
import { Report, Ticket } from '../../shared/dto';
import Big from 'big.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type DaysReport = { key: number } & Report;
type KeyTicketTicket = { key: string } & Ticket;

const reports: Array<DaysReport> = (data.reports as Array<[number, Report]>)
  .sort(([key1], [key2]) => key2 > key1 ? -1 : 1)
  .map(([key, value]) => ({
    ...value,
    key
  }));

const db_tickets: Map<string, Ticket> = new Map(data.tickets as Array<[string, Ticket]>);
const db_reports: Map<number, Report> = new Map(data.reports as Array<[number, Report]>);
const findTicket = (key: string): KeyTicketTicket => ({ key, ...db_tickets.get(key) })

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
          {children}
        </Box>
      )}
    </div>
  );
}

const distinct = <T extends unknown>(value: T, index: number, self: Array<T>) => self.indexOf(value) === index;

const charData = reports.map(report => ({
  day: new Date(report.key).toLocaleDateString(),
  count: report.tickets.length,
  eta: report.eta,
  live_est: report.eta - report.logged,
  logged: report.logged
}));

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

function App() {

  const [from, setFrom] = useState<number>(reports[0].key);

  const [to, setTo] = useState<number>(reports[reports.length - 1].key);

  const addedStories: Array<KeyTicketTicket> = useMemo(() => reports.reduce((acc, cur) => {
    if (cur.key < from || cur.key > to) {
      return acc;
    }

    const fromTickets = db_reports.get(from).tickets;

    cur.tickets.forEach(ticket => {
      !fromTickets.includes(ticket) && acc.push(ticket)
    })

    return acc;
  }, new Array<string>()).filter(distinct).map(findTicket)
    , [from, to])

  const removedStories: Array<KeyTicketTicket> = useMemo(() => {

    const allTicketsInRange = Array.from((reports.reduce((acc, cur) => {
      if (cur.key < from || cur.key > to) {
        return acc;
      }

      cur.tickets.forEach(ticket => acc.add(ticket));
      return acc;
    }, new Set<string>())));

    return allTicketsInRange.filter(ticket => !db_reports.get(to).tickets.includes(ticket)).map(findTicket);

  }, [from, to])

  const lastStories: Array<KeyTicketTicket> = useMemo(() => db_reports.get(to).tickets.map(findTicket), [to])

  console.log(lastStories);

  const columns: GridColDef[] = [
    {
      field: 'key', headerName: 'ID', width: 120,
      renderCell: (params: GridRenderCellParams<string>) => (
        <a href={`https://jira.in.devexperts.com/browse/${params.value}`}>{params.value}</a>
      ),
    },
    { field: 'eta', headerName: 'ETA', width: 60 },
    { field: 'priority', headerName: 'Priority', width: 130, valueFormatter: (params) => params.value?.name },
    { field: 'status', headerName: 'Status', width: 150 },
    { field: 'logged', headerName: 'Logged', width: 150, valueFormatter: (params) => Big(params.value).div(3600).div(8).round(2).toNumber() },
    { field: 'summary', headerName: 'Summary' },
    { field: 'assignee', headerName: 'Assignee', width: 150 },
  ];

  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className="App">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Chart" />
          <Tab label="Table" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={1}>
        <div>
          <div>
            <Select labelId="label" label="From" id="select" value={from} onChange={(item) => setFrom(Number(item.target.value))}>
              {reports.map(_ => <MenuItem key={_.key} value={_.key}>{new Date(_.key).toUTCString().split(' ').slice(0, 4).join(' ')}</MenuItem>)}
            </Select>
            <Select labelId="label" label="To" id="select" value={to} onChange={(item) => setTo(Number(item.target.value))}>
              {reports.map(_ => <MenuItem key={_.key} value={_.key}>{new Date(_.key).toUTCString().split(' ').slice(0, 4).join(' ')}</MenuItem>)}
            </Select>
          </div>
          <div className="grid">
            Added
            <DataGrid
              rows={addedStories}
              columns={columns}
              getRowId={item => item.key}
            />
            Removed
            <DataGrid
              rows={removedStories}
              columns={columns}
              getRowId={item => item.key}
            />
            On {new Date(to).toLocaleDateString()}
            <DataGrid
              rows={lastStories}
              columns={columns}
              getRowId={item => item.key}
            />
          </div>
        </div>
      </TabPanel>
      <TabPanel value={value} index={0}>
        <Line options={options} data={cData} />
      </TabPanel>

    </div>
  );
}

export default App;
