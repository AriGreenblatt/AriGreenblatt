import { Routes } from '@angular/router';
import { TalmideiHahamimComponent } from '../talmidei-hahamim/talmidei-hahamim.component';
import { AdminEntryComponent } from '../admin-entry/admin-entry.component';
import { AdminImportComponent } from '../admin-import/admin-import.component';

export const routes: Routes = [
	{
		path: '',
		component: TalmideiHahamimComponent
	},
	{
		path: 'admin',
		component: AdminEntryComponent
	},
	{
		path: 'admin/import',
		component: AdminImportComponent
	}
];
