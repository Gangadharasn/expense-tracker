const API = '/api';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const state = {
  month: MONTHS[new Date().getMonth()],
  year: new Date().getFullYear(),
  accounts: [],
  categories: [],
  transactions: [],
  dashboard: null,
  selectedType: 'expense',
  currentView: 'dashboard',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
  }
  return res.json();
}

function showToast(message, type = '') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function updatePeriodDisplay() {
  $('#current-period').textContent = `${state.month} ${state.year}`;
}

function switchView(view) {
  state.currentView = view;
  $$('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');
  $$('.nav-item[data-view]').forEach((n) => {
    n.classList.toggle('active', n.dataset.view === view);
  });
}

function navigateMonth(delta) {
  let idx = MONTHS.indexOf(state.month) + delta;
  let year = state.year;
  if (idx < 0) { idx = 11; year--; }
  if (idx > 11) { idx = 0; year++; }
  state.month = MONTHS[idx];
  state.year = year;
  updatePeriodDisplay();
  loadData();
}

function renderGoalProgress() {
  const intel = state.dashboard?.intelligence;
  if (!intel) return;
  const g = intel.goalProgress;
  const statusClass = g.onTrack ? 'on-track' : 'off-track';
  const statusText = g.onTrack ? 'ON TRACK' : 'OFF TRACK — ACTION NEEDED';
  $('#goal-progress').innerHTML = `
    <div class="goal-header">
      <div>
        <div class="goal-label">🎯 ${g.goalLabel} (${g.yearsRemaining} years)</div>
        <div class="goal-amount">${formatCurrency(g.totalProgress)} <span>of ${formatCurrency(g.goalAmount)}</span></div>
      </div>
      <span class="goal-status ${statusClass}">${statusText}</span>
    </div>
    <div class="goal-bar-track">
      <div class="goal-bar-fill ${statusClass}" style="width:${Math.min(g.percentComplete, 100)}%"></div>
    </div>
    <div class="goal-stats">
      <div><span class="gs-label">This month saved</span><span class="gs-value">${formatCurrency(g.actualMonthlySavings)}</span></div>
      <div><span class="gs-label">Required/month</span><span class="gs-value">${formatCurrency(g.requiredMonthlyInvestment)}</span></div>
      <div><span class="gs-label">Gap</span><span class="gs-value ${g.gap > 0 ? 'bad' : 'good'}">${formatCurrency(g.gap)}</span></div>
      <div><span class="gs-label">Projected (5yr)</span><span class="gs-value">${formatCurrency(g.projectedAtCurrentRate)}</span></div>
    </div>
  `;
}

function renderBucketBudgets() {
  const buckets = state.dashboard?.intelligence?.bucketBudgets ?? [];
  if (!buckets.length) {
    $('#bucket-budgets').innerHTML = '<div class="empty-state">Log salary to see budget plan</div>';
    return;
  }
  $('#bucket-budgets').innerHTML = buckets.map((b) => {
    const isSavings = b.bucket === 'savings';
    const diffLabel = isSavings
      ? (b.difference >= 0 ? `+${formatCurrency(b.difference)}` : formatCurrency(b.difference))
      : (b.status === 'over' ? `+${formatCurrency(b.difference)}` : formatCurrency(b.difference));
    return `
      <div class="bucket-card ${b.status}">
        <div class="bucket-label">${b.label}</div>
        <div class="bucket-amounts">
          <span class="actual">${formatCurrency(b.actual)}</span>
          <span class="vs">/ ${formatCurrency(b.standard)}</span>
        </div>
        <div class="bucket-bar-track">
          <div class="bucket-bar-fill ${b.status}" style="width:${Math.min(b.percentUsed, 100)}%"></div>
        </div>
        <div class="bucket-diff ${b.status}">${diffLabel}</div>
      </div>
    `;
  }).join('');
}

function renderCategoryBudgets() {
  const budgets = state.dashboard?.intelligence?.categoryBudgets ?? [];
  const withStandard = budgets.filter((b) => b.standard > 0);
  if (!withStandard.length) {
    $('#category-budgets').innerHTML = '<div class="empty-state">No budget categories configured</div>';
    return;
  }
  const statusIcon = { on_track: '✅', over: '❌', under: '⚠️', missing: '⭕' };
  $('#category-budgets').innerHTML = withStandard.map((b) => `
    <div class="budget-row ${b.status}">
      <span class="br-icon">${b.icon}</span>
      <span class="br-name">${b.categoryName}</span>
      <span class="br-actual">${formatCurrency(b.actual)}</span>
      <span class="br-standard">/ ${formatCurrency(b.standard)}</span>
      <span class="br-status">${statusIcon[b.status] || ''}</span>
    </div>
  `).join('');
}

