// Firebase 連線設定（觀眾端 index.html 與投影端 stage.html 共用）
//
// 2026/08/13 起共用 qqqqaaaa 專案（與 QQQQAAAA 彈幕工具同一個 Firebase 專案、
// 同一個 Realtime Database）。加薪條資料放獨立的 raise/ 頂層節點，與彈幕的
// rooms/ 完全隔離。security rules 以 database.rules.json 為全專案唯一真相，
// 修改後必須「整份」貼進 Firebase 主控台，不能只貼半份。
//
// 注意：apiKey 等值「不是密碼」，Firebase 網頁應用本來就會公開它們，
// 安全性是靠 database.rules.json 的規則把關，不是靠藏金鑰。
export const firebaseConfig = {
  apiKey: "AIzaSyAYV1-M1BbvJwjk8i9NDPY2nN6Dty-P6Z8",
  authDomain: "qqqqaaaa.firebaseapp.com",
  databaseURL: "https://qqqqaaaa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "qqqqaaaa",
};

// 觀眾端不載 SDK，只用這個 REST 端點做一次性讀寫（免費方案不佔常駐連線）
export const REST_BASE = firebaseConfig.databaseURL.replace(/\/+$/, "");

// 尚未填入真實金鑰時，兩個頁面會顯示錯誤橫幅而不是白畫面
export const isPlaceholder = Object.values(firebaseConfig).some((v) => v.includes("YOUR_") || v === "PASTE_HERE");
