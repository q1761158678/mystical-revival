/* ===========================
   注册/登录系统 - 后端API版
   ==================== */

var _currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
  API.getCurrentUser().then(function(data) {
    if (data.user) {
      _currentUser = data.user;
      showLoggedInState(data.user);
    } else {
      showLoginForm();
    }
  });
});

function showLoginForm() {
  document.getElementById('login-section').style.display = '';
  document.getElementById('register-form-section').style.display = 'none';
  document.getElementById('certificate-section').style.display = 'none';
  document.getElementById('logged-in-section').style.display = 'none';
}

function showRegisterForm() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-form-section').style.display = '';
  document.getElementById('certificate-section').style.display = 'none';
  document.getElementById('logged-in-section').style.display = 'none';
}

function showLoggedInState(user) {
  _currentUser = user;
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-form-section').style.display = 'none';
  document.getElementById('certificate-section').style.display = 'none';
  document.getElementById('logged-in-section').style.display = '';

  var infoEl = document.getElementById('logged-in-info');
  infoEl.innerHTML =
    '<div class="doc-style">' +
      '<div class="doc-line"><span class="doc-label">账号：</span><span class="doc-value">' + escapeHtml(user.account) + '</span></div>' +
      '<div class="doc-line"><span class="doc-label">代号：</span><span class="doc-value" style="color:var(--accent-red);">「' + escapeHtml(user.codename) + '」</span></div>' +
      '<div class="doc-line"><span class="doc-label">驭诡编号：</span><span class="doc-value">' + escapeHtml(user.gcId) + '</span></div>' +
      '<div class="doc-line"><span class="doc-label">驾驭厉鬼：</span><span class="doc-value">' + escapeHtml(user.ghost.name) + ' · ' + user.ghost.level + '级</span></div>' +
      '<div class="doc-line"><span class="doc-label">所属分部：</span><span class="doc-value">' + escapeHtml(user.branch) + '</span></div>' +
    '</div>';
}

function doLogin() {
  var account = document.getElementById('login-account').value.trim();
  var password = document.getElementById('login-password').value;
  if (!account || !password) { alert('请输入账号和密码'); return; }

  API.login(account, password).then(function(data) {
    if (data.error) { alert(data.error); return; }
    _currentUser = data;
    showLoggedInState(data);
  });
}

function doLogout() {
  API.logout().then(function() {
    _currentUser = null;
    showLoginForm();
    document.getElementById('login-account').value = '';
    document.getElementById('login-password').value = '';
  });
}

function submitRegistration() {
  var account = document.getElementById('reg-account').value.trim();
  var password = document.getElementById('reg-password').value;
  var password2 = document.getElementById('reg-password2').value;
  var codename = document.getElementById('reg-codename').value.trim();
  var gender = document.getElementById('reg-gender').value;
  var branch = document.getElementById('reg-branch').value;

  if (!account) { alert('请输入账号'); return; }
  if (account.length < 3) { alert('账号至少需要3个字符'); return; }
  if (!/^[a-zA-Z0-9_]+$/.test(account)) { alert('账号只能包含字母、数字和下划线'); return; }
  if (!password) { alert('请输入密码'); return; }
  if (password.length < 6) { alert('密码至少需要6位'); return; }
  if (password !== password2) { alert('两次输入的密码不一致'); return; }

  API.register({ account: account, password: password, codename: codename, gender: gender, branch: branch }).then(function(data) {
    if (data.error) { alert(data.error); return; }
    _currentUser = data;
    showCertificate();
  });
}

function showCertificate() {
  if (!_currentUser) { showLoginForm(); return; }
  var user = _currentUser;
  var ghost = user.ghost;
  var levelClass = 'level-d';
  if (ghost.level === 'S') levelClass = 'level-s';
  else if (ghost.level === 'A') levelClass = 'level-a';
  else if (ghost.level === 'B') levelClass = 'level-b';
  else if (ghost.level === 'C') levelClass = 'level-c';

  var html = '<div class="certificate">' +
    '<div class="cert-header">★ 诡异事务总部 · 驭诡者证书 ★</div>' +
    '<div class="cert-title">驭 诡 者</div>' +
    '<p style="color: var(--text-dim); font-size: 13px; font-family: var(--font-mono);">GHOST CONTROLLER CERTIFICATE</p>' +
    '<div class="cert-name">「' + escapeHtml(user.codename) + '」</div>' +
    '<p style="color: var(--text-dim); font-size: 13px;">账号：' + escapeHtml(user.account) + '&nbsp;|&nbsp;' + escapeHtml(user.gender) + '&nbsp;|&nbsp;' + escapeHtml(user.branch) + '</p>' +
    '<div class="cert-ghost">' +
      '<span class="level-badge ' + levelClass + '" style="display:inline-flex;vertical-align:middle;">' + ghost.level + '</span>' +
      '已驾驭厉鬼：' + escapeHtml(ghost.name) +
    '</div>' +
    '<p style="color: var(--text-main); font-size: 14px; margin: 12px 0;">' + escapeHtml(ghost.desc) + '</p>' +
    '<div class="doc-style" style="text-align: left; margin: 16px 0;">' +
      '<div class="doc-line"><span class="doc-label">诡异类型：</span><span class="doc-value">' + escapeHtml(ghost.type) + '</span></div>' +
      '<div class="doc-line"><span class="doc-label">驭诡等级：</span><span class="doc-value" style="color: var(--accent-red);">' + escapeHtml(user.controllerLevel) + '</span></div>' +
      '<div class="doc-line"><span class="doc-label">能力描述：</span><span class="doc-value">' + escapeHtml(ghost.ability) + '</span></div>' +
      '<div class="doc-line"><span class="doc-label">使用代价：</span><span class="doc-value" style="color: var(--accent-red);">' + escapeHtml(ghost.cost) + '</span></div>' +
    '</div>' +
    '<div class="cert-id">驭诡编号：' + escapeHtml(user.gcId) + ' &nbsp;|&nbsp; 注册日期：' + escapeHtml(user.registerDate) + '</div>' +
    '<div style="margin-top: 24px;">' +
      '<a href="forum.html" class="btn">前往论坛</a>' +
      '<a href="roster.html" class="btn" style="margin-left: 8px;">查看名册</a>' +
      '<button class="btn" style="margin-left: 8px;" onclick="showLoggedInState(_currentUser)">返回</button>' +
    '</div>' +
  '</div>';

  var section = document.getElementById('certificate-section');
  section.innerHTML = html;
  section.style.display = '';
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-form-section').style.display = 'none';
  document.getElementById('logged-in-section').style.display = 'none';
  section.scrollIntoView({ behavior: 'smooth' });
}
