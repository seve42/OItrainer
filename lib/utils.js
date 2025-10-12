/* utils.js - 随机/辅助/名字生成函数 */
function uniform(min, max){ return min + Math.random()*(max-min); }
function uniformInt(min, max){ return Math.floor(min + Math.random()*(max - min + 1)); }
function normal(mean=0, stddev=1){
  let u=0,v=0;
  while(u===0) u=Math.random();
  while(v===0) v=Math.random();
  let z=Math.sqrt(-2.0*Math.log(u))*Math.cos(2*Math.PI*v);
  return z*stddev + mean;
}
function clamp(val,min,max){ return Math.max(min,Math.min(max,val)); }
function clampInt(v,min,max){ return Math.max(min,Math.min(max,Math.round(v))); }
function sigmoid(x){ return 1.0 / (1.0 + Math.exp(-x)); }
function getLetterGrade(val) {
  // 更细化的字母等级，包含带+的中间值。阈值略微上调以匹配数值显示
  // 等级（从低到高）： E, E+, D, D+, C, C+, B, B+, A, A+, S, S+, SS, SS+, SSS
  if (val < 8) return 'E';
  if (val < 16) return 'E+';
  if (val < 30) return 'D';
  if (val < 40) return 'D+';
  if (val < 50) return 'C';
  if (val < 60) return 'C+';
  if (val < 68) return 'B';
  if (val < 76) return 'B+';
  if (val < 82) return 'A';
  if (val < 88) return 'A+';
  if (val < 92) return 'S';
  if (val < 96) return 'S+';
  if (val < 99) return 'SS';
  if (val < 100) return 'SS+';
  // 保持 100 为 SSS，且在 100 之后扩展为不封顶的 U 级别：U1e ... U1sss, U2e ...
  const n = Math.floor(val);
  if (n === 100) return 'SSS';
  if (n > 100) {
    const subs = ['e','e+','d','d+','c','c+','b','b+','a','a+','s','s+','ss','ss+','sss'];
    // 101 -> U1e, 102 -> U1e+, ... 115 -> U1sss, 116 -> U2e, ...
    const offset = n - 101; // 0-based offset after 100
    const tier = Math.floor(offset / subs.length) + 1;
    const idx = offset % subs.length;
    return `U${tier}${subs[idx]}`;
  }
  return 'SSS';
}

/* 名字生成 */
const surnames = [
  "张","李","王","刘","陈","杨","黄","赵","周","吴",
  "徐","孙","马","朱","胡","郭","何","林","罗","高",
  "梁","宋","郑","谢","韩","唐","冯","于","董","萧","曹",
  "潘","袁","许","曾","蒋","蔡","余","杜","叶","程",
  "苏","魏","吕","丁","任","沈","姚","卢","姜","崔"
];

const namesPool = [
  /* pool omitted for brevity - copied from original script.js at time of split */
  "伟","刚","勇","毅","俊","峰","强","军","平","保",
  "东","文","辉","力","明","永","健","世","广","志",
  "义","兴","良","海","山","仁","波","宁","贵","福",
  "生","龙","元","全","国","胜","学","祥","才","发",
  "武","新","利","清","飞","彬","富","顺","信","杰",
  "涛","昌","成","康","星","光","天","达","安","岩",
  "中","茂","进","林","有","坚","和","彪","博","诚",
  "先","敬","震","振","壮","会","思","群","豪","心",
  "邦","承","乐","绍","功","松","善","厚","庆","民",
  "友","裕","河","哲","江","超","浩","亮","政","谦",
  "亨","奇","固","之","翰","朗","伯","宏","言","鸣",
  "朋","斌","梁","栋","维","启","克","伦","翔","旭",
  "鹏","泽","晨","辰","士","建","家","致","树","炎",
  "德","行","时","泰","盛","雄","琛","钧","冠","策",
  "腾","楠","榕","岳","然","煜","鑫","骏","宸","珩",
  "骁","恒","博","尧","奕","澄","峻","逸","尘","晟",
  "烨","翎","晗","卓","麟","皓","煦","栩","瀚","燊",
  "烁","霖","屹","骞","嵩","澜","漾","渊","峥","祺",
  "淞","珺","珞","瑜","瑾","琨","铠","铭","锴","锋",
  "铎","锐","剑","戎","霆","震","骢","骥","昊","煊",
  "炜","昱","曜","桦","槐","栋","森","澔","淳","湛",
  "涵","灿","焱","燎","炎","尧","哲","航","睿","凯",
  "琪","澔","玮","珂","洺","源","湧","鸣","俊","煜",
  "翰","云","哲","诚","邦","尘","恒","鸣","渊","森",
  "桓","泽","弘","川","渝","岳","帆","栋","弈","奇",
  "锐","琪","嵩","铠","恺","诚","轩","峰","晟","远",
  "铭","凯","炜","煜","杰","烽","志","朗","逸","骞",
  "宸","烨","骁","尧","腾","珩","霖","泽","航","瑞",
  "煊","岳","麟","博","晗","昀","嘉","澄","桦","骅",
  "澜","然","尘","奕","翰","栩","祺","瑜","珺","骏",
  "峻","晟","尧","钧","骋","锐","承","炎","帆","弘"
];

function generateName(){
  let s = surnames[uniformInt(0,surnames.length-1)];
  let n = namesPool[uniformInt(0,namesPool.length-1)];
  if(Math.random()>0.4) n += namesPool[uniformInt(0,namesPool.length-1)];
  return s + n;
}
