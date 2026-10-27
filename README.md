# WordBank 算術操練（香港小學・數範疇）

定題心算／算術工作紙原型：固定題目、自檢答案，版式接近 WordBank（A4、多欄、約 40–60 題、每頁約 3–5 分鐘）。

本專案**不包含應用題**；幾何、度量、數據處理、代數方程亦不在本階段範圍。

**English (brief):** Seed-reproducible Hong Kong primary arithmetic worksheets (Number strand only). Pure frontend (HTML + ES modules). No word problems / geometry. Live demo: [https://wordbank-arith.pages.dev/](https://wordbank-arith.pages.dev/). Grade guide: [grades.html](./grades.html).

---

## 線上演示／Live

- 工作紙產生器：https://wordbank-arith.pages.dev/
- **年級與課程對照說明頁**：https://wordbank-arith.pages.dev/grades.html（亦見 [`grades.html`](./grades.html)）

部署方式：Cloudflare Pages Direct Upload（非 Git 自動建置）。

---

## 與課程的對照

學習單位與制約見：

- [`edb-primary-arithmetic-map.md`](./edb-primary-arithmetic-map.md)
- [`edb-primary-arithmetic-map.json`](./edb-primary-arithmetic-map.json)
- 年級一覽（家長／教師向）：[`grades.html`](./grades.html)

原始教育局文件（繁體 PDF）置於 [`sources/`](./sources/)：

| 檔名 | 說明 |
|------|------|
| `pmc2017_tc.pdf` | 《小學數學科學習內容》補充文件（2017） |
| `EN_KS1_tc.pdf` | 《小學數學課程闡釋（第一學習階段）》（2018） |
| `EN_KS2_tc.pdf` | 《小學數學課程闡釋（第二學習階段）》（2020） |

### 課程誠實說明（請勿誤標）

| 項目 | 本工具做法 |
|------|------------|
| 乘法表 | 預設 **0–10**（對應 2N3）。另有「11–12 挑戰」模式，介面標示 **課程外延展**，**並非**教育局規定須學 12×12。 |
| 10／18 以內加減 | 關卡一：10 以內；關卡二：18 以內（1N2）。 |
| 退位減法 | 「100 以內」關卡嚴格分開：1N4 無退位 → 其後才有退位模式。 |
| 100 與 1000 | **兩個獨立操練族**，題目不會混在同一生成器。 |
| 除法（表內） | P0 先做**整除（無餘數）**。 |
| 分數答案 | 優先**最簡**；在地圖允許處可用最簡帶分數或假分數。 |

---

## 本機開啟／How to run locally

純前端（HTML + ES modules），需以**本機靜態伺服器**開啟（`file://` 可能無法載入 module）。

```bash
cd wordbank-arith   # 或專案根目錄
python3 -m http.server 8765
```

瀏覽器開啟：http://127.0.0.1:8765/

1. 選擇操練族與模式  
2. 設定題數／欄數／種子（同一種子可重現同一頁）  
3. 按「產生工作紙」  
4. 「列印／PDF」→ 工作紙為第一頁，答案頁為第二頁  

建議列印設定：A4 直向、背景圖形可開或關均可。

**Smoke test（Node）：**

```bash
node js/smoke-test.mjs
```

---

## URL 查詢參數

可選覆寫（預設不變）：

`?family=&mode=&seed=&count=&columns=`

例：`/?family=mult_div_table&mode=table_0_10&seed=20261015&count=48&columns=3`

---

## 目錄結構

```
wordbank-arith/
  index.html          # 操控列 + 可列印工作紙
  grades.html         # 操練族 → 年級／EDB 單位說明
  js/rng.js           # 可重現隨機種子
  js/math-utils.js    # 因數、最簡分數、進位／退位判斷等
  js/generators.js    # 各操練族生成器（約 13 族）
  js/app.js           # 介面與版面
  js/smoke-test.mjs   # Node 煙霧測試
  edb-primary-arithmetic-map.md
  edb-primary-arithmetic-map.json
  sources/            # EDB PDF 與抽取文本
```

實際功能摘要：種子可重現生成器；A4 多欄列印；自檢答案頁；教科書式直書分數（CSS）；無後端。

---

## 已實作／延後

### 已實作（橫式心算＋可列印答案頁）

1. 10／18 以內加減與分解（1N1、1N2）— 分關卡  
2. 乘法表 0–10 與表內整除除法（2N3、2N6）；另設 11–12 **課程外延展**  
3. **100 以內**加減（1N4 無退位／其後退位）— 獨立操練族  
4. **1000 以內**三位數加減（2N2、2N5）— **另一獨立操練族**，不與上項混題  
5. 因數／倍數／質數＜100／整除性（4N3、4N2）  
6. 兩數 H.C.F.／L.C.M.（4N4）  
7. 同分母分數加減（3N5、4N6）  
8. 異分母分數加減（5N2，分母≤12）  
9. 分數乘除（5N3、5N5 簡化版）  
10. 小數加減（4N8）  
11. 分數↔小數互化（6N2）  
12. 小數×÷10 的冪（5N4／6N1 子集）  
13. 四則混合＋圓括號非嵌套（3N4、4N5）

### 延後

- 直式演算頁、帶餘數除法、百分數應用題、應用題、多於兩個數的 H.C.F.／L.C.M.、嵌套括號

---

## 品質（題幹去重與低資訊量過濾）

- **同頁題幹不重複**：產生 N 題時以 `prompt` 去重；碰撞則重抽，並設重試上限；必要時才放寬過濾以湊滿題數。
- **「包含零／恆等題」**（UI 核取方塊，**預設關閉**）：關閉時過濾低資訊量題，例如 `n − n`、`n + 0`／`0 + n`／`n − 0`、`n × 1`／`1 × n`、`n × 0`、`n ÷ 1`、`n × m ÷ m`，以及補數為 0 的分解題。開啟後可練習 0 與恆等性質（對應 1N2 等）。
- 預設取向：較密、有練習價值的心算頁。

---

## 授權

本倉庫目前未附獨立 `LICENSE` 檔。原始碼與文件之使用條件以倉庫擁有者聲明為準；教育用途歡迎參考，商業再分發請先聯繫擁有者。

（若日後加入開源授權條款，將於此處更新。）
