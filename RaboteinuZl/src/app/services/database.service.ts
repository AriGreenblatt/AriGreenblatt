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

export interface RelationshipInfo {
  RelationshipCode: number;
  RelationshipName?: string;
  HebRelationshipName?: string;
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

  /**
   * Convenience: Get talmidim via generic table data endpoint
   */
  getTalmidim(limit: number = 1000, offset: number = 0): Observable<ApiResponse<{ data: any[]; count: number }>> {
    return this.getTableData('AssociatedWith', limit, offset);
  }

  /**
   * Convenience: Get sforim via generic table data endpoint
   */
  getSforim(limit: number = 1000, offset: number = 0): Observable<ApiResponse<{ data: any[]; count: number }>> {
    return this.getTableData('Sforim', limit, offset);
  }

  /**
   * Convenience: Get relationships via generic table data endpoint
   */
  getRelationships(limit: number = 1000, offset: number = 0): Observable<ApiResponse<{ data: RelationshipInfo[]; count: number }>> {
    return this.getTableData('Relationships', limit, offset) as Observable<ApiResponse<{ data: RelationshipInfo[]; count: number }>>;
  }

  /**
   * Update a rabbi record in Talmidei_Hahamim
   */
  async updateRabbi(rabbiId: number, fields: Record<string, any>): Promise<any> {
    const setClauses: string[] = [];
    Object.keys(fields).forEach((key) => {
      const value = fields[key];
      if (value === null || value === undefined) {
        setClauses.push(`[${key}] = NULL`);
      } else if (typeof value === 'number') {
        setClauses.push(`[${key}] = ${value}`);
      } else {
        const escaped = String(value).replace(/'/g, "''");
        setClauses.push(`[${key}] = '${escaped}'`);
      }
    });
    const sql = `UPDATE [Talmidei_Hahamim] SET ${setClauses.join(', ')} WHERE [RabbiID] = ${rabbiId}`;
    const response = await this.executeQuery(sql).toPromise();
    return response;
  }

  /**
   * Extract rabbi data from Wikipedia
   */
  extractWikipedia(url?: string, name?: string): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse>(`${this.apiUrl}/extract-wikipedia`, {
        url,
        name
      }, this.httpOptions).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  /**
   * Get Hebrew Wikipedia content for a given title
   */
  getWikipediaContent(title: string): Observable<ApiResponse<{ title: string; content: string; pageId: string }>> {
    return this.http.get<ApiResponse<{ title: string; content: string; pageId: string }>>(`${this.apiUrl}/wikipedia/${encodeURIComponent(title)}`);
  }

  /**
   * Get biographical content (Odot) - checks file first, then Wikipedia
   */
  getOdotContent(title: string): Observable<ApiResponse<{ title: string; content: string; source: string }>> {
    return this.http.get<ApiResponse<{ title: string; content: string; source: string }>>(`${this.apiUrl}/odot/${encodeURIComponent(title)}`);
  }

  /**
   * Save biographical content to file
   */
  saveOdotContent(title: string, content: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/odot/${encodeURIComponent(title)}`, { content });
  }

  /**
   * List all available odot files
   */
  listOdotFiles(): Observable<ApiResponse<{ count: number; files: Array<{ fileName: string; title: string }> }>> {
    return this.http.get<ApiResponse<{ count: number; files: Array<{ fileName: string; title: string }> }>>(`${this.apiUrl}/odot`);
  }

  /**
   * Create a new rabbi
   */
  async createRabbi(rabbi: any): Promise<any> {
    const response = await this.http.post<any>(`${this.apiUrl}/rabbis`, rabbi).toPromise();
    return response;
  }

  /**
   * Search Wikipedia for a rabbi
   */
  async searchWikipedia(name: string): Promise<any> {
    const response = await this.http.get<any>(`${this.apiUrl}/search-wikipedia/${encodeURIComponent(name)}`).toPromise();
    return response;
  }

  /**
   * Check for duplicate rabbi
   */
  async checkDuplicate(fullName: string): Promise<any> {
    const response = await this.http.get<any>(`${this.apiUrl}/check-duplicate/${encodeURIComponent(fullName)}`).toPromise();
    return response;
  }

  /**
   * Create a new book
   */
  async createBook(book: any): Promise<any> {
    const response = await this.http.post<any>(`${this.apiUrl}/books`, book).toPromise();
    return response;
  }

  /**
   * Create a new event
   */
  async createEvent(event: any): Promise<any> {
    const response = await this.http.post<any>(`${this.apiUrl}/events`, event).toPromise();
    return response;
  }

  /**
   * Create a new relationship (alias for association)
   */
  async createRelationship(relationship: any): Promise<any> {
    const response = await this.http.post<any>(`${this.apiUrl}/associations`, relationship).toPromise();
    return response;
  }

  /**
   * Get city map
   */
  async getCityMap(cityName: string): Promise<any> {
    const response = await this.http.get<any>(`${this.apiUrl}/city-map/${encodeURIComponent(cityName)}`).toPromise();
    return response;
  }
}
