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
    if (err) console.error('Error connecting to DB:', err);
    else console.log('MySQL Connected and Ready (Port 5000)...');
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

app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    const sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'customer')";
    db.query(sql, [username, email, password], (err) => {
        if (err) return res.status(500).json({ message: "Username หรือ Email ซ้ำในระบบ" });
        res.status(201).json({ success: true, message: "สมัครสมาชิกสำเร็จ" });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id, username, email, role FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) res.json({ success: true, user: results[0] });
        else res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านผิด" });
    });
});

app.post('/api/reset-password', (req, res) => {
    const { username, email, newPassword } = req.body;
    if (!username || !email || !newPassword) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    db.query("SELECT * FROM users WHERE username = ? AND email = ?", [username, email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database Error" });
        if (results.length === 0) return res.status(404).json({ message: "ข้อมูลไม่ถูกต้อง" });

        const updateSql = "UPDATE users SET password = ? WHERE username = ? AND email = ?";
        db.query(updateSql, [newPassword, username, email], (updErr) => {
            if (updErr) return res.status(500).json({ message: "ไม่สามารถเปลี่ยนรหัสผ่านได้" });
            res.json({ success: true, message: "เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว" });
        });
    });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    const sql = "UPDATE users SET username = ?, password = ? WHERE id = ?";
    db.query(sql, [username, password, id], (err) => {
        if (err) return res.status(500).json({ message: "Update failed" });
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ" });
    });
});

// API ดึงรูปภาพที่ซื้อแล้ว (สำหรับหน้า My Collection)
app.get('/api/my-collection/:buyer_id', (req, res) => {
    const { buyer_id } = req.params;
    const sql = `
        SELECT p.*, o.created_at as purchase_date 
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        WHERE o.buyer_id = ? AND o.status = 'paid'
        ORDER BY o.created_at DESC`;
    
    db.query(sql, [buyer_id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ================= ADMIN API =================

app.get('/api/admin/users', (req, res) => {
    db.query("SELECT id, username, email, role FROM users", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;

    // 1. ลบประวัติการสั่งซื้อที่เกี่ยวข้องกับผู้ใช้นี้ (ทั้งในฐานะคนซื้อและคนขาย)
    const deleteOrders = "DELETE FROM orders WHERE buyer_id = ? OR seller_id = ?";
    
    db.query(deleteOrders, [id, id], (err) => {
        if (err) return res.status(500).json({ message: "ลบประวัติการสั่งซื้อไม่สำเร็จ", error: err });

        // 2. ลบผลงาน (Products) ของผู้ใช้นี้
        const deleteProducts = "DELETE FROM products WHERE user_id = ?";
        
        db.query(deleteProducts, [id], (err) => {
            if (err) return res.status(500).json({ message: "ลบผลงานไม่สำเร็จ", error: err });

            // 3. เมื่อลบข้อมูลที่เกี่ยวข้องหมดแล้ว จึงลบตัวผู้ใช้ (User)
            const deleteUser = "DELETE FROM users WHERE id = ?";
            
            db.query(deleteUser, [id], (err) => {
                if (err) return res.status(500).json({ message: "ลบผู้ใช้งานไม่สำเร็จ", error: err });
                
                res.json({ success: true, message: "ลบผู้ใช้งานและข้อมูลที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว" });
            });
        });
    });
});

app.get('/api/admin/sales-stats', (req, res) => {
    const totalSql = "SELECT SUM(amount) as total_revenue, COUNT(*) as total_sales FROM orders WHERE status = 'paid'";
    const historySql = `
        SELECT o.*, p.title as artwork_name, u.username as buyer_name, o.slip_path 
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.buyer_id = u.id 
        ORDER BY o.created_at DESC LIMIT 20`;
    const dailySql = `
        SELECT DATE(created_at) as date, SUM(amount) as daily_total, COUNT(*) as count 
        FROM orders WHERE status = 'paid' 
        GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7`;

    db.query(totalSql, (err, tRes) => {
        db.query(historySql, (err, hRes) => {
            db.query(dailySql, (err, dRes) => {
                res.json({
                    total_revenue: tRes[0].total_revenue || 0,
                    total_sales: tRes[0].total_sales || 0,
                    sales_history: hRes,
                    daily_performance: dRes
                });
            });
        });
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM products WHERE user_id = ?", [id], () => {
        db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: "ลบผู้ใช้งานและผลงานเรียบร้อย" });
        });
    });
});

// ลบผลงานถาวร (ลบไฟล์รูปออกจากเครื่องด้วย) โดยแอดมิน
app.delete('/api/admin/products/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT thumbnail_path FROM products WHERE id = ?", [id], (err, results) => {
        if (results && results.length > 0) {
            const thumbnailPath = results[0].thumbnail_path;
            db.query("DELETE FROM orders WHERE product_id = ?", [id], () => {
                db.query("DELETE FROM products WHERE id = ?", [id], () => {
                    if (thumbnailPath) {
                        const cleanPath = thumbnailPath.startsWith('/') ? thumbnailPath.substring(1) : thumbnailPath;
                        const filePath = path.join(__dirname, cleanPath);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
                    }
                    res.json({ success: true, message: "ลบผลงานเรียบร้อยแล้ว" });
                });
            });
        } else { res.status(404).json({ message: "ไม่พบสินค้า" }); }
    });
});

