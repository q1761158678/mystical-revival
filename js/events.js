/* ===========================
   事件档案系统 - 后端API版
   =========================== */

var _currentUser = null;
var _isAdmin = false;

function getCurrentUser() {
  return _currentUser;
}

document.addEventListener('DOMContentLoaded', function() {
  API.getCurrentUser().then(function(data) {
    if (!data.user) {
      document.getElementById('access-denied-section').style.display = '';
      document.getElementById('events-content').style.display = 'none';
      return;
    }
    _currentUser = data.user;
    _isAdmin = data.admin;
    document.getElementById('access-denied-section').style.display = 'none';
    document.getElementById('events-content').style.display = '';
    updateUserBar();
    renderEvents();
  });
});

function updateUserBar() {
  var bar = document.getElementById('user-info-bar');
  var pubBtn = document.getElementById('publish-btn-section');
  if (_currentUser) {
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<span style="color: var(--accent-red); font-weight: 700;">' + escapeHtml(_currentUser.codename) + '</span>' +
        '<span style="color: var(--text-dim); font-size: 12px; font-family: var(--font-mono);">驾驭：' + escapeHtml(_currentUser.ghost.name) + ' | 已登录</span>' +
        (_isAdmin ? '<span style="color:var(--accent-amber);font-size:11px;font-family:var(--font-mono);">[管理员]</span>' : '') +
      '</div>' +
      '<a href="register.html" style="color: var(--text-dim); font-size: 12px; text-decoration: none;">账号管理</a>';
    pubBtn.style.display = '';
  }
}

function renderEvents() {
  API.getEvents().then(function(events) {
    var listEl = document.getElementById('event-list');
    var countEl = document.getElementById('event-count-text');
    countEl.textContent = '显示 ' + events.length + ' / 847 条档案';

    if (events.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">暂无档案</div>';
      return;
    }

    var html = '';
    events.forEach(function(ev) {
      var levelClass = 'level-d';
      if (ev.level === 'S') levelClass = 'level-s';
      else if (ev.level === 'A') levelClass = 'level-a';
      else if (ev.level === 'B') levelClass = 'level-b';
      else if (ev.level === 'C') levelClass = 'level-c';

      var statusTag = 'tag-active';
      if (ev.status === '已收容') statusTag = 'tag-resolved';
      else if (ev.status === '处理中') statusTag = 'tag-active';
      else if (ev.status === '收容中') statusTag = 'tag-classified';

      var stampHtml = ev.level === 'S' ? '<div class="stamp">绝密</div>' : '';

      var editHtml = '';
      if (_currentUser && (ev.isUserCreated || _isAdmin)) {
        editHtml = '<div style="margin-top:12px;display:flex;gap:8px;">' +
          (ev.isUserCreated ? '<button class="btn" style="padding:4px 14px;font-size:11px;" onclick="editEvent(\'' + ev.id + '\')">编辑</button>' : '') +
          '<button class="btn" style="padding:4px 14px;font-size:11px;" onclick="deleteEvent(\'' + ev.id + '\')">删除</button>' +
        '</div>';
      }

      var authorHtml = ev.isUserCreated ? ' · 发布者：「' + ev.author + '」' : '';

      html += '<div class="card event-item" data-level="' + ev.level + '">' +
        stampHtml +
        '<div class="card-header">' +
          '<span class="file-id">' + escapeHtml(ev.id) + '</span>' +
          '<span class="level-badge ' + levelClass + '" style="width:32px;height:32px;font-size:14px;">' + ev.level + '</span>' +
          '<h2>' + escapeHtml(ev.title) + '</h2>' +
          '<span class="file-tag ' + statusTag + '">' + escapeHtml(ev.status) + '</span>' +
        '</div>' +
        '<div class="doc-style">' +
          '<div class="doc-line"><span class="doc-label">发生地点：</span><span class="doc-value">' + escapeHtml(ev.location) + '</span></div>' +
          '<div class="doc-line"><span class="doc-label">发现时间：</span><span class="doc-value">' + escapeHtml(ev.date) + '</span></div>' +
          '<div class="doc-line"><span class="doc-label">伤亡人数：</span><span class="doc-value" style="' + (ev.casualties === '无' ? '' : 'color:var(--accent-red);') + '">' + escapeHtml(ev.casualties) + '</span></div>' +
          '<div class="doc-line"><span class="doc-label">诡异类型：</span><span class="doc-value">' + escapeHtml(ev.type) + '</span></div>' +
        '</div>' +
        '<p style="margin-top:12px;white-space:pre-wrap;">' + escapeHtml(ev.description) + '</p>' +
        (authorHtml ? '<p style="margin-top:8px;font-size:11px;color:var(--text-dim);font-family:var(--font-mono);">档案来源：驭诡者提交' + escapeHtml(authorHtml) + '</p>' : '') +
        editHtml +
      '</div>';
    });

    listEl.innerHTML = html;
  });
}

