/*
  chinese-convert.js - 简繁转换工具
  用于在选择香港或澳门地区时将游戏界面转换为繁体中文
*/

// 简体到繁体的常用字词映射表
const s2tMap = {
  // 常用字
  '会': '會', '学': '學', '国': '國', '为': '為', '产': '產', '从': '從', 
  '个': '個', '们': '們', '来': '來', '说': '說', '对': '對', '这': '這',
  '时': '時', '无': '無', '开': '開', '经': '經', '发': '發', '关': '關',
  '动': '動', '进': '進', '过': '過', '问': '問', '业': '業', '体': '體',
  '现': '現', '应': '應', '当': '當', '实': '實', '长': '長', '与': '與',
  '两': '兩', '变': '變', '点': '點', '头': '頭', '见': '見', '书': '書',
  '气': '氣', '队': '隊', '历': '歷', '门': '門', '听': '聽', '电': '電',
  '风': '風', '师': '師', '医': '醫', '车': '車', '东': '東', '务': '務',
  '区': '區', '义': '義', '习': '習', '认': '認', '议': '議', '记': '記',
  '让': '讓', '设': '設', '许': '許', '证': '證', '厂': '廠', '边': '邊',
  '万': '萬', '达': '達', '难': '難', '场': '場', '儿': '兒', '务': '務',
  '华': '華', '报': '報', '台': '臺', '艺': '藝', '号': '號', '几': '幾',
  '声': '聲', '处': '處', '备': '備', '战': '戰', '远': '遠', '运': '運',
  '赛': '賽', '导': '導', '协': '協', '写': '寫', '观': '觀', '轻': '輕',
  '钱': '錢', '计': '計', '斗': '鬥', '极': '極', '检': '檢', '节': '節',
  '术': '術', '环': '環', '继': '繼', '总': '總', '图': '圖', '团': '團',
  '结': '結', '条': '條', '较': '較', '营': '營', '旧': '舊', '压': '壓',
  '尽': '盡', '随': '隨', '适': '適', '单': '單', '济': '濟', '护': '護',
  '杂': '雜', '复': '複', '类': '類', '担': '擔', '岁': '歲', '拥': '擁',
  '积': '積', '绝': '絕', '际': '際', '响': '響', '农': '農', '脑': '腦',
  '专': '專', '属': '屬', '续': '續', '买': '買', '卖': '賣', '众': '眾',
  '词': '詞', '线': '線', '练': '練', '组': '組', '细': '細', '织': '織',
  '终': '終', '绍': '紹', '经': '經', '统': '統', '维': '維', '综': '綜',
  '举': '舉', '码': '碼', '传': '傳', '仅': '僅', '尔': '爾', '龄': '齡',
  '办': '辦', '怀': '懷', '态': '態', '戏': '戲', '挥': '揮', '担': '擔',
  '据': '據', '拟': '擬', '摆': '擺', '择': '擇', '换': '換', '挂': '掛',
  '览': '覽', '课': '課', '谈': '談', '调': '調', '请': '請', '费': '費',
  '质': '質', '贵': '貴', '贸': '貿', '还': '還', '连': '連', '迁': '遷',
  '选': '選', '逻': '邏', '铁': '鐵', '银': '銀', '销': '銷', '锁': '鎖',
  '锋': '鋒', '错': '錯', '键': '鍵', '镇': '鎮', '阳': '陽', '阴': '陰',
  '陈': '陳', '际': '際', '除': '除', '险': '險', '院': '院', '顾': '顧',
  '颜': '顏', '额': '額', '题': '題', '类': '類', '顶': '頂', '须': '須',
  '领': '領', '饮': '飲', '饭': '飯', '饰': '飾', '馆': '館', '验': '驗',
  '驻': '駐', '驾': '駕', '骂': '罵', '鸡': '雞', '龙': '龍',
  
  // 游戏相关词汇
  '模拟': '模擬', '训练': '訓練', '教练': '教練', '学生': '學生', '经费': '經費',
  '声誉': '聲譽', '设施': '設施', '计算机': '計算機', '资料库': '資料庫', '空调': '空調',
  '宿舍': '宿舍', '食堂': '食堂', '维护': '維護', '压力': '壓力', '压': '壓',
  '娱乐': '娛樂', '集训': '集訓', '难度': '難度', '省份': '省份', '选择': '選擇',
  '开始': '開始', '游戏': '遊戲', '结束': '結束', '确认': '確認', '取消': '取消',
  '升级': '升級', '辞职': '辭職', '思维': '思維', '编程': '編程', '心理': '心理',
  '知识': '知識', '数据结构': '資料結構', '图论': '圖論', '字符串': '字串',
  '数学': '數學', '动态规划': '動態規劃', '比赛': '比賽', '成绩': '成績',
  '奖牌': '獎牌', '奖励': '獎勵', '舒适度': '舒適度', '天气': '天氣', '温度': '溫度',
  '湿度': '濕度', '预测': '預測', '下场': '下場', '训话': '訓話', '日志': '日誌',
  '本周': '本週', '行动': '行動', '持续': '持續', '安排': '安排', '专项': '專項',
  '提高': '提高', '实力': '實力', '放松': '放鬆', '缓解': '緩解', '内部': '內部',
  '检验': '檢驗', '成果': '成果', '参加': '參加', '合适': '合適', '外出': '外出',
  '集中': '集中', '效率': '效率', '立即': '立即', '进行': '進行', '结算': '結算',
  '能力': '能力', '强': '強', '弱': '弱', '普通': '普通', '资源': '資源',
  '丰富': '豐富', '挑战': '挑戰', '人数': '人數', '更多': '更多', '机遇': '機遇',
  '带来': '帶來', '开支': '開支', '目标': '目標', '冲击': '衝擊', '入选': '入選',
  '进军': '進軍', '属性': '屬性', '基础': '基礎', '五大': '五大', '管理': '管理',
  '规划': '規劃', '系统': '系統', '增加': '增加', '导致': '導致', '退队': '退隊',
  '链': '鏈', '必须': '必須', '通过': '通過', '才能': '才能', '预览': '預覽',
  '获得': '獲得', '影响': '影響', '表现': '表現', '帮助': '幫助', '详细': '詳細',
  '查看': '查看', '今日': '今日', '挑战': '挑戰', '返回': '返回', '继续': '繼續',
  '确定': '確定', '要': '要', '将': '將', '无法': '無法', '撤销': '撤銷',
  '原因': '原因', '所有': '所有', '已': '已', '退役': '退役', '不': '不',
  '消耗': '消耗', '晋级': '晉級', '断裂': '斷裂', '自动': '自動', '存在': '存在',
  '未': '未', '处理': '處理', '事件': '事件', '卡片': '卡片', '请': '請',
  '先': '先', '再': '再', '推进': '推進', '回合': '回合', '加入': '加入',
  '退': '退', '变动': '變動', '汇总': '匯總', '无': '無', '显': '顯',
  '著': '著', '变化': '變化', '第': '第', '周': '週', '共': '共',
  '预': '預', '测': '測', '支': '支', '状态': '狀態', '资': '資',
  '料': '料', '库': '庫', '息': '息', '加': '加', '载': '載',
  '中': '中', '句': '句', '话': '話', '辞职': '辭職', '确': '確',
  '认': '認','娱乐': '娛樂', 
};

