require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.firestore();
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
app.post('/api/patients', authenticate, async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      userId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('patients').add(patientData);
    const newPatient = await docRef.get();
    
    res.status(201).json({ id: docRef.id, ...newPatient.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/patients', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.admin || false;
    let query = db.collection('patients');

    if (!isAdmin) {
      query = query.where('userId', '==', req.user.uid);
    }

    const snapshot = await query.get();
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/patients/:id', authenticate, async (req, res) => {
  try {
    const docRef = db.collection('patients').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Patient not found' });
    if (!req.user.admin && doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    await docRef.update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/patients/:id', authenticate, async (req, res) => {
  try {
    const docRef = db.collection('patients').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Patient not found' });
    if (!req.user.admin && doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    await docRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/fun_soft.html');
});


app.use(express.static(__dirname + '/public'));