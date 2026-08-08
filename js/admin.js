/* ===========================
   管理员后台系统 - 后端API版
   =========================== */

document.addEventListener('DOMContentLoaded', function() {
  API.getCurrentUser().then(function(data) {
    if (data.admin) {
      showDashboard();
    } else {
      document.getElementById('admin-login-section').style.display = '';
      document.getElementById('admin-dashboard').style.display = 'none';
      document.getElementById('admin-password-input').focus();
    }
  });
});

function doAdminLogin() {
  var input = document.getElementById('admin-password-input').value;
  API.adminLogin(input).then(function(data) {
    if (data.error) {
      alert('密码错误');
      document.getElementById('admin-password-input').value = '';
    } else {
      showDashboard();
    }
  });
}

function doAdminLogout() {
  API.adminLogout().then(function() {
    document.getElementById('admin-login-section').style.display = '';
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin-password-input').value = '';
    document.getElementById('admin-password-input').focus();
  });
}

function showDashboard() {
  document.getElementById('admin-login-section').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = '';
  updateStats();
  switchTab('users');
}

function updateStats() {
  Promise.all([
    API.adminGetUsers(),
    API.adminGetPosts(),
    API.adminGetEvents()
  ]).then(function(results) {
    document.getElementById('stat-users').textContent = results[0].length;
    document.getElementById('stat-posts').textContent = results[1].length;
    document.getElementById('stat-events').textContent = results[2].length;
  });
}

function switchTab(tab) {
  ['users','posts','events'].forEach(function(t) {
    document.getElementById('panel-' + t).style.display = 'none';
    var btn = document.getElementById('tab-' + t);
    if (btn) btn.style.opacity = '0.5';
  });
  document.getElementById('panel-' + tab).style.display = '';
  var activeBtn = document.getElementById('tab-' + tab);
  if (activeBtn) activeBtn.style.opacity = '1';

  if (tab === 'users') renderAdminUsers();
  else if (tab === 'posts') renderAdminPosts();
  else if (tab === 'events') renderAdminEvents();
}

// ==================== 驭鬼者管理 ====================

function renderAdminUsers() {
  API.adminGetUsers().then(function(users) {
    var listEl = document.getElementById('admin-user-list');
    if (users.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">暂无注册驭诡者</div>';
      return;
    }
    var html = '';
    users.forEach(function(user, idx) {
      var g = user.ghost;
      var levelClass = 'level-d';
      if (g.level === 'S') levelClass = 'level-s';
      else if (g.level === 'A') levelClass = 'level-a';
      else if (g.level === 'B') levelClass = 'level-b';
      else if (g.level === 'C') levelClass = 'level-c';

      html += '<div class="card" style="margin-bottom:16px;">' +
        '<div class="card-header">' +
          '<span class="file-id">NO.' + String(idx+1).padStart(3,'0') + '</span>' +
          '<span class="level-badge ' + levelClass + '" style="width:32px;height:32px;font-size:14px;">' + g.level + '</span>' +
          '<h2>「' + escapeHtml(user.codename) + '」</h2>' +
          '<span class="file-tag tag-active">注册驭鬼者</span>' +
        '</div>' +
        '<div class="grid-2">' +
          '<div class="doc-style">' +
            '<div class="doc-line"><span class="doc-label">账号：</span><span class="doc-value">' + escapeHtml(user.account) + '</span></div>' +
            '<div class="doc-line"><span class="doc-label">密码：</span><span class="doc-value" style="color:var(--text-dim);">' + escapeHtml(user.password.replace(/./g,'●')) + '</span></div>' +
            '<div class="doc-line"><span class="doc-label">性别：</span><span class="doc-value">' + escapeHtml(user.gender) + '</span></div>' +
            '<div class="doc-line"><span class="doc-label">所属分部：</span><span class="doc-value">' + escapeHtml(user.branch) + '</span></div>' +
          '</div>' +
          '<div class="doc-style">' +
            '<div class="doc-line"><span class="doc-label">驭诡编号：</span><span class="doc-value">' + escapeHtml(user.gcId) + '</span></div>' +
            '<div class="doc-line"><span class="doc-label">驭诡等级：</span><span class="doc-value" style="color:var(--accent-red);">' + escapeHtml(user.controllerLevel) + '</span></div>' +
            '<div class="doc-line"><span class="doc-label">驾驭厉鬼：</span><span class="doc-value">' + escapeHtml(g.name) + ' · ' + g.level + '级</span></div>' +
            '<div class="doc-line"><span class="doc-label">注册日期：</span><span class="doc-value">' + escapeHtml(user.registerDate) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:8px;font-size:12px;color:var(--text-dim);">' +
          '<strong>能力：</strong>' + escapeHtml(g.ability) + '<br>' +
          '<strong>代价：</strong><span style="color:var(--accent-red);">' + escapeHtml(g.cost) + '</span>' +
        '</div>' +
        '<div style="margin-top:12px;">' +
          '<button class="btn" style="padding:6px 16px;font-size:12px;" onclick="deleteUser(\'' + user.account + '\',\'' + user.codename + '\')">删除此驭鬼者</button>' +
        '</div>' +
      '</div>';
    });
    listEl.innerHTML = html;
  });
}

