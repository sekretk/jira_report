import { useMemo, useState } from 'react';
import './App.css';
import { Box, MenuItem, Select, Tab, Tabs } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import React from 'react';
import Big from 'big.js';
import { Chart } from './components/chart';
import { reports, KeyTicketTicket, db_reports, distinct, findTicket } from './model';

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
          {children}
        </Box>
      )}
    </div>
  );
}

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
          <Tab label="Overall" />
          <Tab label="Detailed" />
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
            Added ({addedStories.length})
            <DataGrid
              rows={addedStories}
              columns={columns}
              getRowId={item => item.key}
            />
            Removed ({removedStories.length})
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
        <Chart/>
      </TabPanel>

    </div>
  );
}

export default App;
