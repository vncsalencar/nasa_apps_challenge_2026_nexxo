// Brazilian Portuguese texts of the Body page, the Cabin page, the value tile, the body figure and the range bar.
// The key is the English text, with the same {names} in the translation.
//
// A sentence with the name of an indicator or of a part of the body has no adjective that follows the gender
// of the name: "{label} está acima do limite" or "{label}: acima do normal", not "{label} está alto".
export const bodyCabin: Record<string, string> = {
  // Parts of the body. The page sends the English name to the server and shows the translation.
  Head: 'Cabeça',
  Chest: 'Peito',
  Abdomen: 'Abdômen',
  Arms: 'Braços',
  Legs: 'Pernas',
  // The same names inside a sentence.
  head: 'cabeça',
  chest: 'peito',
  abdomen: 'abdômen',
  arms: 'braços',
  legs: 'pernas',

  // Names of symptoms. The page sends the English name to the server and shows the translation.
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

  // Body page: the title. {parts} is a list of parts, for example "cabeça e peito".
  '{list} and {last}': '{list} e {last}',
  'Your {parts} needs care.': 'Precisa de cuidado: {parts}.',
  'Your {parts} need care.': 'Precisam de cuidado: {parts}.',
  'Your {parts} is normal.': 'Está normal: {parts}.',
  'Your {parts} are normal.': 'Estão normais: {parts}.',
  'All parts are normal.': 'Todas as partes estão normais.',

  // Body page: the figure.
  'Parts of the body': 'Partes do corpo',
  'Your body, front view': 'Seu corpo, visto de frente',
  'Tap a part to see its values': 'Toque em uma parte para ver os valores',
  'Select a part of the body': 'Selecione uma parte do corpo',
  'Body of the crew member': 'Corpo do tripulante',
  'No values': 'Sem valores',
  '{count} open symptom': '{count} sintoma em aberto',
  '{count} open symptoms': '{count} sintomas em aberto',
  // The status word in small letters, for a screen reader.
  normal: 'normal',
  caution: 'atenção',
  alert: 'alerta',
  '{part}: {status}': '{part}: {status}',
  '{part}: {status}, {count} open symptom': '{part}: {status}, {count} sintoma em aberto',
  '{part}: {status}, {count} open symptoms': '{part}: {status}, {count} sintomas em aberto',

  // Body page: the values of each part.
  'Body values': 'Valores do corpo',
  'Show all parts': 'Ver todas',
  'The app has no values for this part.': 'O app não tem valores para esta parte.',

  // Body page: the open symptoms.
  'Open symptoms': 'Sintomas em aberto',
  'You have no open symptoms.': 'Você não tem sintomas em aberto.',
  '{part} · since {time}': '{part} · desde {time}',
  'I feel better': 'Estou melhor',
  'This symptom can be an emergency. Tell the crew medical officer and the ground team now.':
    'Este sintoma pode ser uma emergência. Avise agora o oficial médico e a equipe em solo.',
  'Possible causes in your data': 'Causas possíveis nos seus dados',
  'Strong evidence': 'Evidência forte',
  'Medium evidence': 'Evidência média',
  'Weak evidence': 'Evidência fraca',
  'The app found no cause in your data.': 'O app não encontrou nenhuma causa nos seus dados.',
  '{names} also reports this symptom.': '{names} também relata este sintoma.',
  '{names} also report this symptom.': '{names} também relatam este sintoma.',

  // Body page: the symptom report.
  'Report a symptom': 'Relatar um sintoma',
  'What do you feel in the head?': 'O que você sente na cabeça?',
  'What do you feel in the chest?': 'O que você sente no peito?',
  'What do you feel in the abdomen?': 'O que você sente no abdômen?',
  'What do you feel in the arms?': 'O que você sente nos braços?',
  'What do you feel in the legs?': 'O que você sente nas pernas?',
  reported: 'relatado',
  'Select a part of the body first.': 'Primeiro, selecione uma parte do corpo.',
  'The body values come from a model, not from a real crew. The tag of each value shows its source.':
    'Os valores do corpo vêm de um modelo, não de uma tripulação real. A etiqueta de cada valor mostra a fonte.',

  // The value tile.
  'No value yet': 'Ainda sem valor',
  'Normal is {range}': 'Normal: {range}',
  Close: 'Fechar',
  Details: 'Detalhes',
  'What to do': 'O que fazer',
  'Time range of the chart': 'Período do gráfico',
  '24 hours': '24 horas',
  '7 days': '7 dias',
  '30 days': '30 dias',
  'Loading the chart…': 'Carregando o gráfico…',
  'A red line shows the time of a symptom report.': 'Uma linha vermelha mostra a hora do relato de um sintoma.',
  Status: 'Status',
  '{value} is in the normal range.': '{value} está na faixa normal.',
  '{value} is not normal.': '{value} não está normal.',
  '{value} is above the alert limit of {limit}.': '{value} está acima do limite de alerta de {limit}.',
  '{value} is below the alert limit of {limit}.': '{value} está abaixo do limite de alerta de {limit}.',
  '{value} is above the normal range.': '{value} está acima da faixa normal.',
  '{value} is below the normal range.': '{value} está abaixo da faixa normal.',
  'Normal range': 'Faixa normal',
  'Your usual': 'Seu valor habitual',
  'Your usual value': 'Seu valor habitual',
  'The value now is the same.': 'O valor agora é o mesmo.',
  'The value now is {distance} {unit} above it.': 'O valor agora está {distance} {unit} acima do habitual.',
  'The value now is {distance} {unit} below it.': 'O valor agora está {distance} {unit} abaixo do habitual.',
  'Why the app measures this': 'Por que o app mede isto',
  'Measured {time} UTC': 'Medido em {time} UTC',

  // Cabin page: the title. {label} is the name of an indicator.
  // alerts.ts has the first two keys too, for a value past the alert limit. Keep the two files the same.
  '{label} is too low.': '{label} está abaixo do limite.',
  '{label} is too high.': '{label} está acima do limite.',
  '{label} is not normal.': '{label} não está normal.',
  'All cabin values are normal.': 'Todos os valores da cabine estão normais.',

  // Cabin page: the wide bar of the worst value.
  'normal up to {high}': 'normal até {high}',
  'normal from {low}': 'normal a partir de {low}',
  'normal {low} to {high}': 'normal de {low} a {high}',
  'alert limit {limit}': 'limite de alerta {limit}',
  'Scale from {low} to {high} {unit}.': 'Escala de {low} a {high} {unit}.',
  'Normal is {range}.': 'Faixa normal: {range}.',
  'The alert limit is {limit} {unit}.': 'O limite de alerta é {limit} {unit}.',
  'Above the normal range for 30 days or more.': 'Acima da faixa normal há 30 dias ou mais.',
  'Below the normal range for 30 days or more.': 'Abaixo da faixa normal há 30 dias ou mais.',
  'Above the normal range since {time}.': 'Acima da faixa normal desde {time}.',
  'Below the normal range since {time}.': 'Abaixo da faixa normal desde {time}.',
  'Before that, it was near {value} {unit}.': 'Antes disso, o valor ficava perto de {value} {unit}.',

  // Cabin page: who works on the problem.
  'Who works on it': 'Quem cuida disso',
  'No one yet.': 'Ninguém ainda.',
  'since {time}': 'desde {time}',
  'A crew member': 'Um tripulante',
  'The engineer: {names}': 'Engenheiro de voo: {names}',
  'The engineers: {names}': 'Engenheiros de voo: {names}',
  'The app told this person at {time}.': 'O app avisou esta pessoa em {time}.',
  'The app told them at {time}.': 'O app avisou essas pessoas em {time}.',
  'This crew has no engineer.': 'Esta tripulação não tem engenheiro de voo.',
  'I am on it': 'Deixa comigo',
  'The crew will see your name on this problem.': 'A tripulação vai ver seu nome neste problema.',
  'The work is done': 'O trabalho terminou',
  'The crew sees your name on this problem.': 'A tripulação vê seu nome neste problema.',
  // The text that the page sends to the server with "I am on it". The server writes it into the mission log.
  '{label} is high': '{label}: acima do normal',
  '{label} is low': '{label}: abaixo do normal',
  '{label} is not normal': '{label}: fora do normal',

  // Cabin page: the cards.
  'Cabin values': 'Valores da cabine',
  'Computed values': 'Valores calculados',
  'Computed from the sensor values': 'Calculados a partir dos valores dos sensores',
  'Effect on the crew': 'Efeito na tripulação',
  'The app asked no crew member about the cabin in the last day.': 'O app não fez perguntas sobre a cabine a nenhum tripulante no último dia.',
  '{name} was asked: {question}': 'Pergunta para {name}: {question}',
  'No answer yet': 'Ainda sem resposta',
  Yes: 'Sim',
  No: 'Não',

  // Cabin page: the note about the data.
  'The cabin values are a real sensor record of the International Space Station from NASA: {source}, mission {mission}.':
    'Os valores da cabine são um registro real de sensores da Estação Espacial Internacional, da NASA: {source}, missão {mission}.',
  'The record has one set of sensors, so the app shows one value for the whole cabin.':
    'O registro tem um só conjunto de sensores, então o app mostra um valor para a cabine inteira.',
  'The record ended at {time}. The app replays it now.': 'O registro terminou em {time}. Agora o app repete o registro.',
  'After the end of the record, the app replays it.': 'Depois do fim do registro, o app repete o registro.',

  // Body page: the switch between the flat figure and the 3D figure.
  Figure: 'Figura',
  'Your body, in 3D': 'Seu corpo, em 3D',
  'Drag to turn. Tap a part to see its values': 'Arraste para girar. Toque em uma parte para ver os valores',
  'Body of the crew member in 3D.': 'Corpo do tripulante em 3D.',
}
