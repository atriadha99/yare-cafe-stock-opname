const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { db, init } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const auth = (req, res, next) => {
  const authCookie = req.cookies['yare-auth'];
  if (!authCookie) return res.redirect('/');
  const [username, role] = authCookie.split('|');
  if (!username || !role) return res.redirect('/');
  req.user = { username, role };
  next();
};

const pageRoles = {
  dashboard: ['admin', 'gudang', 'kasir'],
  menu: ['admin', 'gudang', 'kasir'],
  transaksi: ['admin', 'kasir'],
  gudang: ['admin', 'gudang'],
  opname: ['admin', 'gudang', 'kasir']
};

const authRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Akses ditolak' });
  next();
};

const authPage = (page) => (req, res, next) => {
  if (!pageRoles[page].includes(req.user.role)) {
    const redirectPage = req.user.role === 'kasir' ? '/transaksi' : req.user.role === 'gudang' ? '/gudang' : '/dashboard';
    return res.redirect(redirectPage);
  }
  next();
};

app.get('/dashboard', auth, authPage('dashboard'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/menu', auth, authPage('menu'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
app.get('/transaksi', auth, authPage('transaksi'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'transaksi.html')));
app.get('/gudang', auth, authPage('gudang'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'gudang.html')));
app.get('/opname', auth, authPage('opname'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'opname.html')));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT username, role FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(401).json({ error: 'Login gagal' });
    res.cookie('yare-auth', `${row.username}|${row.role}`, { httpOnly: false });
    res.json({ username: row.username, role: row.role });
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('yare-auth');
  res.json({ ok: true });
});

app.get('/api/user', auth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

app.get('/api/summary', auth, (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) AS total_menu FROM menu', (err, menuRow) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT COUNT(*) AS total_transaksi FROM transaksi', (err2, trxRow) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.get('SELECT SUM(qty) AS total_bahan FROM stok', (err3, stokRow) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ total_menu: menuRow.total_menu, total_transaksi: trxRow.total_transaksi, total_stok: stokRow.total_bahan || 0 });
        });
      });
    });
  });
});

app.get('/api/menu', auth, (req, res) => {
  db.all(`SELECT menu.id, menu.nama, menu.harga, menu.bahan_id, menu.jumlah_bahan, bahan_baku.nama AS bahan_nama, bahan_baku.satuan
          FROM menu
          LEFT JOIN bahan_baku ON menu.bahan_id = bahan_baku.id`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/menu', auth, authRole(['admin', 'kasir']), (req, res) => {
  const { nama, harga, bahan_id, jumlah_bahan } = req.body;
  db.run('INSERT INTO menu (nama, harga, bahan_id, jumlah_bahan) VALUES (?, ?, ?, ?)', [nama, harga, bahan_id, jumlah_bahan], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/menu/:id', auth, authRole(['admin', 'kasir']), (req, res) => {
  const id = req.params.id;
  const { nama, harga, bahan_id, jumlah_bahan } = req.body;
  db.run('UPDATE menu SET nama = ?, harga = ?, bahan_id = ?, jumlah_bahan = ? WHERE id = ?', [nama, harga, bahan_id, jumlah_bahan, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/menu/:id', auth, authRole(['admin', 'kasir']), (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM menu WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/bahan', auth, (req, res) => {
  db.all(`SELECT bahan_baku.id, bahan_baku.nama, bahan_baku.satuan, stok.qty, stok.minimum
          FROM bahan_baku
          LEFT JOIN stok ON bahan_baku.id = stok.bahan_id`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/stock/update', auth, authRole(['admin', 'gudang']), (req, res) => {
  const { bahan_id, qty, minimum } = req.body;
  db.run('UPDATE stok SET qty = ?, minimum = ? WHERE bahan_id = ?', [qty, minimum, bahan_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.post('/api/stock/move', auth, authRole(['admin', 'gudang']), (req, res) => {
  const { bahan_id, type, qty } = req.body;
  const delta = type === 'masuk' ? qty : -qty;
  db.run('UPDATE stok SET qty = qty + ? WHERE bahan_id = ?', [delta, bahan_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/transaksi', auth, authRole(['admin','kasir']), (req, res) => {
  db.all(`SELECT transaksi.id, transaksi.tanggal, transaksi.total, transaksi.kasir,
          GROUP_CONCAT(menu.nama || ' x' || detail_transaksi.qty, ', ') AS items
          FROM transaksi
          LEFT JOIN detail_transaksi ON transaksi.id = detail_transaksi.transaksi_id
          LEFT JOIN menu ON detail_transaksi.menu_id = menu.id
          GROUP BY transaksi.id ORDER BY transaksi.id DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/transaksi', auth, authRole(['admin','kasir']), (req, res) => {
  const { kasir, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Tidak ada item' });
  const tanggal = new Date().toISOString();
  const total = items.reduce((sum, item) => sum + item.qty * item.harga, 0);

  db.run('INSERT INTO transaksi (tanggal, total, kasir) VALUES (?, ?, ?)', [tanggal, total, kasir], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const transaksiId = this.lastID;
    const stmt = db.prepare('INSERT INTO detail_transaksi (transaksi_id, menu_id, qty, subtotal) VALUES (?, ?, ?, ?)');
    items.forEach((item) => {
      stmt.run(transaksiId, item.menu_id, item.qty, item.qty * item.harga);
      db.get('SELECT bahan_id, jumlah_bahan FROM menu WHERE id = ?', [item.menu_id], (err2, menuRow) => {
        if (!err2 && menuRow) {
          const totalBahan = menuRow.jumlah_bahan * item.qty;
          db.run('UPDATE stok SET qty = qty - ? WHERE bahan_id = ?', [totalBahan, menuRow.bahan_id]);
        }
      });
    });
    stmt.finalize();
    res.json({ id: transaksiId, total });
  });
});

app.get('/api/opname', auth, authRole(['admin','gudang']), (req, res) => {
  db.all(`SELECT opname.id, bahan_baku.nama, bahan_baku.satuan, opname.stok_fisik, opname.stok_sistem, opname.selisih, opname.tanggal
          FROM opname
          LEFT JOIN bahan_baku ON opname.bahan_id = bahan_baku.id
          ORDER BY opname.id DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/opname', auth, authRole(['admin','gudang']), (req, res) => {
  const { bahan_id, stok_fisik } = req.body;
  db.get('SELECT qty FROM stok WHERE bahan_id = ?', [bahan_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Bahan tidak ditemukan' });
    const stokSistem = row.qty;
    const selisih = stok_fisik - stokSistem;
    const tanggal = new Date().toISOString();
    db.run('INSERT INTO opname (bahan_id, tanggal, stok_fisik, stok_sistem, selisih) VALUES (?, ?, ?, ?, ?)', [bahan_id, tanggal, stok_fisik, stokSistem, selisih], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID, selisih });
    });
  });
});

app.get('/api/notifications', auth, (req, res) => {
  db.all('SELECT bahan_baku.nama, stok.qty, stok.minimum FROM stok JOIN bahan_baku ON stok.bahan_id = bahan_baku.id WHERE stok.qty < stok.minimum', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('*', (req, res) => {
  res.redirect('/');
});

init();

const server = app.listen(port, () => console.log(`Server berjalan di http://localhost:${port}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} sudah digunakan. Hentikan proses lain atau setel PORT yang berbeda.`);
    process.exit(1);
  }
  throw err;
});
