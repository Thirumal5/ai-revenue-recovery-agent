import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Revenue Recovery Backend is running' });
});


app.post('/webhooks/simulator', (req, res) => {
  const event = req.body;
  
  console.log('\n================================');
  console.log('🚨 SIMULATOR EVENT RECEIVED 🚨');
  console.log(`Event Type: ${event.type}`);
  console.log(`Reason: ${event.payload?.payment?.entity?.error_description || 'None'}`);
  console.log('================================\n');
  
  res.json({ status: 'received' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
