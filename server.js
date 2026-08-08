/* ============================================================
   神秘复苏·总部 — 后端服务器 (PostgreSQL 版)
   Express + Socket.io + pg
   ============================================================ */

const express = require('express');
const session = require('express-session');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');

// ==================== 数据库连接 ====================
// 有 DATABASE_URL 用 PostgreSQL（云端），否则用 node:sqlite（本地开发）
let pool = null;
let sqliteDb = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('使用 PostgreSQL (云端模式)');
} else {
  console.log('未设置 DATABASE_URL，尝试使用本地 SQLite');
  try {
    const Database = require('node:sqlite').DatabaseSync;
    sqliteDb = new Database(path.join(__dirname, 'data.db'));
    sqliteDb.exec('PRAGMA journal_mode = WAL');
  } catch(e) {
    console.log('node:sqlite 不可用');
  }
}

// ==================== 数据库抽象层 ====================
// PostgreSQL 模式（云端）或 SQLite 模式（本地开发）
const db = {
  async exec(sql) {
    if (pool) {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
      for (const stmt of statements) {
        try { await pool.query(stmt); } catch(e) { /* 忽略已存在错误 */ }
      }
    } else if (sqliteDb) {
      sqliteDb.exec(sql);
    }
  },

  async run(sql, params) {
    if (pool) {
      let pgSql = sql, idx = 0;
      pgSql = pgSql.replace(/\?/g, function() { idx++; return '$' + idx; });
      const res = await pool.query(pgSql, params || []);
      return { lastInsertRowid: res.rows[0] ? res.rows[0].id : null, changes: res.rowCount };
    } else if (sqliteDb) {
      const stmt = sqliteDb.prepare(sql);
      const info = params ? stmt.run(...params) : stmt.run();
      return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
    }
    return { lastInsertRowid: null, changes: 0 };
  },

  async get(sql, params) {
    if (pool) {
      let pgSql = sql, idx = 0;
      pgSql = pgSql.replace(/\?/g, function() { idx++; return '$' + idx; });
      const res = await pool.query(pgSql, params || []);
      return res.rows[0] || null;
    } else if (sqliteDb) {
      const stmt = sqliteDb.prepare(sql);
      return params ? stmt.get(...params) : stmt.get();
    }
    return null;
  },

  async all(sql, params) {
    if (pool) {
      let pgSql = sql, idx = 0;
      pgSql = pgSql.replace(/\?/g, function() { idx++; return '$' + idx; });
      const res = await pool.query(pgSql, params || []);
      return res.rows;
    } else if (sqliteDb) {
      const stmt = sqliteDb.prepare(sql);
      return params ? stmt.all(...params) : stmt.all();
    }
    return [];
  }
};

