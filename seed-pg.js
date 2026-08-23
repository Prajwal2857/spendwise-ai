require("dotenv/config");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log("Connected to database. Seeding...");

  // Create demo user
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const userId = cuid();

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", ["demo@spendwise.ai"]);
  if (existing.rows.length > 0) {
    console.log("Demo user already exists. Updating...");
    await pool.query("UPDATE users SET password_hash = $1, onboarding_completed = true, monthly_income = 75000 WHERE email = $2", [passwordHash, "demo@spendwise.ai"]);
    var realUserId = existing.rows[0].id;
  } else {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, currency, onboarding_completed, monthly_income, notification_preferences, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [userId, "Priya Sharma", "demo@spendwise.ai", passwordHash, "user", "INR", true, 75000,
       JSON.stringify({ budgetWarnings: true, subscriptionReminders: true, spendingAlerts: true, savingsMilestones: true })]
    );
    var realUserId = userId;
  }
  console.log("User ready: demo@spendwise.ai");

  // Clear existing data for this user
  await pool.query("DELETE FROM notifications WHERE user_id = $1", [realUserId]);
  await pool.query("DELETE FROM transactions WHERE user_id = $1", [realUserId]);
  await pool.query("DELETE FROM subscriptions WHERE user_id = $1", [realUserId]);
  await pool.query("DELETE FROM savings_goals WHERE user_id = $1", [realUserId]);
  await pool.query("DELETE FROM budgets WHERE user_id = $1", [realUserId]);
  await pool.query("DELETE FROM accounts WHERE user_id = $1", [realUserId]);

  // Create accounts
  const accNames = ["HDFC Bank", "SBI Credit Card", "Cash Wallet", "PhonePe Wallet"];
  const accTypes = ["bank", "credit_card", "cash", "wallet"];
  const accBalances = [45000, -12500, 3000, 1500];
  const accInstitutions = ["HDFC Bank", "SBI", null, "PhonePe"];
  const accountIds = [];

  for (let i = 0; i < accNames.length; i++) {
    const id = cuid();
    accountIds.push(id);
    await pool.query(
      `INSERT INTO accounts (id, user_id, name, type, balance, institution, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, realUserId, accNames[i], accTypes[i], accBalances[i], accInstitutions[i]]
    );
  }
  console.log("Accounts created:", accountIds.length);

  // Create transactions
  const now = new Date();
  const categories = [
    { category: "Food", merchants: ["Swiggy", "Zomato", "Local Restaurant", "Starbucks", "Domino's"], amounts: [350, 520, 850, 430, 680] },
    { category: "Shopping", merchants: ["Amazon", "Myntra", "Flipkart", "Nykaa", "Local Store"], amounts: [2499, 1299, 3499, 899, 599] },
    { category: "Transportation", merchants: ["Uber", "Ola", "Metro Recharge", "Petrol Pump", "Parking"], amounts: [180, 250, 500, 2000, 50] },
    { category: "Entertainment", merchants: ["Netflix", "BookMyShow", "YouTube Premium", "Spotify", "Prime Video"], amounts: [649, 450, 189, 149, 179] },
    { category: "Housing", merchants: ["Rent Payment", "Society Maintenance", "Electricity Bill"], amounts: [18000, 2500, 1800] },
    { category: "Bills & Utilities", merchants: ["Jio Recharge", "Airtel Bill", "Water Bill", "Broadband"], amounts: [399, 599, 200, 999] },
    { category: "Healthcare", merchants: ["Practo Consultation", "Apollo Pharmacy", "Health Checkup"], amounts: [500, 750, 1500] },
    { category: "Education", merchants: ["Udemy Course", "Coursera", "Books"], amounts: [499, 399, 350] },
  ];
  const paymentMethods = ["UPI", "Credit Card", "Debit Card", "Cash", "Bank Transfer", "Wallet"];
  const recurringMerchants = ["Netflix", "Spotify", "YouTube Premium", "Prime Video", "Jio Recharge", "Rent Payment"];

  for (let i = 0; i < 30; i++) {
    const cat = categories[i % categories.length];
    const mIdx = i % cat.merchants.length;
    const day = Math.max(1, now.getDate() - i);
    const isRecurring = recurringMerchants.includes(cat.merchants[mIdx]);

    await pool.query(
      `INSERT INTO transactions (id, user_id, account_id, merchant, amount, type, category, payment_method, date, notes, recurring, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [cuid(), realUserId, accountIds[i % accountIds.length], cat.merchants[mIdx], cat.amounts[mIdx],
       "expense", cat.category, paymentMethods[i % paymentMethods.length],
       new Date(now.getFullYear(), now.getMonth(), day), null, isRecurring]
    );
  }

  // Income
  for (const [day, amount] of [[1, 65000], [5, 14500]]) {
    await pool.query(
      `INSERT INTO transactions (id, user_id, merchant, amount, type, category, payment_method, date, notes, recurring, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [cuid(), realUserId, "Salary - TechCorp India", amount, "income", "Salary", "Bank Transfer",
       new Date(now.getFullYear(), now.getMonth(), day), null, false]
    );
  }
  console.log("Transactions created: 32");

  // Budgets
  const budgets = [
    ["Food", 6000], ["Shopping", 6000], ["Entertainment", 3000],
    ["Transportation", 5000], ["Bills & Utilities", 3000], ["Healthcare", 3000], ["Education", 2000],
  ];
  for (const [cat, amt] of budgets) {
    await pool.query(
      `INSERT INTO budgets (id, user_id, category, amount, period, start_date, end_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [cuid(), realUserId, cat, amt, "monthly",
       new Date(now.getFullYear(), now.getMonth(), 1),
       new Date(now.getFullYear(), now.getMonth() + 1, 0)]
    );
  }
  console.log("Budgets created:", budgets.length);

  // Savings goals
  const goals = [
    ["Emergency Fund", 200000, 85000, "🛡️", "#10b981"],
    ["New Laptop", 120000, 42000, "💻", "#3b82f6"],
    ["Goa Trip", 50000, 18000, "✈️", "#f59e0b"],
    ["Bike", 150000, 35000, "🏍️", "#ef4444"],
  ];
  for (const [name, target, current, icon, color] of goals) {
    await pool.query(
      `INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, icon, color, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [cuid(), realUserId, name, target, current,
       new Date(now.getFullYear(), now.getMonth() + 6, 1), icon, color]
    );
  }
  console.log("Goals created:", goals.length);

  // Subscriptions
  const subs = [
    ["Netflix", 649, "monthly", "Entertainment", "🎬"],
    ["Spotify", 149, "monthly", "Entertainment", "🎵"],
    ["YouTube Premium", 189, "monthly", "Entertainment", "📺"],
    ["Amazon Prime", 1499, "yearly", "Entertainment", "📦"],
    ["Jio Unlimited", 399, "monthly", "Mobile/Internet", "📱"],
    ["Google One 100GB", 130, "monthly", "Storage", "☁️"],
    ["Gym Membership", 2000, "monthly", "Healthcare", "🏋️"],
  ];
  for (const [name, amount, cycle, cat, icon] of subs) {
    await pool.query(
      `INSERT INTO subscriptions (id, user_id, name, amount, billing_cycle, renewal_date, category, active, icon, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [cuid(), realUserId, name, amount, cycle,
       new Date(now.getFullYear(), now.getMonth() + 1, Math.floor(Math.random() * 28) + 1),
       cat, true, icon]
    );
  }
  console.log("Subscriptions created:", subs.length);

  // Notifications
  const notifs = [
    ["Budget Alert", "You've used 85% of your Food budget this month.", "budget"],
    ["Subscription Renewal", "Netflix renews in 3 days.", "subscription"],
    ["Savings Milestone", "You've reached 42% of your Emergency Fund goal!", "savings"],
  ];
  for (const [title, message, type] of notifs) {
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [cuid(), realUserId, title, message, type, false]
    );
  }
  console.log("Notifications created:", notifs.length);

  await pool.end();
  console.log("✅ Seed complete! Login with: demo@spendwise.ai / demo1234");
}

main().catch((e) => { console.error(e); process.exit(1); });
