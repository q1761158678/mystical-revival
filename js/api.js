/* ===========================
   前端共享 API 模块
   封装所有后端请求
   =========================== */

var API = {
  // 认证
  register: function(data) {
    return fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(function(r){return r.json();});
  },
  login: function(account, password) {
    return fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({account:account, password:password}) }).then(function(r){return r.json();});
  },
  logout: function() {
    return fetch('/api/logout', { method:'POST' }).then(function(r){return r.json();});
  },
  getCurrentUser: function() {
    return fetch('/api/user').then(function(r){return r.json();});
  },

  // 管理员
  adminLogin: function(password) {
    return fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:password}) }).then(function(r){return r.json();});
  },
  adminLogout: function() {
    return fetch('/api/admin/logout', { method:'POST' }).then(function(r){return r.json();});
  },
  adminGetUsers: function() {
    return fetch('/api/admin/users').then(function(r){return r.json();});
  },
  adminDeleteUser: function(account) {
    return fetch('/api/admin/users/' + encodeURIComponent(account), { method:'DELETE' }).then(function(r){return r.json();});
  },
  adminGetPosts: function() {
    return fetch('/api/admin/posts').then(function(r){return r.json();});
  },
  adminGetEvents: function() {
    return fetch('/api/admin/events').then(function(r){return r.json();});
  },
  adminDeleteEvent: function(id) {
    return fetch('/api/events/' + encodeURIComponent(id), { method:'DELETE' }).then(function(r){return r.json();});
  },

  // 论坛
  getPosts: function() {
    return fetch('/api/posts').then(function(r){return r.json();});
  },
  createPost: function(title, content) {
    return fetch('/api/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:title, content:content}) }).then(function(r){return r.json();});
  },
  createReply: function(postId, content) {
    return fetch('/api/posts/' + encodeURIComponent(postId) + '/replies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content:content}) }).then(function(r){return r.json();});
  },
  deletePost: function(postId) {
    return fetch('/api/posts/' + encodeURIComponent(postId), { method:'DELETE' }).then(function(r){return r.json();});
  },

  // 事件档案
  getEvents: function() {
    return fetch('/api/events').then(function(r){return r.json();});
  },
  createEvent: function(data) {
    return fetch('/api/events', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(function(r){return r.json();});
  },
  updateEvent: function(id, data) {
    return fetch('/api/events/' + encodeURIComponent(id), { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(function(r){return r.json();});
  },
  deleteEvent: function(id) {
    return fetch('/api/events/' + encodeURIComponent(id), { method:'DELETE' }).then(function(r){return r.json();});
  },

  // 聊天
  getChatMessages: function() {
    return fetch('/api/chat/messages').then(function(r){return r.json();});
  },
  deleteChatMessage: function(id) {
    return fetch('/api/chat/messages/' + id, { method:'DELETE' }).then(function(r){return r.json();});
  }
};

// HTML转义（全局共享）
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
