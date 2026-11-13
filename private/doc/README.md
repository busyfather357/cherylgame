# 文件地圖

`private/doc/` 的文件不部署，給維護者與 AI agent（Claude Code、Google Antigravity）閱讀。每份文件只有一種類型，內容不混在一起。

## 文件的類型

| 類型 | 回答的問題 | 寫法 | 什麼時候改 |
|---|---|---|---|
| **規則** | 一定要遵守什麼、不能做什麼 | 條列，簡短 | 維護者做了新的決定 |
| **SOP** | 這件事現在怎麼做 | 步驟、指令、範本、檢查清單。只寫現在的做法 | 做法改變時。舊的做法直接改掉，不保留 |
| **設計** | 系統現在是什麼樣子、為什麼這樣設計 | 依系統分節，寫現況與理由 | 行為或架構改變時 |
| **計畫** | 做到哪裡、接下來做什麼、誰負責 | 表格，一列一件事 | 狀態改變時（每個 PR 都看一次） |
| **經驗紀錄** | 發生過什麼、量到什麼、試過什麼 | 有日期的紀錄，只往後加 | 有新的實測結果、踩到新的坑 |

## 每份文件

| 文件 | 類型 | 內容 | 主要給誰 |
|---|---|---|---|
| [`AGENTS.md`](../../AGENTS.md) | 規則 + SOP | 專案概要、執行環境、目錄、指令、程式慣例、開發工具、Git 與 PR 流程。每個 agent 開始工作時都會讀 | 所有 agent |
| [`CLAUDE.md`](../../CLAUDE.md) | 規則 | 指向 `AGENTS.md`，只有 Claude Code 依執行環境要注意的兩件事 | Claude Code |
| [`work_plan.md`](work_plan.md) | 計畫 | 工作計畫總表：每個角色做到哪一步、遊戲功能與工具的狀態、已決定與待決定的事 | 所有人。**開始工作前先看** |
| [`system_architecture.md`](system_architecture.md) | 設計 | 遊戲各系統的現況與理由：核心、介面、存檔、iframe、經驗值與商店、章節與魔王、觸控、開發工具 | 寫程式的 agent |
| [`character_pipeline.md`](character_pipeline.md) | SOP | 角色原圖 → 精靈圖與全身圖：格式、`tools/sprites.py` 的指令與處理流程、新增角色的步驟 | 做轉檔的 agent |
| [`art_guide.md`](art_guide.md) | SOP | 美術素材怎麼畫：畫風、技術規則、提示詞範本、Drive 的資料夾與檔名、核可流程。**Google Drive 上有一份副本** | Antigravity |
| [`lessons_learned.md`](lessons_learned.md) | 經驗紀錄 | 實測數據、踩過的坑、試過但放棄的做法、每次改版的驗證結果。最前面有索引 | 想知道「為什麼」的人 |

其他：`private/iframe.txt` 是給外部網站嵌入遊戲的語法（限制見 `system_architecture.md` 第 5 節）；`.github/pull_request_template.md` 是 PR 說明的固定段落。

## 新的內容要寫在哪裡

| 你手上的內容 | 寫在 |
|---|---|
| 維護者說「以後都要這樣」「不要那樣」 | `AGENTS.md`；跟畫圖有關的寫 `art_guide.md` |
| 完成了一個步驟、發現一件待辦、維護者做了決定 | `work_plan.md` |
| 改了遊戲的行為、資料格式、檔案結構 | `system_architecture.md` 對應的那一節 |
| 改了工具的指令或處理方式、轉檔的步驟 | `character_pipeline.md`；會影響原圖畫法的同時改 `art_guide.md` |
| 改了畫圖的規則或提示詞範本 | `art_guide.md`，提高開頭的規範版本，合併後複製到 Drive |
| 測試結果、量到的數字、失敗的嘗試、事情的經過 | `lessons_learned.md` |
| 每張圖的提示詞與自我檢查 | 該素材在 Drive 上的 `log.md`（`art_guide.md` 9.2） |

* **經驗要回寫**：`lessons_learned.md` 的紀錄如果會改變做法，同一個 PR 就要修改對應的規則、SOP 或設計，並在它的索引註明寫在哪裡。agent 開始工作時讀的是規則與 SOP，不會先讀經驗紀錄。
* **SOP 與設計不放流水帳**：不寫「某年某月某日改成…之前是…」的經過，只寫現在的樣子；經過寫在經驗紀錄。決定的日期可以留。
* **不要重複**：同一件事只在一份文件寫清楚，其他地方用一句話加連結帶過。
* **節號不要重新編號**：`system_architecture.md`、`character_pipeline.md`、`art_guide.md` 的節號被其他文件與程式註解引用。新的內容加成子節或加在最後；搬走的內容留下標題與一行指向新位置的說明。
* 文件用繁體中文；提示詞用英文（`art_guide.md`）。

## Google Drive 上的副本

Drive 的 `Antigravity_Data/cherylgame/` 對照 repo 的根目錄（`AGENTS.md`「Google Drive 對照資料夾」）。文件的正本都在 git，Drive 上**只放一份副本**：`private/doc/art_guide.md`，讓只讀得到 Drive 的美術 agent 可以畫圖。它修改並合併後，由維護者（或讀寫得到 Drive 的 agent）複製過去；`work_plan.md` 第 4 節會列出還沒同步的版本。
