// simple page toggle
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// current user & profile
let currentUser = null;
let currentProfile = null;

// auth handlers
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const res = await signUp(email, password);
  if (res.error) return alert('Sign up failed: ' + (res.error.message || res.error));
  alert('Check your email to confirm sign up.');
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const res = await loginUser(email, password);
  if (res.error) return alert('Login error: ' + res.error.message);
  currentUser = res.data.user;
  currentProfile = await ensureProfile(currentUser);
  afterLogin();
});

// on load, check session
(async function init() {
  if (BACKEND_MODE === 'supabase') {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session && data.session.user) {
      currentUser = data.session.user;
      currentProfile = await ensureProfile(currentUser);
      afterLogin();
      return;
    }
  }
  showPage('login-page');
})();

function afterLogin() {
  document.getElementById('welcome').innerText = 'Hello — ' + (currentUser.email || '');
  document.getElementById('subLevel').innerText = (currentProfile && currentProfile.subscription_level) || 'free';
  showPage('dashboard');
  loadTransactions();
  loadCategories();
  document.getElementById('subscriptionStatus').innerText = (currentProfile && currentProfile.subscription_level) || 'free';
}

// COMPLIANCE
document.getElementById('businessForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('businessName').value;
  const industry = document.getElementById('industry').value;
  const province = document.getElementById('province').value;

  const recommendations = [
    "Register with CIPC",
    "SARS Income Tax registration",
    "VAT registration (if turnover > R1m)",
    "UIF registration",
    "COIDA (if employees)",
    "BEE affidavit / checklist"
  ];

  document.getElementById('results').innerHTML = `<h4>Tasks for ${name}</h4><ul>${recommendations.map(r=>'<li>'+r+'</li>').join('')}</ul>`;

  await saveCompliance({ user_id: currentUser.id, name, industry, province, tasks: recommendations });
});

// BOOKKEEPING: categories & transactions
async function loadCategories() {
  const sel = document.getElementById('category');
  sel.innerHTML = '';
  // Default categories for free users
  const defaultCats = ['Sales','Supplies','Marketing','Utilities','Other'];
  if (currentProfile.subscription_level === 'free') {
    defaultCats.forEach(c => {
      const opt = document.createElement('option'); opt.value = c; opt.innerText = c; sel.appendChild(opt);
    });
    document.getElementById('categoryManager').innerText = 'Upgrade to Starter to manage categories.';
  } else {
    // starter or higher: load from DB
    const cats = await getCategories(currentUser.id);
    if (!cats || cats.length === 0) {
      // create defaults
      for (let c of defaultCats) await addCategory(currentUser.id, c);
    }
    const finalCats = await getCategories(currentUser.id);
    finalCats.forEach(c => {
      const opt = document.createElement('option'); opt.value = c.name; opt.innerText = c.name; sel.appendChild(opt);
    });

    // show category manager UI
    const cm = document.getElementById('categoryManager');
    cm.innerHTML = `
      <input id="newCategory" placeholder="New category" />
      <button id="addCatBtn">Add category</button>
      <div id="catList"></div>
    `;
    document.getElementById('addCatBtn').addEventListener('click', async ()=> {
      const val = document.getElementById('newCategory').value.trim();
      if (!val) return alert('Enter a name');
      await addCategory(currentUser.id, val);
      loadCategories();
    });
    renderCategoryList(finalCats);
  }
}

function renderCategoryList(cats) {
  const node = document.getElementById('catList');
  node.innerHTML = cats.map(c => `<div class="small">${c.name}</div>`).join('');
}

document.getElementById('transactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('type').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const desc = document.getElementById('desc').value;
  const category = document.getElementById('category').value;
  const tdate = document.getElementById('tdate').value || new Date().toISOString().slice(0,10);

  const tx = {
    user_id: currentUser.id,
    type, amount, desc, category, tdate
  };
  await saveTransaction(tx);
  document.getElementById('transactionForm').reset();
  loadTransactions();
});

