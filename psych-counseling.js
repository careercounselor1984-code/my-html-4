(function (root) {
  'use strict';

  const scenarios = {
    explore: ['희망직무 탐색', '관심 직무 두 가지의 실제 업무와 근무조건을 비교해 우선 탐색할 직무를 정합니다.'],
    ready: ['희망직무가 구체적임', '희망직무 공고 한 건에서 필수요건을 확인하고, 이를 설명할 경험을 지원서에 한 가지 반영합니다.'],
    gap: ['희망직무와 검사 흥미가 다름', '희망직무를 선택한 이유와 실제 과업을 먼저 확인하고, 관심이 가는 과업을 포함한 인접 직무도 비교합니다.'],
    entry: ['첫 취업·경험 부족', '학교·훈련·프로젝트에서 수행한 역할과 결과를 한 가지 정리하고, 지원서나 면접에 활용할 표현을 만듭니다.'],
    returning: ['경력 공백·직무 전환', '이전 경험에서 새 직무에 활용할 역량과 보완이 필요한 요건을 나누고, 가장 작은 준비 과제를 정합니다.'],
    support: ['구직 실행에 어려움', '어느 단계에서 구직활동이 멈추는지 확인하고, 상담 중 공고 검색이나 지원서 첫 항목 작성을 함께 연습합니다.'],
    conditions: ['근무조건 조율 필요', '근무시간·통근 등 반드시 필요한 조건과 조정 가능한 조건을 구분하고, 공고를 함께 걸러 봅니다.'],
  };

  const personalityIds = ['extroversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
  const lifeIds = ['life_independence', 'life_ambition', 'life_challenge', 'life_responsibility', 'life_achievement', 'life_flexibility', 'life_relationship', 'life_money', 'life_satisfaction'];

  function interpretation(doc, packet, longForm) {
    const value = id => String(doc.getElementById(id)?.value || '').trim();
    const scores = [...doc.querySelectorAll('#gujikInputs .score-input')];
    const scoreCount = scores.filter(input => input.value !== '' && Number(input.value) >= 1 && Number(input.value) <= 100).length;
    const readinessConfirmed = scores.length > 0 && scoreCount === scores.length;
    const distinguishAreas = readinessConfirmed && new Set(scores.map(input => Number(input.value))).size > 1;
    const code = value('riasecCode').toUpperCase();
    const interestConfirmed = /^[RIASEC]{1,2}$/.test(code) && new Set(code).size === code.length;
    const confirmedCount = ids => ids.filter(id => ['높음', '보통', '낮음'].includes(value(id))).length;
    const personalityCount = longForm ? confirmedCount(personalityIds) : 0;
    const lifeCount = longForm ? confirmedCount(lifeIds) : 0;
    const profileConfirmed = !longForm || (personalityCount === personalityIds.length && lifeCount === lifeIds.length);
    const target = value('psychTargetJob').replace(/\s+/g, ' ').slice(0, 60);
    const chosen = scenarios[value('psychConsultScenario')];
    const missing = [];
    if (!readinessConfirmed) missing.push('구직준비도');
    if (!interestConfirmed) missing.push('직업흥미');
    if (!profileConfirmed) missing.push('성격·생활사');

    let focus, action;
    if (chosen) {
      [focus, action] = chosen;
    } else if (missing.length) {
      focus = '검사 자료 추가 확인';
      action = `${missing.join('·')} 자료를 확인하고, 현재 희망하는 업무와 구직 과정에서 어려운 점을 상담으로 파악합니다.`;
    } else {
      [focus, action] = scenarios[target ? 'ready' : 'explore'];
      if (target) focus = '희망직무 요건 확인';
    }

    const data = packet.data || {};
    const area = (id, fallback) => {
      if (!readinessConfirmed) return '확인 필요';
      if (!distinguishAreas) return '점수 차이 없음';
      const entered = value(id);
      return (entered && entered !== 'N/A' ? entered : fallback) || '확인 필요';
    };
    const strongest = area('strongestAreas', data.strongestAreas);
    const weakest = area('weakestAreas', data.weakestAreas);
    const opinion = [];
    if (distinguishAreas && strongest !== '확인 필요') opinion.push(`구직준비도에서 상대적으로 높은 영역(${strongest})을 실제 구직 경험과 대조해 활용할 방법을 확인할 예정임.`);
    if (distinguishAreas && weakest !== '확인 필요') opinion.push(`상대적으로 낮은 영역(${weakest})은 실제로 어려움이 있는 단계인지 상담에서 확인하고 필요한 지원을 협의할 예정임.`);
    if (interestConfirmed) opinion.push(`흥미코드 ${code}는 선호하는 과업을 탐색하는 자료로 활용하고, ${target ? `${target}의` : '관심 직무의'} 업무·근무조건과 참여자 경험을 함께 확인할 예정임.`);
    if (missing.length) opinion.push(`${missing.join('·')}의 미확인 자료를 확인한 뒤 종합 해석을 보완할 예정임.`);
    if (distinguishAreas && interestConfirmed && profileConfirmed && ['psychStrengthPreset','psychNeedPreset','psychDirectionPreset'].some(value) && packet.opinion) opinion.push(packet.opinion);

    return {
      overallType: distinguishAreas ? data.overallType || value('overallOpinionType') || '확인 필요' : strongest,
      strongest, weakest,
      readiness: distinguishAreas ? data.readiness || '점수표와 상담 내용을 함께 확인합니다.' : readinessConfirmed ? '영역별 점수가 같아 상대적인 강점과 보완점은 상담에서 확인합니다.' : `구직준비도 점수 ${scoreCount}/${scores.length}개 확인. 전체 점수를 확인한 뒤 해석합니다.`,
      service: distinguishAreas ? data.service || '필요한 지원을 상담에서 협의합니다.' : '현재의 구직 상황과 필요한 지원을 면담에서 확인합니다.',
      interest: interestConfirmed ? [code, value('riasecStrong')].filter(Boolean).join(' · ') : '확인 필요',
      career: interestConfirmed ? '검사에서 관심을 보인 과업을 실제 업무, 근무조건, 경험과 대조합니다.' : '흥미코드를 확인한 뒤 실제 업무와 비교합니다.',
      style: profileConfirmed ? data.style || '검사 결과와 상담에서 확인한 경험을 함께 검토합니다.' : `성격 ${personalityCount}/${personalityIds.length}개, 생활사 ${lifeCount}/${lifeIds.length}개 확인. 미확인 요인은 종합 해석을 보류합니다.`,
      followUp: `- 상담 초점: ${focus}${target ? ` (${target})` : ''}\n- 다음 상담 제안: ${action}`,
      opinion: opinion.join('\n'),
    };
  }

  function renderPreview(doc, longForm) {
    const box = doc.getElementById('counselorRecommendation');
    if (!box) return;
    const analysis = interpretation(doc, {}, longForm);
    box.style.whiteSpace = 'pre-line';
    box.textContent = ['상담사 참고 요약', analysis.followUp, analysis.opinion].filter(Boolean).join('\n');
  }

  root.ClgPsychCounseling = { interpretation, renderPreview };
  const refresh = event => {
    if (event.target.matches?.('#psychConsultScenario, #psychTargetJob, #riasecCode, #gujikInputs .score-input, select')) {
      renderPreview(root.document, Boolean(root.document.getElementById('life_independence')));
    }
  };
  root.document.addEventListener('input', refresh);
  root.document.addEventListener('change', refresh);
})(window);
