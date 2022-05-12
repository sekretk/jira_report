import { useState } from 'react';
import './App.css';
import data from './tickets_history.json'
import { MenuItem, Select } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

function onlyUnique(value: any, index: any, self: string | any[]) {
  return self.indexOf(value) === index;
}

type Story = (typeof data)[number]['stories'][number];

function App() {

  const stories = data.reverse().reduce((acc, cur) => {

    const sKeys = acc.map(_ => _.key);

    return [...acc, ...cur.stories.filter(oS => !sKeys.includes(oS.key))];
  }, new Array<Story>());

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
      <div className="grid">
      <DataGrid
        rows={stories}
        columns={columns}
        getRowId={item => item.key}
      />
      {/* {stories.map(story => (<p><a href={`https://jira.in.devexperts.com/browse/${story.key}`}>{story.key}</a></p>))} */}
      </div>
    </div>
  );
}

export default App;