// ================= PRODUCT & CHECKOUT API =================

app.get('/api/products', (req, res) => {
    const sql = `SELECT p.*, u.username as owner_name FROM products p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.id DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/products', upload.single('image'), (req, res) => {
    const { title, price, stock, user_id } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const sql = "INSERT INTO products (title, price, thumbnail_path, stock, user_id) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, price, imagePath, stock || 1, user_id], (err) => {
        if (err) return res.status(500).json({ message: "บันทึกข้อมูลไม่สำเร็จ" });
        res.status(201).json({ message: "อัปโหลดสำเร็จ" });
    });
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { title, price, stock } = req.body;
    const sql = "UPDATE products SET title = ?, price = ?, stock = ? WHERE id = ?";
    db.query(sql, [title, price, stock, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ" });
    });
});

// ลบผลงานถาวรสำหรับ User (ลบประวัติการขายและไฟล์รูปด้วย)
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT thumbnail_path FROM products WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: "ไม่พบสินค้า" });
        const thumbnailPath = results[0].thumbnail_path;
        db.query("DELETE FROM orders WHERE product_id = ?", [id], (orderErr) => {
            if (orderErr) return res.status(500).json({ success: false, message: "ลบประวัติการขายไม่สำเร็จ" });
            db.query("DELETE FROM products WHERE id = ?", [id], (prodErr) => {
                if (prodErr) return res.status(500).json({ success: false, message: "ลบรูปภาพจากฐานข้อมูลไม่สำเร็จ" });
                if (thumbnailPath) {
                    const cleanPath = thumbnailPath.startsWith('/') ? thumbnailPath.substring(1) : thumbnailPath;
                    const filePath = path.join(__dirname, cleanPath);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
                }
                res.json({ success: true, message: "ลบผลงานเรียบร้อยแล้ว" });
            });
        });
    });
});

app.post('/api/checkout', upload.single('slip'), (req, res) => {
    const { cart, buyer_id } = req.body;
    const slipPath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!cart || !buyer_id) return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });

    const cartItems = JSON.parse(cart);
    const promises = cartItems.map(item => {
        return new Promise((resolve, reject) => {
            db.query("UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0", [item.id], (err, result) => {
                if (err || result.affectedRows === 0) return reject("สินค้าหมด");
                
                const sqlOrder = "INSERT INTO orders (product_id, buyer_id, seller_id, amount, status, slip_path) VALUES (?, ?, ?, ?, 'paid', ?)";
                db.query(sqlOrder, [item.id, buyer_id, item.user_id, item.price, slipPath], (orderErr) => {
                    if (orderErr) reject(orderErr);
                    else resolve();
                });
            });
        });
    });

    Promise.all(promises)
        .then(() => {
            res.json({ success: true, message: "ชำระเงินเรียบร้อย" });
        })
        .catch(err => res.status(500).json({ message: "Checkout failed", error: err }));
});

// ให้ดึง slip_path ออกมาโชว์ในหน้าประวัติการขาย
app.get('/api/sales/:seller_id', (req, res) => {
    const { seller_id } = req.params;
    const sql = `
        SELECT o.*, p.title as product_name, u.username as buyer_name, o.slip_path 
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.buyer_id = u.id 
        WHERE o.seller_id = ? ORDER BY o.created_at DESC`;
    db.query(sql, [seller_id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/sales-summary/:seller_id', (req, res) => {
    const { seller_id } = req.params;
    const totalSql = `SELECT SUM(amount) as grandTotal FROM orders WHERE seller_id = ? AND status = 'paid'`;
    const dailySql = `SELECT DATE(created_at) as date, SUM(amount) as dailyTotal, COUNT(*) as count FROM orders WHERE seller_id = ? AND status = 'paid' GROUP BY DATE(created_at) ORDER BY date DESC`;
    db.query(totalSql, [seller_id], (err, tRes) => {
        db.query(dailySql, [seller_id], (err, dRes) => {
            res.json({ grandTotal: tRes[0].grandTotal || 0, dailySummary: dRes });
        });
    });
});

app.listen(5000, () => console.log(`Server running at: http://localhost:5000`));