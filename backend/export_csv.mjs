// Script d'export des donnees MariaDB vers CSV pour Power BI
import * as mariadbModule from 'mariadb';
import fs from 'fs';
import path from 'path';

const mariadb = mariadbModule.default || mariadbModule;

const outputDir = 'C:\\Users\\moron\\Documents\\vscode\\TPusineconnectee\\tp2-moron-axel\\powerbi_export';

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const pool = mariadb.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'tp2_maintenance_z4',
    connectionLimit: 3
});

async function exportTable(conn, table, filename) {
    const rows = await conn.query('SELECT * FROM ' + table);
    if (rows.length === 0) {
        console.log('[' + table + '] Aucune donnee.');
        fs.writeFileSync(path.join(outputDir, filename), '');
        return 0;
    }
    const headers = Object.keys(rows[0]).filter(k => k !== 'meta').join(',');
    const lines = rows.filter(r => r.meta === undefined || true).map(r => {
        const vals = Object.entries(r)
            .filter(([k]) => k !== 'meta')
            .map(([, v]) => {
                if (v === null || v === undefined) return '';
                if (v instanceof Date) return v.toISOString();
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
            });
        return vals.join(',');
    });
    fs.writeFileSync(path.join(outputDir, filename), [headers, ...lines].join('\n'), 'utf8');
    console.log('[' + table + '] ' + rows.length + ' lignes -> ' + filename);
    return rows.length;
}

async function main() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connecte a MariaDB : tp2_maintenance_z4');
        await exportTable(conn, 'mesures', 'mesures.csv');
        await exportTable(conn, 'alarmes', 'alarmes.csv');
        await exportTable(conn, 'seuils', 'seuils.csv');
        console.log('Export termine ! -> ' + outputDir);
    } catch (err) {
        console.error('ERREUR: ' + err.message);
        process.exit(1);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

main();
