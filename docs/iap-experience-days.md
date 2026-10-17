# IAP 일경험 예상 참여일수

시작일과 종료일을 포함하여 월~금에서 확인된 공휴일을 제외한다. 주말 공휴일을 중복 차감하지 않는다. 날짜별 추가·제외는 사유와 함께 저장한다. 회차 분할 전후의 일수 합계는 같아야 한다.

공휴일 자료는 실시간 API가 아닌 2026·2027년 공식 자료의 배포 스냅샷이다. 다른 연도는 공휴일 미반영으로 표시하고 자동 인정횟수 연결을 하지 않는다. 이후 임시공휴일은 날짜 조정 또는 자료 업데이트로 반영한다.

공식 출처:
- 2026 월력요항: https://www.kasa.go.kr/prog/bbsArticle/BBSMSTR_000000000010/view.do?bbsId=BBSMSTR_000000000010&nttId=B000000001860Pe2zT3
- 2026 노동절·제헌절 추가: https://www.mpm.go.kr/mpm/comm/newsPress/newsPressRelease/?boardId=bbs_0000000000000029&cntId=4250&mode=view
- 2027 월력요항: https://www.kasa.go.kr/prog/plcyBrf/brief/kor/sub01_01_04/view.do?plcyBrfNo=431
- 후속 API 연계: https://www.data.go.kr/data/15012690/openapi.do

IAP의 기존 취업지원프로그램 행에서 일경험을 선택하면 예상일수와 날짜 조정을 표시한다. 기존 기간분할을 사용하면 지급단위기간과 겹치는 회차별 일수를 계산한다. 새 행은 예상일수로 기존 10일 기준에 연결하고, 기존 수동 선택은 유지한다. 예상 0일을 1회로 잡지 않는다. 이는 계획 단계의 예상값이며 실제 출석·이행 인정은 별도 확인한다.

날짜 조정, 공휴일 버전, 계산 시각, 예상일수는 행의 experiencePlan에 보관한다. 저장·복원·초안·회차 분할·동일행 복사·출력·전송 payload에 연결한다. 읽기만 할 때 계산 시각이 바뀌어 저장 비교가 흔들리지 않게 한다. 고용24의 별도 일수 필드를 지원한다는 뜻은 아니며 실제 전산 저장은 검증하지 않았다.

미인정 훈련은 이번 변경 범위에서 제외한다.

검증 명령:
- node tests/experience-days.test.cjs
- NODE_PATH=<jsdom 설치 경로> node tests/experience-days-dom.test.cjs

DOM 검사는 실제 내장 IAP에서 날짜 조정·회차 분할·합계 보존·수동 선택·0일·저장 및 초안 복원을 확인한다.
