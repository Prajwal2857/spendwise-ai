const http = require('http');

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3456, path, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Registering demo user...');
  const reg = await apiCall('POST', '/api/auth/register', {
    name: 'Priya Sharma', email: 'demo@spendwise.ai', password: 'demo1234'
  });
  if (!reg.token) { console.error('Registration failed:', reg); process.exit(1); }
  const token = reg.token;
  console.log('Registered! Token acquired.');

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const incomes = [
    { merchant: 'Salary - TechCorp', amount: 65000, category: 'Salary', paymentMethod: 'Bank Transfer', date: new Date(year, month, 1) },
    { merchant: 'Freelance - Web Project', amount: 12000, category: 'Freelance', paymentMethod: 'Bank Transfer', date: new Date(year, month, 5) },
    { merchant: 'Stock Dividends', amount: 2500, category: 'Income', paymentMethod: 'Bank Transfer', date: new Date(year, month, 10) },
  ];

  const expenses = [
    { merchant: 'Swiggy', amount: 430, category: 'Food', paymentMethod: 'UPI', date: new Date(year, month, 2) },
    { merchant: 'Zomato', amount: 680, category: 'Food', paymentMethod: 'UPI', date: new Date(year, month, 3) },
    { merchant: 'BigBasket', amount: 2150, category: 'Food', paymentMethod: 'UPI', date: new Date(year, month, 5) },
    { merchant: 'Dominos Pizza', amount: 520, category: 'Food', paymentMethod: 'Credit Card', date: new Date(year, month, 7) },
    { merchant: 'Starbucks', amount: 380, category: 'Food', paymentMethod: 'UPI', date: new Date(year, month, 8) },
    { merchant: 'Local Restaurant', amount: 850, category: 'Food', paymentMethod: 'Cash', date: new Date(year, month, 12) },
    { merchant: 'Uber', amount: 340, category: 'Transportation', paymentMethod: 'UPI', date: new Date(year, month, 4) },
    { merchant: 'Ola Cabs', amount: 220, category: 'Transportation', paymentMethod: 'UPI', date: new Date(year, month, 9) },
    { merchant: 'Indian Oil - Petrol', amount: 3200, category: 'Transportation', paymentMethod: 'Credit Card', date: new Date(year, month, 6) },
    { merchant: 'Metro Recharge', amount: 500, category: 'Transportation', paymentMethod: 'UPI', date: new Date(year, month, 11) },
    { merchant: 'Amazon', amount: 1899, category: 'Shopping', paymentMethod: 'Credit Card', date: new Date(year, month, 3) },
    { merchant: 'Flipkart', amount: 3499, category: 'Shopping', paymentMethod: 'Debit Card', date: new Date(year, month, 8) },
    { merchant: 'Myntra', amount: 1299, category: 'Shopping', paymentMethod: 'Credit Card', date: new Date(year, month, 14) },
    { merchant: 'Reliance Digital', amount: 899, category: 'Shopping', paymentMethod: 'UPI', date: new Date(year, month, 10) },
    { merchant: 'Rent - Home', amount: 18000, category: 'Housing', paymentMethod: 'Bank Transfer', date: new Date(year, month, 1) },
    { merchant: 'Electricity Bill - BESCOM', amount: 1850, category: 'Bills & Utilities', paymentMethod: 'UPI', date: new Date(year, month, 5) },
    { merchant: 'Water Bill', amount: 450, category: 'Bills & Utilities', paymentMethod: 'UPI', date: new Date(year, month, 5) },
    { merchant: 'Airtel Broadband', amount: 999, category: 'Mobile/Internet', paymentMethod: 'UPI', date: new Date(year, month, 1) },
    { merchant: 'Jio Recharge', amount: 599, category: 'Mobile/Internet', paymentMethod: 'UPI', date: new Date(year, month, 1) },
    { merchant: 'Netflix', amount: 649, category: 'Subscriptions', paymentMethod: 'Credit Card', date: new Date(year, month, 2) },
    { merchant: 'Spotify Premium', amount: 179, category: 'Subscriptions', paymentMethod: 'UPI', date: new Date(year, month, 3) },
    { merchant: 'Amazon Prime', amount: 179, category: 'Subscriptions', paymentMethod: 'Credit Card', date: new Date(year, month, 4) },
    { merchant: 'YouTube Premium', amount: 189, category: 'Subscriptions', paymentMethod: 'UPI', date: new Date(year, month, 5) },
    { merchant: 'Hotstar', amount: 499, category: 'Subscriptions', paymentMethod: 'Credit Card', date: new Date(year, month, 6) },
    { merchant: 'PVR Cinemas', amount: 750, category: 'Entertainment', paymentMethod: 'UPI', date: new Date(year, month, 7) },
    { merchant: 'BookMyShow', amount: 450, category: 'Entertainment', paymentMethod: 'Credit Card', date: new Date(year, month, 13) },
    { merchant: 'Apollo Pharmacy', amount: 680, category: 'Healthcare', paymentMethod: 'UPI', date: new Date(year, month, 9) },
    { merchant: 'Practo Consultation', amount: 500, category: 'Healthcare', paymentMethod: 'UPI', date: new Date(year, month, 15) },
    { merchant: 'Udemy Course', amount: 499, category: 'Education', paymentMethod: 'Credit Card', date: new Date(year, month, 10) },
    { merchant: 'Gym Membership', amount: 2500, category: 'Entertainment', paymentMethod: 'UPI', date: new Date(year, month, 1) },
  ];

  console.log(`Creating ${incomes.length} income transactions...`);
  for (const tx of incomes) {
    const res = await apiCall('POST', '/api/transactions', { ...tx, type: 'income', notes: '', recurring: false }, token);
    if (res.error) console.error('  Error:', res.error);
  }

  console.log(`Creating ${expenses.length} expense transactions...`);
  for (const tx of expenses) {
    const res = await apiCall('POST', '/api/transactions', { ...tx, type: 'expense', notes: '', recurring: false }, token);
    if (res.error) console.error('  Error:', res.error);
  }

  console.log('Creating budgets...');
  const budgets = [
    { category: 'Food', amount: 8000, period: 'monthly' },
    { category: 'Shopping', amount: 6000, period: 'monthly' },
    { category: 'Transportation', amount: 5000, period: 'monthly' },
    { category: 'Entertainment', amount: 3000, period: 'monthly' },
    { category: 'Bills & Utilities', amount: 4000, period: 'monthly' },
    { category: 'Healthcare', amount: 2000, period: 'monthly' },
  ];
  for (const b of budgets) {
    await apiCall('POST', '/api/budgets', b, token);
  }

  console.log('Creating savings goals...');
  const goals = [
    { name: 'New Laptop', targetAmount: 120000, currentAmount: 45000, targetDate: new Date(year, month + 4, 1).toISOString(), icon: '💻' },
    { name: 'Emergency Fund', targetAmount: 200000, currentAmount: 82000, targetDate: new Date(year, month + 8, 1).toISOString(), icon: '🛡' },
    { name: 'Goa Vacation', targetAmount: 35000, currentAmount: 12000, targetDate: new Date(year, month + 3, 1).toISOString(), icon: '✈️' },
    { name: 'iPhone Fund', targetAmount: 80000, currentAmount: 28000, targetDate: new Date(year, month + 6, 1).toISOString(), icon: '📱' },
  ];
  for (const g of goals) {
    await apiCall('POST', '/api/goals', g, token);
  }

  console.log('Creating subscriptions...');
  const subs = [
    { name: 'Netflix', amount: 649, billingCycle: 'monthly', renewalDate: new Date(year, month + 1, 2).toISOString(), category: 'Subscriptions' },
    { name: 'Spotify Premium', amount: 179, billingCycle: 'monthly', renewalDate: new Date(year, month + 1, 3).toISOString(), category: 'Subscriptions' },
    { name: 'Amazon Prime', amount: 1499, billingCycle: 'yearly', renewalDate: new Date(year, month + 2, 4).toISOString(), category: 'Subscriptions' },
    { name: 'YouTube Premium', amount: 189, billingCycle: 'monthly', renewalDate: new Date(year, month + 1, 5).toISOString(), category: 'Subscriptions' },
    { name: 'Hotstar Super', amount: 899, billingCycle: 'yearly', renewalDate: new Date(year, month + 1, 6).toISOString(), category: 'Subscriptions' },
    { name: 'Airtel Broadband', amount: 999, billingCycle: 'monthly', renewalDate: new Date(year, month + 1, 1).toISOString(), category: 'Mobile/Internet' },
    { name: 'Gym Membership', amount: 2500, billingCycle: 'monthly', renewalDate: new Date(year, month + 1, 1).toISOString(), category: 'Entertainment' },
  ];
  for (const s of subs) {
    await apiCall('POST', '/api/subscriptions', s, token);
  }

  console.log('\n✅ All seed data created successfully!');
  console.log('Login credentials: demo@spendwise.ai / demo1234');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
