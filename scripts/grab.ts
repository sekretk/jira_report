import { writeFileSync, readFileSync } from 'fs';
const https = require('https')

import Big from 'big.js';
import fetch from 'cross-fetch';
import { IssuerStatus, DB, Report, WeeklyReport } from '../shared/dto';
import { startOfWeek } from 'date-fns';

const filterID = 42978;

const token = Buffer.from(`${process.env.LOGIN}:${process.env.PASSWORD}`).toString('base64').slice(0, -1);

const pairwise = <T>(arr: Array<T>): Array<[T, T]> =>
	arr.reduce((acc, current, index) => {

		if (index === 0) return acc;

		return [...acc, [current, arr[index - 1]]];
	}, []);

const distinct = <T extends unknown>(value: T, index: number, self: Array<T>) => self.indexOf(value) === index;

const db = 'tickets_history.json';

type StatusCategory = 'In Progress' | 'Done';

const sendNotification = (message) => {

	const options = {
		hostname: 'api.telegram.org',
		port: 443,
		path: encodeURI(`/${process.env.BOT_TOCKEN}/sendMessage?chat_id=${process.env.NOTIFY_CHAT}&text=${message}`),
		method: 'GET'
	}

	const req = https.request(options, res => {
		console.log(`statusCode: ${res.statusCode}`)

		res.on('data', d => {
			process.stdout.write(d)
		})
	})

	req.on('error', error => {
		console.error(error)
	})

	req.end()
}

type ResType = {
	total: number;
	maxResult: number;
	issues: Array<{
		key: string;
		fields: {
			customfield_10811: number;
			summary: string;
			progress: {
				total: number;
			};
			assignee: {
				displayName: string;
			};
			status: {
				name: IssuerStatus;
				statusCategory: {
					name: StatusCategory;
				}
			};
			priority: {
				name: string;
				id: number;
			};
			issuetype: {
				name: string;
			};
			resolution: {
				name: string
			} | null,
		};
	}>;
};

const getToday = (): number => Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());

const readDb = (): DB => {
	const raw_db = JSON.parse(readFileSync(db, { encoding: 'utf8' }));

	return {
		reports: new Map(raw_db.reports ?? []),
		tickets: new Map(raw_db.tickets ?? []),
		weekly: new Map(raw_db.weekly ?? [])
	}
}

const saveDb = (db_state: DB) => {

	const raw_db = {
		reports: Array.from(db_state.reports.entries()),
		tickets: Array.from(db_state.tickets.entries()),
		weekly: Array.from(db_state.weekly.entries())
	}

	writeFileSync(db, JSON.stringify(raw_db, null, 2), { encoding: 'utf8' });
}

const addReport = (db_state: DB, res: ResType) => {

	const report: Report = {
		tickets: res.issues.map(_ => _.key),
		eta: res.issues.map(_ => _.fields.customfield_10811).reduce((acc, cur) => acc.add(cur), Big(0)).toNumber(),
		logged: res.issues.map(_ => _.fields.progress.total).reduce((acc, cur) => acc.add(cur), Big(0)).div(3600).div(8).round(2).toNumber(),
	}

	db_state.reports.set(getToday(), report);
}

const updateTickets = async (db_state: DB) => {

	const setOfTickets = Array.from(db_state.reports.entries())
		.map(([key, report]) => report.tickets)
		.reduce((acc, cur) => {
			cur.forEach(ticket => acc.add(ticket));
			return acc;
		}, new Set<string>());

	console.log('setOfTickets', setOfTickets)

	const ticketDetails = Array.from(setOfTickets.values())
		.filter((ticket) => !Boolean(db_state.tickets.get(ticket)?.resolution))
		.map(key => fetch(
			`https://jira.in.devexperts.com/rest/api/latest/issue/${key}`,
			{
				method: 'GET',
				headers: {
					Authorization: 'Basic ' + token,
					'Content-Type': 'application/json',
				},
			},
		).then((_) => _.json() as unknown as ResType['issues'][number]));

	(await Promise.all(ticketDetails)).forEach(issue => db_state.tickets.set(issue.key, {
		eta: issue.fields.customfield_10811,
		assignee: issue.fields.assignee.displayName,
		logged: issue.fields.progress.total,
		status: issue.fields.status.name,
		summary: issue.fields.summary,
		priority: issue.fields.priority?.name ?? '',
		resolution: issue.fields.resolution?.name ?? null
	}))
}

