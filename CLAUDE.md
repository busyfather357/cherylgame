# CLAUDE.md

所有專案規則都在 AGENTS.md（Claude Code、Google Antigravity 等共用）。新規則加在 AGENTS.md，不要加在這裡。

**給 Claude Code 的重要提醒：先確認執行環境（AGENTS.md 的「執行環境」），兩種環境的規則不同。**

* **在維護者的電腦上（本機）**：
    * 不要執行 `git add`、`git commit`、`git push` 或其他會改變 git 狀態的指令。只修改工作目錄的檔案，由維護者檢查 diff 後手動 commit。
    * 不要自行安裝任何程式、套件或瀏覽器，需要安裝時把指令交給維護者執行。
* **在雲端工作階段（claude.ai/code 的容器或 VM）**：工作目錄是暫時的，維護者看不到，所以要用 PR 交付。
    * 照 AGENTS.md 的「Git 與 PR 流程」在指定的分支 commit、push，完成後開 PR。不直接 push `main`、不自行合併。
    * 可以用 `npm --prefix tools ci` 照 lock 檔安裝測試用的套件；不新增、不升級套件，環境已經內建瀏覽器時不要再下載。

@AGENTS.md
