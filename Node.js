require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


const supabase = createClient(
  'https://wtgmmckcenxyccltlukd.supabase.co',  
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Z21tY2tjZW54eWNjbHRsdWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTA0MDMsImV4cCI6MjA2Mzg2NjQwM30.nC5_D6fEKOAb0BxAxwucv-HcoAEx5UtxO-cfH6astHc'      
);


const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};


app.post('/api/patients', authenticate, async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/patients', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.app_metadata?.role === 'admin';
    const query = isAdmin 
      ? supabase.from('patients').select('*')
      : supabase.from('patients').select('*').eq('user_id', req.user.id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/patients/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    
  
    if (req.user.app_metadata?.role !== 'admin' && data.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/patients/:id', authenticate, async (req, res) => {
  try {
    
    const { data: existing, error: fetchError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;
    if (req.user.app_metadata?.role !== 'admin' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const { data, error } = await supabase
      .from('patients')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/patients/:id', authenticate, async (req, res) => {
  try {
    
    const { data: existing, error: fetchError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;
    if (req.user.app_metadata?.role !== 'admin' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});