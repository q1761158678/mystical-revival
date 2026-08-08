/* ===========================
   神秘复苏·总部 - 主JS
   =========================== */

document.addEventListener('DOMContentLoaded', function() {
  // 移动端菜单切换
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.navbar-nav');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });
  }

  // 高亮当前页面导航
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav a').forEach(function(link) {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // 隐藏管理员入口：连续点击logo图标5次
  var logoIcon = document.querySelector('.logo-icon');
  if (logoIcon) {
    var clickCount = 0;
    var clickTimer = null;
    logoIcon.style.cursor = 'pointer';
    logoIcon.addEventListener('click', function() {
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(function() { clickCount = 0; }, 3000);
      if (clickCount >= 5) {
        clickCount = 0;
        var nav = document.querySelector('.navbar-nav');
        if (nav && !nav.querySelector('.admin-link')) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = 'admin.html';
          a.className = 'admin-link';
          a.textContent = '管理';
          a.style.color = 'var(--accent-amber)';
          li.appendChild(a);
          nav.appendChild(li);
        }
      }
    });
  }

  // 卡片淡入动画
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card').forEach(function(card) {
    observer.observe(card);
  });

  // 终端打字机效果（如果有 .typewriter 元素）
  document.querySelectorAll('.typewriter').forEach(function(el) {
    const text = el.textContent;
    el.textContent = '';
    el.style.borderRight = '2px solid var(--accent-red)';
    let i = 0;
    function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, 40);
      } else {
        el.style.borderRight = 'none';
      }
    }
    setTimeout(type, 500);
  });
});