// 繁体到简体的映射（用于还原）
const t2sMap = {};
for (const s in s2tMap) {
  t2sMap[s2tMap[s]] = s;
}

/**
 * 将简体中文文本转换为繁体中文
 * @param {string} text - 简体中文文本
 * @returns {string} - 繁体中文文本
 */
function convertToTraditional(text) {
  if (typeof text !== 'string') return text;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += s2tMap[char] || char;
  }
  return result;
}

/**
 * 将繁体中文文本转换为简体中文
 * @param {string} text - 繁体中文文本
 * @returns {string} - 简体中文文本
 */
function convertToSimplified(text) {
  if (typeof text !== 'string') return text;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += t2sMap[char] || char;
  }
  return result;
}

/**
 * 转换整个DOM元素的文本内容为繁体中文
 * @param {HTMLElement} element - 要转换的DOM元素
 */
function convertElementToTraditional(element) {
  if (!element) return;
  
  // 处理文本节点
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  textNodes.forEach(textNode => {
    if (textNode.nodeValue && textNode.nodeValue.trim()) {
      textNode.nodeValue = convertToTraditional(textNode.nodeValue);
    }
  });
  
  // 处理常见的属性
  const attributesToConvert = ['placeholder', 'title', 'alt', 'value'];
  element.querySelectorAll('*').forEach(el => {
    attributesToConvert.forEach(attr => {
      if (el.hasAttribute(attr)) {
        const value = el.getAttribute(attr);
        if (value) {
          el.setAttribute(attr, convertToTraditional(value));
        }
      }
    });
  });
}

/**
 * 转换整个页面为繁体中文
 */
function convertPageToTraditional() {
  // 转换页面标题
  if (document.title) {
    document.title = convertToTraditional(document.title);
  }
  
  // 转换body内容
  if (document.body) {
    convertElementToTraditional(document.body);
  }
  
  // 标记页面已转换为繁体
  try {
    sessionStorage.setItem('oi_use_traditional_chinese', 'true');
  } catch (e) {
    console.warn('无法设置 sessionStorage:', e);
  }
}

/**
 * 检查当前是否应该使用繁体中文
 * @returns {boolean}
 */
function shouldUseTraditionalChinese() {
  try {
    return sessionStorage.getItem('oi_use_traditional_chinese') === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * 设置是否使用繁体中文
 * @param {boolean} useTraditional
 */
function setUseTraditionalChinese(useTraditional) {
  try {
    if (useTraditional) {
      sessionStorage.setItem('oi_use_traditional_chinese', 'true');
    } else {
      sessionStorage.removeItem('oi_use_traditional_chinese');
    }
  } catch (e) {
    console.warn('无法设置 sessionStorage:', e);
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.ChineseConverter = {
    convertToTraditional,
    convertToSimplified,
    convertElementToTraditional,
    convertPageToTraditional,
    shouldUseTraditionalChinese,
    setUseTraditionalChinese
  };
}