function renderSummaryCards() {
  const d = state.dashboard?.currentMonth;
  if (!d) return;
  $('#summary-cards').innerHTML = `
    <div class="summary-card income">
      <div class="label">Income</div>
      <div class="value">${formatCurrency(d.totalIncome)}</div>
    </div>
    <div class="summary-card expense">
      <div class="label">Expenses</div>
      <div class="value">${formatCurrency(d.totalExpense)}</div>
    </div>
    <div class="summary-card savings">
      <div class="label">Savings</div>
      <div class="value">${formatCurrency(d.totalSavings)}</div>
    </div>
    <div class="summary-card net">
      <div class="label">Net Balance</div>
      <div class="value">${formatCurrency(d.netBalance)}</div>
    </div>
  `;
}

function renderInsights() {
  const insights = state.dashboard?.insights ?? [];
  if (!insights.length) {
    $('#insights-list').innerHTML = '<div class="empty-state">Add salary and transactions to get smart alerts.</div>';
    return;
  }
  $('#insights-list').innerHTML = insights.map((i) => `
    <div class="insight-card ${i.type}">
      <div class="insight-title">${i.title}</div>
      <div class="insight-message">${i.message}</div>
    </div>
  `).join('');
}

function renderMonthlyGoals() {
  const goals = state.dashboard?.intelligence?.monthlyGoals ?? [];
  if (!goals.length) {
    $('#monthly-goals').innerHTML = '<div class="empty-state">No monthly goals set</div>';
    return;
  }
  const statusClass = { completed: 'on_track', in_progress: 'in_progress', missed: 'over', over_limit: 'over' };
  $('#monthly-goals').innerHTML = goals.map((g) => `
    <div class="goal-item ${statusClass[g.status] || ''}">
      <div class="goal-item-header">
        <span>${g.icon} ${g.name}</span>
        <span class="goal-pct">${g.percentComplete.toFixed(0)}%</span>
      </div>
      <div class="goal-item-amounts">
        <span>${formatCurrency(g.actual)}</span>
        <span class="vs">/ ${formatCurrency(g.target)}</span>
      </div>
      <div class="goal-bar-track">
        <div class="goal-bar-fill ${statusClass[g.status]}" style="width:${Math.min(g.percentComplete, 100)}%"></div>
      </div>
      <div class="goal-item-status">${g.status === 'completed' ? '✅ Done' : g.status === 'over_limit' ? '❌ Over limit' : g.status === 'missed' ? '⭕ Not started' : '🔄 In progress'}</div>
    </div>
  `).join('');
}

function renderCreditCards() {
  const cards = state.dashboard?.intelligence?.creditCards ?? [];
  if (!cards.length) {
    $('#credit-cards').innerHTML = '<div class="empty-state">No credit cards. Add one in Accounts.</div>';
    return;
  }
  $('#credit-cards').innerHTML = cards.map((cc) => `
    <div class="cc-card ${cc.utilizationPercent > 80 ? 'cc-warning' : ''}">
      <div class="cc-header">
        <span class="cc-name">💳 ${cc.name}</span>
        <span class="cc-util">${cc.utilizationPercent.toFixed(0)}% used</span>
      </div>
      <div class="cc-outstanding">Outstanding: <strong>${formatCurrency(cc.outstanding)}</strong></div>
      <div class="cc-meta">
        <span>Limit: ${formatCurrency(cc.creditLimit)}</span>
        <span>Available: ${formatCurrency(cc.availableCredit)}</span>
      </div>
      <div class="cc-meta">
        <span>This month spent: ${formatCurrency(cc.monthlySpend)}</span>
        ${cc.dueDay ? `<span>Due: day ${cc.dueDay}</span>` : ''}
      </div>
      <div class="cc-bar-track">
        <div class="cc-bar-fill" style="width:${Math.min(cc.utilizationPercent, 100)}%"></div>
      </div>
    </div>
  `).join('');
}

