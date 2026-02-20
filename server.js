
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("started", PORT));

// Trust Proxy: Render load balancer'ı arkasında doğru protokolü (https) almak için
app.set('trust proxy', 1);

// CORS: Tüm kaynaklara izin ver
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser limitini artır
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Uploads Klasörü Kontrolü
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Uploads klasörünü statik olarak sun
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer Ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Basit Veritabanı
const DB_PATH = path.join(__dirname, 'database.json');
const initDB = () => {
    const initialData = { leads: [], messages: [], gallery: [] };
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        }
    } catch (e) {
        console.error("Init DB Error:", e);
    }
};

const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) initDB();
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return data ? JSON.parse(data) : { leads: [], messages: [], gallery: [] };
    } catch (err) {
        console.error("Veritabanı okuma hatası:", err);
        return { leads: [], messages: [], gallery: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Veritabanı yazma hatası:", err);
    }
};

initDB();

// --- API ENDPOINTS ---

app.get('/', (req, res) => {
    res.status(200).send('North Enerji Backend Aktif. Running on Render.');
});

// Image Upload
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Resim yüklenemedi' });
    
    // Protokolü ve hostu belirle. Render üzerinde her zaman HTTPS dönmeli.
    const host = req.get('host');
    const isRender = host && host.includes('onrender.com');
    const protocol = isRender ? 'https' : req.protocol;
    
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.json({ url: imageUrl });
});

// Gallery
app.get('/api/gallery', (req, res) => {
    const db = readDB();
    res.json(db.gallery || []);
});
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
    const item = db.gallery.find(i => i.id === req.params.id);
    if (item && item.imageUrl) {
        try {
            // Sadece dosya yolu sunucudaysa silmeyi dene
            if (item.imageUrl.includes('/uploads/')) {
                const fileName = item.imageUrl.split('/').pop();
                if (fileName) {
                    const filePath = path.join(UPLOADS_DIR, fileName);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            }
        } catch (e) { console.error(e); }
    }
    db.gallery = (db.gallery || []).filter(i => i.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

// Leads
app.get('/api/leads', (req, res) => {
    const db = readDB();
    res.json(db.leads || []);
});
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

// Messages
app.get('/api/messages', (req, res) => {
    const db = readDB();
    res.json(db.messages || []);
});
app.post('/api/messages', (req, res) => {
    const db = readDB();
    const newMessage = { ...req.body, id: 'M-' + Date.now(), createdAt: new Date().toISOString() };
    if (!db.messages) db.messages = [];
    db.messages.unshift(newMessage);
    writeDB(db);
    res.status(201).json(newMessage);
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NORTH ENERJI BACKEND STARTED on PORT ${PORT}`);
});
