// Firebase 連線設定（觀眾端 index.html 與投影端 stage.html 共用）
//
// 2026/08/28 起改用獨立的 raise-game 專案（Jesse 個人帳號、Spark 免費方案）。
// 先前共用 qqqqaaaa 專案的架構已退役：QQQQAAAA 彈幕的規則獨立演進，兩個工具
// 分開專案才不會互相干擾。security rules 以 database.rules.json 為本專案
// 唯一真相，修改後必須「整份」貼進 Firebase 主控台，不能只貼半份。
//
// 注意：apiKey 等值「不是密碼」，Firebase 網頁應用本來就會公開它們，
// 安全性是靠 database.rules.json 的規則把關，不是靠藏金鑰。
export const firebaseConfig = {
  apiKey: "AIzaSyDZSW8iQTa2cEGW76ZSZOqnVKefrkY0Pls",
  authDomain: "raise-game.firebaseapp.com",
  databaseURL: "https://raise-game-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "raise-game",
};

// 觀眾端不載 SDK，只用這個 REST 端點做一次性讀寫（免費方案不佔常駐連線）
export const REST_BASE = firebaseConfig.databaseURL.replace(/\/+$/, "");

// 尚未填入真實金鑰時，兩個頁面會顯示錯誤橫幅而不是白畫面
export const isPlaceholder = Object.values(firebaseConfig).some((v) => v.includes("YOUR_") || v === "PASTE_HERE");
