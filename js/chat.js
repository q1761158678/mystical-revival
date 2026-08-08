/* ===========================
   聊天室系统 - Socket.io 实时通信
   =========================== */

var _currentUser = null;
var _isAdmin = false;
var socket = null;

document.addEventListener('DOMContentLoaded', function() {
  API.getCurrentUser().then(function(data) {
    if (!data.user) {
      document.getElementById('access-denied-section').style.display = '';
      document.getElementById('chat-content').style.display = 'none';
      return;
    }
    _currentUser = data.user;
    _isAdmin = data.admin;
    document.getElementById('access-denied-section').style.display = 'none';
    document.getElementById('chat-content').style.display = '';

    // 加载历史消息
    API.getChatMessages().then(function(msgs) {
      var container = document.getElementById('chat-messages');
      var html = '';
      msgs.forEach(function(msg) { html += buildMessageHtml(msg); });
      container.innerHTML = html;
      container.scrollTop = container.scrollHeight;
    });

    // 连接 Socket.io
    socket = io();

    socket.on('connect', function() {
      document.getElementById('chat-conn-status').innerHTML = '● 在线';
      document.getElementById('chat-conn-status').style.color = '#2a6a2a';
      socket.emit('chat-join', _currentUser.account);
    });

    socket.on('disconnect', function() {
      document.getElementById('chat-conn-status').innerHTML = '● 重连中...';
      document.getElementById('chat-conn-status').style.color = 'var(--accent-red)';
    });

    socket.on('chat-message', function(msg) {
      var container = document.getElementById('chat-messages');
      container.insertAdjacentHTML('beforeend', buildMessageHtml(msg));
      container.scrollTop = container.scrollHeight;
    });

    socket.on('chat-deleted', function(msgId) {
      var el = document.querySelector('[data-msg-id="' + msgId + '"]');
      if (el) el.remove();
    });

    socket.on('online-users', function(users) {
      renderOnlineUsers(users);
    });

    document.getElementById('chat-input').focus();
  });
});

function buildMessageHtml(msg) {
  if (msg.type === 'system') {
    return '<div class="chat-msg chat-msg-system" data-msg-id="' + (msg.id || '') + '">' +
      '<div class="chat-msg-body">' + escapeHtml(msg.content) + ' — ' + escapeHtml(msg.timestamp) + '</div>' +
    '</div>';
  }
  var isSelf = _currentUser && msg.account === _currentUser.account;
  var adminBadge = _isAdmin ?
    '<button class="btn" style="padding:2px 8px;font-size:10px;margin-left:4px;" onclick="deleteChatMsg(' + msg.id + ')">删</button>' : '';
  return '<div class="chat-msg' + (isSelf ? ' chat-msg-self' : '') + '" data-msg-id="' + (msg.id || '') + '">' +
    '<div class="chat-msg-meta">' +
      '<span class="chat-msg-author">' + escapeHtml(msg.author) + '</span>' +
      '<span class="chat-msg-ghost">驾驭：' + escapeHtml(msg.ghostName) + '</span>' +
      adminBadge +
      '<span class="chat-msg-time">' + escapeHtml(msg.timestamp) + '</span>' +
    '</div>' +
    '<div class="chat-msg-body">' + escapeHtml(msg.content) + '</div>' +
  '</div>';
}

function sendChatMessage() {
  if (!_currentUser || !socket) return;
  var input = document.getElementById('chat-input');
  var text = input.value.trim();
  if (!text) return;
  socket.emit('chat-message', { content: text });
  input.value = '';
}

function renderOnlineUsers(users) {
  var container = document.getElementById('online-list');
  var countEl = document.getElementById('online-count');
  countEl.textContent = users.length + ' 人';

  var html = '';
  users.forEach(function(u) {
    html += '<div class="online-item">' +
      '<span class="online-dot"></span>' +
      '<span class="online-name">' + escapeHtml(u.codename) + '</span>' +
      '<span class="online-ghost">' + escapeHtml(u.ghostName) + '</span>' +
    '</div>';
  });

  if (users.length === 0) {
    html = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">暂无在线驭诡者</div>';
  }

  container.innerHTML = html;
}

function deleteChatMsg(msgId) {
  if (!_isAdmin) return;
  if (!confirm('确认删除此消息？')) return;
  if (socket) socket.emit('chat-delete', msgId);
}
