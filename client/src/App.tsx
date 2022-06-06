import { useMemo, useState } from 'react';
import './App.css';
import { Box, MenuItem, Select, Tab, Tabs } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import React from 'react';
import Big from 'big.js';
import { Chart } from './components/chart';
import { KeyTicketTicket, distinct, findTicket, db_weekly } from './model';

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

  const [selected, setSelected] = useState<number>(Array.from(db_weekly.keys())[db_weekly.size - 1]);

  const addedStories: Array<KeyTicketTicket> = useMemo(
    () => db_weekly.get(selected).added.filter(distinct).map(findTicket),
    [selected]);

  const removedStories: Array<KeyTicketTicket> = useMemo(
    () => db_weekly.get(selected).removed.filter(distinct).map(findTicket),
    [selected]);

  const lastStories: Array<KeyTicketTicket> = useMemo(
    () => db_weekly.get(selected).current.filter(distinct).map(findTicket),
    [selected]);

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
    { field: 'summary', headerName: 'Summary', flex: 1 },
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
            <Select labelId="label" label="From" id="select" value={selected} onChange={(item) => setSelected(Number(item.target.value))}>
              {Array.from(db_weekly.keys()).map(_ => <MenuItem key={_} value={_}>{new Date(_).toUTCString().split(' ').slice(0, 4).join(' ')}</MenuItem>)}
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
            Items on end of week ({lastStories.length})
            <DataGrid
              rows={lastStories}
              columns={columns}
              getRowId={item => item.key}
            />
          </div>
        </div>
      </TabPanel>
      <TabPanel value={value} index={0}>
        <Chart />
      </TabPanel>

    </div>
  );
}

export default App;
