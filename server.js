const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OAuth2Client } = require('google-auth-library');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const GOOGLE_CLIENT_ID = '754398575380-2dcpk7j3ctgm2m0n2ukbjom09ca91udk.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(bodyParser.json());

// Inisialisasi Database SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Gagal terhubung ke SQLite:', err.message);
  } else {
    console.log('Berhasil terhubung ke database SQLite.');
  }
});

// Buat tabel otomatis
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS produk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    nama TEXT,
    harga INTEGER,
    stok INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_barang TEXT,
    harga INTEGER,
    tanggal DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ---------- AUTH: GOOGLE LOGIN ----------
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { name, email, picture } = payload;

    return res.json({
      status: 'ok',
      pesan: 'Login Google berhasil!',
      user: { nama: name, email: email, foto: picture, role: 'kasir' }
    });
  } catch (error) {
    return res.status(400).json({ status: 'error', pesan: 'Token Google tidak valid!' });
  }
});

// ---------- GET: AMBIL SEMUA PRODUK ----------
app.get('/api/produk', (req, res) => {
  db.all("SELECT * FROM produk ORDER BY id ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const data = rows.map(row => ({
      id: Number(row.id),
      code: row.code,
      nama: row.nama,
      harga: Number(row.harga),
      stok: Number(row.stok)
    }));
    res.json(data);
  });
});

// ---------- POST: TAMBAH PRODUK BARU ----------
app.post('/api/produk', (req, res) => {
  const { code, nama, harga, stok } = req.body;

  if (!code || !nama || harga === undefined || stok === undefined) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  const query = `INSERT INTO produk (code, nama, harga, stok) VALUES (?, ?, ?, ?)`;
  db.run(query, [code, nama, harga, stok], function(err) {
    if (err) {
      return res.status(500).json({ error: "Gagal simpan: " + err.message });
    }
    res.json({ status: "berhasil", id: this.lastID });
  });
});

// ---------- PUT: EDIT PRODUK (Mendukung ?id= maupun /:id) ----------
app.put('/api/produk', (req, res) => {
  const id = req.query.id;
  const { nama, harga, stok } = req.body;
  if (!id) return res.status(400).json({ error: "ID tidak disertakan" });

  db.run(`UPDATE produk SET nama = ?, harga = ?, stok = ? WHERE id = ?`, [nama, harga, stok, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: "diedit" });
  });
});

app.put('/api/produk/:id', (req, res) => {
  const id = req.params.id;
  const { nama, harga, stok } = req.body;

  db.run(`UPDATE produk SET nama = ?, harga = ?, stok = ? WHERE id = ?`, [nama, harga, stok, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: "diedit" });
  });
});

// ---------- DELETE: HAPUS PRODUK (Mendukung ?id= maupun /:id) ----------
app.delete('/api/produk', (req, res) => {
  const id = req.query.id;
  db.run(`DELETE FROM produk WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: "dihapus" });
  });
});

app.delete('/api/produk/:id', (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM produk WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: "dihapus" });
  });
});

app.listen(PORT, () => {
  console.log(`Server Backend Kasir Firza berjalan di http://localhost:${PORT}`);
});