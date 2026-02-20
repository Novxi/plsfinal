
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust Proxy: Render arkasında protokol (https) hatası almamak için
app.set('trust proxy', 1);

// CORS Ayarları
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Klasör Kontrolleri
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Statik Dosyalar (Resimler)
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer (Resim Yükleme)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// JSON DB Yardımcıları
const DB_PATH = path.join(__dirname, 'database.json');
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { leads: [], messages: [], gallery: [] };
    }
};
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- API ENDPOINTS ---

app.get('/', (req, res) => res.send('North Enerji API Online'));

// Resim Yükle
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const imageUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// Başvurular (Leads)
app.get('/api/leads', (req, res) => res.json(readDB().leads));
app.post('/api/leads', (req, res) => {
    const db = readDB();
    const newLead = { ...req.body, id: 'L-' + Date.now(), createdAt: new Date().toISOString() };
    if (!db.leads) db.leads = [];
    db.leads.unshift(newLead);
    writeDB(db);
    res.status(201).json(newLead);
});
app.delete('/api/leads/:id', (req, res) => {
    const db = readDB();
    if (!db.leads) db.leads = [];
    db.leads = db.leads.filter(l => l.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

// Mesajlar
app.get('/api/messages', (req, res) => res.json(readDB().messages));
app.post('/api/messages', (req, res) => {
    const db = readDB();
    const newMessage = { ...req.body, id: 'M-' + Date.now(), createdAt: new Date().toISOString() };
    if (!db.messages) db.messages = [];
    db.messages.unshift(newMessage);
    writeDB(db);
    res.status(201).json(newMessage);
});

// Galeri
app.get('/api/gallery', (req, res) => res.json(readDB().gallery));
app.post('/api/gallery', (req, res) => {
    const db = readDB();
    const newItem = { ...req.body, id: 'gal-' + Date.now() };
    if (!db.gallery) db.gallery = [];
    db.gallery.unshift(newItem);
    writeDB(db);
    res.status(201).json(newItem);
});
app.delete('/api/gallery/:id', (req, res) => {
    const db = readDB();
    if (!db.gallery) db.gallery = [];
    db.gallery = db.gallery.filter(i => i.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
