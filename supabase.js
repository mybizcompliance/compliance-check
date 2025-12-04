  let supabaseClient = null;

if (BACKEND_MODE === "supabase") {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// AUTH
async function signUp(email, password) {
  return await supabaseClient.auth.signUp({ email, password });
}

async function loginUser(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// PROFILE
async function ensureProfile(user) {
  const { data: existing } = await supabaseClient.from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabaseClient.from('profiles').insert([
      { id: user.id, email: user.email, subscription_level: 'free' }
    ]);
    return { id: user.id, email: user.email, subscription_level: 'free' };
  }

  return existing[0];
}

async function setSubscription(userId, level) {
  const { error } = await supabaseClient
    .from('profiles')
    .update({ subscription_level: level })
    .eq('id', userId);

  return !error;
}

// COMPLIANCE
async function saveCompliance(data) {
  const { error } = await supabaseClient.from('compliance_results').insert([data]);
  return !error;
}

// TRANSACTIONS
async function saveTransaction(tx) {
  const { error } = await supabaseClient.from('transactions').insert([tx]);
  return !error;
}

async function getTransactions(userId) {
  const { data } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('tdate', { ascending: false });

  return data || [];
}

async function getCategories(userId) {
  const { data } = await supabaseClient
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  return data || [];
}

async function addCategory(userId, name) {
  const { error } = await supabaseClient.from('categories').insert([{ user_id: userId, name }]);
  return !error;
}
