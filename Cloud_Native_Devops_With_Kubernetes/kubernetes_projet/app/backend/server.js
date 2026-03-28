const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'SuperSecretPassword123!',
  database: process.env.POSTGRES_DB || 'appdb',
});

app.get('/api/health', (req, res) => res.json({ status: "OK" }));

app.get('/api/menu', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM menu ORDER BY categorie, nom');
    client.release();
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur PostgreSQL:', err);
    res.status(500).json({ error: "Erreur lors de la récupération du menu" });
  }
});

app.listen(port, () => console.log(`Backend sur le port ${port}`));