function filterEvents(level) {
  document.querySelectorAll('.event-item').forEach(function(item) {
    if (level === 'all' || item.dataset.level === level) item.style.display = '';
    else item.style.display = 'none';
  });
}

function showEventForm() {
  if (!_currentUser) { alert('请先登录'); return; }
  document.getElementById('event-form-section').style.display = '';
  document.getElementById('event-form-mode').textContent = '发布新档案';
  document.getElementById('event-form-title').textContent = '发布事件档案';
  document.getElementById('event-edit-id').value = '';
  document.getElementById('ev-title').value = '';
  document.getElementById('ev-fileid').value = '';
  document.getElementById('ev-level').value = 'B';
  document.getElementById('ev-status').value = '处理中';
  document.getElementById('ev-location').value = '';
  document.getElementById('ev-date').value = '';
  document.getElementById('ev-casualties').value = '';
  document.getElementById('ev-type').value = '';
  document.getElementById('ev-description').value = '';
  document.getElementById('event-form-section').scrollIntoView({ behavior: 'smooth' });
}

function editEvent(eventId) {
  API.getEvents().then(function(events) {
    var ev = events.find(function(e) { return e.id === eventId; });
    if (!ev) return;
    document.getElementById('event-form-section').style.display = '';
    document.getElementById('event-form-mode').textContent = '编辑档案';
    document.getElementById('event-form-title').textContent = '编辑事件档案';
    document.getElementById('event-edit-id').value = ev.id;
    document.getElementById('ev-title').value = ev.title;
    document.getElementById('ev-fileid').value = ev.id;
    document.getElementById('ev-level').value = ev.level;
    document.getElementById('ev-status').value = ev.status;
    document.getElementById('ev-location').value = ev.location;
    document.getElementById('ev-date').value = ev.date;
    document.getElementById('ev-casualties').value = ev.casualties;
    document.getElementById('ev-type').value = ev.type;
    document.getElementById('ev-description').value = ev.description;
    document.getElementById('event-form-section').scrollIntoView({ behavior: 'smooth' });
  });
}

function cancelEventForm() {
  document.getElementById('event-form-section').style.display = 'none';
}

function saveEvent() {
  if (!_currentUser) { alert('请先登录'); return; }
  var data = {
    title: document.getElementById('ev-title').value.trim(),
    fileId: document.getElementById('ev-fileid').value.trim(),
    level: document.getElementById('ev-level').value,
    status: document.getElementById('ev-status').value,
    location: document.getElementById('ev-location').value.trim(),
    date: document.getElementById('ev-date').value.trim(),
    casualties: document.getElementById('ev-casualties').value.trim(),
    type: document.getElementById('ev-type').value.trim(),
    description: document.getElementById('ev-description').value.trim()
  };
  if (!data.title) { alert('请输入事件标题'); return; }
  if (!data.location) { alert('请输入发生地点'); return; }
  if (!data.description) { alert('请输入事件详情'); return; }

  var editId = document.getElementById('event-edit-id').value;
  if (editId) {
    API.updateEvent(editId, data).then(function(result) {
      if (result.error) { alert(result.error); return; }
      cancelEventForm();
      renderEvents();
    });
  } else {
    API.createEvent(data).then(function(result) {
      if (result.error) { alert(result.error); return; }
      cancelEventForm();
      renderEvents();
    });
  }
}

function deleteEvent(eventId) {
  if (!confirm('确认删除此档案？此操作不可撤销。')) return;
  API.deleteEvent(eventId).then(function(result) {
    if (result.error) { alert(result.error); return; }
    renderEvents();
  });
}
