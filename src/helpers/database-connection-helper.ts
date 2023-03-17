import { Pool, Client } from "pg";

export default class DatabaseConnection {
    pool: Pool;

    constructor(databaseUrl: string) {
        this.pool = new Pool({
            connectionString: databaseUrl,
            statement_timeout: 10000,
        });
    }

    async query(text: string, params?: any[]) {
        return await this.pool.query(text, params);
    }
}