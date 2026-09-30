# مرجع عربي

تشرح هذه الملاحظات كيفية استخدام القوالب كـ harness عامل بدلاً من
مجموعة ملفات فضفاضة.

## ملاحظات مرجعية داخلية

- [`method-map.md`](./method-map.md): يربط أنماط الفشل الشائعة بالمنتج أو السياسة الذي يعالجها أولاً
- [`initializer-agent-playbook.md`](./initializer-agent-playbook.md): ما يجب أن يتركه المُهيئ قبل بدء عمل الميزات
- [`coding-agent-startup-flow.md`](./coding-agent-startup-flow.md): سير بدء جلسة ثابت لعمليات البرمجة اللاحقة
- [`prompt-calibration.md`](./prompt-calibration.md): كيف تحافظ على التعليمات الجذرية حادة بدون جعلها منتفخة وهشة

## المقالات الأساسية

هذه القائمة ضيقة عمداً. الـ harness يعني نظام التنفيذ حول النموذج: حلقة الوكيل، تنفيذ الأدوات، الحماية، الحالة، السياق، التحقق، الإنهاء، التنسيق، والمراقبة.

المقالات الثلاثة الأصلية تبقى العمود الفقري للدورة:

- [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/) (2026-02-11)
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025-11-26)
- [Anthropic: Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026-03-24)

- [ETH Zurich: Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://www.sri.inf.ethz.ch/publications/gloaguen2026agentsmd): دراسة ملفات السياق: نجاح المهام وتكلفة الاستدلال والمتطلبات المختصرة. راجع الملخص والخاتمة.

- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/html/2601.20404v2): gpt-5.2-codex; 10 repos / 124 PR tasks; Table 1.

- [Anthropic: Sonnet 4.5 — SWE-bench Verified methodology (2025-09-29)](https://www.anthropic.com/news/claude-sonnet-4-5)
- [Boris Cherny: personal 30-day production report (2025-12-27)](https://twitter.com/bcherny/status/2004887829252317325) · [quoted original post](https://simonwillison.net/tags/boris-cherny/)
- [Karpathy: measured autoresearch leaderboard improvement](https://github.com/karpathy/nanochat/commit/f06860494848db080c9a80a0ffa83203b042056b)
- [Karpathy: two-day autonomous tuning commit](https://github.com/karpathy/nanochat/commit/6ed7d1d82cee16c2e26f45d559ad3338447a6c1b)

## ترتيب القراءة المقترح

1. `method-map.md`
2. `initializer-agent-playbook.md`
3. `coding-agent-startup-flow.md`
4. `prompt-calibration.md`
5. مقالات OpenAI و Anthropic الأساسية
