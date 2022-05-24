import { writeFileSync, readFileSync } from 'fs';
const https = require('https')

import Big from 'big.js';
import fetch from 'cross-fetch';
import { IssuerStatus, DB, Report } from '../shared/dto';

const filterID = 42978;

const token = Buffer.from(`${process.env.LOGIN}:${process.env.PASSWORD}`).toString('base64').slice(0, -1);

const db = 'tickets_history.json';

const riskThreshold = 0.3;

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
		};
	}>;
};

const getToday = (): number => Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());

const readDb = (): DB => {
	const raw_db = JSON.parse(readFileSync(db, { encoding: 'utf8' }));

	return {
		reports: new Map(raw_db.reports??[]),
		tickets: new Map(raw_db.tickets??[])	
	}
}

const saveDb = (db_state: DB) => {

	const raw_db = {
		reports: Array.from(db_state.reports.entries()),
		tickets: Array.from(db_state.tickets.entries())
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

	res.issues.forEach(issue => {
		db_state.tickets.set(issue.key, {
			eta: issue.fields.customfield_10811,
			assignee: issue.fields.assignee.displayName,
			logged: issue.fields.progress.total,
			status: issue.fields.status.name,
			summary: issue.fields.summary,
			priority: issue.fields.priority
		})
	})


	// const totallyLoggedDays = Big(res.issues.map((_) => _.fields.progress.total).reduce((acc, cur) => acc + cur, 0))
	// 	.div(3600)
	// 	.div(8)
	// 	.round(1)
	// 	.toNumber();

	// const stories = res.issues
	// 	.map((_) => ({
	// 		key: _.key,
	// 		points: _.fields.customfield_10811,
	// 		log: Big(_.fields.progress.total).div(3600).div(8).round(1).toNumber(),
	// 		status: _.fields.status.name,
	// 		priority: _.fields.priority.name,
	// 		type: _.fields.issuetype.name,
	// 	}))
	// 	.map((_) => ({
	// 		..._,
	// 		est: Big(_.log).div(_.points).round(2).toNumber(),
	// 	}))
	// 	.sort((a, b) => (a.est > b.est ? -1 : 1));

	// const total = {
	// 	day: getToday(),
	// 	count: res.total,
	// 	eta: res.issues
	// 		.map((_) => _.fields.customfield_10811)
	// 		.reduce((acc, cur) => acc + cur, 0)
	// 		.toFixed(1),
	// 	logged: totallyLoggedDays,
	// 	stories,
	// };
}

/*
 * Migration
 */
// const migration = () => {

// 	const db_state = readDb();

// 	const snapshot = JSON.parse(readFileSync('tickets_1905_snapshot.json', { encoding: 'utf8' }));

// 	snapshot.forEach(item => {
// 		const day = Date.UTC(new Date(item.day).getUTCFullYear(), new Date(item.day).getUTCMonth(), new Date(item.day).getUTCDate());

// 		db_state.reports.set(day, {
// 			eta: item.stories.map(_ => _.points).reduce((acc, cur) => acc.add(cur), Big(0)).toNumber(),
// 			logged: item.stories.map(_ => _.log).reduce((acc, cur) => acc.add(cur), Big(0)).toNumber(),
// 			tickets: item.stories.map(_ => _.key)
// 		});

// 		item.stories.forEach(story => {
// 			db_state.tickets.set(story.key, {
// 				assignee: '',
// 				eta: story.points,
// 				logged: story.log,
// 				status: story.status,
// 				summary: '',
// 			})
// 		});
// 	})

// 	saveDb(db_state);
// }

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

	addReport(db_state, res)

	saveDb(db_state);

	const addedTickets = newTickets.filter(resTicket => !lastReportTickets.includes(resTicket));
	const deletedTickets = lastReportTickets.filter(lastTicket => !newTickets.includes(lastTicket));

	sendNotification(`Got new JIRA report for ${new Date(getToday()).toLocaleDateString()}, Count: ${res.issues.length}, ${''
		}ETA: ${res.issues.map(_ => _.fields.customfield_10811).reduce((acc, cur) => acc + cur, 0)}${''
		}. Changes from ${new Date(lastReport).toLocaleDateString()} : added: ${addedTickets.length > 0 ? addedTickets.join('-') : 'none'}, ${''
		}, removed: ${deletedTickets.length > 0 ? deletedTickets.join('-') : 'none'}`)
};

run();
