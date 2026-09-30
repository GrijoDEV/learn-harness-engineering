# 한국어 참고 자료 (Reference)

이 노트들은 템플릿(template) 모음을 단순한 파일 더미가 아닌 실제로 작동하는 하네스(harness)로 사용하는 방법을 설명합니다. 각 문서는 특정 실패 유형(failure mode)을 다루며, 함께 읽으면 안정적인 장기 에이전트(agent) 작업 환경을 구축하는 전체 그림을 파악할 수 있습니다.

## 참고 노트 (Reference Notes)

- [`method-map.md`](./method-map.md): 장기 실행 중 자주 발생하는 실패 유형을 해당 문제를 가장 먼저 해결하는 산출물(artifact) 또는 정책(policy)에 매핑합니다.
- [`initializer-agent-playbook.md`](./initializer-agent-playbook.md): 기능 작업이 시작되기 전에 초기화 에이전트가 남겨야 할 것들.
- [`coding-agent-startup-flow.md`](./coding-agent-startup-flow.md): 이후 코딩 세션을 위한 고정된 세션 시작 흐름.
- [`prompt-calibration.md`](./prompt-calibration.md): 루트 지침을 비대하고 취약하게 만들지 않으면서 날카롭게 유지하는 방법.

- [ETH Zurich: Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://www.sri.inf.ethz.ch/publications/gloaguen2026agentsmd): 컨텍스트 파일의 실증 연구: 성공률, 추론 비용, 최소 요구사항. 초록과 결론 참고.

- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/html/2601.20404v2): gpt-5.2-codex; 10 repos / 124 PR tasks; Table 1.

- [Anthropic: Sonnet 4.5 — SWE-bench Verified methodology (2025-09-29)](https://www.anthropic.com/news/claude-sonnet-4-5)
- [Boris Cherny: personal 30-day production report (2025-12-27)](https://twitter.com/bcherny/status/2004887829252317325) · [quoted original post](https://simonwillison.net/tags/boris-cherny/)
- [Karpathy: measured autoresearch leaderboard improvement](https://github.com/karpathy/nanochat/commit/f06860494848db080c9a80a0ffa83203b042056b)
- [Karpathy: two-day autonomous tuning commit](https://github.com/karpathy/nanochat/commit/6ed7d1d82cee16c2e26f45d559ad3338447a6c1b)

## 권장 읽기 순서 (Suggested Reading Order)

1. `method-map.md`
2. `initializer-agent-playbook.md`
3. `coding-agent-startup-flow.md`
4. `prompt-calibration.md`
