import { writeFileSync, readFileSync } from 'fs';

import Big from 'big.js';
import fetch from 'cross-fetch';

const filterID = 42978;

const token = Buffer.from(`${process.env.LOGIN}:${process.env.PASSWORD}`).toString('base64').slice(0, -1);

const db = 'tickets_history.json';

const riskThreshold = 0.3;

type IssuerStatus = 'Reported' | 'Confirmed' | 'Waiting for review' | 'Resolved' | 'In development' | 'Aborted';

type ResType = {
	total: number;
	maxResult: number;
	issues: Array<{
		key: string;
		fields: {
			customfield_10811: number;
			progress: {
				total: number;
			};
			assignee: {
				displayName: string;
			};
			status: {
				name: IssuerStatus;
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

	const totallyLoggedDays = Big(res.issues.map((_) => _.fields.progress.total).reduce((acc, cur) => acc + cur, 0))
		.div(3600)
		.div(8)
		.round(1)
		.toNumber();

	const stories = res.issues
		.map((_) => ({
			key: _.key,
			points: _.fields.customfield_10811,
			log: Big(_.fields.progress.total).div(3600).div(8).round(1).toNumber(),
			status: _.fields.status.name,
			priority: _.fields.priority.name,
			type: _.fields.issuetype.name,
		}))
		.map((_) => ({
			..._,
			est: Big(_.log).div(_.points).round(2).toNumber(),
		}))
		.sort((a, b) => (a.est > b.est ? -1 : 1));

	const total = {
		day: Number(new Date()),
		count: res.total,
		eta: res.issues
			.map((_) => _.fields.customfield_10811)
			.reduce((acc, cur) => acc + cur, 0)
			.toFixed(1),
		logged: totallyLoggedDays,
		stories,
	};

	const db_state: Array<any> = JSON.parse(readFileSync(db, { encoding: 'utf8' }));

	db_state.push(total);

	writeFileSync(db, JSON.stringify(db_state, null, 2), { encoding: 'utf8' });

	console.log(total);
};

run();