function renderAccountBalances() {
  const balances = state.dashboard?.accountBalances ?? state.accounts;
  const accMap = Object.fromEntries(state.accounts.map((a) => [a.accountId || a.id, a]));
  $('#account-balances').innerHTML = balances.map((a) => {
    const full = accMap[a.accountId] || a;
    const isCC = full.type === 'credit_card';
    return `
    <div class="account-card ${isCC ? 'account-cc' : ''}">
      <div>
        <div class="name">${isCC ? '💳 ' : ''}${a.name}</div>
        <div class="type">${full.type || 'account'}${isCC && full.creditLimit ? ` · Limit ${formatCurrency(full.creditLimit)}` : ''}</div>
      </div>
      <div class="balance ${isCC ? 'cc-balance' : ''}">${isCC ? 'Owed: ' : ''}${formatCurrency(a.balance)}</div>
    </div>
  `}).join('');
}

function renderAccounts() {
  $('#accounts-list').innerHTML = state.accounts.map((a) => {
    const isCC = a.type === 'credit_card';
    return `
    <div class="account-card ${isCC ? 'account-cc' : ''}">
      <div>
        <div class="name">${isCC ? '💳 ' : ''}${a.name}</div>
        <div class="type">${a.type}${isCC && a.creditLimit ? ` · ${formatCurrency(a.creditLimit)} limit` : ''}</div>
        ${isCC && a.dueDay ? `<div class="type">Due day: ${a.dueDay}</div>` : ''}
      </div>
      <div class="balance ${isCC ? 'cc-balance' : ''}">${isCC ? 'Owed: ' : ''}${formatCurrency(a.balance)}</div>
    </div>
  `}).join('');
}

function toggleAccountTypeFields() {
  const isCC = $('#account-type').value === 'credit_card';
  $('#cc-fields').classList.toggle('hidden', !isCC);
  $('#cc-billing').classList.toggle('hidden', !isCC);
  $('#cc-due').classList.toggle('hidden', !isCC);
  $('#balance-label').textContent = isCC ? 'Current Outstanding (₹ owed)' : 'Opening Balance (₹)';
}

function renderSummaryCards() {
  const d = state.dashboard?.currentMonth;
  if (!d) return;
  $('#summary-cards').innerHTML = `
    <div class="summary-card income">
      <div class="label">Income</div>
      <div class="value">${formatCurrency(d.totalIncome)}</div>
    </div>
    <div class="summary-card expense">
      <div class="label">Expenses</div>
      <div class="value">${formatCurrency(d.totalExpense)}</div>
    </div>
    <div class="summary-card savings">
      <div class="label">Savings</div>
      <div class="value">${formatCurrency(d.totalSavings)}</div>
    </div>
    <div class="summary-card net">
      <div class="label">Net Balance</div>
      <div class="value">${formatCurrency(d.netBalance)}</div>
    </div>
  `;
}

function renderTransactions() {
  const filterType = $('#filter-type').value;
  let txs = state.transactions;
  if (filterType) txs = txs.filter((t) => t.type === filterType);

  if (!txs.length) {
    $('#transactions-list').innerHTML = '<div class="empty-state">No transactions this month</div>';
    return;
  }

  const catMap = Object.fromEntries(state.categories.map((c) => [c.id, c]));
  const accMap = Object.fromEntries(state.accounts.map((a) => [a.id, a]));

  $('#transactions-list').innerHTML = txs.map((t) => {
    const cat = catMap[t.categoryId];
    const acc = accMap[t.accountId];
    const sign = ['expense', 'withdrawal'].includes(t.type) ? '-' : '+';
    const ccTag = acc?.type === 'credit_card' ? ' 💳' : '';
    return `
      <div class="tx-card">
        <div class="tx-icon ${t.type}">${cat?.icon || '💰'}</div>
        <div class="tx-details">
          <div class="desc">${t.description}</div>
          <div class="meta">${formatDate(t.date)} · ${cat?.name || ''} · ${acc?.name || ''}${ccTag}</div>
        </div>
        <div class="tx-amount ${t.type}">${sign}${formatCurrency(t.amount)}</div>
        <button class="tx-delete" data-id="${t.id}" title="Delete">🗑</button>
      </div>
    `;
  }).join('');

  $$('.tx-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this transaction?')) return;
      try {
        await api(`/transactions/${btn.dataset.id}`, { method: 'DELETE' });
        showToast('Transaction deleted', 'success');
        loadData();
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });
}

