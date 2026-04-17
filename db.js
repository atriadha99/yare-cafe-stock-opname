const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

const init = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bahan_baku (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT,
      satuan TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS stok (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bahan_id INTEGER,
      qty INTEGER,
      minimum INTEGER,
      FOREIGN KEY(bahan_id) REFERENCES bahan_baku(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT,
      harga INTEGER,
      bahan_id INTEGER,
      jumlah_bahan INTEGER,
      FOREIGN KEY(bahan_id) REFERENCES bahan_baku(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT,
      total INTEGER,
      kasir TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS detail_transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER,
      menu_id INTEGER,
      qty INTEGER,
      subtotal INTEGER,
      FOREIGN KEY(transaksi_id) REFERENCES transaksi(id),
      FOREIGN KEY(menu_id) REFERENCES menu(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS opname (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bahan_id INTEGER,
      tanggal TEXT,
      stok_fisik INTEGER,
      stok_sistem INTEGER,
      selisih INTEGER,
      FOREIGN KEY(bahan_id) REFERENCES bahan_baku(id)
    )`);

    db.get('SELECT COUNT(*) AS total FROM users', (err, row) => {
      if (err) return console.error(err);
      if (row.total === 0) {
        const users = [
          ['admin', 'admin123', 'admin'],
          ['gudang', 'gudang123', 'gudang'],
          ['kasir', 'kasir123', 'kasir']
        ];
        const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        users.forEach((u) => stmt.run(u));
        stmt.finalize();
      }
    });

    db.get('SELECT COUNT(*) AS total FROM bahan_baku', (err, row) => {
      if (err) return console.error(err);
      if (row.total === 0) {
        const bahan = [
          ['Biji Kopi', 'gram'],
          ['Susu', 'ml'],
          ['Gula', 'gram'],
          ['Es Batu', 'pcs']
        ];
        const stmt = db.prepare('INSERT INTO bahan_baku (nama, satuan) VALUES (?, ?)');
        bahan.forEach((b) => stmt.run(b));
        stmt.finalize();
      }
    });

    db.get('SELECT COUNT(*) AS total FROM stok', (err, row) => {
      if (err) return console.error(err);
      if (row.total === 0) {
        const stokData = [
          [1, 2000, 250],
          [2, 5000, 1200],
          [3, 2500, 300],
          [4, 100, 20]
        ];
        const stmt = db.prepare('INSERT INTO stok (bahan_id, qty, minimum) VALUES (?, ?, ?)');
        stokData.forEach((s) => stmt.run(s));
        stmt.finalize();
      }
    });

    db.get('SELECT COUNT(*) AS total FROM menu', (err, row) => {
      if (err) return console.error(err);
      if (row.total === 0) {
        const menu = [
          ['Espresso', 15000, 1, 18],
          ['Latte', 20000, 1, 15],
          ['Cappuccino', 22000, 1, 17],
          ['Teler Susu', 18000, 2, 200],
          ['Es Kopi Susu', 25000, 1, 20]
        ];
        const stmt = db.prepare('INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES (?, ?, ?, ?)');
        menu.forEach((m) => stmt.run(m));
        stmt.finalize();
      }
    });
  });
};

module.exports = { db, init };