// ==================== 厉鬼数据库 ====================
const GHOSTS = [
  { name:'鬼眼',level:'S',type:'鬼域型',ability:'额间开启鬼眼，注视目标触发死亡。十层递进鬼域：空间瞬移、制造幻象、窥视隐藏灵异、融合鬼火灼烧、空间放逐、时间静止禁锢、自身重启抵消死亡、大范围区域重启、接引过去/未来分身、终极规则级压制',cost:'鬼眼开启时双目充血红肿，频繁使用导致视力永久损伤；多鬼拼图导致鬼化进程持续加速',desc:'杨间的本命核心厉鬼。十层鬼域从空间操控到规则级压制，几乎涵盖所有灵异类型。' },
  { name:'无头鬼影',level:'A',type:'近战压制型',ability:'释放漆黑无形的鬼手，强制压制、抓取、封印厉鬼；鬼手可延伸、穿透障碍物；无头本体可隐匿身形潜行',cost:'使用后手臂出现黑色纹路，逐渐向全身蔓延',desc:'杨间最常用的近战压制手段。鬼手可穿透一切物理防御直接压制厉鬼核心。' },
  { name:'替死鬼',level:'S',type:'因果型',ability:'将一切伤害与死亡转移至他人身上，规避致命伤害',cost:'每次转移需要替死对象，且替死对象会出现"命运消耗"',desc:'叶真驾驭的因果级厉鬼。近乎无解的保命能力。' },
  { name:'遗忘鬼',level:'S',type:'概念型',ability:'所有人都会忘记你的存在。可抹除记忆、抹除厉鬼杀人规则、忘掉自身伤痛死亡诅咒寿命损耗',cost:'特性导致全世界几乎没人能长久记住你的样貌信息，永恒的孤独',desc:'李乐平的核心厉鬼。概念级能力——遗忘一切。' },
  { name:'饿死鬼',level:'S',type:'吞噬成长型',ability:'可吞噬一切灵异，吞噬厉鬼后获得对方能力，无限成长',cost:'吞噬数量越多越难控制',desc:'王察灵掌控的厉鬼。无限成长的吞噬型。' },
  { name:'双生鬼脸',level:'A',type:'双效攻击型',ability:'笑脸笑声杀人，哭脸哭声杀人；可切换"死机"状态免疫一切厉鬼攻击',cost:'死机时无法行动，频繁切换导致精神分裂风险',desc:'童倩驾驭的双生鬼脸。攻击方式直接致命。' },
  { name:'鬼湖',level:'S',type:'封印水域型',ability:'召唤大范围灵异水域，被拉入鬼湖的目标将困于湖底',cost:'使用后精神恍惚，产生溺水窒息幻觉',desc:'杨间驾驭的六鬼之一。极为强大的封印型厉鬼。' },
  { name:'鬼梦',level:'A',type:'梦境型',ability:'入侵所有人梦境，梦中击杀即可杀死现实本体',cost:'使用后自身也会陷入困倦',desc:'杨间驾驭的六鬼之一。梦境击杀是极为罕见的跨维度攻击方式。' },
  { name:'许愿鬼',level:'S',type:'因果规则型',ability:'愿望必定实现——因果级许愿、凭空造物、远程杀人、复活逝者',cost:'每个愿望附带沉重、致命的等价代价',desc:'杨间驾驭的六鬼之一。最可怕的规则型厉鬼。' },
  { name:'鬼剪刀',level:'A',type:'因果刺杀型',ability:'依靠姓名、照片锁定目标，无视距离进行斩首攻击',cost:'使用后手腕出现剪切状伤口，持续流血',desc:'杨间驾驭的六鬼之一。因果级锁定刺杀。' },
  { name:'鬼画',level:'A',type:'空间囚禁型',ability:'杀人规则为"回忆画作就会被杀死"；可将一切厉鬼与活人拉入画内永久囚禁',cost:'自身也不能回忆画作内容',desc:'何月莲驾驭的厉鬼。画中世界是极为强大的永久封印手段。' },
  { name:'纸人鬼',level:'B',type:'分身军团型',ability:'制造海量纸人分身，分身拥有战斗力；纸人可充当替命傀儡',cost:'使用后手指皮肤干燥皲裂脱皮',desc:'柳三驾驭的厉鬼。纸人军团配合替命傀儡，几乎不死不灭。' },
  { name:'鬼血压',level:'A',type:'大范围压制型',ability:'释放灵异血液大范围压制所有厉鬼；死后血液凝聚大型血池，永久压制整片区域灵异',cost:'压制越强自身鬼化越快，以命换力',desc:'严力驾驭的厉鬼。大范围压制能力极强。' },
  { name:'坟土鬼',level:'A',type:'封印掩埋型',ability:'操控坟墓泥土掩埋封印厉鬼',cost:'使用后身体沉重，皮肤灰败如泥土',desc:'冯全驾驭的双鬼之一。坟土封印是极为可靠的收容手段。' },
  { name:'鬼雾鬼',level:'A',type:'领域侵蚀型',ability:'释放大范围迷雾领域，迷惑视线、侵蚀肉身',cost:'与坟土鬼互相冲突侵蚀，鬼化风险极高',desc:'冯全驾驭的双鬼之一。大范围迷雾是优秀的支援型领域。' },
  { name:'梦游鬼',level:'B',type:'夜间强化型',ability:'夜间大幅强化身体素质与灵异抗性，夜间基本无敌',cost:'白天能力大幅削弱，出现嗜睡症状',desc:'李乐平驾驭的四鬼之一。夜间无敌的强化型厉鬼。' },
  { name:'找人鬼',level:'B',type:'定位追踪型',ability:'远距离定位所有目标的位置，无视空间距离与物理遮蔽',cost:'使用后出现持续性头痛',desc:'李乐平驾驭的四鬼之一。战术价值极高的辅助型厉鬼。' },
  { name:'鬼烟',level:'B',type:'禁锢灼烧型',ability:'释放黑色灵异烟雾，禁锢、灼烧敌人，同时可防御攻击',cost:'使用后呼吸道灼痛，持续咳嗽',desc:'李乐平驾驭的四鬼之一。攻防一体的烟雾型厉鬼。' },
  { name:'预知鬼',level:'B',type:'预知未来型',ability:'可预知10分钟左右的未来',cost:'频繁使用会导致精神疲劳与时间感知错乱',desc:'熊文文驾驭的厉鬼。在灵异战斗中足以规避致命危险。' },
  { name:'鬼火',level:'B',type:'灼烧压制型',ability:'释放碧绿色鬼火灼烧、困住、压制厉鬼',cost:'使用后体温异常，手掌持续灼热',desc:'李军驾驭的厉鬼。稳定可靠的压制型能力。' }
];

