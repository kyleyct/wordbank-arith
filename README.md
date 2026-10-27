# WordBank 算術操練（香港小學・數範疇）

本工具為定題心算及算術工作紙原型：題目固定、附答案以供自檢，排版參照 WordBank 風格（A4 尺寸、多欄排版、每頁約 40–60 題，建議完成時間約 3–5 分鐘）。

本專案**不設應用題**；幾何、度量、數據處理及代數方程亦不屬於現階段涵蓋範圍。

**English (brief):** Seed-reproducible Hong Kong primary arithmetic worksheets (Number strand only). Pure frontend (HTML + ES modules). No word problems / geometry. Live demo: [https://wordbank-arith.pages.dev/](https://wordbank-arith.pages.dev/). Grade guide: [grades.html](./grades.html).

---

## 線上演示／Live

- 工作紙產生器：https://wordbank-arith.pages.dev/
- **年級與課程對照說明**：https://wordbank-arith.pages.dev/grades.html（亦可參閱 [`grades.html`](./grades.html)）

部署方式：以 Cloudflare Pages Direct Upload 部署（非經由 Git 自動建置）。

---

## 與課程的對照

各學習單位與限制條件請參閱：

- [`edb-primary-arithmetic-map.md`](./edb-primary-arithmetic-map.md)
- [`edb-primary-arithmetic-map.json`](./edb-primary-arithmetic-map.json)
- 年級總覽（供家長及教師參考）：[`grades.html`](./grades.html)

教育局原始課程文件（繁體中文 PDF）存放於 [`sources/`](./sources/)：

| 檔名 | 說明 |
|------|------|
| `pmc2017_tc.pdf` | 《小學數學科學習內容》補充文件（2017） |
| `EN_KS1_tc.pdf` | 《小學數學課程闡釋（第一學習階段）》（2018） |
| `EN_KS2_tc.pdf` | 《小學數學課程闡釋（第二學習階段）》（2020） |

### 課程誠實說明（請勿誤標）

| 項目 | 本工具做法 |
|------|------------|
| 乘法表 | 預設為 **0–10**（對應 2N3）。另設「11–12 挑戰」模式，介面清晰標註為**課程外延展**，**並非**教育局課程規定之 12×12 內容。 |
| 10／18 以內加減 | 關卡一：10 以內；關卡二：18 以內（對應 1N2）。 |
| 退位減法 | 「100 以內」關卡嚴格劃分：1N4 階段不設退位，其後方提供退位模式。 |
| 100 與 1000 | 分屬**兩個獨立操練族**，題目不會混合於同一個生成器之內。 |
| 除法（表內） | P0 階段先提供**整除（不設餘數）**。 |
| 分數答案 | 答案以**最簡分數**為準；在課程架構允許範圍內，可接受最簡帶分數或假分數。 |

---

## 本機開啟／How to run locally

本專案為純前端架構（HTML + ES modules），須透過**本機靜態伺服器**開啟（若直接使用 `file://` 協定開啟，瀏覽器可能無法正確載入 module）。

```bash
cd wordbank-arith   # 或專案根目錄
python3 -m http.server 8765
```

於瀏覽器前往：http://127.0.0.1:8765/

1. 選擇操練族與模式  
2. 設定題數、欄數及隨機種子（相同種子可重現完全一致的工作紙）  
3. 點選「產生工作紙」  
4. 點選「列印／PDF」——工作紙為第一頁，答案頁為第二頁  

建議列印設定：A4 縱向（直向），是否列印「背景圖形」皆可。

**Smoke test（Node）：**

```bash
node js/smoke-test.mjs
```

---

## URL 查詢參數

可透過 URL 參數自訂選項（未指定之參數將維持預設值）：

`?family=&mode=&seed=&count=&columns=`

範例：`/?family=mult_div_table&mode=table_0_10&seed=20261015&count=48&columns=3`

---

## 目錄結構

```
wordbank-arith/
  index.html          # 控制列及可列印工作紙介面
  grades.html         # 操練族對應之年級／教育局課程單位說明
  js/rng.js           # 支援重現結果之隨機種子產生器
  js/math-utils.js    # 因數、最簡分數、進位／退位判斷等數學輔助函式
  js/generators.js    # 各操練族題目生成器（約 13 族）
  js/app.js           # 使用者介面互動與版面控制
  js/smoke-test.mjs   # Node 煙霧測試
  edb-primary-arithmetic-map.md
  edb-primary-arithmetic-map.json
  sources/            # 教育局課程 PDF 文件及擷取文本
```

功能特點摘要：支援以種子重現題目；A4 多欄排版列印；附自檢答案頁；採用 CSS 實現教科書風格的直式分數排版；純前端運作，無需後端伺服器支援。

---

## 已實作／延後

### 已實作（橫式心算＋可列印答案頁）

1. 10 及 18 以內的加減法與數的分解（1N1、1N2）— 按關卡劃分  
2. 乘法表（0–10）及表內整除法（2N3、2N6）；另設 11–12 **課程外延展**模式  
3. **100 以內**加減法（1N4 無退位／其後之退位模式）— 獨立操練族  
4. **1000 以內**三位數加減法（2N2、2N5）— **另一獨立操練族**，絕不與上述項目混題  
5. 因數／倍數／100 以內的質數／整除性判別（4N3、4N2）  
6. 兩數之 H.C.F.／L.C.M.（4N4）  
7. 同分母分數加減法（3N5、4N6）  
8. 異分母分數加減法（5N2，分母 ≤ 12）  
9. 分數乘除法（5N3、5N5 簡化版）  
10. 小數加減法（4N8）  
11. 分數與小數互化（6N2）  
12. 小數乘除 10 的冪（5N4／6N1 子集）  
13. 四則混合運算（含非嵌套圓括號）（3N4、4N5）

### 延後

- 直式運算工作紙、帶餘除法、百分數應用題、各類應用題、多於兩個數的 H.C.F.／L.C.M.、嵌套括號運算

---

## 品質保證（題幹去重與低資訊量題目過濾）

- **同頁題幹不重複**：生成 N 題時會以 `prompt` 進行去重；如遇重複即重新抽題，並設有重試上限；僅在必要時才會適度放寬過濾條件以湊滿題數。
- **「包含零／恆等題」**（介面核取方塊，**預設為關閉**）：關閉此選項時，系統會自動過濾訓練價值較低的題目，例如 `n − n`、`n + 0`／`0 + n`／`n − 0`、`n × 1`／`1 × n`、`n × 0`、`n ÷ 1`、`n × m ÷ m`，以及補數為 0 的數的分解題。勾選開啟後，則可針對 0 的運算與恆等性質進行專門練習（對應 1N2 等學習單位）。
- 預設導向：題目密度較高、兼具練習價值的心算工作紙。

---

## 授權

本專案倉庫目前未附帶獨立的 `LICENSE` 檔案。原始碼及相關文件之使用條件，一切以倉庫擁有者之聲明為準；歡迎作教育用途參考，如需作商業再分發，請先聯絡倉庫擁有者。

（若日後加入開源授權條款，將會在此更新。）