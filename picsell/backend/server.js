const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ================= เชื่อมต่อ Database =================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'picsell_db'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to DB:', err);
    } else {
        console.log('MySQL Connected and Ready...');
    }
});

// ================= การจัดการไฟล์ (Multer) =================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= USER API =================

// สมัครสมาชิก
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    const sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'customer')";
    db.query(sql, [username, email, password], (err) => {
        if (err) return res.status(500).json({ message: "Username หรือ Email ซ้ำในระบบ" });
        res.status(201).json({ success: true, message: "สมัครสมาชิกสำเร็จ" });
    });
});

// เข้าสู่ระบบ
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id, username, email, role FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) res.json({ success: true, user: results[0] });
        else res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านผิด" });
    });
});

// รีเซ็ตรหัสผ่าน
app.post('/api/reset-password', (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    
    db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
        if (err) return res.status(500).json({ message: "Database Error" });
        if (results.length === 0) return res.status(404).json({ message: "ไม่พบ Username นี้ในระบบ" });
        
        const updateSql = "UPDATE users SET password = ? WHERE username = ?";
        db.query(updateSql, [newPassword, username], (updErr) => {
            if (updErr) return res.status(500).json({ message: "ไม่สามารถเปลี่ยนรหัสผ่านได้" });
            res.json({ success: true, message: "เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว" });
        });
    });
});

// แก้ไขโปรไฟล์
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    const sql = "UPDATE users SET username = ?, password = ? WHERE id = ?";
    db.query(sql, [username, password, id], (err) => {
        if (err) return res.status(500).json({ message: "ชื่อผู้ใช้นี้อาจมีผู้อื่นใช้แล้ว" });
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ" });
    });
});

// ================= ADMIN API =================

// ดึงรายชื่อผู้ใช้ทั้งหมด
app.get('/api/admin/users', (req, res) => {
    db.query("SELECT id, username, email FROM users", (err, result) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err });
        res.json(result);
    });
});

// ดึงข้อมูลผู้ใช้รายบุคคล
app.get('/api/admin/users/:id', (req, res) => {
    db.query("SELECT id, username, email FROM users WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: "Database Error" });
        if (result.length === 0) return res.status(404).json({ message: "User not found" });
        res.json(result[0]);
    });
});

// ดึงสินค้าทั้งหมด
app.get('/api/admin/products', (req, res) => {
    db.query("SELECT * FROM products", (err, result) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err });
        res.json(result);
    });
});

// ลบผู้ใช้งานและสินค้าของเขา
app.delete('/api/admin/users/:id', (req, res) => {
    const userId = req.params.id;
    db.query("DELETE FROM products WHERE user_id = ?", [userId], (err) => {
        db.query("DELETE FROM users WHERE id = ?", [userId], (err2) => {
            if (err2) return res.status(500).json({ message: "Delete user failed" });
            res.json({ message: "User and their products deleted successfully" });
        });
    });
});

// ลบสินค้าโดย Admin
app.delete('/api/admin/products/:id', (req, res) => {
    db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: "Delete artwork failed" });
        res.json({ message: "Artwork deleted by admin" });
    });
});

// ================= PRODUCT API =================

// ดึงรายการสินค้าทั้งหมดพร้อมชื่อเจ้าของ
app.get('/api/products', (req, res) => {
    const sql = `SELECT p.*, u.username as owner_name FROM products p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.id DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// อัปโหลดสินค้าใหม่
app.post('/api/products', upload.single('image'), (req, res) => {
    const { title, price, stock, user_id } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!user_id) return res.status(400).json({ message: "User ID is required" });
    
    const sql = "INSERT INTO products (title, price, thumbnail_path, stock, user_id) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, price, imagePath, stock || 1, user_id], (err) => {
        if (err) return res.status(500).json({ message: "บันทึกข้อมูลไม่สำเร็จ" });
        res.status(201).json({ message: "อัปโหลดงานศิลปะสำเร็จ" });
    });
});

// แก้ไขสินค้า
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { title, price, stock } = req.body;
    const sql = "UPDATE products SET title = ?, price = ?, stock = ? WHERE id = ?";
    db.query(sql, [title, price, stock, id], (err) => {
        if (err) return res.status(500).json({ message: "แก้ไขข้อมูลไม่สำเร็จ" });
        res.json({ success: true, message: "อัปเดตข้อมูลสินค้าเรียบร้อย" });
    });
});

// ลบสินค้า (พร้อมลบไฟล์ในเครื่อง)
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT thumbnail_path FROM products WHERE id = ?", [id], (err, results) => {
        if (results && results.length > 0 && results[0].thumbnail_path) {
            const filePath = path.join(__dirname, results[0].thumbnail_path);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        db.query("DELETE FROM products WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "ลบงานศิลปะเรียบร้อย" });
        });
    });
});

// ================= ORDER, SALES & COLLECTION API =================

// ดึงรายการที่ User เคยซื้อ (Collection)
app.get('/api/user-collection/:buyer_id', (req, res) => {
    const { buyer_id } = req.params;
    const sql = `
        SELECT p.id, p.title, p.thumbnail_path, p.price, o.created_at
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.buyer_id = ? AND o.status = 'paid'
        ORDER BY o.created_at DESC`;

    db.query(sql, [buyer_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err });
        res.json(results);
    });
});

// ระบบ Checkout
app.post('/api/checkout', (req, res) => {
    const { cart, buyer_id } = req.body;
    if (!cart || cart.length === 0) return res.status(400).json({ message: "ไม่มีสินค้าในตะกร้า" });

    const promises = cart.map(item => {
        return new Promise((resolve, reject) => {
            db.query("UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0", [item.id], (err, result) => {
                if (err) return reject(err);
                const sqlOrder = "INSERT INTO orders (product_id, buyer_id, seller_id, amount, status) VALUES (?, ?, ?, ?, 'paid')";
                db.query(sqlOrder, [item.id, buyer_id, item.user_id, item.price], (orderErr) => {
                    if (orderErr) reject(orderErr);
                    else resolve(result);
                });
            });
        });
    });

    Promise.all(promises)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ message: "Checkout failed", error: err }));
});

// ดึงรายงานการขายของผู้ขาย
app.get('/api/sales/:seller_id', (req, res) => {
    const { seller_id } = req.params;
    const sql = `
        SELECT o.*, p.title as product_name, u.username as buyer_name 
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u ON o.buyer_id = u.id
        WHERE o.seller_id = ?
        ORDER BY o.created_at DESC`;

    db.query(sql, [seller_id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// เริ่มต้น Server
app.listen(5000, () => console.log(`Server running at: http://localhost:5000`));