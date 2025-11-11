/*
  devtools-detector.js - 开发者工具检测模块
  检测玩家是否打开过F12开发者工具，并防止检测值被篡改
*/

(function() {
  'use strict';

  // ===== 配置常量 =====
  const DETECTION_INTERVAL = 1000; // 检测间隔（毫秒）
  const HASH_SALT = 'OITrainer_DevTools_Salt_2024'; // 哈希盐值
  
  // ===== 检测状态（使用多变量互相验证） =====
  let detectionState = {
    // 主要标记（是否检测到开发者工具）
    detected: false,
    detectedBackup1: false,
    detectedBackup2: false,
    
    // 第一次检测到的时间戳
    firstDetectedTime: 0,
    firstDetectedTimeBackup: 0,
    
    // 检测次数
    detectionCount: 0,
    detectionCountBackup: 0,
    
    // 校验哈希（初始化为null，首次计算后更新）
    checksum: null,
    checksumBackup: null,
    
    // 最后更新时间（防止回溯篡改）
    lastUpdateTime: Date.now(),
    lastUpdateTimeBackup: Date.now()
  };

  // ===== 哈希函数（简单但有效的校验） =====
  function simpleHash(str) {
    let hash = 0;
    const input = str + HASH_SALT;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ===== 计算状态的校验和 =====
  function calculateChecksum() {
    const data = `${detectionState.detected}|${detectionState.firstDetectedTime}|${detectionState.detectionCount}|${detectionState.lastUpdateTime}`;
    return simpleHash(data);
  }

  // ===== 更新检测状态 =====
  function updateDetectionState(isDetected) {
    const now = Date.now();
    
    // 验证时间戳是否合法（防止回溯）
    if (now < detectionState.lastUpdateTime - 1000) {
      console.warn('[DevTools Detector] 检测到时间回溯，可能存在篡改');
      markAsDetected(); // 时间异常，标记为检测到
      return;
    }
    
    if (isDetected && !detectionState.detected) {
      // 第一次检测到
      detectionState.detected = true;
      detectionState.detectedBackup1 = true;
      detectionState.detectedBackup2 = true;
      detectionState.firstDetectedTime = now;
      detectionState.firstDetectedTimeBackup = now;
      console.log('[DevTools Detector] 检测到开发者工具被打开');
    }
    
    if (isDetected) {
      detectionState.detectionCount++;
      detectionState.detectionCountBackup++;
    }
    
    // 更新时间戳
    detectionState.lastUpdateTime = now;
    detectionState.lastUpdateTimeBackup = now;
    
    // 计算并保存校验和
    const newChecksum = calculateChecksum();
    detectionState.checksum = newChecksum;
    detectionState.checksumBackup = newChecksum;
    
    // 保存到游戏状态
    saveToGameState();
  }

  // ===== 验证状态完整性 =====
  function verifyStateIntegrity() {
    // 首次运行时，checksum为null，不进行校验和验证
    const isFirstRun = (detectionState.checksum === null || detectionState.checksum === undefined);
    
    // 检查备份值是否一致
    if (detectionState.detected !== detectionState.detectedBackup1 ||
        detectionState.detected !== detectionState.detectedBackup2) {
      console.warn('[DevTools Detector] 检测到状态不一致，可能被篡改');
      return false;
    }
    
    if (detectionState.firstDetectedTime !== detectionState.firstDetectedTimeBackup) {
      console.warn('[DevTools Detector] 检测到时间戳不一致，可能被篡改');
      return false;
    }
    
    if (detectionState.detectionCount !== detectionState.detectionCountBackup) {
      console.warn('[DevTools Detector] 检测到计数不一致，可能被篡改');
      return false;
    }
    
    // 首次运行时跳过校验和验证
    if (isFirstRun) {
      console.log('[DevTools Detector] 首次运行，初始化校验和');
      const newChecksum = calculateChecksum();
      detectionState.checksum = newChecksum;
      detectionState.checksumBackup = newChecksum;
      return true;
    }
    
    // 验证校验和
    const expectedChecksum = calculateChecksum();
    if (detectionState.checksum !== expectedChecksum ||
        detectionState.checksumBackup !== expectedChecksum) {
      console.warn('[DevTools Detector] 检测到校验和不匹配，可能被篡改');
      console.warn('[DevTools Detector] 当前:', detectionState.checksum, '预期:', expectedChecksum);
      return false;
    }
    
    return true;
  }

  // ===== 强制标记为已检测（发现篡改时调用） =====
  function markAsDetected() {
    const now = Date.now();
    detectionState.detected = true;
    detectionState.detectedBackup1 = true;
    detectionState.detectedBackup2 = true;
    if (detectionState.firstDetectedTime === 0) {
      detectionState.firstDetectedTime = now;
      detectionState.firstDetectedTimeBackup = now;
    }
    detectionState.detectionCount = Math.max(detectionState.detectionCount, 999);
    detectionState.detectionCountBackup = detectionState.detectionCount;
    detectionState.lastUpdateTime = now;
    detectionState.lastUpdateTimeBackup = now;
    const newChecksum = calculateChecksum();
    detectionState.checksum = newChecksum;
    detectionState.checksumBackup = newChecksum;
    saveToGameState();
  }

  // ===== 方法1：检测控制台大小变化 =====
  let lastOuterWidth = window.outerWidth;
  let lastOuterHeight = window.outerHeight;
  let lastInnerWidth = window.innerWidth;
  let lastInnerHeight = window.innerHeight;

  function detectByWindowSize() {
    const widthThreshold = 160; // 宽度差异阈值
    const heightThreshold = 160; // 高度差异阈值
    
    const outerWidthDiff = Math.abs(window.outerWidth - lastOuterWidth);
    const outerHeightDiff = Math.abs(window.outerHeight - lastOuterHeight);
    const innerWidthDiff = Math.abs(window.innerWidth - lastInnerWidth);
    const innerHeightDiff = Math.abs(window.innerHeight - lastInnerHeight);
    
    // 检测窗口大小异常变化（可能是开发者工具打开）
    if ((outerWidthDiff > widthThreshold || outerHeightDiff > heightThreshold) &&
        (innerWidthDiff > widthThreshold || innerHeightDiff > heightThreshold)) {
      // 窗口大小显著变化，可能是开发者工具
      console.log('[DevTools Detector] 窗口大小变化检测触发');
      return true;
    }
    
    lastOuterWidth = window.outerWidth;
    lastOuterHeight = window.outerHeight;
    lastInnerWidth = window.innerWidth;
    lastInnerHeight = window.innerHeight;
    
    return false;
  }

  // ===== 方法1.5：检测窗口与视口的差异（更适合Firefox） =====
  function detectByViewportDiff() {
    try {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      // Firefox开发者工具通常会占用较大空间
      // 检测异常的窗口-视口差异
      if (widthDiff > 200 || heightDiff > 300) {
        console.log('[DevTools Detector] 视口差异检测触发:', widthDiff, heightDiff);
        return true;
      }
    } catch (e) {
      // 某些情况下可能无法访问这些属性
    }
    return false;
  }

  // ===== 方法2：检测console对象重写 =====
  function detectByConsole() {
    // 检测console.log是否被重写
    const consoleStr = console.log.toString();
    if (consoleStr.indexOf('native code') === -1 && consoleStr.indexOf('[Command Line API]') === -1) {
      // console被重写，可能开发者工具打开
      return false; // 这个方法不太可靠，暂时禁用
    }
    return false;
  }

  // ===== 方法3：使用debugger语句检测 =====
  let debuggerStartTime = 0;
  function detectByDebugger() {
    debuggerStartTime = Date.now();
    // 注意：这会在开发者工具打开时暂停执行
    // 我们通过检测执行时间来判断
    // 实际上这个方法会影响用户体验，暂时注释掉
    // debugger;
    const elapsed = Date.now() - debuggerStartTime;
    return elapsed > 100; // 如果执行时间超过100ms，可能是被debugger暂停
  }

  // ===== 方法4：检测DevTools打开的API =====
  function detectByDevToolsAPI() {
    // 某些浏览器提供了检测开发者工具的API
    if (window.devtools && window.devtools.open) {
      return true;
    }
    return false;
  }

  // ===== 方法5：通过元素尺寸检测（Firebug等工具） =====
  let firebugElement = null;
  function detectByElement() {
    if (!firebugElement) {
      firebugElement = document.createElement('div');
      Object.defineProperty(firebugElement, 'id', {
        get: function() {
          updateDetectionState(true);
          return 'devtools-detector';
        }
      });
    }
    
    console.log(firebugElement); // 触发getter
    console.clear(); // 清除控制台（减少干扰）
    
    return false;
  }

  // ===== 方法6：检测console.table等方法（Firefox特有） =====
  let lastConsoleCheck = Date.now();
  function detectByConsoleDirectAccess() {
    try {
      // 每5秒检查一次，避免频繁检测
      const now = Date.now();
      if (now - lastConsoleCheck < 5000) {
        return false;
      }
      lastConsoleCheck = now;

      // 创建一个对象，监听其toString被调用
      const detector = {
        toString: function() {
          updateDetectionState(true);
          return '';
        },
        valueOf: function() {
          updateDetectionState(true);
          return 0;
        }
      };

      // 在控制台输出时会触发toString
      console.log('%c', detector);
      console.clear();
    } catch (e) {
      // 忽略错误
    }
    return false;
  }

  // ===== 方法7：检测Firehose事件（Firefox devtools） =====
  function detectByFirefoxDevtools() {
    try {
      // Firefox在开发者工具打开时会暴露某些特定对象
      const isFirefox = typeof InstallTrigger !== 'undefined';
      if (isFirefox) {
        // 检测开发者工具特有的全局对象
        if (window.console && window.console.firebug) {
          console.log('[DevTools Detector] Firefox Firebug检测触发');
          return true;
        }
      }
    } catch (e) {
      // 忽略错误
    }
    return false;
  }

  // ===== 综合检测函数 =====
  function performDetection() {
    // 先验证状态完整性
    if (!verifyStateIntegrity()) {
      markAsDetected();
      return;
    }
    
    // 如果已经检测到，就不需要继续检测了（节省性能）
    if (detectionState.detected) {
      return;
    }
    
    // 执行各种检测方法
    const detected = 
      detectByWindowSize() ||
      detectByViewportDiff() ||
      detectByConsole() ||
      // detectByDebugger() || // 会影响用户体验，暂时禁用
      detectByDevToolsAPI() ||
      detectByElement() ||
      detectByConsoleDirectAccess() ||
      detectByFirefoxDevtools();
    
    if (detected) {
      updateDetectionState(true);
    }
  }

  // ===== 保存到游戏状态 =====
  function saveToGameState() {
    if (typeof window !== 'undefined' && window.game) {
      try {
        // 保存检测结果到游戏对象
        window.game.devToolsDetection = {
          detected: detectionState.detected,
          detectedBackup1: detectionState.detectedBackup1,
          detectedBackup2: detectionState.detectedBackup2,
          firstDetectedTime: detectionState.firstDetectedTime,
          firstDetectedTimeBackup: detectionState.firstDetectedTimeBackup,
          detectionCount: detectionState.detectionCount,
          detectionCountBackup: detectionState.detectionCountBackup,
          checksum: detectionState.checksum,
          checksumBackup: detectionState.checksumBackup,
          lastUpdateTime: detectionState.lastUpdateTime,
          lastUpdateTimeBackup: detectionState.lastUpdateTimeBackup
        };
        
        // 自动保存游戏（如果存在保存函数）
        if (typeof window.saveGame === 'function') {
          window.saveGame(true); // 静默保存
        }
      } catch (e) {
        console.error('[DevTools Detector] 保存到游戏状态失败:', e);
      }
    }
  }

  // ===== 从游戏状态加载 =====
  function loadFromGameState() {
    if (typeof window !== 'undefined' && window.game && window.game.devToolsDetection) {
      try {
        const saved = window.game.devToolsDetection;
        detectionState.detected = saved.detected || false;
        detectionState.detectedBackup1 = saved.detectedBackup1 || false;
        detectionState.detectedBackup2 = saved.detectedBackup2 || false;
        detectionState.firstDetectedTime = saved.firstDetectedTime || 0;
        detectionState.firstDetectedTimeBackup = saved.firstDetectedTimeBackup || 0;
        detectionState.detectionCount = saved.detectionCount || 0;
        detectionState.detectionCountBackup = saved.detectionCountBackup || 0;
        // 如果saved.checksum不存在或为空字符串，保持为null
        detectionState.checksum = (saved.checksum !== undefined && saved.checksum !== null && saved.checksum !== '') ? saved.checksum : null;
        detectionState.checksumBackup = (saved.checksumBackup !== undefined && saved.checksumBackup !== null && saved.checksumBackup !== '') ? saved.checksumBackup : null;
        detectionState.lastUpdateTime = saved.lastUpdateTime || Date.now();
        detectionState.lastUpdateTimeBackup = saved.lastUpdateTimeBackup || Date.now();
        
        console.log('[DevTools Detector] 已从游戏状态加载检测数据');
        
        // 加载后验证完整性
        // 注意：首次验证会初始化校验和，所以总是返回true
        const isValid = verifyStateIntegrity();
        if (!isValid) {
          console.warn('[DevTools Detector] 加载的数据完整性验证失败，可能被篡改');
          // 标记为检测到（但不调用markAsDetected，避免覆盖真实数据）
          detectionState.detected = true;
          detectionState.detectedBackup1 = true;
          detectionState.detectedBackup2 = true;
        }
      } catch (e) {
        console.error('[DevTools Detector] 从游戏状态加载失败:', e);
      }
    }
  }

  // ===== 获取检测结果（供外部调用） =====
  function getDetectionResult() {
    // 先尝试验证完整性（首次运行会自动初始化）
    const isValid = verifyStateIntegrity();
    
    // 如果验证失败，返回异常状态
    if (!isValid) {
      return {
        detected: true,
        tampered: true,
        firstDetectedTime: detectionState.firstDetectedTime,
        detectionCount: 999,
        message: '⚠️ 检测到数据异常',
        trustLevel: 0
      };
    }
    
    // 正常返回检测结果
    return {
      detected: detectionState.detected,
      tampered: false,
      firstDetectedTime: detectionState.firstDetectedTime,
      detectionCount: detectionState.detectionCount,
      message: detectionState.detected ? '⚠️ 检测到开发者工具' : '✓ 未检测到开发者工具',
      trustLevel: detectionState.detected ? 50 : 100
    };
  }

  // ===== 启动检测器 =====
  function startDetector() {
    console.log('[DevTools Detector] 检测器已启动');
    console.log('[DevTools Detector] 浏览器信息:', {
      userAgent: navigator.userAgent,
      isFirefox: typeof InstallTrigger !== 'undefined',
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight
    });
    
    // 从游戏状态加载之前的检测结果
    loadFromGameState();
    
    // 定期执行检测
    const intervalId = setInterval(performDetection, DETECTION_INTERVAL);
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      console.log('[DevTools Detector] 窗口大小变化');
      performDetection();
    });
    
    // 立即执行一次检测
    performDetection();
    
    // 保存interval ID以便后续清理
    window._devToolsDetectorInterval = intervalId;
  }

  // ===== 停止检测器 =====
  function stopDetector() {
    console.log('[DevTools Detector] 检测器已停止');
    // 在实际使用中，应该清除interval和事件监听器
  }

  // ===== 导出API =====
  window.DevToolsDetector = {
    start: startDetector,
    stop: stopDetector,
    getResult: getDetectionResult,
    // 内部方法（用于调试）
    _verifyIntegrity: verifyStateIntegrity,
    _getState: () => detectionState,
    _markAsDetected: markAsDetected
  };

  // ===== 自动启动（在游戏页面） =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 等待游戏对象初始化
      setTimeout(() => {
        if (window.location.pathname.includes('game.html')) {
          startDetector();
        }
      }, 100);
    });
  } else {
    // DOM已经加载完成
    setTimeout(() => {
      if (window.location.pathname.includes('game.html')) {
        startDetector();
      }
    }, 100);
  }

})();