const CODENAMES = ['夜游神','鬼眼','画皮','纸人','鬼湖','鬼梦','鬼火','鬼烟','遗忘者','替死者','饿鬼','扭曲','血池','坟土','鬼雾','预知','招魂','画中','鬼剪','鬼手','鬼钟','幽灵','黎明','黄昏','寒霜','惊雷','孤月','残阳','深渊'];

// ==================== 种子数据 ====================
async function seedData() {
  // 根据数据库类型使用不同的自增列语法
  var autoInc = pool ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  // 建表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      account TEXT PRIMARY KEY, password TEXT NOT NULL, codename TEXT NOT NULL,
      gender TEXT DEFAULT '未知', branch TEXT DEFAULT '',
      ghost_name TEXT NOT NULL, ghost_level TEXT NOT NULL, ghost_type TEXT NOT NULL,
      ghost_ability TEXT NOT NULL, ghost_cost TEXT NOT NULL, ghost_desc TEXT NOT NULL,
      gc_id TEXT NOT NULL, controller_level TEXT NOT NULL, register_date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY, account TEXT NOT NULL, author TEXT NOT NULL,
      ghost_name TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS replies (
      id ${autoInc}, post_id TEXT NOT NULL, account TEXT NOT NULL,
      author TEXT NOT NULL, ghost_name TEXT NOT NULL, content TEXT NOT NULL, timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, level TEXT NOT NULL, title TEXT NOT NULL, location TEXT NOT NULL,
      date TEXT NOT NULL, casualties TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL,
      description TEXT NOT NULL, author TEXT NOT NULL, is_user_created INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id ${autoInc}, type TEXT NOT NULL DEFAULT 'chat',
      account TEXT, author TEXT, ghost_name TEXT, content TEXT NOT NULL, timestamp TEXT NOT NULL, date TEXT NOT NULL
    )
  `);

  // 事件种子
  var eventCount = (await db.get('SELECT COUNT(*) as c FROM events'))?.c || 0;
  if (eventCount === 0) {
    var seedEvents = [
      ['EV-2026-0817','S','黄冈村诡域事件','██省黄冈村','2026-07-14','23人遇难 / 7人失踪','诡域 · 封闭型','收容中','黄冈村全村在一场浓雾后与外界失联。搜救队进入后发现整个村庄已被转化为诡域——村内时间流速异常，雾中存在不明实体。已派遣冯全以鬼雾鬼进行领域对抗、何月莲以鬼画尝试拉入画中封印，目前诡域范围已初步控制，但核心区域仍未突破。\n\n据幸存者描述，浓雾中出现了一个"不断重复同一天"的现象。所有进入诡域的普通人员均在72小时内精神崩溃。杨间曾以鬼眼第六层"时间静止"尝试破解时间循环，但诡域核心疑似存在多只厉鬼共生状态。收容措施 ████████，预计完全收容需要 ███ 天。','总部',0],
      ['EV-2026-0731','A','地铁十三号线灵异事件','██市地铁十三号线','2026-07-28','5人遇难 / 12人精神受损','厉鬼 · 附体型','处理中','末班地铁列车在驶过████站后消失，于次日清晨重新出现在终点站。车上乘客均陷入昏迷，其中5人已确认死亡。监控显示，列车在消失区间内出现了异常停靠——一个不存在的站台。\n\n死亡的5名乘客面容扭曲，似乎在死前看到了极度恐怖的景象。已确认该厉鬼具有空间穿梭能力。李乐平以找人鬼已定位厉鬼本体位置，目前地铁线路已暂停运营，收容作业进行中。','总部',0],
      ['EV-2026-0612','A','旧照片中的死者','██市████小区','2026-06-08','3人遇难','厉鬼 · 介质型','已收容','一名居民在家中整理旧物时发现一张年代不明的黑白照片，照片中有一个模糊的人影。此后，接触过该照片的三名家庭成员相继在72小时内死亡，死因均为"心脏骤停"，但面部表情极度恐惧。\n\n照片具有时间锁定能力。已由何月莲以鬼画将照片拉入画中世界永久囚禁，事件已结案。','总部',0],
      ['EV-2026-0503','B','废弃医院的笑声','██市██区废弃██医院','2026-04-29','1人受伤','灵异现象 · 声音型','已收容','附近居民频繁在夜间听到废弃医院内传出笑声。经调查确认该声音源于一种低级灵异现象——由曾经在医院去世的一名患者残留的精神烙印所致。\n\n已由李军以鬼火进行净化处理，现象消失。','总部',0],
      ['EV-2026-0418','B','镜子中的陌生人','██省████市','2026-04-15','2人失踪','厉鬼 · 镜像型','处理中','多名居民反映在照镜子时，镜中倒影的动作与本人不同步。已有两名居民在长时间注视镜子后失踪，现场仅留下破碎的镜片。\n\n该厉鬼疑似通过反射介质进行空间转移。目前已封锁涉事区域，柳三以纸人分身进行地毯式搜索，收容作业正在由第三编队执行。','总部',0],
      ['EV-2026-0307','C','深夜电梯','██市████写字楼','2026-03-05','无','灵异现象 · 空间型','已收容','写字楼电梯在深夜会自动运行至不存在的"第十八层"。多名加班员工反映电梯门打开后看到一条漆黑的走廊，尽头有微弱的光源。尚未有人员进入该空间。\n\n经确认该现象为一种低强度的空间扭曲灵异现象。已使用收容装置稳定电梯空间，现象消失。','总部',0],
      ['EV-2026-0214','C','无人接听的电话','██省多个城市','2026-02-10','无','灵异现象 · 电子型','已收容','大量居民反映在凌晨2-4点接到未知号码来电，接听后只能听到持续的呼吸声。该现象为电子设备被微弱灵异能量干扰所致。\n\n已在通信网络中部署灵能过滤装置，异常来电已消除。','总部',0]
    ];
    for (var e of seedEvents) {
      await db.run('INSERT INTO events (id,level,title,location,date,casualties,type,status,description,author,is_user_created) VALUES (?,?,?,?,?,?,?,?,?,?,?)', e);
    }
  }

  // 论坛种子
  var postCount = (await db.get('SELECT COUNT(*) as c FROM posts'))?.c || 0;
  if (postCount === 0) {
    var seedPosts = [
      ['seed-1','叶真','替死鬼','关于替死鬼伤害转移机制的研究笔记','各位同僚好，我是叶真。最近对替死鬼的能力做了一些测试：\n\n1. 替死鬼的伤害转移并非无限制——每次转移需要一个"替死对象"。\n2. 转移的"伤害"不仅包括物理伤害，还包括灵异伤害、诅咒甚至鬼化侵蚀。\n3. 连续使用替死鬼后，替死对象会出现"命运消耗"现象——运气变差、机能下降、寿命缩短。\n\n扭曲长剑可以斩碎灵异本身，但对概念级厉鬼效果有限。','2026-08-07 14:23'],
      ['seed-2','杨间','鬼眼','鬼眼鬼域第七层"自身重启"的使用心得与风险警告','鬼域第七层"自身重启"是最危险的保命手段：\n\n1. 第七层重启会将肉身重置到受伤前的状态，可以抵消死亡伤害。但重启后身体会出现虚弱期。\n2. 重启过程中意识会短暂消失，如果在此期间被攻击，可能直接导致真正的死亡。\n3. 重启会加速鬼化进程。每次使用后，鬼眼的"自主意识"都会增强一分。\n\n许愿鬼的使用需格外谨慎——愿望必定实现，但代价必定致命。','2026-08-06 09:15'],
      ['seed-3','王察灵','饿死鬼','关于饿死鬼吞噬成长性的阶段性报告','经科研技术部配合，对饿死鬼的吞噬能力进行了阶段性评估：\n\n1. 饿死鬼可以吞噬一切灵异，包括厉鬼的核心规则。吞噬后可获得对方的部分能力。\n2. 吞噬数量越多，控制难度呈指数级增长。\n3. 吞噬S级厉鬼的风险极高。\n\n因为我本体是普通人，不存在鬼化侵蚀风险。但短板是肉身脆弱。','2026-08-05 10:00'],
      ['seed-4','李乐平','遗忘鬼','如果你们看到了这个帖子，请回复','我又忘了自己上次发帖是什么时候了。\n\n遗忘鬼的特性导致几乎没人能长久记住我的样貌和信息。每次执行任务回来，同事们都问"你是新来的？"。\n\n但是遗忘鬼确实是最强的保命能力。近乎无解。\n\n如果你看到了这个帖子，请回复。让我知道有人记得我。','2026-08-04 22:30']
    ];
    for (var p of seedPosts) {
      await db.run('INSERT INTO posts (id,account,author,ghost_name,title,content,timestamp) VALUES (?,?,?,?,?,?,?)', [p[0],'system',p[1],p[2],p[3],p[4],p[5]]);
    }

    var seedReplies = [
      ['seed-1','system','柳三','纸人鬼','叶真前辈，替死鬼的转移范围具体是多少？用纸人分身做替死对象是否可行？','2026-08-07 15:01'],
      ['seed-1','system','李乐平','遗忘鬼','……我又忘了自己上次发帖是什么时候了。','2026-08-07 16:30'],
      ['seed-2','system','王察灵','爷爷厉鬼','杨间说得对。我虽然驾驭五只厉鬼，但本体是普通人，靠血脉驱使不存在鬼化风险。','2026-08-06 11:42'],
      ['seed-2','system','童倩','双生鬼脸','补充：双生鬼脸的死机状态可以免疫厉鬼攻击，代价是无法开启鬼域。','2026-08-06 14:20'],
      ['seed-3','system','冯全','坟土鬼','王队长你的处境让人羡慕。我体内坟土鬼和鬼雾鬼互相冲突侵蚀，不知道还能撑多久。','2026-08-05 12:15'],
      ['seed-3','system','严力','鬼血压','鬼血压每次使用都在以命换力。大家保重。','2026-08-05 13:40'],
      ['seed-4','system','杨间','鬼眼','乐平，我记得你。鬼眼可以看穿一切，包括被遗忘的事物。保重。','2026-08-04 23:15'],
      ['seed-4','system','张羡光','鬼邮局','夜游神，桃花源计划的档案里有你的记录。','2026-08-05 08:00']
    ];
    for (var r of seedReplies) {
      await db.run('INSERT INTO replies (post_id,account,author,ghost_name,content,timestamp) VALUES (?,?,?,?,?,?)', r);
    }
  }
}

// ==================== 工具函数 ====================
function getTimestamp() {
  var d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
}
function getDateStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function getFullTimestamp() { return getDateStr() + ' ' + getTimestamp(); }

// ==================== Express 应用 ====================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { maxHttpBufferSize: 1e6 });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ms-revival-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));

// ==================== 中间件 ====================
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(403).json({ error: '无管理员权限' });
  next();
}

// ==================== 认证 API ====================
app.post('/api/register', async function(req, res) {
  try {
    var { account, password, codename, gender, branch } = req.body;
    if (!account || account.length < 3) return res.json({ error: '账号至少需要3个字符' });
    if (!/^[a-zA-Z0-9_]+$/.test(account)) return res.json({ error: '账号只能包含字母、数字和下划线' });
    if (!password || password.length < 6) return res.json({ error: '密码至少需要6位' });

    var existing = await db.get('SELECT account FROM users WHERE account = ?', [account]);
    if (existing) return res.json({ error: '该账号已被注册' });

    var ghost = GHOSTS[Math.floor(Math.random() * GHOSTS.length)];
    if (!codename) codename = CODENAMES[Math.floor(Math.random() * CODENAMES.length)];
    var gcId = 'GC-' + String(Math.floor(Math.random() * 9000) + 1000);
    var controllerLevel = 'D级驭诡者';
    if (ghost.level === 'S') controllerLevel = 'S级驭诡者';
    else if (ghost.level === 'A') controllerLevel = 'A级驭诡者';
    else if (ghost.level === 'B') controllerLevel = 'B级驭诡者';
    else if (ghost.level === 'C') controllerLevel = 'C级驭诡者';

    await db.run('INSERT INTO users (account,password,codename,gender,branch,ghost_name,ghost_level,ghost_type,ghost_ability,ghost_cost,ghost_desc,gc_id,controller_level,register_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [account, password, codename, gender || '未知', branch || '', ghost.name, ghost.level, ghost.type, ghost.ability, ghost.cost, ghost.desc, gcId, controllerLevel, getDateStr()]);

    req.session.user = { account: account };
    res.json({ account, codename, gender: gender||'未知', branch: branch||'', ghost, gcId, controllerLevel, registerDate: getDateStr() });
  } catch(e) { res.json({ error: '服务器错误: ' + e.message }); }
});

app.post('/api/login', async function(req, res) {
  try {
    var { account, password } = req.body;
    if (!account || !password) return res.json({ error: '请输入账号和密码' });
    var user = await db.get('SELECT * FROM users WHERE account = ? AND password = ?', [account, password]);
    if (!user) return res.json({ error: '账号或密码错误' });
    req.session.user = { account: user.account };
    res.json({
      account: user.account, codename: user.codename, gender: user.gender, branch: user.branch,
      ghost: { name: user.ghost_name, level: user.ghost_level, type: user.ghost_type, ability: user.ghost_ability, cost: user.ghost_cost, desc: user.ghost_desc },
      gcId: user.gc_id, controllerLevel: user.controller_level, registerDate: user.register_date
    });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

app.post('/api/logout', function(req, res) {
  delete req.session.user; delete req.session.admin;
  res.json({ ok: true });
});

app.get('/api/user', async function(req, res) {
  try {
    if (!req.session.user) return res.json({ user: null, admin: !!req.session.admin });
    var u = await db.get('SELECT * FROM users WHERE account = ?', [req.session.user.account]);
    if (!u) return res.json({ user: null, admin: !!req.session.admin });
    res.json({
      user: { account: u.account, codename: u.codename, gender: u.gender, branch: u.branch,
        ghost: { name: u.ghost_name, level: u.ghost_level, type: u.ghost_type, ability: u.ghost_ability, cost: u.ghost_cost, desc: u.ghost_desc },
        gcId: u.gc_id, controllerLevel: u.controller_level, registerDate: u.register_date },
      admin: !!req.session.admin
    });
  } catch(e) { res.json({ user: null, admin: false }); }
});

app.post('/api/admin/login', function(req, res) {
  if (req.body.password !== 'qwerty123456') return res.json({ error: '密码错误' });
  req.session.admin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', function(req, res) {
  delete req.session.admin;
  res.json({ ok: true });
});

// ==================== 论坛 API ====================
app.get('/api/posts', async function(req, res) {
  try {
    var posts = await db.all('SELECT * FROM posts ORDER BY rowid DESC');
    if (!posts || posts.length === 0) { posts = []; }
    // PostgreSQL 没有 rowid，用 id 倒序
    posts = await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
    var replies = await db.all('SELECT * FROM replies ORDER BY id ASC');
    var result = posts.map(function(p) {
      return { id: p.id, author: p.author, ghostName: p.ghost_name, title: p.title, content: p.content, timestamp: p.timestamp, account: p.account,
        replies: (replies||[]).filter(function(r){return r.post_id===p.id;}).map(function(r){return {author:r.author,ghostName:r.ghost_name,content:r.content,timestamp:r.timestamp,account:r.account};})
      };
    });
    res.json(result);
  } catch(e) { res.json([]); }
});

app.post('/api/posts', requireLogin, async function(req, res) {
  try {
    var { title, content } = req.body;
    if (!title || !content) return res.json({ error: '标题和内容不能为空' });
    var id = 'post-' + Date.now();
    var user = await db.get('SELECT * FROM users WHERE account = ?', [req.session.user.account]);
    var ts = getFullTimestamp();
    await db.run('INSERT INTO posts (id,account,author,ghost_name,title,content,timestamp) VALUES (?,?,?,?,?,?,?)',
      [id, user.account, user.codename, user.ghost_name, title, content, ts]);
    res.json({ id, author: user.codename, ghostName: user.ghost_name, title, content, timestamp: ts, replies: [] });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

app.post('/api/posts/:id/replies', requireLogin, async function(req, res) {
  try {
    var { content } = req.body;
    if (!content) return res.json({ error: '回复内容不能为空' });
    var post = await db.get('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.json({ error: '帖子不存在' });
    var user = await db.get('SELECT * FROM users WHERE account = ?', [req.session.user.account]);
    var ts = getFullTimestamp();
    var info = await db.run('INSERT INTO replies (post_id,account,author,ghost_name,content,timestamp) VALUES (?,?,?,?,?,?)',
      [req.params.id, user.account, user.codename, user.ghost_name, content, ts]);
    res.json({ id: info.lastInsertRowid, author: user.codename, ghostName: user.ghost_name, content, timestamp: ts });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

app.delete('/api/posts/:id', requireLogin, async function(req, res) {
  try {
    var post = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.json({ error: '帖子不存在' });
    if (!req.session.admin && post.account !== req.session.user.account) return res.status(403).json({ error: '无权删除' });
    await db.run('DELETE FROM replies WHERE post_id = ?', [req.params.id]);
    await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

// ==================== 事件档案 API ====================
app.get('/api/events', async function(req, res) {
  try {
    var events = await db.all('SELECT * FROM events ORDER BY timestamp ASC');
    // 用 id 排序近似原始顺序
    events = await db.all('SELECT * FROM events ORDER BY date ASC');
    res.json((events||[]).map(function(e){
      return { id:e.id, level:e.level, title:e.title, location:e.location, date:e.date, casualties:e.casualties, type:e.type, status:e.status, description:e.description, author:e.author, isUserCreated: !!e.is_user_created };
    }));
  } catch(e) { res.json([]); }
});

app.post('/api/events', requireLogin, async function(req, res) {
  try {
    var b = req.body;
    if (!b.title || !b.location || !b.description) return res.json({ error: '标题、地点、详情不能为空' });
    var id = b.fileId || ('EV-' + getDateStr().replace(/-/g,'') + '-' + String(Math.floor(Math.random()*9000)+1000));
    var user = await db.get('SELECT codename FROM users WHERE account = ?', [req.session.user.account]);
    await db.run('INSERT INTO events (id,level,title,location,date,casualties,type,status,description,author,is_user_created) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
      [id, b.level||'B', b.title, b.location, b.date||getDateStr(), b.casualties||'无', b.type||'未分类', b.status||'处理中', b.description, user.codename]);
    res.json({ ok: true, id });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

app.put('/api/events/:id', requireLogin, async function(req, res) {
  try {
    var ev = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!ev) return res.json({ error: '档案不存在' });
    if (!ev.is_user_created) return res.json({ error: '无法编辑系统档案' });
    var b = req.body;
    await db.run('UPDATE events SET level=?,title=?,location=?,date=?,casualties=?,type=?,status=?,description=? WHERE id=?',
      [b.level||ev.level, b.title||ev.title, b.location||ev.location, b.date||ev.date, b.casualties||ev.casualties, b.type||ev.type, b.status||ev.status, b.description||ev.description, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

app.delete('/api/events/:id', requireLogin, async function(req, res) {
  try {
    var ev = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!ev) return res.json({ error: '档案不存在' });
    if (!req.session.admin) {
      if (!ev.is_user_created) return res.status(403).json({ error: '无法删除系统档案' });
      var user = await db.get('SELECT codename FROM users WHERE account = ?', [req.session.user.account]);
      if (ev.author !== user.codename) return res.status(403).json({ error: '无权删除' });
    }
    await db.run('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.json({ error: '服务器错误' }); }
});

// ==================== 聊天 API ====================
app.get('/api/chat/messages', async function(req, res) {
  try {
    var msgs = await db.all('SELECT * FROM (SELECT * FROM chat_messages ORDER BY id DESC LIMIT 200) sub ORDER BY id ASC');
    res.json((msgs||[]).map(function(m){
      return { id:m.id, type:m.type, account:m.account, author:m.author, ghostName:m.ghost_name, content:m.content, timestamp:m.timestamp, date:m.date };
    }));
  } catch(e) { res.json([]); }
});

app.delete('/api/chat/messages/:id', requireLogin, async function(req, res) {
  if (!req.session.admin) return res.status(403).json({ error: '无管理员权限' });
  await db.run('DELETE FROM chat_messages WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ==================== 管理员 API ====================
app.get('/api/admin/users', requireAdmin, async function(req, res) {
  try {
    var users = await db.all('SELECT * FROM users ORDER BY register_date ASC');
    res.json((users||[]).map(function(u){
      return { account:u.account, password:u.password, codename:u.codename, gender:u.gender, branch:u.branch,
        ghost:{name:u.ghost_name,level:u.ghost_level,type:u.ghost_type,ability:u.ghost_ability,cost:u.ghost_cost,desc:u.ghost_desc},
        gcId:u.gc_id, controllerLevel:u.controller_level, registerDate:u.register_date };
    }));
  } catch(e) { res.json([]); }
});

app.delete('/api/admin/users/:account', requireAdmin, async function(req, res) {
  await db.run('DELETE FROM users WHERE account = ?', [req.params.account]);
  res.json({ ok: true });
});

app.get('/api/admin/posts', requireAdmin, async function(req, res) {
  try {
    var posts = await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
    var replies = await db.all('SELECT * FROM replies ORDER BY id ASC');
    res.json((posts||[]).map(function(p){
      return { id:p.id, author:p.author, ghostName:p.ghost_name, title:p.title, content:p.content, timestamp:p.timestamp,
        replies:(replies||[]).filter(function(r){return r.post_id===p.id;}).map(function(r){return {author:r.author,ghostName:r.ghost_name,content:r.content,timestamp:r.timestamp};})
      };
    }));
  } catch(e) { res.json([]); }
});

app.get('/api/admin/events', requireAdmin, async function(req, res) {
  try {
    var events = await db.all('SELECT * FROM events ORDER BY date ASC');
    res.json((events||[]).map(function(e){
      return { id:e.id, level:e.level, title:e.title, location:e.location, date:e.date, casualties:e.casualties, type:e.type, status:e.status, description:e.description, author:e.author, isUserCreated: !!e.is_user_created };
    }));
  } catch(e) { res.json([]); }
});

// ==================== Socket.io 聊天 ====================
var onlineUsers = {};

io.on('connection', function(socket) {
  socket.on('chat-join', async function(account) {
    var user = await db.get('SELECT * FROM users WHERE account = ?', [account]);
    if (!user) return;
    socket.account = account;
    onlineUsers[account] = { codename: user.codename, ghostName: user.ghost_name, gcId: user.gc_id, socketId: socket.id };
    io.emit('online-users', Object.keys(onlineUsers).map(function(k){
      return { account: k, codename: onlineUsers[k].codename, ghostName: onlineUsers[k].ghostName, gcId: onlineUsers[k].gcId };
    }));
    var sysMsg = { type: 'system', content: '「' + user.codename + '」进入了聊天室', timestamp: getTimestamp(), date: getDateStr() };
    await db.run('INSERT INTO chat_messages (type,content,timestamp,date) VALUES (?,?,?,?)', ['system', sysMsg.content, sysMsg.timestamp, sysMsg.date]);
    io.emit('chat-message', sysMsg);
  });

  socket.on('chat-message', async function(data) {
    var user = await db.get('SELECT * FROM users WHERE account = ?', [socket.account]);
    if (!user) return;
    var msg = { type:'chat', account:user.account, author:user.codename, ghostName:user.ghost_name, content:data.content, timestamp:getTimestamp(), date:getDateStr() };
    var info = await db.run('INSERT INTO chat_messages (type,account,author,ghost_name,content,timestamp,date) VALUES (?,?,?,?,?,?,?)',
      [msg.type, msg.account, msg.author, msg.ghostName, msg.content, msg.timestamp, msg.date]);
    msg.id = info.lastInsertRowid;
    io.emit('chat-message', msg);
  });

  socket.on('chat-delete', async function(msgId) {
    if (!socket.handshake.session || !socket.handshake.session.admin) return;
    await db.run('DELETE FROM chat_messages WHERE id = ?', [msgId]);
    io.emit('chat-deleted', msgId);
  });

  socket.on('disconnect', async function() {
    if (socket.account && onlineUsers[socket.account]) {
      var codename = onlineUsers[socket.account].codename;
      delete onlineUsers[socket.account];
      io.emit('online-users', Object.keys(onlineUsers).map(function(k){
        return { account: k, codename: onlineUsers[k].codename, ghostName: onlineUsers[k].ghostName, gcId: onlineUsers[k].gcId };
      }));
      var sysMsg = { type:'system', content:'「' + codename + '」离开了聊天室', timestamp:getTimestamp(), date:getDateStr() };
      await db.run('INSERT INTO chat_messages (type,content,timestamp,date) VALUES (?,?,?,?)', ['system', sysMsg.content, sysMsg.timestamp, sysMsg.date]);
      io.emit('chat-message', sysMsg);
    }
  });
});

// ==================== 启动 ====================
seedData().then(function() {
  var PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, '0.0.0.0', function() {
    console.log('神秘复苏·总部 服务器已启动: http://localhost:' + PORT);
    if (process.env.DATABASE_URL) console.log('数据库: PostgreSQL (云端)');
    else console.log('数据库: SQLite (本地)');
  });
}).catch(function(e) {
  console.error('数据库初始化失败:', e.message, e.stack);
});
