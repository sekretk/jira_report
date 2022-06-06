export type IssuerStatus = 'Reported' | 'Confirmed' | 'Waiting for review' | 'Resolved' | 'In development' | 'Aborted';

export type DB = {
	tickets: Map<string, Ticket>,
	reports: Map<number, Report>,
	weekly: Map<number, WeeklyReport>
}

export type Report = {
	logged: number, 
	eta: number,
	tickets: Array<string>,
}

export type WeeklyReport = {
	logged: number, 
	eta: number,
	count: number,
	tickets: Array<string>,
	added: Array<string>,
	removed: Array<string>
}

export type Ticket = {
	summary: string,
	assignee: string,
	eta: number,
	logged: number,
	status: IssuerStatus,
	resolution: string | null,
	priority: {
		name: string;
		id: number;
	}
}