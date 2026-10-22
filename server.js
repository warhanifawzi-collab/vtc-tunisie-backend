// ============================================================
// VTC TUNISIE ULTRA - PLATEFORME WEB PRO & ADMIN SECURE
// Banque : Amen Bank - RIB : 07308006410581111081
// Titulaire : Ahmed Ayari
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Permet de servir automatiquement les fichiers statiques (HTML, CSS, JS) du dossier courant
app.use(express.static(__dirname));

// Configuration Bancaire & Plateforme
const AMEN_BANK_CONFIG = {
    bankName: "Amen Bank - Agence Tunis",
    rib: "07308006410581111081",
    accountHolder: "Ahmed Ayari"
};

// Bases de données en mémoire
let ridesDatabase = [];
let pendingDrivers = [
    { id: 101, name: "Sami Ben Ali", phone: "+216 20 123 456", cin: "08812345", car: "Symbol 2022", status: "En attente" }
];
let activeDrivers = [
    { id: 1, name: "Chauffeur Test 1", car: "Renault Symbol", rating: 4.9, status: "Disponible", phone: "+216 98 000 000", lat: 36.8065, lng: 10.1815 }
];

// ============================================================
// 1. PAGE D'ACCUEIL CLIENT & CARTE INTERACTIVE
// ============================================================
app.get('/', (req, res) => {
    // Si un fichier index.html physique existe dans le dossier, on peut le servir directement,
    // sinon le template intégré s'affiche.
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            res.send(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>VTC Tunisie Ultra - Transport Premium</title>
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <script src="/socket.io/socket.io.js"></script>
                    <style>
                        body { background-color: #090d16; color: #f8fafc; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 15px; }
                        header { display: flex; justify-content: space-between; align-items: center; max-width: 1100px; margin: 0 auto 20px auto; border-bottom: 1px solid #1f2937; padding-bottom: 10px; }
                        h1 { color: #d4af37; margin: 0; font-size: 24px; }
                        nav a { color: #94a3b8; text-decoration: none; margin-left: 15px; font-size: 13px; border: 1px solid #374151; padding: 6px 12px; border-radius: 6px; }
                        nav a.btn-apk { background: #d4af37; color: #000; border: none; font-weight: bold; }
                        .layout { display: flex; gap: 20px; max-width: 1100px; margin: 0 auto; flex-wrap: wrap; }
                        .panel { flex: 1; min-width: 320px; background: #111827; padding: 20px; border-radius: 16px; border: 1px solid #d4af37; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                        #map { height: 400px; width: 100%; border-radius: 12px; border: 1px solid #374151; }
                        .form-group { margin-bottom: 12px; }
                        label { display: block; color: #cbd5e1; font-size: 12px; margin-bottom: 4px; }
                        input, select { width: 100%; padding: 10px; background: #1f2937; border: 1px solid #374151; color: #fff; border-radius: 8px; box-sizing: border-box; }
                        button { background: linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%); color: #000; border: none; padding: 12px; width: 100%; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 15px; margin-top: 10px; }
                        .status-box { margin-top: 15px; background: #1f2937; padding: 12px; border-radius: 8px; font-size: 13px; color: #34d399; border-left: 4px solid #34d399; display: none; }
                        footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
                        footer a { color: #94a3b8; text-decoration: underline; margin: 0 5px; }
                    </style>
                </head>
                <body>
                    <header>
                        <h1>VTC TUNISIE ULTRA 🚖</h1>
                        <nav>
                            <a href="/driver/register">🚘 Devenir Chauffeur</a>
                            <a href="/download" class="btn-apk">📱 Télécharger APK</a>
                            <a href="/admin">🔒 Admin Login</a>
                        </nav>
                    </header>

                    <div class="layout">
                        <div class="panel">
                            <h3 style="color: #d4af37; margin-top: 0;">Commander une Course (100% Cash)</h3>
                            <div class="form-group">
                                <label>📍 Lieu de départ</label>
                                <input type="text" id="pickup" value="Aéroport Tunis-Carthage">
                            </div>
                            <div class="form-group">
                                <label>🏁 Destination</label>
                                <input type="text" id="dropoff" value="La Marsa Plage">
                            </div>
                            <div class="form-group">
                                <label>🚗 Catégorie de Véhicule</label>
                                <select id="carType">
                                    <option value="Confort">Confort Standard</option>
                                    <option value="VIP">VIP Gold (Berline)</option>
                                    <option value="Van">Van Familial</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>💳 Mode de Paiement</label>
                                <select id="paymentMethod">
                                    <option value="cash">Espèces au Chauffeur (100% Cash)</option>
                                </select>
                            </div>
                            <button onclick="submitRide()">Valider & Suivre la Course</button>
                            <div id="result" class="status-box"></div>
                        </div>

                        <div class="panel">
                            <h3 style="color: #d4af37; margin-top: 0;">🗺️ Suivi GPS en Temps Réel</h3>
                            <div id="map"></div>
                        </div>
                    </div>

                    <footer>
                        © 2026 VTC Tunisie Ultra. RIB Amen Bank: 07308006410581111081 | <a href="/cgu">CGU & Mentions Légales</a>
                    </footer>

                    <script>
                        const map = L.map('map').setView([36.8065, 10.1815], 12);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

                        let driverMarker = L.marker([36.8065, 10.1815]).addTo(map)
                            .bindPopup("<b>Chauffeur Test 1</b><br>Disponible").openPopup();

                        const socket = io();
                        socket.on('liveDriverLocation', (data) => {
                            if(data.lat && data.lng) {
                                driverMarker.setLatLng([data.lat, data.lng]);
                                map.panTo([data.lat, data.lng]);
                            }
                        });

                        async function submitRide() {
                            const pickup = document.getElementById('pickup').value;
                            const dropoff = document.getElementById('dropoff').value;
                            const carType = document.getElementById('carType').value;
                            const paymentMethod = document.getElementById('paymentMethod').value;

                            const response = await fetch('/api/ride/confirm', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ rideId: Date.now(), pickup, dropoff, carType, paymentMethod, distanceKm: 12, durationMin: 20 })
                            });
                            const data = await response.json();
                            
                            const resBox = document.getElementById('result');
                            resBox.style.display = 'block';
                            if(data.success) {
                                resBox.innerHTML = '✅ <b>Course confirmée !</b><br>' +
                                                   '💰 Total : ' + data.amountTND + ' TND (25% Commission Wallet)<br>' +
                                                   '🔒 Code PIN : <b style="color:#d4af37;">' + data.securityPin + '</b><br>' +
                                                   '📄 <a href="/receipt/' + data.rideId + '" target="_blank" style="color:#60a5fa;">Télécharger Reçu PDF</a>';
                                
                                let step = 0;
                                const interval = setInterval(() => {
                                    step += 0.002;
                                    socket.emit('updateDriverLocation', { driverId: 1, lat: 36.8065 + step, lng: 10.1815 + step });
                                    if(step >= 0.01) clearInterval(interval);
                                }, 2000);
                            }
                        }
                    </script>
                </body>
                </html>
            `);
        }
    });
});

// ============================================================
// 2. PAGE DE TÉLÉCHARGEMENT DE L'APPLICATION MOBILE (APK)
// ============================================================
app.get('/download', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Télécharger VTC Tunisie Ultra APK</title>
            <style>
                body { background: #090d16; color: #fff; font-family: sans-serif; text-align: center; padding: 50px 20px; }
                .card { background: #111827; max-width: 450px; margin: 0 auto; padding: 30px; border-radius: 16px; border: 1px solid #d4af37; }
                h1 { color: #d4af37; }
                .btn { display: inline-block; background: #d4af37; color: #000; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>📱 VTC Tunisie Ultra Mobile</h1>
                <p>Téléchargez l'application officielle Android pour Chauffeurs (Modèle Wallet & Cash).</p>
                <p style="font-size:13px; color:#94a3b8;">Version 1.0.0 Pro | Compatible Android 8.0+</p>
                <a href="/download/app.apk" class="btn">📥 Télécharger le Fichier APK</a>
                <br><br>
                <a href="/" style="color:#94a3b8; font-size:13px;">⬅️ Retour à l'accueil</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/download/app.apk', (req, res) => {
    res.send("Le fichier APK compilé sera téléchargeable ici dès sa génération finale.");
});

// ============================================================
// 3. INSCRIPTION ET SOUMISSION DOCUMENTS CHAUFFEURS
// ============================================================
app.get('/driver/register', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Devenir Chauffeur - VTC Tunisie Ultra</title>
            <style>
                body { background: #090d16; color: #fff; font-family: sans-serif; padding: 40px 20px; }
                .form-box { background: #111827; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 12px; border: 1px solid #d4af37; }
                h2 { color: #d4af37; margin-top: 0; }
                input { width: 100%; padding: 10px; margin: 8px 0 15px 0; background: #1f2937; border: 1px solid #374151; color: #fff; border-radius: 6px; box-sizing: border-box; }
                button { background: #d4af37; color: #000; border: none; padding: 12px; width: 100%; font-weight: bold; border-radius: 6px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="form-box">
                <h2>🚘 Inscription Chauffeur Partner</h2>
                <p style="font-size: 13px; color: #94a3b8;">Rejoignez le réseau VTC Tunisie Ultra (Commission 25% réglée via votre RIB Amen Bank).</p>
                <form action="/api/driver/register" method="POST">
                    <label>Nom complet</label>
                    <input type="text" name="name" required placeholder="Ex: Mohamed Trabelsi">
                    
                    <label>Numéro de Téléphone</label>
                    <input type="text" name="phone" required placeholder="Ex: +216 98 123 456">

                    <label>Numéro CIN</label>
                    <input type="text" name="cin" required placeholder="Ex: 08899887">

                    <label>Modèle du Véhicule</label>
                    <input type="text" name="car" required placeholder="Ex: Kia Rio 2023">

                    <button type="submit">Envoyer le Dossier pour Validation</button>
                </form>
                <br>
                <a href="/" style="color:#94a3b8; font-size:12px;">⬅️ Retour à l'accueil</a>
            </div>
        </body>
        </html>
    `);
});

app.post('/api/driver/register', (req, res) => {
    const { name, phone, cin, car } = req.body;
    pendingDrivers.push({ id: Date.now(), name, phone, cin, car, status: "En attente" });
    res.send("<h2 style='color:green; text-align:center;'>Dossier Reçu ! Votre candidature sera validée sous 24h par l'Administrateur. <br><a href='/'>Retour</a></h2>");
});

// ============================================================
// 4. DASHBOARD SUPER ADMIN SÉCURISÉ (MOT DE PASSE: admin123)
// ============================================================
app.get('/admin', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== 'Basic ' + Buffer.from('admin:admin123').toString('base64')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Espace Admin VTC Tunisie"');
        return res.status(401).send("Accès refusé. Mot de passe requis (Admin: admin, Pass: admin123).");
    }

    const totalRevenue = ridesDatabase.reduce((sum, r) => sum + r.amountTND, 0);
    const platformEarnings = ridesDatabase.reduce((sum, r) => sum + r.platformCommission, 0);

    let rows = ridesDatabase.map(r => `
        <tr>
            <td>#${r.rideId}</td>
            <td>${r.pickup} ➔ ${r.dropoff}</td>
            <td><b>${r.amountTND} TND</b></td>
            <td style="color:#34d399;">${r.platformCommission} TND</td>
            <td style="color:#60a5fa;">${r.driverShare} TND</td>
            <td>${r.securityPin}</td>
            <td><a href="/receipt/${r.rideId}" target="_blank" style="color:#d4af37;">📄 Reçu</a></td>
        </tr>
    `).join('');

    let pendingRows = pendingDrivers.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.phone}</td>
            <td>${d.cin}</td>
            <td>${d.car}</td>
            <td><a href="/api/driver/approve/${d.id}" style="color:#34d399; font-weight:bold;">Valider le Candidat</a></td>
        </tr>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Super Admin SÉCURISÉ - VTC Tunisie Ultra</title>
            <style>
                body { background: #0b0f19; color: #e2e8f0; font-family: sans-serif; padding: 25px; }
                h1 { color: #d4af37; text-align: center; }
                .stats { display: flex; gap: 20px; margin: 25px 0; justify-content: center; flex-wrap: wrap; }
                .card { background: #151e2e; padding: 20px; border-radius: 12px; border: 1px solid #d4af37; text-align: center; min-width: 200px; }
                .card h2 { color: #34d399; margin: 10px 0 0 0; }
                table { width: 100%; max-width: 1000px; margin: 20px auto; border-collapse: collapse; background: #151e2e; border-radius: 12px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #2d3748; font-size: 13px; }
                th { background: #1f2937; color: #d4af37; }
                .bank-box { max-width: 1000px; margin: 0 auto 20px auto; background: #1e293b; padding: 15px; border-radius: 8px; border-left: 4px solid #d4af37; font-size: 13px; }
            </style>
        </head>
        <body>
            <h1>📊 Super Admin - Finances & Chauffeurs</h1>
            
            <div class="bank-box">
                🏦 <b>Votre RIB Amen Bank (Réception des Commissions) :</b> <code style="background:#000; padding:2px 6px; color:#d4af37; font-weight:bold;">${AMEN_BANK_CONFIG.rib}</code> | Titulaire: ${AMEN_BANK_CONFIG.accountHolder}
            </div>

            <div class="stats">
                <div class="card">
                    <div>Courses Totales</div>
                    <h2>${ridesDatabase.length}</h2>
                </div>
                <div class="card">
                    <div>Chiffre d'Affaires Global</div>
                    <h2>${totalRevenue.toFixed(2)} TND</h2>
                </div>
                <div class="card">
                    <div>Gain Plateforme (25%)</div>
                    <h2 style="color:#d4af37;">${platformEarnings.toFixed(2)} TND</h2>
                </div>
            </div>

            <h3 style="text-align: center; color: #d4af37;">🪪 Candidatures Chauffeurs en Attente</h3>
            <table>
                <thead>
                    <tr><th>Nom</th><th>Téléphone</th><th>CIN</th><th>Véhicule</th><th>Action</th></tr>
                </thead>
                <tbody>${pendingRows || '<tr><td colspan="5" style="text-align:center;">Aucune candidature en attente.</td></tr>'}</tbody>
            </table>

            <h3 style="text-align: center; color: #94a3b8; margin-top:40px;">Historique des Courses</h3>
            <table>
                <thead>
                    <tr><th>ID</th><th>Trajet</th><th>Total</th><th>Commission 25%</th><th>Chauffeur 75%</th><th>PIN</th><th>Facture</th></tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="7" style="text-align:center;">Aucune course enregistrée.</td></tr>'}</tbody>
            </table>
        </body>
        </html>
    `);
});

app.get('/api/driver/approve/:id', (req, res) => {
    const id = parseInt(req.params.id);
    pendingDrivers = pendingDrivers.filter(d => d.id !== id);
    res.send("<script>alert('Chauffeur approuvé avec succès !'); window.location.href='/admin';</script>");
});

// ============================================================
// 5. GÉNÉRATION DE REÇU / FACTURE PDF NUMÉRIQUE
// ============================================================
app.get('/receipt/:rideId', (req, res) => {
    const ride = ridesDatabase.find(r => r.rideId == req.params.rideId);
    if (!ride) return res.status(404).send("Reçu introuvable.");

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Reçu de Course #${ride.rideId}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; background: #f4f4f9; color: #333; }
                .receipt { max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                h2 { color: #b8860b; border-bottom: 2px solid #b8860b; padding-bottom: 10px; }
                .row { display: flex; justify-content: space-between; margin: 12px 0; font-size: 14px; }
                .total { font-size: 18px; font-weight: bold; border-top: 2px solid #eee; padding-top: 10px; margin-top: 20px; color: #000; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <h2>VTC TUNISIE ULTRA</h2>
                <p><b>Reçu de Paiement Officiel (100% Cash)</b></p>
                <div class="row"><span>ID Course :</span> <span>#${ride.rideId}</span></div>
                <div class="row"><span>Départ :</span> <span>${ride.pickup}</span></div>
                <div class="row"><span>Destination :</span> <span>${ride.dropoff}</span></div>
                <div class="row"><span>Mode de Paiement :</span> <span>Espèces (Cash)</span></div>
                <div class="row"><span>Chauffeur :</span> <span>${ride.driver}</span></div>
                <div class="total row"><span>Montant Réglé :</span> <span>${ride.amountTND} TND</span></div>
                <br>
                <button onclick="window.print()" style="background:#b8860b; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">🖨️ Imprimer ce Reçu</button>
            </div>
        </body>
        </html>
    `);
});

// ============================================================
// 6. CONDITIONS GÉNÉRALES (CGU)
// ============================================================
app.get('/cgu', (req, res) => {
    res.send(`
        <div style="font-family:sans-serif; max-width:800px; margin:40px auto; line-height:1.6; padding:20px;">
            <h1>Conditions Générales d'Utilisation - VTC Tunisie Ultra</h1>
            <p>La plateforme VTC Tunisie Ultra met en relation des passagers avec des chauffeurs indépendants enregistrés en Tunisie.</p>
            <h3>1. Tarification et Modèle Économique</h3>
            <p>Les courses sont réglées en 100% espèces entre le passager et le chauffeur. La plateforme prélève une commission de 25% gérée via le solde portefeuille (Wallet) du chauffeur, payable par virement ou dépôt sur votre RIB Amen Bank : <b>07308006410581111081</b>.</p>
            <h3>2. Sécurité</h3>
            <p>Un code PIN à 4 chiffres est généré à chaque réservation pour certifier le début de la course.</p>
            <br><a href="/">Retour au site</a>
        </div>
    `);
});

// APIS CORE
app.post('/api/ride/confirm', (req, res) => {
    const { rideId, pickup, dropoff, carType, paymentMethod, distanceKm = 10, durationMin = 20 } = req.body;
    let baseFare = carType === 'VIP' ? 6 : (carType === 'Van' ? 8 : 3);
    const amountTND = Number((baseFare + (distanceKm * 1.8) + (durationMin * 0.3)).toFixed(2));
    const platformCommission = Number((amountTND * 0.25).toFixed(2));
    const driverShare = Number((amountTND * 0.75).toFixed(2));
    const securityPin = Math.floor(1000 + Math.random() * 9000);
    const assignedDriver = activeDrivers[0];

    const newRide = { rideId, pickup, dropoff, amountTND, platformCommission, driverShare, securityPin, paymentMethod: 'Espèces (Cash)', driver: assignedDriver.name, createdAt: new Date() };
    ridesDatabase.push(newRide);

    res.json({ success: true, rideId, amountTND, platformCommission, driverShare, securityPin, driver: assignedDriver });
});

io.on('connection', (socket) => {
    socket.on('updateDriverLocation', (data) => {
        io.emit('liveDriverLocation', data);
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Site Web VTC Tunisie Ultra PRO actif sur le port ${PORT}`);
    console.log(`🔗 Interface Client : http://localhost:${PORT}`);
    console.log(`🔒 Dashboard Admin SÉCURISÉ : http://localhost:${PORT}/admin`);
    console.log(`💳 RIB Amen Bank configuré : 07308006410581111081`);
    console.log(`====================================================`);
});