// Transactions list
async function loadTransactions() {
  if (!currentUser) return;
  const txs = await getTransactions(currentUser.id);
  const node = document.getElementById('transactionsList');
  if (!txs || txs.length === 0) { node.innerHTML = '<div class="small">No transactions yet</div>'; return; }
  let html = '<table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount (R)</th></tr></thead><tbody>';
  for (let t of txs) {
    html += `<tr><td>${t.tdate}</td><td>${t.type}</td><td>${t.category}</td><td>${t.desc||''}</td><td>${t.amount.toFixed(2)}</td></tr>`;
  }
  html += '</tbody></table>';
  // totals
  const income = txs.filter(x=>x.type==='income').reduce((s,x)=>s+parseFloat(x.amount),0);
  const expense = txs.filter(x=>x.type==='expense').reduce((s,x)=>s+parseFloat(x.amount),0);
  const balance = income - expense;
  html += `<div class="card"><strong>Income:</strong> R${income.toFixed(2)} &nbsp; <strong>Expenses:</strong> R${expense.toFixed(2)} &nbsp; <strong>Balance:</strong> R${balance.toFixed(2)}</div>`;
  node.innerHTML = html;
}

// CSV export
document.getElementById('exportCsvBtn').addEventListener('click', async () => {
  const txs = await getTransactions(currentUser.id);
  if (!txs || txs.length === 0) return alert('No transactions to export');
  const rows = txs.map(t => `${t.tdate},"${t.type}","${t.category}","${(t.desc||'').replace(/"/g,'""')}",${t.amount}`);
  const csv = ['Date,Type,Category,Description,Amount', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `bizaid_transactions_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
});

// REPORTS
document.getElementById('generateReportBtn').addEventListener('click', async () => {
  const monthInput = document.getElementById('reportMonth').value;
  if (!monthInput) return alert('Choose month');
  const [y,m] = monthInput.split('-').map(x=>parseInt(x));
  const txs = await getTransactions(currentUser.id);
  const filtered = txs.filter(t => {
    const d = new Date(t.tdate);
    return d.getFullYear()===y && (d.getMonth()+1)===m;
  });
  const income = filtered.filter(x=>x.type==='income').reduce((s,x)=>s+parseFloat(x.amount),0);
  const expense = filtered.filter(x=>x.type==='expense').reduce((s,x)=>s+parseFloat(x.amount),0);
  const byCategory = {};
  filtered.forEach(t => { byCategory[t.category] = (byCategory[t.category]||0) + (t.type==='expense' ? -t.amount : t.amount); });

  document.getElementById('reportResult').innerHTML = `
    <h4>Report for ${monthInput}</h4>
    <div>Income: R${income.toFixed(2)}</div>
    <div>Expenses: R${expense.toFixed(2)}</div>
    <div>Net: R${(income-expense).toFixed(2)}</div>
    <h5>By Category</h5>
    <ul>${Object.keys(byCategory).map(k=>`<li>${k}: R${byCategory[k].toFixed(2)}</li>`).join('')}</ul>
  `;
});

document.getElementById('printReportBtn').addEventListener('click', () => {
  window.print();
});

// SUBSCRIPTION
document.getElementById('subscribeBtn').addEventListener('click', () => {
  // simple redirect to PayFast sandbox with placeholders. In production compute signature & verify webhook.
  const redirectUrl = `${PAYFAST_SUBSCRIPTION_URL}?merchant_id=${encodeURIComponent(PAYFAST_MERCHANT_ID)}&merchant_key=${encodeURIComponent(PAYFAST_MERCHANT_KEY)}&amount=49&item_name=Bizaid+Starter+Subscription&subscription_type=1`;
  // optionally pass custom data to identify user
  window.location.href = redirectUrl;
});

// placeholder: manually set subscription (for testing)
window.setStarterLocally = async function() {
  const ok = await setSubscription(currentUser.id, 'starter');
  if (ok) { alert('Subscription level set to starter (local placeholder)'); currentProfile.subscription_level = 'starter'; afterLogin(); loadCategories(); }
}

// small helper: expose function so you can call from console during testing:
// setStarterLocally()

