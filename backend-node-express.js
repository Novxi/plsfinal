/**
 * NORTH ENERJI - PROFESSIONAL BACKEND SERVER
 * 
 * Kurulum adımları:
 * 1. Bir klasör aç: `mkdir north-backend && cd north-backend`
 * 2. `npm init -y`
 * 3. `npm install express cors multer body-parser`
 * 4. Bu kodu `server.js` olarak kaydet.
 * 5. `mkdir uploads` (Resimlerin saklanacağı klasör)
 * 6. `node server.js`
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Resimlerin saklanacağı klasörü oluştur
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Resimleri dışarıya servis et (Örn: http://localhost:5000/uploads/resim.jpg)
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer Ayarları (Disk Depolama)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// Veritabanı simülasyonu (JSON dosyası)
const DB_PATH = path.join(__dirname, 'database.json');
const initDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        const initialData = { leads: [], messages: [], gallery: [] };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    }
};
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- API ENDPOINTS ---

// 1. Resim Yükleme Endpoint'i
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Resim yüklenemedi' });
    // Resmin URL'sini dön
    const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// 2. Galeri Verilerini Getir
app.get('/api/gallery', (req, res) => {
    const db = readDB();
    res.json(db.gallery);
});

// 3. Galeriye Yeni Proje Ekle
app.post('/api/gallery', (req, res) => {
    const db = readDB();
    const newItem = { 
        ...req.body, 
        id: 'gal-' + Date.now(),
        createdAt: new Date().toISOString()
    };
    db.gallery.unshift(newItem);
    writeDB(db);
    res.status(201).json(newItem);
});

// 4. Galeri Projesi Sil (Resmi de siler)
app.delete('/api/gallery/:id', (req, res) => {
    const db = readDB();
    const item = db.gallery.find(i => i.id === req.params.id);
    
    if (item && item.imageUrl) {
        // Fiziksel dosyayı silmeye çalış
        const fileName = item.imageUrl.split('/').pop();
        const filePath = path.join(UPLOADS_DIR, fileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.gallery = db.gallery.filter(i => i.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

// 5. Müşteri Başvuruları (Leads)
app.get('/api/leads', (req, res) => res.json(readDB().leads));
app.post('/api/leads', (req, res) => {
    const db = readDB();
    const newLead = { ...req.body, id: 'L-' + Date.now(), createdAt: new Date().toISOString() };
    db.leads.unshift(newLead);
    writeDB(db);
    res.status(201).json(newLead);
});

// Sunucuyu Başlat
initDB();
app.listen(PORT, () => {
    console.log(`
    🚀 NORTH ENERJI BACKEND AKTİF!
    📡 Sunucu: http://localhost:${PORT}
    📸 Resimler: http://localhost:${PORT}/uploads
    
    Hazırsın kanka! Admin panelinden resim yükleyebilirsin.
    `);
});