function deleteUser(account, codename) {
  if (!confirm('确认删除驭鬼者「' + codename + '」？\n账号：' + account + '\n此操作不可撤销。')) return;
  API.adminDeleteUser(account).then(function() {
    updateStats();
    renderAdminUsers();
  });
}

// ==================== 帖子管理 ====================

function renderAdminPosts() {
  API.adminGetPosts().then(function(posts) {
    var listEl = document.getElementById('admin-post-list');
    if (posts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">暂无帖子</div>';
      return;
    }
    var html = '';
    posts.forEach(function(post) {
      var replyCount = post.replies ? post.replies.length : 0;
      html += '<div class="card" style="margin-bottom:16px;">' +
        '<div class="card-header">' +
          '<span class="file-id">' + escapeHtml(post.id) + '</span>' +
          '<h2 style="font-size:16px;">' + escapeHtml(post.title) + '</h2>' +
          '<span class="file-tag tag-secret">帖子</span>' +
        '</div>' +
        '<div class="post-meta">' +
          '<span class="post-author">' + escapeHtml(post.author) + '</span>' +
          '<span>驾驭：' + escapeHtml(post.ghostName || '未知') + '</span>' +
          '<span>' + escapeHtml(post.timestamp) + '</span>' +
          '<span>回复 ' + replyCount + '</span>' +
        '</div>' +
        '<div class="post-content" style="white-space:pre-wrap;margin-top:8px;">' + escapeHtml(post.content) + '</div>';
      if (post.replies && post.replies.length > 0) {
        html += '<div style="margin-top:12px;padding-left:16px;border-left:2px solid var(--border-dim);">';
        post.replies.forEach(function(reply) {
          html += '<div class="forum-reply" style="margin-bottom:8px;">' +
            '<div class="post-meta"><span class="post-author">' + escapeHtml(reply.author) + '</span><span>' + escapeHtml(reply.timestamp) + '</span></div>' +
            '<div class="post-content" style="margin-bottom:0;font-size:13px;">' + escapeHtml(reply.content) + '</div>' +
          '</div>';
        });
        html += '</div>';
      }
      html += '<div style="margin-top:12px;">' +
        '<button class="btn" style="padding:6px 16px;font-size:12px;" onclick="adminDeletePost(\'' + post.id + '\')">删除帖子</button>' +
      '</div></div>';
    });
    listEl.innerHTML = html;
  });
}

function adminDeletePost(postId) {
  if (!confirm('确认删除此帖子？')) return;
  API.deletePost(postId).then(function() {
    updateStats();
    renderAdminPosts();
  });
}

// ==================== 事件档案管理 ====================

function renderAdminEvents() {
  API.adminGetEvents().then(function(events) {
    var listEl = document.getElementById('admin-event-list');
    if (events.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">暂无事件档案</div>';
      return;
    }
    var html = '';
    events.forEach(function(ev) {
      var levelClass = 'level-d';
      if (ev.level === 'S') levelClass = 'level-s';
      else if (ev.level === 'A') levelClass = 'level-a';
      else if (ev.level === 'B') levelClass = 'level-b';
      else if (ev.level === 'C') levelClass = 'level-c';
      var sourceTag = ev.isUserCreated ? '<span class="file-tag tag-secret">用户提交</span>' : '<span class="file-tag tag-resolved">系统档案</span>';

      html += '<div class="card" style="margin-bottom:16px;">' +
        '<div class="card-header">' +
          '<span class="file-id">' + escapeHtml(ev.id) + '</span>' +
          '<span class="level-badge ' + levelClass + '" style="width:28px;height:28px;font-size:12px;">' + ev.level + '</span>' +
          '<h2 style="font-size:16px;">' + escapeHtml(ev.title) + '</h2>' +
          sourceTag +
        '</div>' +
        '<div class="doc-style">' +
          '<div class="doc-line"><span class="doc-label">地点：</span><span class="doc-value">' + escapeHtml(ev.location) + '</span></div>' +
          '<div class="doc-line"><span class="doc-label">时间：</span><span class="doc-value">' + escapeHtml(ev.date) + '</span></div>' +
          '<div class="doc-line"><span class="doc-label">伤亡：</span><span class="doc-value">' + escapeHtml(ev.casualties) + '</span></div>' +
          '<div class="doc-line"><span class="doc-label">状态：</span><span class="doc-value">' + escapeHtml(ev.status) + '</span></div>' +
          (ev.author ? '<div class="doc-line"><span class="doc-label">发布者：</span><span class="doc-value">「' + escapeHtml(ev.author) + '」</span></div>' : '') +
        '</div>' +
        '<p style="margin-top:8px;font-size:13px;color:var(--text-dim);white-space:pre-wrap;">' + escapeHtml(ev.description) + '</p>' +
        '<div style="margin-top:12px;">' +
          '<button class="btn" style="padding:6px 16px;font-size:12px;" onclick="deleteEventAdmin(\'' + ev.id + '\')">删除档案</button>' +
        '</div>' +
      '</div>';
    });
    listEl.innerHTML = html;
  });
}

function deleteEventAdmin(eventId) {
  if (!confirm('确认删除事件档案？')) return;
  API.deleteEvent(eventId).then(function() {
    updateStats();
    renderAdminEvents();
  });
}
