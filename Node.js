require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Authentication middleware
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

// Create patient
app.post('/api/patients', authenticate, async (req, res) => {
    try {
        const patientData = {
            ...req.body,
            user_id: req.user.id,
            created_at: new Date()
        };

        const { data, error } = await supabase
            .from('patients')
            .insert(patientData)
            .select();
        
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get patients
app.get('/api/patients', authenticate, async (req, res) => {
    try {
        let query = supabase
            .from('patients')
            .select('*');
        
        // For non-admin users, only show their own patients
        const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
        if (userError) throw userError;
        
        if (!user.user_metadata?.admin) {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single patient
app.get('/api/patients/:id', authenticate, async (req, res) => {
    try {
        const { data: patient, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        
        // Check if user has permission to access this patient
        const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
        if (!user.user_metadata?.admin && patient.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        
        res.json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update patient
app.put('/api/patients/:id', authenticate, async (req, res) => {
    try {
        // First get the patient to check ownership
        const { data: existingPatient, error: fetchError } = await supabase
            .from('patients')
            .select('user_id')
            .eq('id', req.params.id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Check permissions
        const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
        if (!user.user_metadata?.admin && existingPatient.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        
        // Update the patient
        const { data, error } = await supabase
            .from('patients')
            .update({
                ...req.body,
                updated_at: new Date()
            })
            .eq('id', req.params.id)
            .select();
        
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete patient
app.delete('/api/patients/:id', authenticate, async (req, res) => {
    try {
        // First get the patient to check ownership
        const { data: existingPatient, error: fetchError } = await supabase
            .from('patients')
            .select('user_id')
            .eq('id', req.params.id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Check permissions
        const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
        if (!user.user_metadata?.admin && existingPatient.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        
        // Delete the patient
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

// Serve static files
app.use(express.static('public'));

// Default route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/fun_soft.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Make tabs scrollable on mobile
function adjustTabsForMobile() {
    const tabs = document.querySelector('.tabs');
    if (window.innerWidth < 768) {
        tabs.style.overflowX = 'auto';
        tabs.style.whiteSpace = 'nowrap';
    } else {
        tabs.style.overflowX = '';
        tabs.style.whiteSpace = '';
    }
}

// Handle form section toggling more responsively
function toggleSection(sectionId, show) {
    const section = document.getElementById(sectionId);
    if (show) {
        section.style.display = 'block';
        // Scroll to section for better mobile UX
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        section.style.display = 'none';
    }
}

// Initialize responsive behaviors
window.addEventListener('DOMContentLoaded', () => {
    adjustTabsForMobile();
    
    // Button event listeners with responsive considerations
    document.getElementById('newPatientBtn').addEventListener('click', () => {
        toggleSection('patientFormSection', true);
        toggleSection('searchSection', false);
    });
    
    document.getElementById('searchPatientBtn').addEventListener('click', () => {
        toggleSection('searchSection', true);
        toggleSection('patientFormSection', false);
    });
    
    document.getElementById('sendMessageBtn').addEventListener('click', () => {
        toggleSection('messageSection', true);
    });
});

// Handle window resize
window.addEventListener('resize', adjustTabsForMobile);
// In Node.js server file
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Professional error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    requestId: req.id, // Consider adding request IDs
    timestamp: new Date().toISOString()
  });
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Payment method toggle
document.getElementById('paymentMethod').addEventListener('change', function() {
    const cardFields = document.querySelector('.card-fields');
    if (this.value === 'credit' || this.value === 'debit') {
        cardFields.style.display = 'block';
    } else {
        cardFields.style.display = 'none';
    }
});

// Payment Details button functionality
document.getElementById('PaymentdetailsBtn').addEventListener('click', function() {
    // Hide other sections
    document.getElementById('patientFormSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';
    document.getElementById('messageSection').style.display = 'none';
    
    // Show payment section
    document.getElementById('paymentSection').style.display = 'block';
    
    // Set current date
    document.getElementById('paymentDate').valueAsDate = new Date();
    
    // If a patient is selected, fill their details
    const selectedPatientId = ''; // You'll need to set this when a patient is selected
    if (selectedPatientId) {
        // Load patient details and payment history
        loadPatientPaymentDetails(selectedPatientId);
    }
});

// Function to load patient payment details
async function loadPatientPaymentDetails(patientId) {
    try {
        showLoading(true);
        
        // Get patient details
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();
            
        if (patientError) throw patientError;
        
        // Fill patient info
        document.getElementById('paymentPatientId').value = patient.personal_info.patient_id;
        document.getElementById('paymentPatientName').value = `${patient.personal_info.first_name} ${patient.personal_info.last_name}`;
        
        // Get payment history
        const { data: payments, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('patient_id', patientId)
            .order('payment_date', { ascending: false });
            
        if (paymentError) throw paymentError;
        
        // Populate payment history table
        const paymentHistoryBody = document.getElementById('paymentHistoryBody');
        paymentHistoryBody.innerHTML = '';
        
        payments.forEach(payment => {
            const row = `
                <tr>
                    <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td>${payment.payment_method}</td>
                    <td>${payment.amount.toFixed(2)}</td>
                    <td><span class="status-badge ${payment.status}">${payment.status}</span></td>
                    <td>${payment.receipt_number || 'N/A'}</td>
                    <td>
                        <button class="btn-icon view-payment" title="View details" data-id="${payment.id}">
                            <i class="icon-eye"></i>
                        </button>
                        <button class="btn-icon print-payment" title="Print receipt" data-id="${payment.id}">
                            <i class="icon-print"></i>
                        </button>
                    </td>
                </tr>
            `;
            paymentHistoryBody.innerHTML += row;
        });
        
    } catch (error) {
        console.error("Error loading payment details:", error);
        showToast('Error loading payment details', 'error');
    } finally {
        showLoading(false);
    }
}

// Save payment
document.getElementById('savePayment').addEventListener('click', async function() {
    const paymentData = {
        patient_id: '', // You'll need to set this when a patient is selected
        payment_method: document.getElementById('paymentMethod').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        payment_date: document.getElementById('paymentDate').value,
        status: document.getElementById('paymentStatus').value,
        notes: document.getElementById('paymentNotes').value,
        created_at: new Date()
    };
    
    try {
        showLoading(true);
        const { data, error } = await supabase
            .from('payments')
            .insert(paymentData)
            .select();
            
        if (error) throw error;
        
        showToast('Payment saved successfully!');
        // Refresh payment history
        loadPatientPaymentDetails(paymentData.patient_id);
    } catch (error) {
        console.error("Error saving payment:", error);
        showToast('Error saving payment', 'error');
    } finally {
        showLoading(false);
    }
});
// ... (previous code remains the same until patient creation endpoint)

// Updated patient creation endpoint
app.post('/api/patients', authenticate, async (req, res) => {
    try {
        const { patientData, demographicData, medicalData } = req.body;
        
        // Create patient
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert({
                ...patientData,
                user_id: req.user.id,
                created_at: new Date()
            })
            .select()
            .single();
        
        if (patientError) throw patientError;

        // Create demographic info
        await supabase
            .from('patient_demographics')
            .insert({
                patient_id: patient.id,
                ...demographicData
            });

        // Create medical info
        await supabase
            .from('medical_info')
            .insert({
                patient_id: patient.id,
                ...medicalData
            });

        res.status(201).json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search patients endpoint
app.get('/api/patients/search', authenticate, async (req, res) => {
    try {
        const { query, field } = req.query;
        
        let supabaseQuery = supabase
            .from('patients')
            .select(`
                *,
                patient_demographics(*),
                medical_info(*)
            `);
        
        if (field === 'id') {
            supabaseQuery = supabaseQuery.ilike('patient_id', `%${query}%`);
        } else if (field === 'name') {
            supabaseQuery = supabaseQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
        } else if (field === 'phone') {
            supabaseQuery = supabaseQuery.ilike('phone', `%${query}%`);
        } else if (field === 'id_number') {
            supabaseQuery = supabaseQuery.ilike('id_number', `%${query}%`);
        }
        
        const { data, error } = await supabaseQuery;
        if (error) throw error;
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enhanced single patient endpoint
app.get('/api/patients/:id', authenticate, async (req, res) => {
    try {
        const { data: patient, error } = await supabase
            .from('patients')
            .select(`
                *,
                patient_demographics(*),
                medical_info(*),
                visits(id, visit_date, provider, purpose, status),
                payments(id, payment_date, amount, status)
            `)
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        
        // Check if user has permission to access this patient
        const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
        if (!user.user_metadata?.admin && patient.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        
        res.json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ... (rest of the code remains the same)
