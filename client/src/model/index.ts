import { Report, Ticket } from '../../../shared/dto';
import data from '../tickets_history.json'

export type Snapshot = {
    count: number;
    logged: number;
}

export type AggregatedItem = {
    estimation: number;
    latestSnapshot: Snapshot;
    removedSnapshot: Snapshot;    
}

export type DaysReport = { key: number } & Report;
export type KeyTicketTicket = { key: string } & Ticket;

export const reports: Array<DaysReport> = (data.reports as Array<[number, Report]>)
  .sort(([key1], [key2]) => key2 > key1 ? -1 : 1)
  .map(([key, value]) => ({
    ...value,
    key
  }));

  export const db_tickets: Map<string, Ticket> = new Map(data.tickets as Array<[string, Ticket]>);
export const db_reports: Map<number, Report> = new Map(data.reports as Array<[number, Report]>);

export const findTicket = (key: string): KeyTicketTicket => ({ key, ...db_tickets.get(key) })

export const distinct = <T extends unknown>(value: T, index: number, self: Array<T>) => self.indexOf(value) === index;

