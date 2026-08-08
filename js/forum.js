/* ===========================
   论坛系统 - 后端API版
   =========================== */

var _currentUser = null;
var _isAdmin = false;

document.addEventListener('DOMContentLoaded', function() {
  API.getCurrentUser().then(function(data) {
    if (!data.user) {
      document.getElementById('access-denied-section').style.display = '';
      document.getElementById('forum-content').style.display = 'none';
      return;
    }
    _currentUser = data.user;
    _isAdmin = data.admin;
    document.getElementById('access-denied-section').style.display = 'none';
    document.getElementById('forum-content').style.display = '';

    var userInfoEl = document.getElementById('user-info');
    userInfoEl.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<span style="color: var(--accent-red); font-weight: 700;">' + escapeHtml(_currentUser.codename) + '</span>' +
        '<span style="color: var(--text-dim); font-size: 12px; font-family: var(--font-mono);">驾驭：' + escapeHtml(_currentUser.ghost.name) + ' | ' + escapeHtml(_currentUser.gcId) + '</span>' +
        (_isAdmin ? '<span style="color:var(--accent-amber);font-size:11px;font-family:var(--font-mono);">[管理员]</span>' : '') +
      '</div>' +
      '<a href="register.html" style="color: var(--text-dim); font-size: 12px; text-decoration: none;">账号管理</a>';

    renderPosts();
  });
});

function renderPosts() {
  API.getPosts().then(function(posts) {
    var listEl = document.getElementById('post-list');
    var emptyEl = document.getElementById('empty-state');
    var countEl = document.getElementById('post-count');
    countEl.textContent = '共 ' + posts.length + ' 篇帖子';

    if (posts.length === 0) { listEl.innerHTML = ''; emptyEl.style.display = ''; return; }
    emptyEl.style.display = 'none';

    var html = '';
    posts.forEach(function(post) {
      var replyCount = post.replies ? post.replies.length : 0;
      html += '<div class="forum-post">' +
        '<div class="post-meta">' +
          '<span class="post-author">' + escapeHtml(post.author) + '</span>' +
          '<span>驾驭：' + escapeHtml(post.ghostName || '未知') + '</span>' +
          '<span>' + escapeHtml(post.timestamp) + '</span>' +
          '<span>回复 ' + replyCount + '</span>' +
        '</div>' +
        '<div class="post-title" onclick="togglePost(\'' + post.id + '\')">' + escapeHtml(post.title) + '</div>' +
        '<div class="post-content" id="content-' + post.id + '" style="display:none;white-space:pre-wrap;">' + escapeHtml(post.content) + '</div>' +
        '<div id="replies-' + post.id + '" style="display:none;">';

      if (post.replies && post.replies.length > 0) {
        post.replies.forEach(function(reply) {
          html += '<div class="forum-reply">' +
            '<div class="post-meta">' +
              '<span class="post-author">' + escapeHtml(reply.author) + '</span>' +
              '<span>驾驭：' + escapeHtml(reply.ghostName || '未知') + '</span>' +
              '<span>' + escapeHtml(reply.timestamp) + '</span>' +
            '</div>' +
            '<div class="post-content" style="margin-bottom:0;">' + escapeHtml(reply.content) + '</div>' +
          '</div>';
        });
      }

      html += '<div style="margin-top:12px;display:flex;gap:8px;">' +
        '<input type="text" id="reply-input-' + post.id + '" placeholder="回复..." style="flex:1;background:var(--bg-dark);border:1px solid var(--border-dim);color:var(--text-bright);padding:8px 12px;font-family:var(--font-serif);font-size:13px;outline:none;" onfocus="this.style.borderColor=\'var(--accent-red)\'" onblur="this.style.borderColor=\'var(--border-dim)\'">' +
        '<button class="btn" style="padding:6px 16px;font-size:12px;" onclick="submitReply(\'' + post.id + '\')">回复</button>' +
        (_isAdmin ? '<button class="btn" style="padding:6px 16px;font-size:12px;border-color:var(--accent-amber);color:var(--accent-amber);" onclick="adminDeletePost(\'' + post.id + '\')">管理删除</button>' : '') +
      '</div></div></div>';
    });

    listEl.innerHTML = html;
  });
}

function togglePost(postId) {
  var content = document.getElementById('content-' + postId);
  var replies = document.getElementById('replies-' + postId);
  if (content.style.display === 'none') { content.style.display = ''; replies.style.display = ''; }
  else { content.style.display = 'none'; replies.style.display = 'none'; }
}

function submitPost() {
  if (!_currentUser) { alert('请先登录'); return; }
  var title = document.getElementById('post-title').value.trim();
  var content = document.getElementById('post-content').value.trim();
  if (!title) { alert('请输入标题'); return; }
  if (!content) { alert('请输入内容'); return; }

  API.createPost(title, content).then(function(data) {
    if (data.error) { alert(data.error); return; }
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    renderPosts();
  });
}

function submitReply(postId) {
  if (!_currentUser) { alert('请先登录'); return; }
  var input = document.getElementById('reply-input-' + postId);
  var content = input.value.trim();
  if (!content) { alert('请输入回复内容'); return; }

  API.createReply(postId, content).then(function(data) {
    if (data.error) { alert(data.error); return; }
    renderPosts();
    setTimeout(function() {
      var contentEl = document.getElementById('content-' + postId);
      var repliesEl = document.getElementById('replies-' + postId);
      if (contentEl) contentEl.style.display = '';
      if (repliesEl) repliesEl.style.display = '';
    }, 100);
  });
}

function adminDeletePost(postId) {
  if (!_isAdmin) { alert('无管理员权限'); return; }
  if (!confirm('确认删除此帖子？')) return;
  API.deletePost(postId).then(function(data) {
    if (data.error) { alert(data.error); return; }
    renderPosts();
  });
}
