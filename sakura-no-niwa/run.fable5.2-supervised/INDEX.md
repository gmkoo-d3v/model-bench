# 감독 실행 기록 (2026-11-18)

감독자 claude-fable-5.2가 지시문을 쓰고 워커 셋이 구현한 실행의 원본 기록입니다.
분석은 상위 폴더의 `README.md` "감독 실행" 절에 있습니다. 실행 로그는 원래 레포에 올리지 않지만, 이 폴더는 사용자 요청으로 올렸습니다.

실행 당시 Sonnet·Haiku 결과물 이름은 `fable5.2withsonnet5.5eli3.html`, `fable5.2withhaiku5.5eli3.html`이었습니다.
이후 사용자가 `fable5.2withsonnet5.5.html`, `fable5.2withhaiku5.5.html`로 바꿨습니다. 이 폴더의 지시문에는 옛 이름이 남아 있습니다.

1차본 HTML은 `.html.txt`로 저장했습니다. 과제 폴더의 결과물 HTML과 섞이지 않게 하기 위해서입니다. 열어 보려면 `.html`로 복사하세요.

## 지시문과 검수 지시

| 파일 | 내용 |
|---|---|
| `brief.md` | 감독자 지시문 289줄. DeepSeek 1차 요청에 그대로 들어갔습니다 |
| `task.sonnet5.5.md`, `task.haiku5.5.md` | Claude 워커용 지시문. 과제 원문 + `SPEC.md` + 같은 지시문(1–11절은 `brief.md`와 바이트 동일) |
| `review2.md` | DeepSeek 2차 검수 지시 (수정 C1–C9, 검색·치환 형식 규칙) |
| `review2.changes.md` | `review2.md`에서 수정 목록만 뽑은 것 (DeepSeek 파일의 함수 이름 기준) |
| `review2.claude.changes.md` | 같은 수정 목록을 함수 이름 대신 역할로 풀어 쓴 것. Claude 워커에게 보냈습니다 |

## DeepSeek (로컬, curl 단발 호출)

| 파일 | 내용 |
|---|---|
| `r1.*` | 1차: `request.json` 요청, `sse` 스트림 원본, `content.txt` 답변, `reasoning.txt` 추론, `meta.json` 토큰·시간, `time` 시작·종료 시각 |
| `r1.saved.html.txt` | 1차본 2,202줄 (답변에서 HTML만 잘라 저장, sha256 `4e2f19696fd13971…`) |
| `r2.*` | 2차 수정 요청과 답변 (검색·치환 블록 21건) |
| `r2b.*` | EDIT 16 재요청, 반려 (형식과 값이 틀림) |
| `r2c.*` | EDIT 16 재요청, 통과 |
| `r2.merged.txt` | 적용한 최종 수정 21건 |
| `probe*.json`, `probe2.sse` | 엔드포인트 확인용 첫 호출 |
| `hi.*` | 호출→저장 경로 증명용 `hi.html` 생성 기록 |

최종본은 상위 폴더의 `fable5.2withdeepseekv4.1eli3.html`입니다 (sha256 `c12c7179af25…`, `r2.merged.txt`를 `r1.saved.html.txt`에 적용한 결과).

## Claude 워커 (Agent 도구)

| 파일 | 내용 |
|---|---|
| `sonnet.r1.html.txt` | Sonnet 5.5 1차본 1,553줄 |
| `haiku.r1.html.txt` | Haiku 5.5 1차본 1,374줄 |
| `agents.time` | 두 워커를 띄운 시각 |

워커와 주고받은 메시지 전문은 감독 세션의 로컬 기록에만 있고, 레포에는 없습니다.

## 사양 조항 측정 도구

| 파일 | 내용 |
|---|---|
| `audit_probe.js` | 실행 중인 장면에서 사양 조항을 재는 도구. 인스턴스 행렬(단위 큐브 여부), 조명, 드로콜, 토글 전후 상태, 카메라 비행 시간, 같은 시드 재현을 측정합니다 |
| `harness.htm` | 결과물을 불러와 `requestAnimationFrame`을 직접 돌려 주는 틀. 브라우저 패널이 숨겨져 있어도 측정이 됩니다. `harness.htm?f=<결과물>.html`로 엽니다 |

## 스크립트

| 파일 | 내용 |
|---|---|
| `build_request.py` | 지시문으로 요청 JSON 생성 |
| `parse_sse.py` | SSE 스트림을 답변·추론·메타로 조립 |
| `extract_html.py` | 답변에서 `<!DOCTYPE html>`…`</html>` 한 덩어리만 추출 |
| `apply_edits.py` | 검색·치환 블록 적용. `FIND`가 정확히 한 번 나와야 하고, 하나라도 실패하면 아무것도 쓰지 않습니다 |
| `static_check.sh` | `index.html`이라는 이름의 동일 사본에 `SPEC.md` 검증 커맨드 실행, 모듈 문법 검사 |
| `selftest/` | `apply_edits.py` 자체 시험 입력과 출력 |
