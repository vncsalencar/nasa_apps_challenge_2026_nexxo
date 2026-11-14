// Brazilian Portuguese texts of the three home views: Readiness, Bridge and Companion.
// The key is the English text, with the same {names} in the translation.
export const homes: Record<string, string> = {
  // Texts that more than one view uses.
  '{greeting}, {name}.': '{greeting}, {name}.',
  '{greeting}.': '{greeting}.',
  'Nothing to do now.': 'Nada a fazer agora.',
  'Normal: {range}': 'Normal: {range}',
  'normal {range}': 'normal {range}',
  'What to do': 'O que fazer',
  Next: 'A seguir',

  // The short labels of the cabin values, for a place that already says "cabin".
  CO2: 'CO2',
  'CO2, 7-day average': 'CO2, média de 7 dias',
  Temperature: 'Temperatura',
  Humidity: 'Umidade',
  temperature: 'Temperatura',
  humidity: 'Umidade',

  // Readiness: the greeting and the score.
  'Nothing needs your attention now.': 'Nada precisa da sua atenção agora.',
  '1 thing to do now.': '1 coisa a fazer agora.',
  '{count} things to do now.': '{count} coisas a fazer agora.',
  'Readiness {score} of 100': 'Prontidão {score} de 100',
  'of 100': 'de 100',
  'How we count': 'Como calculamos',
  'The score starts at 100. Each problem takes points away.': 'A nota começa em 100. Cada problema tira pontos.',
  '{count} × {each} points': '{count} × {each} pontos',
  'The score does not go below {score}.': 'A nota não fica abaixo de {score}.',

  // Readiness: the "Do now" card.
  'Do now': 'Fazer agora',
  'Do now · 1 of {count}': 'Fazer agora · 1 de {count}',
  'Saved: {title}.': 'Salvo: {title}.',
  'Next:': 'A seguir:',
  'See all check-ups': 'Ver todos os check-ups',
  'Open {screen}': 'Abrir {screen}',
  'No check-up is open. All your values and the cabin values are in the normal range.':
    'Nenhum check-up está aberto. Todos os seus valores e os valores da cabine estão na faixa normal.',

  // Readiness: the whole crew, the three areas, the crew, the streak.
  'Whole crew': 'Toda a tripulação',
  'Do this:': 'Faça isto:',
  'Rest and mind': 'Descanso e mente',
  'Cabin air': 'Ar da cabine',
  'Blood pressure': 'Pressão arterial',
  'No values yet.': 'Ainda sem valores.',
  'Check-in streak': 'Sequência de check-ins',
  'day in a row': 'dia seguido',
  'days in a row': 'dias seguidos',
  'Check-ins in the last 7 days: {count}': 'Check-ins nos últimos 7 dias: {count}',
  'Today is done.': 'O de hoje está feito.',
  'Do your first check-in today. It takes 2 minutes.': 'Faça o seu primeiro check-in hoje. Leva 2 minutos.',
  'Today is still open.': 'O de hoje ainda está aberto.',
  "Open today's check-in": 'Abrir o check-in de hoje',
  "Do today's 2-minute check-in": 'Fazer o check-in de hoje (2 min)',

  // Bridge: the value in focus.
  'Value in focus: {label}': 'Valor em foco: {label}',
  'Your state now': 'Seu estado agora',
  'All values are normal.': 'Todos os valores estão normais.',
  'Measured {time} UTC': 'Medido em {time} UTC',
  'You have 1 open check-up.': 'Você tem 1 check-up aberto.',
  'You have {count} open check-ups.': 'Você tem {count} check-ups abertos.',
  '{list} and {name}': '{list} e {name}',
  'You work on it.': 'Você trabalha nisso.',
  '{name} works on it.': '{name} trabalha nisso.',
  '{names} work on it.': '{names} trabalham nisso.',
  'Answer 1 question': 'Responder 1 pergunta',
  'Answer {count} questions': 'Responder {count} perguntas',
  'Show the details': 'Mostrar os detalhes',
  'Show the alerts': 'Mostrar os alertas',

  // Bridge: the other values and the four large buttons.
  'Other values': 'Outros valores',
  'No other values yet.': 'Ainda não há outros valores.',
  '{label}: {value} {unit}, {status}. Open the details.': '{label}: {value} {unit}, {status}. Abrir os detalhes.',
  'Detail screens': 'Telas de detalhe',
  'All normal': 'Tudo normal',
  'No values yet': 'Ainda sem valores',
  '{count} not normal': '{count} fora do normal',
  '{label} is high': '{label}: acima do normal',
  '{label} is low': '{label}: abaixo do normal',
  '1 open symptom': '1 sintoma em aberto',
  '{count} open symptoms': '{count} sintomas em aberto',
  // The open questions of the check-ups.
  '1 open': '1 aberta',
  '{count} open': '{count} abertas',
  'None open': 'Nenhuma aberta',
  '1 unread': '1 não lido',
  '{count} unread': '{count} não lidos',
  'None unread': 'Nenhum não lido',

  // Companion: the head of the talk and the first message.
  'Talk with Nexxo about your health': 'Conversa com o Nexxo sobre a sua saúde',
  'Nexxo, your health companion': 'Nexxo, seu companheiro de saúde',
  'The fixed rules work with no link to Earth.': 'As regras fixas funcionam sem conexão com a Terra.',
  'One labelled message is from a language model. Fixed rules write the others.': 'Uma mensagem tem etiqueta: ela é de um modelo de linguagem. Regras fixas escrevem as outras.',
  'Fixed rules write these messages': 'Regras fixas escrevem estas mensagens',
  'I have no values yet.': 'Ainda não tenho valores.',
  'I read your newest values at {time}.': 'Li os seus valores mais recentes em {time}.',
  'All your values and all cabin values are normal.': 'Todos os seus valores e todos os valores da cabine estão normais.',
  '1 thing needs your attention.': '1 coisa precisa da sua atenção.',
  '{count} things need your attention.': '{count} coisas precisam da sua atenção.',
  'I show the {count} most important ones here.': 'Mostro aqui as {count} mais importantes.',
  'Go to the open question': 'Ir para a pergunta aberta',

  // Companion: one value.
  'This is above the alert limit of {limit} {unit}.': 'Está acima do limite de alerta de {limit} {unit}.',
  'This is below the alert limit of {limit} {unit}.': 'Está abaixo do limite de alerta de {limit} {unit}.',
  'This is above the normal range.': 'Está acima da faixa normal.',
  'This is below the normal range.': 'Está abaixo da faixa normal.',
  '{label}, last 7 days: from {first} on {firstDay} to {last} on {lastDay}.': '{label}, últimos 7 dias: de {first} em {firstDay} a {last} em {lastDay}.',
  '{time} UTC: {value}': '{time} UTC: {value}',
  'Last 7 days': 'Últimos 7 dias',
  'Open the detail': 'Abrir o detalhe',

  // Companion: the earlier answers.
  'Your earlier answers': 'Suas respostas anteriores',
  'I saved "{symptom}" as a symptom in your record.': 'Salvei "{symptom}" como sintoma no seu registro.',
  'I told {name}, the crew medical officer.': 'Avisei {name}, oficial médico.',
  'I told the flight surgeons on the ground.': 'Avisei os médicos de voo em solo.',
  'I told {name}, the crew medical officer, and the flight surgeons on the ground.': 'Avisei {name}, oficial médico, e os médicos de voo em solo.',

  // Companion: the message of the language model.
  'A language model wrote this text. It can be wrong.': 'Um modelo de linguagem escreveu este texto. O texto pode estar errado.',
  '{model} wrote this at {time}. The check-ups and alerts of Nexxo do not depend on it.': '{model} escreveu isto em {time}. Os check-ups e os alertas do Nexxo não dependem disto.',
  'The model reads the data of the mission now.': 'O modelo lê os dados da missão agora.',
  'No insight of the model yet.': 'Ainda não há análise do modelo.',

  // Companion: the open question and the answer.
  'Why I ask · {title}': 'Por que pergunto · {title}',
  'Question 1 of {count}': 'Pergunta 1 de {count}',
  'Your answer': 'Sua resposta',
  'What you can do now': 'O que você pode fazer agora',
  'I have no open question for you now.': 'Não tenho pergunta aberta para você agora.',
  'Report a symptom': 'Relatar um sintoma',
  'Do the daily check-in': 'Fazer o check-in diário',

  // Companion: the side column.
  'About this talk': 'Sobre esta conversa',
  'In this talk': 'Nesta conversa',
  'No questions now.': 'Sem perguntas agora.',
  'You answered: {answer}': 'Você respondeu: {answer}',
  'The question is open now': 'A pergunta está aberta agora',
  'Who reads your answers': 'Quem lê as suas respostas',
  'You. This crew has no medical officer.': 'Você. Esta tripulação não tem oficial médico.',
  'You. You are the crew medical officer.': 'Você. O oficial médico é você.',
  'You and {name}, the crew medical officer.': 'Você e {name}, oficial médico.',
  'Some rules also send a "Yes" to the flight surgeons on the ground. The mission log keeps each answer.':
    'Algumas regras também enviam um "Sim" aos médicos de voo em solo. O registro da missão guarda cada resposta.',
  'See all my values': 'Ver todos os meus valores',
}
