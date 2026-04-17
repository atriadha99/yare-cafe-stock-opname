-- SQLite schema untuk Yare Cafe Stock Opname
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS bahan_baku (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT,
  satuan TEXT
);

CREATE TABLE IF NOT EXISTS stok (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bahan_id INTEGER,
  qty INTEGER,
  minimum INTEGER,
  FOREIGN KEY(bahan_id) REFERENCES bahan_baku(id)
);

CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT,
  harga INTEGER,
  bahan_id INTEGER,
  jumlah_bahan INTEGER,
  FOREIGN KEY(bahan_id) REFERENCES bahan_baku(id)
);

CREATE TABLE IF NOT EXISTS transaksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT,
  total INTEGER,
  kasir TEXT
);

CREATE TABLE IF NOT EXISTS detail_transaksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaksi_id INTEGER,
  menu_id INTEGER,
  qty INTEGER,
  subtotal INTEGER,
  FOREIGN KEY(transaksi_id) REFERENCES transaksi(id),
  FOREIGN KEY(menu_id) REFERENCES menu(id)
);

CREATE TABLE IF NOT EXISTS opname (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bahan_id INTEGER,
  tanggal TEXT,
  stok_fisik INTEGER,
  stok_sistem INTEGER,
  selisih INTEGER,
  FOREIGN KEY(bahan_id) REFERENCES bahan_baku(id)
);

-- Data awal
INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin');
INSERT INTO users (username, password, role) VALUES ('gudang', 'gudang123', 'gudang');
INSERT INTO users (username, password, role) VALUES ('kasir', 'kasir123', 'kasir');

INSERT INTO bahan_baku (nama, satuan) VALUES ('Biji Kopi', 'gram');
INSERT INTO bahan_baku (nama, satuan) VALUES ('Susu', 'ml');
INSERT INTO bahan_baku (nama, satuan) VALUES ('Gula', 'gram');
INSERT INTO bahan_baku (nama, satuan) VALUES ('Es Batu', 'pcs');

INSERT INTO stok (bahan_id, qty, minimum) VALUES (1, 2000, 250);
INSERT INTO stok (bahan_id, qty, minimum) VALUES (2, 5000, 1200);
INSERT INTO stok (bahan_id, qty, minimum) VALUES (3, 2500, 300);
INSERT INTO stok (bahan_id, qty, minimum) VALUES (4, 100, 20);

INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES ('Espresso', 15000, 1, 18);
INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES ('Latte', 20000, 1, 15);
INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES ('Cappuccino', 22000, 1, 17);
INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES ('Teler Susu', 18000, 2, 200);
INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES ('Es Kopi Susu', 25000, 1, 20);