function renderReports() {
  const m = state.dashboard?.currentMonth;
  const ytd = state.dashboard?.yearToDate;
  if (!m) return;

  $('#month-report').innerHTML = `
    <div class="report-row"><span class="label">Transactions</span><span class="value">${m.transactionCount}</span></div>
    <div class="report-row"><span class="label">Income</span><span class="value" style="color:var(--deposit)">${formatCurrency(m.totalIncome)}</span></div>
    <div class="report-row"><span class="label">Expenses</span><span class="value" style="color:var(--expense)">${formatCurrency(m.totalExpense)}</span></div>
    <div class="report-row"><span class="label">Withdrawals</span><span class="value">${formatCurrency(m.totalWithdrawals)}</span></div>
    <div class="report-row"><span class="label">Transfers</span><span class="value">${formatCurrency(m.totalTransfers)}</span></div>
    <div class="report-row"><span class="label">Savings</span><span class="value" style="color:var(--saving)">${formatCurrency(m.totalSavings)}</span></div>
    <div class="report-row"><span class="label">Savings Rate</span><span class="value">${m.savingsRate.toFixed(1)}%</span></div>
    <div class="report-row"><span class="label">Net Balance</span><span class="value">${formatCurrency(m.netBalance)}</span></div>
  `;

  if (ytd) {
    $('#ytd-report').innerHTML = `
      <div class="report-row"><span class="label">YTD Income</span><span class="value">${formatCurrency(ytd.totalIncome)}</span></div>
      <div class="report-row"><span class="label">YTD Expenses</span><span class="value">${formatCurrency(ytd.totalExpense)}</span></div>
      <div class="report-row"><span class="label">YTD Savings</span><span class="value">${formatCurrency(ytd.totalSavings)}</span></div>
      <div class="report-row"><span class="label">Avg Monthly Expense</span><span class="value">${formatCurrency(ytd.avgMonthlyExpense)}</span></div>
      <div class="report-row"><span class="label">Avg Savings Rate</span><span class="value">${ytd.avgSavingsRate.toFixed(1)}%</span></div>
    `;
  }

  const trend = m.dailyTrend ?? [];
  if (!trend.length) {
    $('#daily-trend').innerHTML = '<div class="empty-state">No daily data</div>';
    return;
  }
  const maxVal = Math.max(...trend.map((d) => Math.max(d.income, d.expense)), 1);
  $('#daily-trend').innerHTML = trend.map((d) => `
    <div class="daily-row">
      <span>${formatDate(d.date)}</span>
      <div class="daily-bar-wrap">
        <div class="daily-bar-income" style="width:${(d.income / maxVal) * 50}%"></div>
        <div class="daily-bar-expense" style="width:${(d.expense / maxVal) * 50}%"></div>
      </div>
      <span style="text-align:right;color:var(--text-muted)">${formatCurrency(d.net)}</span>
    </div>
  `).join('');
}

async function loadStorageInfo() {
  try {
    const info = await api('/reports/storage-info');
    $('#storage-info').innerHTML = `
      <strong>${info.type.toUpperCase()}</strong>
      <span>${info.path}</span>
    `;
  } catch { /* ignore */ }
}

async function loadData() {
  try {
    const [accounts, categories, transactions, dashboard] = await Promise.all([
      api('/accounts'),
      api('/categories'),
      api(`/transactions?month=${encodeURIComponent(state.month)}&year=${state.year}`),
      api(`/reports/dashboard?month=${encodeURIComponent(state.month)}&year=${state.year}`),
    ]);
    state.accounts = accounts;
    state.categories = categories;
    state.transactions = transactions;
    state.dashboard = dashboard;

    renderGoalProgress();
    renderSummaryCards();
    renderMonthlyGoals();
    renderCreditCards();
    renderBucketBudgets();
    renderInsights();
    renderCategoryBudgets();
    renderAccountBalances();
    renderTransactions();
    renderReports();
    renderAccounts();
  } catch (e) {
    console.error('Load data error:', e);
    showToast('Failed to load data: ' + e.message, 'error');
    $('#summary-cards').innerHTML = '<div class="empty-state">API unavailable. Check /api/health</div>';
  }
}

