import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { DatabaseService, TableInfo, ApiResponse } from './database.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'תולדות חכמינו זכרונם לברכה';
  connectionStatus: string = 'Not tested';
  tables: TableInfo[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private databaseService: DatabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only run database connection test in browser, not on server
    if (isPlatformBrowser(this.platformId)) {
      this.testConnection();
    }
  }

  testConnection() {
    this.isLoading = true;
    this.error = null;
    
    this.databaseService.testConnection().subscribe({
      next: (response: ApiResponse) => {
        if (response.success) {
          this.connectionStatus = 'Connected successfully';
          this.loadTables();
        } else {
          this.connectionStatus = 'Connection failed';
          this.error = response.message || 'Unknown error';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.connectionStatus = 'Connection failed';
        this.error = `API Error: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadTables() {
    this.databaseService.getTables().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tables = response.data.tables;
        }
      },
      error: (error) => {
        this.error = `Failed to load tables: ${error.message}`;
      }
    });
  }
}
