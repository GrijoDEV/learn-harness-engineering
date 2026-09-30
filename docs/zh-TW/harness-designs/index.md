# 前沿 Harness 拆解

這個專欄把課程講義提到的 harness 理論，逐一對照目前最前沿的真實產品。每個產品我們只關心一件事：**它的 harness 是怎麼設計的**，也就是模型周圍的那一層工程基礎設施：指令、工具、環境、狀態、回饋這五個子系統，以及上下文連續性、初始化、驗證、可觀測性、交接、循環這些核心機制。

我們刻意不談模型的推理能力強不強、不談某次跑分高不高，也不籠統介紹「這個 agent 能做什麼」。那些是模型層和產品層的問題。這裡只拆解 harness，模型權重以外的一切。

## 為什麼值得拆解

講義第一講提過：模型能力強，不等於執行可靠。同一套模型，放在不同的 harness 裡，表現可能相差一個數量級。但講義談的是「應該怎麼做」，這些產品回答的則是「頂尖團隊實際怎麼做」。

每個產品都是一組獨立的設計決策。把它們放在一起對照，你會看到相同的核心機制，被不同團隊以截然不同的方式實作：

- **Pi** 把 harness 做成極簡核心 + 可程式化擴充，靠「最小系統提示 + 隨選載入」做上下文工程。
- **Claude Code** 把 harness 做成完整的執行環境：分層記憶、五級壓縮、permissions、hooks、subagent。
- **Codex** 把 harness 的哲學推到極致：儲存庫即事實來源，AGENTS.md 只是目錄頁，使用 worktree 隔離環境。
- **DeepSeek Harness** 乾脆把 harness 本身定義成一種獨立於模型的執行時期：Everything is a Plugin。

## 文章列表

- [拆解 Pi 的 harness 設計](./pi/)：極簡核心 + 可程式化擴充，把上下文工程做到系統提示之外。
- [拆解 Claude Code 的 harness 設計](./claude-code/)：分層記憶、五級壓縮、permissions 與 hooks，一個完整的 agent 執行環境。
- [拆解 Codex 的 harness 設計](./codex/)：儲存庫即事實來源，AGENTS.md 是目錄頁，環境隔離與回饋循環。
- [拆解 DeepSeek Harness 的設計](./deepseek/)：Everything is a Plugin，把 agent 循環本身做成可替換的 plugin。

## 閱讀方式

建議先讀講義的前幾講（尤其是 [第二講：Harness 到底是什麼](../lectures/lecture-02-what-a-harness-actually-is/)）建立五子系統框架，再回到這裡看真實產品如何實作這些機制。

每篇文章的末尾都有「對應到課程框架」和「值得借鑑的設計」兩節，協助你把產品設計快速轉換回課程概念，方便直接套用到自己的專案。
