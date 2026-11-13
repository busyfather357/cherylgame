<!-- 標題：<類型>(<範圍>): <中文摘要>，例如 feat(character): 新增牧師的全身圖。流程見 AGENTS.md 的「Git 與 PR 流程」 -->

## 摘要
<!-- 一兩句話：這個 PR 做了什麼、為什麼 -->

## 改了什麼
<!-- 依類別列出：遊戲 (public/)、工具 (tools/)、美術產出、文件 -->

## 驗證
<!-- 跑了哪些指令、結果如何。沒有跑的留空，並在下面說明原因 -->
- [ ] `npm --prefix tools test`
- [ ] `python -m unittest discover -s tools/tests -t .`
- [ ] `python -m tools.sprites --check`
- [ ] 已更新 `private/doc/work_plan.md` 與相關文件

## 合併後維護者要做的事
<!-- agent 做不到、但不做就不完整的事：把新的原圖放到 Google Drive、把 art_guide.md 複製到 Drive、實機測試。沒有就寫「無」 -->

## 待決定的事
<!-- 需要維護者決定、這個 PR 沒有處理的事。沒有就寫「無」 -->