const aggregate = (db_state: DB) => {

	db_state.weekly.clear();

	const weeksTickets = new Map<number, Array<{ day: number, report: Report }>>();

	db_state.reports.forEach((rep, key) => {

		const weekKey = startOfWeek(key, { weekStartsOn: 0 }).getTime();

		if (weeksTickets.has(weekKey)) {
			weeksTickets.get(weekKey).push({ day: key, report: rep });
		} else {
			weeksTickets.set(weekKey, [{ day: key, report: rep }]);
		}
	});

	const sortedByWeeks = Array.from(weeksTickets.entries())
		.sort(([a], [b]) => a < b ? -1 : 1)
		.map(([key, set]) => [key, Array.from(set.values())] as const);

	console.log(sortedByWeeks);

	const weekReport: Array<{ key: number, all: Array<string>, end: Array<string> }> =
		sortedByWeeks.map(([key, reports]) => {
			const all = Array.from(
				reports.reduce((acc, data) => {
					data.report.tickets.forEach(_ => acc.add(_));
					return acc;
				}, new Set<string>()));

			const end = reports.reduce((acc, cur) =>
				acc === undefined
					? cur
					: acc.day < cur.day
						? cur
						: acc,
				undefined)?.report?.tickets ?? [];

			return {
				key,
				all,
				end
			}
		})

	weekReport.forEach(({ key, all, end }, index) => {

		if (index === 0) return;

		const { key: prevKey, all: prevAll, end: prevEnd } = weekReport[index - 1];

		db_state.weekly.set(key, {
			count: all.length,
			eta: all.map(ticket => db_state.tickets.get(ticket).eta).reduce((acc, cur) => acc + cur, 0),
			logged: all.map(ticket => db_state.tickets.get(ticket).logged).reduce((acc, cur) => acc + cur, 0),
			added: all.filter(ticket => !prevEnd.includes(ticket)),
			removed: [...all, ...prevEnd].filter(distinct).filter(ticket => !end.includes(ticket)),
			current: end
		});
	}, []);
}

const run = async () => {

	const res: ResType = await fetch(
		`https://jira.in.devexperts.com/rest/api/latest/search?jql=filter=${filterID}&issueLimit=1000`,
		{
			method: 'GET',
			headers: {
				Authorization: 'Basic ' + token,
				'Content-Type': 'application/json',
			},
		},
	).then((_) => _.json());

	const db_state = readDb();

	const lastReport = Math.max(...Array.from(db_state.reports.keys()));

	const lastReportTickets = db_state.reports.get(lastReport).tickets;
	const newTickets = res.issues.map(_ => _.key);

	addReport(db_state, res);

	await updateTickets(db_state);

	aggregate(db_state);

	saveDb(db_state);

	const addedTickets = newTickets.filter(resTicket => !lastReportTickets.includes(resTicket));
	const deletedTickets = lastReportTickets.filter(lastTicket => !newTickets.includes(lastTicket));

	sendNotification(`Got new JIRA report for ${new Date(getToday()).toLocaleDateString()}, Count: ${res.issues.length}, ${''
		}ETA: ${res.issues.map(_ => _.fields.customfield_10811).reduce((acc, cur) => acc + cur, 0)}${''
		}. Changes from ${new Date(lastReport).toLocaleDateString()} : added: ${addedTickets.length > 0 ? addedTickets.join('; ') : 'none'}, ${''
		}, removed: ${deletedTickets.length > 0 ? deletedTickets.join('; ') : 'none'}`)
};

run();