function populateFormSelects() {
  $('#accountId').innerHTML = state.accounts.map((a) => {
    const label = a.type === 'credit_card'
      ? `${a.name} (Owed: ${formatCurrency(a.balance)})`
      : `${a.name} (${formatCurrency(a.balance)})`;
    return `<option value="${a.id}">${label}</option>`;
  }).join('');
  $('#toAccountId').innerHTML = state.accounts.map((a) =>
    `<option value="${a.id}">${a.name}</option>`
  ).join('');
  updateCategoryOptions();
}

function updateCategoryOptions() {
  const filtered = state.categories.filter((c) => c.type === state.selectedType);
  $('#categoryId').innerHTML = filtered.map((c) =>
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');
}

function openModal() {
  $('#modal-overlay').classList.remove('hidden');
  $('#date').value = new Date().toISOString().split('T')[0];
  populateFormSelects();
  toggleToAccount();
}

function closeModal() {
  $('#modal-overlay').classList.add('hidden');
  $('#transaction-form').reset();
}

function toggleToAccount() {
  const needsTo = ['transfer', 'saving'].includes(state.selectedType);
  $('#to-account-group').classList.toggle('hidden', !needsTo);
  const label = $('#to-account-group label');
  if (state.selectedType === 'transfer') {
    label.textContent = 'To Account (select Credit Card to pay bill)';
  } else {
    label.textContent = 'To Account';
  }
}

function initEventListeners() {
  $$('.nav-item[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  $('#btn-add').addEventListener('click', openModal);
  $('#btn-close-modal').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('#modal-overlay')) closeModal();
  });

  $('#btn-prev-month').addEventListener('click', () => navigateMonth(-1));
  $('#btn-next-month').addEventListener('click', () => navigateMonth(1));

  $$('.type-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.type-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedType = tab.dataset.type;
      updateCategoryOptions();
      toggleToAccount();
    });
  });

  $('#filter-type').addEventListener('change', renderTransactions);

  $('#transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      type: state.selectedType,
      amount: parseFloat($('#amount').value),
      description: $('#description').value,
      categoryId: $('#categoryId').value,
      accountId: $('#accountId').value,
      date: new Date($('#date').value).toISOString(),
      notes: $('#notes').value || undefined,
    };
    if (['transfer', 'saving'].includes(state.selectedType)) {
      body.toAccountId = $('#toAccountId').value;
    }
    try {
      const result = await api('/transactions', { method: 'POST', body: JSON.stringify(body) });
      showToast('Transaction saved!', 'success');
      if (result.warnings?.length) {
        result.warnings.forEach((w, i) => {
          setTimeout(() => showToast(w, w.includes('⚠️') || w.includes('Short') ? 'error' : ''), (i + 1) * 3500);
        });
      }
      closeModal();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('#btn-new-account').addEventListener('click', () => {
    toggleAccountTypeFields();
    $('#account-modal-overlay').classList.remove('hidden');
  });
  $('#account-type').addEventListener('change', toggleAccountTypeFields);
  $('#btn-close-account-modal').addEventListener('click', () => {
    $('#account-modal-overlay').classList.add('hidden');
  });
  $('#account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = $('#account-type').value;
    const body = {
      name: $('#account-name').value,
      type,
      balance: parseFloat($('#account-balance').value) || 0,
    };
    if (type === 'credit_card') {
      body.creditLimit = parseFloat($('#account-credit-limit').value) || 200000;
      body.billingDay = parseInt($('#account-billing-day').value, 10) || 15;
      body.dueDay = parseInt($('#account-due-day').value, 10) || 5;
    }
    try {
      await api('/accounts', { method: 'POST', body: JSON.stringify(body) });
      showToast('Account created!', 'success');
      $('#account-modal-overlay').classList.add('hidden');
      $('#account-form').reset();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('#btn-add-goal').addEventListener('click', () => {
    $('#goal-modal-overlay').classList.remove('hidden');
  });
  $('#btn-close-goal-modal').addEventListener('click', () => {
    $('#goal-modal-overlay').classList.add('hidden');
  });
  $('#goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/goals', {
        method: 'POST',
        body: JSON.stringify({
          name: $('#goal-name').value,
          icon: $('#goal-icon').value || '🎯',
          targetAmount: parseFloat($('#goal-amount').value),
          type: $('#goal-type').value,
        }),
      });
      showToast('Monthly goal added!', 'success');
      $('#goal-modal-overlay').classList.add('hidden');
      $('#goal-form').reset();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function init() {
  updatePeriodDisplay();
  initEventListeners();
  await loadData();
  await loadStorageInfo();
}

init();
