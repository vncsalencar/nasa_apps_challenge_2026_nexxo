// Brazilian Portuguese texts of the shared code: derive.ts, symptoms.ts, api.ts, and the shared components.
// The key is the English text, with the same {names} in the translation.
export const shared: Record<string, string> = {
  // Words that many screens use.
  Yes: 'Sim',
  'No, I feel fine': 'Não, estou bem',
  You: 'Você',
  Now: 'Agora',
  Today: 'Hoje',
  'When you have time': 'Quando você tiver tempo',
  Crew: 'Tripulação',
  Dashboard: 'Painel',
  Simulator: 'Simulador',
  'Crew member': 'Tripulante',
  'Language model': 'Modelo de linguagem',
  'The model works…': 'O modelo está trabalhando…',
  'Ask for a new insight': 'Pedir uma nova análise',
  'The last insight failed: {error}': 'A última análise falhou: {error}',
  'For: {role} · {urgency}': 'Para: {role} · {urgency}',

  // derive.ts: the readiness score, the headline, the greeting.
  'Measure again later today.': 'Meça de novo ainda hoje.',
  'Body values in alert': 'Valores do corpo em alerta',
  'Body values in caution': 'Valores do corpo em atenção',
  'Cabin values in alert': 'Valores da cabine em alerta',
  'Cabin values in caution': 'Valores da cabine em atenção',
  'Open symptoms': 'Sintomas em aberto',
  'You are ready for the day.': 'Você está bem para o dia de hoje.',
  'Take it easy today.': 'Vá com calma hoje.',
  'Rest today. Talk to the medical officer.': 'Descanse hoje. Fale com o oficial médico.',
  'Good morning': 'Bom dia',
  'Good afternoon': 'Boa tarde',
  'Good evening': 'Boa noite',

  // symptoms.ts: the parts of the body. The data keeps the English names.
  Head: 'Cabeça',
  Chest: 'Peito',
  Abdomen: 'Abdômen',
  Arms: 'Braços',
  Legs: 'Pernas',

  // symptoms.ts: the names of the symptoms. The server stores the English names.
  Headache: 'Dor de cabeça',
  Dizziness: 'Tontura',
  'Blurred vision': 'Visão embaçada',
  Fatigue: 'Fadiga',
  'Stuffy nose': 'Nariz entupido',
  'Low mood': 'Humor baixo',
  'Chest pain': 'Dor no peito',
  Palpitations: 'Palpitações',
  Cough: 'Tosse',
  'Short of breath': 'Falta de ar',
  Nausea: 'Náusea',
  'Stomach pain': 'Dor de estômago',
  'No appetite': 'Sem apetite',
  'Back pain': 'Dor nas costas',
  'Muscle pain': 'Dor muscular',
  Numbness: 'Dormência',
  'Skin rash': 'Irritação na pele',
  Weakness: 'Fraqueza',
  'Joint pain': 'Dor nas articulações',
  // The symptoms that only a check-up rule of the server saves.
  Fever: 'Febre',
  Stress: 'Estresse',
  'Heat stress': 'Estresse por calor',
  'Low blood sugar signs': 'Sinais de glicemia baixa',
  'High blood sugar signs': 'Sinais de glicemia alta',
  'Dehydration signs': 'Sinais de desidratação',

  // api.ts: where a value comes from, and a range in words.
  'NASA record': 'Registro da NASA',
  'NASA record, replayed': 'Registro da NASA, repetido',
  Model: 'Modelo',
  Computed: 'Calculado',
  'Crew entry': 'Informado pela tripulação',
  'up to {high} {unit}': 'até {high} {unit}',
  '{low} {unit} or more': '{low} {unit} ou mais',
  '{low} to {high} {unit}': '{low} a {high} {unit}',
  'up to {high}': 'até {high}',
  '{low} or more': '{low} ou mais',
  '{low} to {high}': '{low} a {high}',
  'The server answered {status}.': 'O servidor respondeu {status}.',

  // StatusBadge.tsx and TrendChart.tsx.
  'Where this value comes from': 'De onde vem este valor',
  'normal: {range}': 'normal: {range}',
  'No data in this time range.': 'Sem dados neste período.',
  'NASA record ends': 'Fim do registro da NASA',

  // Activity.tsx: the notifications and the history of the mission.
  Information: 'Informação',
  'Flight surgeons on the ground': 'Médicos de voo em solo',
  'No notifications.': 'Sem notificações.',
  'To {name}': 'Para {name}',
  'Mark as read': 'Marcar como lida',
  Read: 'Lida',
  'Nothing yet.': 'Nada ainda.',

  // Insights.tsx: the insight of the language model.
  Insight: 'Análise',
  'Written by a language model': 'Escrita por um modelo de linguagem',
  'No insight yet.': 'Ainda não há análise.',
  'Based on: {list}': 'Com base em: {list}',
  'Suggested actions': 'Ações sugeridas',
  '{model} wrote this at {time}, confidence: low.': '{model} escreveu isto em {time}, confiança: baixa.',
  '{model} wrote this at {time}, confidence: medium.': '{model} escreveu isto em {time}, confiança: média.',
  '{model} wrote this at {time}, confidence: high.': '{model} escreveu isto em {time}, confiança: alta.',
  'A model can be wrong. The check-ups and alerts of the app do not depend on it.': 'Um modelo pode errar. Os check-ups e os alertas do app não dependem dele.',

  // Checkups.tsx.
  'If you confirm, the app tells the crew medical officer.': 'Se você confirmar, o app avisa o oficial médico.',
  'If you confirm, the app tells the flight surgeons on the ground.': 'Se você confirmar, o app avisa os médicos de voo em solo.',
  'No open check-ups.': 'Nenhum check-up aberto.',
  'No check-ups. The app asks a question here when a value looks wrong.': 'Nenhum check-up. O app faz uma pergunta aqui quando um valor parece errado.',
  'Why, and what to do': 'Por quê, e o que fazer',
  'What to do: {action}': 'O que fazer: {action}',
  '{name}: {title}, symptom confirmed': '{name}: {title}, sintoma confirmado',
  '{name}: {title}, no symptom': '{name}: {title}, sem sintoma',

  // MissionHeader.tsx.
  'All missions': 'Todas as missões',
  'Day {day}': 'Dia {day}',
  'Clock runs': 'Relógio andando',
}
