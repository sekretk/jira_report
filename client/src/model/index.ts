import Big from 'big.js';
import { Report, Ticket, WeeklyReport } from '../../../shared/dto';
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

export const db_tickets: Map<string, Ticket> = new Map(data.tickets as Array<[string, Ticket]>);
export const db_reports: Map<number, Report> = new Map(data.reports as Array<[number, Report]>);
export const db_weekly: Map<number, WeeklyReport> = new Map(data.weekly as Array<[number, WeeklyReport]>);

export const overallProgress = (data.tickets as Array<[string, Ticket]>)
  .filter(([_, {resolution}]) => Boolean(resolution))
  .map(([_, {logged, eta}]) => ({logged, eta}))
  .reduce((acc, cur) => ({logged: acc.logged + cur.logged/28800, eta: acc.eta + cur.eta}), {logged: 0, eta: 0});

export const [startDay, endDay] = (data.reports as Array<[number, Report]>)
  .map(([_]) => _)
  .reduce(([min, max], cur) => [cur > min ? min : cur, cur < max ? max : cur], [NaN, NaN]);

export const overallVelocity = Big(overallProgress.eta).div(Big(endDay).minus(startDay).div(1000*60*60*24)).round(2).toNumber();

export const overallEstimation = Big(overallProgress.logged).div(overallProgress.eta).round(2).toNumber();

export const lastScopeEstimationInDays = Big(db_reports.get(endDay).eta).div(overallVelocity).round(2).toNumber();
export const lastScopeEstimationInDaysWithLogged = Big(db_reports.get(endDay).eta).minus(db_reports.get(endDay).logged).div(overallVelocity).round(2).toNumber();

export const findTicket = (key: string): KeyTicketTicket => ({ key, ...db_tickets.get(key) })

export const distinct = <T extends unknown>(value: T, index: number, self: Array<T>) => self.indexOf(value) === index;

