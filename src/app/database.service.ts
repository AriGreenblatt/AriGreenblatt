import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface TableInfo {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  TABLE_TYPE: string;
}

export interface ColumnInfo {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  CHARACTER_MAXIMUM_LENGTH: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly apiUrl = 'http://localhost:3000/api';
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  /**
   * Check if the API server is running
   */
  healthCheck(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/health`);
  }

  /**
   * Test database connection
   */
  testConnection(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/test-connection`);
  }

  /**
   * Get all tables in the database
   */
  getTables(): Observable<ApiResponse<{ tables: TableInfo[] }>> {
    return this.http.get<ApiResponse<{ tables: TableInfo[] }>>(`${this.apiUrl}/tables`);
  }

  /**
   * Get table structure/columns
   */
  getTableStructure(tableName: string): Observable<ApiResponse<{ tableName: string; columns: ColumnInfo[] }>> {
    return this.http.get<ApiResponse<{ tableName: string; columns: ColumnInfo[] }>>(`${this.apiUrl}/tables/${tableName}/structure`);
  }

  /**
   * Get data from a specific table
   */
  getTableData(tableName: string, limit: number = 100, offset: number = 0): Observable<ApiResponse<{ data: any[]; count: number }>> {
    return this.http.get<ApiResponse<{ data: any[]; count: number }>>(`${this.apiUrl}/tables/${tableName}/data?limit=${limit}&offset=${offset}`);
  }

  /**
   * Create a new rabbi
   */
  createRabbi(rabbi: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rabbis`, rabbi, this.httpOptions);
  }

  /**
   * Update an existing rabbi
   */
  updateRabbi(rabbiId: number, rabbi: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/rabbis/${rabbiId}`, rabbi, this.httpOptions);
  }

  /**
   * Get all talmidim relationships with joined data
   */
  getTalmidim(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/talmidim`, this.httpOptions);
  }

  /**
   * Create a new talmid (student-teacher relationship)
   */
  createTalmid(talmid: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/talmidim`, talmid, this.httpOptions);
  }

  /**
   * Update an existing talmid (student-teacher relationship)
   */
  updateTalmid(talmidId: number, talmid: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/talmidim/${talmidId}`, talmid, this.httpOptions);
  }

  /**
   * Execute a custom SQL query
   * BE CAREFUL: This allows arbitrary SQL execution
   */
  executeQuery(query: string): Observable<ApiResponse<{ data: any[]; rowsAffected: number[] }>> {
    return this.http.post<ApiResponse<{ data: any[]; rowsAffected: number[] }>>(
      `${this.apiUrl}/query`, 
      { query }, 
      this.httpOptions
    );
  }
}